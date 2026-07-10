"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { customAlphabet } from "nanoid";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, isUnlimited } from "@/lib/plans";
import { getQrType } from "@/lib/qr-types/registry";
import type { QrDesign } from "@/lib/types";
import { DEFAULT_DESIGN } from "@/components/qr/qr-options";

const makeSlug = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

export interface QrPayload {
  typeId: string;
  title: string;
  data: Record<string, unknown>;
  design: QrDesign;
  isDynamic: boolean;
  isActive: boolean;
  folderId: string | null;
  expiresAt: string | null;
  password: string | null;
  removePassword?: boolean;
}

export type QrActionResult = { error: string } | undefined;

function sanitizeDesign(design: QrDesign, logoEnabled: boolean): QrDesign {
  const hex = /^#[0-9a-fA-F]{6}$/;
  return {
    fgColor: hex.test(design?.fgColor ?? "") ? design.fgColor : DEFAULT_DESIGN.fgColor,
    bgColor: hex.test(design?.bgColor ?? "") ? design.bgColor : DEFAULT_DESIGN.bgColor,
    dotStyle: design?.dotStyle ?? "square",
    cornerStyle: design?.cornerStyle ?? "square",
    logoUrl: logoEnabled ? (design?.logoUrl ?? null) : null,
  };
}

export async function createQrCode(payload: QrPayload): Promise<QrActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "generic" };

  const type = getQrType(payload.typeId);
  const title = payload.title?.trim();
  if (!type || !title) return { error: "invalid" };

  const { limits } = await getUserPlan(supabase, user.id);

  const { count: totalCount } = await supabase
    .from("qr_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (!isUnlimited(limits.max_qr_codes) && (totalCount ?? 0) >= limits.max_qr_codes) {
    return { error: `qrLimit:${limits.max_qr_codes}` };
  }

  const isDynamic = type.canBeStatic ? payload.isDynamic : true;
  if (isDynamic && !isUnlimited(limits.max_dynamic)) {
    const { count: dynCount } = await supabase
      .from("qr_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_dynamic", true);
    if ((dynCount ?? 0) >= limits.max_dynamic) {
      return { error: `dynamicLimit:${limits.max_dynamic}` };
    }
  }

  const password =
    limits.password_enabled && payload.password?.trim()
      ? await bcrypt.hash(payload.password.trim(), 10)
      : null;

  const { data: inserted, error } = await supabase
    .from("qr_codes")
    .insert({
      user_id: user.id,
      folder_id: limits.folders_enabled ? payload.folderId : null,
      type: type.id,
      title,
      slug: makeSlug(),
      is_dynamic: isDynamic,
      is_active: payload.isActive !== false,
      expires_at: payload.expiresAt || null,
      password,
      design: sanitizeDesign(payload.design, limits.logo_enabled),
    })
    .select("id")
    .single();

  if (error || !inserted) return { error: "generic" };

  const { error: dataError } = await supabase
    .from("qr_code_data")
    .insert({ qr_code_id: inserted.id, data: payload.data ?? {} });
  if (dataError) {
    await supabase.from("qr_codes").delete().eq("id", inserted.id);
    return { error: "generic" };
  }

  revalidatePath("/qr");
  revalidatePath("/dashboard");
  redirect(`/qr/${inserted.id}?created=1`);
}

export async function updateQrCode(
  id: string,
  payload: QrPayload
): Promise<QrActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "generic" };

  const { data: existing } = await supabase
    .from("qr_codes")
    .select("id, password")
    .eq("id", id)
    .single();
  if (!existing) return { error: "generic" };

  const title = payload.title?.trim();
  if (!title) return { error: "invalid" };

  const { limits } = await getUserPlan(supabase, user.id);

  let password: string | null = existing.password;
  if (payload.removePassword) {
    password = null;
  } else if (limits.password_enabled && payload.password?.trim()) {
    password = await bcrypt.hash(payload.password.trim(), 10);
  }

  const { error } = await supabase
    .from("qr_codes")
    .update({
      title,
      folder_id: limits.folders_enabled ? payload.folderId : null,
      is_active: payload.isActive !== false,
      expires_at: payload.expiresAt || null,
      password,
      design: sanitizeDesign(payload.design, limits.logo_enabled),
    })
    .eq("id", id);
  if (error) return { error: "generic" };

  const { error: dataError } = await supabase
    .from("qr_code_data")
    .upsert(
      { qr_code_id: id, data: payload.data ?? {} },
      { onConflict: "qr_code_id" }
    );
  if (dataError) return { error: "generic" };

  revalidatePath("/qr");
  revalidatePath(`/qr/${id}`);
  redirect(`/qr/${id}?updated=1`);
}

export async function toggleQrActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  await supabase.from("qr_codes").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/qr");
  revalidatePath(`/qr/${id}`);
}

export async function deleteQrCode(id: string) {
  const supabase = await createClient();
  await supabase.from("qr_codes").delete().eq("id", id);
  revalidatePath("/qr");
  revalidatePath("/dashboard");
}

export async function duplicateQrCode(id: string): Promise<QrActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "generic" };

  const { data: original } = await supabase
    .from("qr_codes")
    .select("*, qr_code_data(data)")
    .eq("id", id)
    .single();
  if (!original) return { error: "generic" };

  const { limits } = await getUserPlan(supabase, user.id);
  const { count } = await supabase
    .from("qr_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (!isUnlimited(limits.max_qr_codes) && (count ?? 0) >= limits.max_qr_codes) {
    return { error: `qrLimit:${limits.max_qr_codes}` };
  }

  const { data: copy, error } = await supabase
    .from("qr_codes")
    .insert({
      user_id: user.id,
      folder_id: original.folder_id,
      type: original.type,
      title: `${original.title} (copie)`,
      slug: makeSlug(),
      is_dynamic: original.is_dynamic,
      is_active: original.is_active,
      expires_at: original.expires_at,
      password: original.password,
      design: original.design,
    })
    .select("id")
    .single();
  if (error || !copy) return { error: "generic" };

  await supabase.from("qr_code_data").insert({
    qr_code_id: copy.id,
    data: original.qr_code_data?.[0]?.data ?? {},
  });

  revalidatePath("/qr");
  revalidatePath("/dashboard");
}

export async function moveQrToFolder(id: string, folderId: string | null) {
  const supabase = await createClient();
  await supabase.from("qr_codes").update({ folder_id: folderId }).eq("id", id);
  revalidatePath("/qr");
}
