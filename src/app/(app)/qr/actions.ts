"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { customAlphabet } from "nanoid";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserPlan, isUnlimited } from "@/lib/plans";
import { getQrType } from "@/lib/qr-types/registry";
import type { QrDesign } from "@/lib/types";
import { DEFAULT_DESIGN } from "@/components/qr/qr-options";
import { duplicateFileFields, duplicateStorageUrl } from "@/lib/storage";

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
  customDomainId?: string | null;
}

/** Vérifie que le domaine choisi appartient bien à l'utilisateur — sans ça,
 * rien n'empêcherait de passer l'id du domaine de quelqu'un d'autre. */
async function resolveCustomDomainId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  customDomainId: string | null | undefined
): Promise<string | null> {
  if (!customDomainId) return null;
  const { data } = await supabase
    .from("custom_domains")
    .select("id")
    .eq("id", customDomainId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ? customDomainId : null;
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
  const customDomainId = limits.custom_domain_enabled
    ? await resolveCustomDomainId(supabase, user.id, payload.customDomainId)
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
      custom_domain_id: customDomainId,
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
  const customDomainId = limits.custom_domain_enabled
    ? await resolveCustomDomainId(supabase, user.id, payload.customDomainId)
    : null;

  const { error } = await supabase
    .from("qr_codes")
    .update({
      title,
      folder_id: limits.folders_enabled ? payload.folderId : null,
      is_active: payload.isActive !== false,
      expires_at: payload.expiresAt || null,
      password,
      design: sanitizeDesign(payload.design, limits.logo_enabled),
      custom_domain_id: customDomainId,
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

  // Chaque copie doit posséder ses propres fichiers (photos, vidéo, logo…) :
  // partager l'URL Storage d'origine casserait l'une des deux QR dès que
  // l'autre supprime ou remplace ce fichier depuis son formulaire d'édition.
  // Client service_role pour la copie : depuis la migration 007, seul
  // service_role peut écrire dans ces buckets (voir /api/upload).
  const storageAdmin = createAdminClient();
  const design = { ...(original.design as QrDesign) };
  if (design.logoUrl) {
    design.logoUrl = await duplicateStorageUrl(storageAdmin, design.logoUrl, user.id);
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
      design,
    })
    .select("id")
    .single();
  if (error || !copy) return { error: "generic" };

  const type = getQrType(original.type);
  const originalData = (original.qr_code_data?.[0]?.data ?? {}) as Record<string, unknown>;
  const data = type
    ? await duplicateFileFields(storageAdmin, type.fields, originalData, user.id)
    : originalData;

  await supabase.from("qr_code_data").insert({
    qr_code_id: copy.id,
    data,
  });

  revalidatePath("/qr");
  revalidatePath("/dashboard");
}

export async function moveQrToFolder(id: string, folderId: string | null) {
  const supabase = await createClient();
  await supabase.from("qr_codes").update({ folder_id: folderId }).eq("id", id);
  revalidatePath("/qr");
}

/** Actions groupées depuis la liste (sélection multiple) — RLS scope déjà
 * le "in" aux QR du user courant, pas besoin de re-vérifier user_id ici. */
export async function bulkDeleteQr(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase.from("qr_codes").delete().in("id", ids);
  revalidatePath("/qr");
  revalidatePath("/dashboard");
}

export async function bulkMoveToFolder(
  ids: string[],
  folderId: string | null
): Promise<void> {
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase.from("qr_codes").update({ folder_id: folderId }).in("id", ids);
  revalidatePath("/qr");
}

export type UploadCheck =
  | { ok: true }
  | { ok: false; error: "auth" }
  | { ok: false; error: "video" }
  | { ok: false; error: "storage"; limitMb: number };

/**
 * Vérifie le quota de stockage et le droit vidéo du plan.
 *
 * Appelée deux fois pour deux rôles différents :
 * 1. Par les composants client (DynamicForm, QRCustomizer) AVANT l'envoi,
 *    pour un rejet instantané sans transférer les octets — un raccourci UX,
 *    plus la barrière de sécurité.
 * 2. Par la route serveur /api/upload (src/app/api/upload/route.ts), avec
 *    la taille RÉELLEMENT reçue (pas celle déclarée par le client) : c'est
 *    la vérification qui compte. Depuis la migration 007, aucune policy
 *    RLS ne permet plus à un client d'écrire directement dans ces buckets
 *    avec sa propre clé — /api/upload (service_role) est le seul chemin
 *    d'écriture restant, donc ce contrôle est désormais réellement
 *    incontournable (voir 005_storage_enforcement.sql pour l'historique de
 *    la faille, et 007_storage_upload_lockdown.sql pour sa fermeture).
 */
export async function checkUpload(
  totalBytes: number,
  hasVideo: boolean
): Promise<UploadCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };

  // Indépendants (dépendent seulement de l'utilisateur authentifié) :
  // exécutés en parallèle pour économiser un aller-retour réseau.
  const [{ limits }, { data: usedBytes }] = await Promise.all([
    getUserPlan(supabase, user.id),
    supabase.rpc("user_storage_bytes"),
  ]);

  if (hasVideo && !limits.video_enabled) {
    return { ok: false, error: "video" };
  }

  if (!isUnlimited(limits.max_storage_mb)) {
    const quotaBytes = limits.max_storage_mb * 1024 * 1024;
    if (Number(usedBytes ?? 0) + Math.max(totalBytes, 0) > quotaBytes) {
      return { ok: false, error: "storage", limitMb: limits.max_storage_mb };
    }
  }

  return { ok: true };
}
