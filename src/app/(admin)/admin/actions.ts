"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanLimits } from "@/lib/types";
import { savePaydunyaConfig, type PaydunyaConfig } from "@/lib/payments/config";

export type AdminActionResult = { error: string } | undefined;

/** Toute action admin re-vérifie le rôle côté serveur. */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin" ? { supabase, userId: user.id } : null;
}

// ------------------------------------------------------------ Utilisateurs

export async function setUserSuspended(
  userId: string,
  suspended: boolean
): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };
  if (userId === ctx.userId) return { error: "generic" }; // pas d'auto-suspension

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ is_suspended: suspended })
    .eq("id", userId);
  if (error) return { error: "generic" };
  revalidatePath("/admin/users");
}

export async function setUserRole(
  userId: string,
  role: "admin" | "user"
): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };
  if (userId === ctx.userId) return { error: "generic" }; // pas d'auto-rétrogradation

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) return { error: "generic" };
  revalidatePath("/admin/users");
}

export async function setUserPlan(
  userId: string,
  planId: string
): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };

  const { data: plan } = await ctx.supabase
    .from("plans")
    .select("id, price_monthly")
    .eq("id", planId)
    .single();
  if (!plan) return { error: "generic" };

  // Écritures via service_role : la RLS subscriptions n'autorise que l'admin,
  // mais le client admin simplifie la transaction cancel + insert.
  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .eq("status", "active");

  const isPaid = Number(plan.price_monthly) > 0;
  const periodEnd = isPaid
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await admin.from("subscriptions").insert({
    user_id: userId,
    plan_id: planId,
    status: "active",
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd,
    gateway: "admin",
  });
  if (error) return { error: "generic" };
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };
  if (userId === ctx.userId) return { error: "generic" }; // pas d'auto-suppression

  // Supprime le compte auth ; les tables applicatives suivent (on delete cascade)
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: "generic" };
  revalidatePath("/admin/users");
}

// ------------------------------------------------------------ Plans

export interface PlanPayload {
  name: string;
  description: string;
  price_monthly: number;
  currency: string;
  sort_order: number;
  is_active: boolean;
  limits: PlanLimits;
}

function sanitizePlanPayload(p: PlanPayload) {
  const int = (v: number, fallback: number) =>
    Number.isFinite(v) ? Math.max(Math.trunc(v), -1) : fallback;
  const formats = ["png", "svg", "pdf"].filter((f) => p.limits.formats.includes(f));
  return {
    name: p.name.trim(),
    description: p.description.trim() || null,
    price_monthly: Math.max(Number(p.price_monthly) || 0, 0),
    currency: p.currency.trim().toUpperCase() || "XOF",
    sort_order: int(p.sort_order, 0),
    is_active: p.is_active === true,
    limits: {
      max_qr_codes: int(p.limits.max_qr_codes, 5),
      max_dynamic: int(p.limits.max_dynamic, 3),
      max_scans_month: int(p.limits.max_scans_month, 300),
      max_storage_mb: int(p.limits.max_storage_mb, 20),
      logo_enabled: p.limits.logo_enabled === true,
      video_enabled: p.limits.video_enabled === true,
      formats: formats.length > 0 ? formats : ["png"],
      stats_level: p.limits.stats_level === "full" ? "full" : "basic",
      folders_enabled: p.limits.folders_enabled === true,
      password_enabled: p.limits.password_enabled === true,
    },
  };
}

export async function savePlan(
  planId: string | null,
  payload: PlanPayload
): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };

  const row = sanitizePlanPayload(payload);
  if (!row.name) return { error: "generic" };

  const { error } = planId
    ? await ctx.supabase.from("plans").update(row).eq("id", planId)
    : await ctx.supabase.from("plans").insert(row);
  if (error) return { error: "generic" };

  revalidatePath("/admin/plans");
  revalidatePath("/billing");
}

// ------------------------------------------------------------ QR codes

export async function adminToggleQr(
  id: string,
  isActive: boolean
): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("qr_codes")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { error: "generic" };
  revalidatePath("/admin/qrcodes");
}

export interface AdminQrUpdatePayload {
  title: string;
  isActive: boolean;
  expiresAt: string | null;
  removePassword: boolean;
  data: Record<string, unknown>;
}

/**
 * Édition du contenu d'un QR par un admin, pour n'importe quel propriétaire.
 * Passe par le client service_role : il n'existe pas de policy RLS
 * "admin update" sur qr_codes/qr_code_data (seulement select/delete), comme
 * pour adminToggleQr ci-dessus. Ne touche jamais aux champs fichier — voir
 * DynamicForm readOnlyFiles, qui évite d'appliquer le quota de stockage de
 * l'admin à la place de celui du propriétaire réel du QR.
 */
export async function adminUpdateQrCode(
  id: string,
  payload: AdminQrUpdatePayload
): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };

  const title = payload.title.trim();
  if (!title) return { error: "generic" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("qr_codes")
    .update({
      title,
      is_active: payload.isActive,
      expires_at: payload.expiresAt || null,
      ...(payload.removePassword ? { password: null } : {}),
    })
    .eq("id", id);
  if (error) return { error: "generic" };

  const { error: dataError } = await admin
    .from("qr_code_data")
    .upsert({ qr_code_id: id, data: payload.data }, { onConflict: "qr_code_id" });
  if (dataError) return { error: "generic" };

  revalidatePath("/admin/qrcodes");
  revalidatePath(`/admin/qrcodes/${id}`);
}

export async function adminDeleteQr(id: string): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };

  const { error } = await ctx.supabase.from("qr_codes").delete().eq("id", id);
  if (error) return { error: "generic" };
  revalidatePath("/admin/qrcodes");
}

// ------------------------------------------------------------ Paramètres

export interface SiteSettingsPayload {
  site_name: string;
  support_email: string;
  announcement: string;
}

export async function saveSiteSettings(
  payload: SiteSettingsPayload
): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };

  const entries = [
    { key: "site_name", value: { text: payload.site_name.trim() } },
    { key: "support_email", value: { text: payload.support_email.trim() } },
    { key: "announcement", value: { text: payload.announcement.trim() } },
  ];
  const { error } = await ctx.supabase
    .from("site_settings")
    .upsert(entries, { onConflict: "key" });
  if (error) return { error: "generic" };
  revalidatePath("/admin/settings");
}

export async function savePaydunyaSettings(
  config: PaydunyaConfig
): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };

  await savePaydunyaConfig({
    masterKey: config.masterKey.trim(),
    privateKey: config.privateKey.trim(),
    publicKey: config.publicKey.trim(),
    token: config.token.trim(),
    mode: config.mode === "live" ? "live" : "test",
  });
  revalidatePath("/admin/settings");
}
