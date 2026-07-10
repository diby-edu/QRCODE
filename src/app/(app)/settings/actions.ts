"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

export type SettingsResult = { error?: string; success?: boolean } | undefined;

export async function updateProfile(fullName: string): Promise<SettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "generic" };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim() })
    .eq("id", user.id);
  if (error) return { error: "generic" };

  revalidatePath("/settings");
  return { success: true };
}

export async function changePassword(
  password: string,
  confirm: string
): Promise<SettingsResult> {
  if (password.length < 8) return { error: "weakPassword" };
  if (password !== confirm) return { error: "mismatch" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "generic" };
  return { success: true };
}

export async function changeLanguage(locale: string): Promise<SettingsResult> {
  if (!isLocale(locale)) return { error: "generic" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ language: locale }).eq("id", user.id);
  }

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/settings");
  return { success: true };
}
