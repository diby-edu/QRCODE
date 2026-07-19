"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";
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

const HOSTNAME_RE =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

/**
 * Enregistre une demande de domaine personnalisé (statut "pending"). Le
 * client doit déjà posséder ce domaine et l'avoir pointé (CNAME) vers
 * l'app — l'activation réelle (nginx + certbot) est un geste manuel de
 * l'admin sur le VPS, voir scripts/add-custom-domain.sh et DEPLOY.md.
 */
export async function requestCustomDomain(domain: string): Promise<SettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "generic" };

  const { limits } = await getUserPlan(supabase, user.id);
  if (!limits.custom_domain_enabled) return { error: "notEnabled" };

  const clean = domain.trim().toLowerCase();
  if (!HOSTNAME_RE.test(clean)) return { error: "invalidDomain" };

  const { error } = await supabase
    .from("custom_domains")
    .insert({ user_id: user.id, domain: clean, status: "pending" });
  if (error) {
    return { error: error.code === "23505" ? "domainTaken" : "generic" };
  }

  revalidatePath("/domain");
  return { success: true };
}

/** Modifie un domaine existant (repasse en "pending" — un nom différent
 * demande un nouveau bloc nginx/certificat, donc une revalidation admin). */
export async function updateCustomDomain(
  id: string,
  domain: string
): Promise<SettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "generic" };

  const clean = domain.trim().toLowerCase();
  if (!HOSTNAME_RE.test(clean)) return { error: "invalidDomain" };

  const { error } = await supabase
    .from("custom_domains")
    .update({ domain: clean, status: "pending", verified_at: null, notes: null })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    return { error: error.code === "23505" ? "domainTaken" : "generic" };
  }

  revalidatePath("/domain");
  return { success: true };
}

export async function deleteCustomDomain(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("custom_domains").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/domain");
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
