"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";

export type FolderActionResult = { error: string } | undefined;

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function createFolder(
  name: string,
  color: string
): Promise<FolderActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "generic" };

  const { limits } = await getUserPlan(supabase, user.id);
  if (!limits.folders_enabled) return { error: "locked" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "invalid" };

  const { error } = await supabase.from("folders").insert({
    user_id: user.id,
    name: trimmed,
    color: HEX.test(color) ? color : "#6366f1",
  });
  if (error) return { error: "generic" };

  revalidatePath("/folders");
  revalidatePath("/qr");
}

export async function updateFolder(
  id: string,
  name: string,
  color: string
): Promise<FolderActionResult> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { error: "invalid" };

  const { error } = await supabase
    .from("folders")
    .update({ name: trimmed, ...(HEX.test(color) ? { color } : {}) })
    .eq("id", id);
  if (error) return { error: "generic" };

  revalidatePath("/folders");
  revalidatePath("/qr");
}

export async function deleteFolder(id: string): Promise<FolderActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("folders").delete().eq("id", id);
  if (error) return { error: "generic" };

  revalidatePath("/folders");
  revalidatePath("/qr");
}
