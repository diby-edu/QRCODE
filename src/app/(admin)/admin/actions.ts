"use server";

import { revalidatePath } from "next/cache";
import { promises as dns } from "node:dns";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanLimits } from "@/lib/types";
import { savePaydunyaConfig, type PaydunyaConfig } from "@/lib/payments/config";
import { appUrl } from "@/lib/url";

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
  return profile?.role === "admin"
    ? { supabase, userId: user.id, email: user.email ?? null }
    : null;
}

/**
 * Trace une action admin dans admin_activity_log (visible sur /admin/activity).
 * targetLabel : libellé humain de la cible (email, titre de QR, nom de
 * plan/domaine…) capturé au moment de l'action — reste correct même si la
 * ligne visée est supprimée juste après (ex: user.delete, qr.delete),
 * contrairement à un lookup a posteriori sur le seul id stocké dans "target".
 */
async function logAction(
  ctx: { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; email: string | null },
  action: string,
  target?: string,
  details?: Record<string, unknown>,
  targetLabel?: string | null
) {
  await ctx.supabase.from("admin_activity_log").insert({
    admin_id: ctx.userId,
    admin_email: ctx.email,
    action,
    target: target ?? null,
    target_label: targetLabel ?? null,
    details: details ?? {},
  });
}

// ------------------------------------------------------------ Utilisateurs

export async function setUserSuspended(
  userId: string,
  suspended: boolean
): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };
  if (userId === ctx.userId) return { error: "generic" }; // pas d'auto-suspension

  const { data, error } = await ctx.supabase
    .from("profiles")
    .update({ is_suspended: suspended })
    .eq("id", userId)
    .select("email, full_name")
    .single();
  if (error) return { error: "generic" };
  await logAction(
    ctx,
    suspended ? "user.suspend" : "user.unsuspend",
    userId,
    undefined,
    data.full_name || data.email
  );
  revalidatePath("/admin/users");
}

export async function setUserRole(
  userId: string,
  role: "admin" | "user"
): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };
  if (userId === ctx.userId) return { error: "generic" }; // pas d'auto-rétrogradation

  const { data, error } = await ctx.supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select("email, full_name")
    .single();
  if (error) return { error: "generic" };
  await logAction(
    ctx,
    role === "admin" ? "user.promote" : "user.demote",
    userId,
    undefined,
    data.full_name || data.email
  );
  revalidatePath("/admin/users");
}

export async function setUserPlan(
  userId: string,
  planId: string
): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };

  const [{ data: plan }, { data: targetProfile }] = await Promise.all([
    ctx.supabase.from("plans").select("id, name, price_monthly").eq("id", planId).single(),
    ctx.supabase.from("profiles").select("email, full_name").eq("id", userId).single(),
  ]);
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
  await logAction(
    ctx,
    "user.changePlan",
    userId,
    { plan: plan.name },
    targetProfile?.full_name || targetProfile?.email
  );
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };
  if (userId === ctx.userId) return { error: "generic" }; // pas d'auto-suppression

  // Capturé AVANT suppression : le profil n'existera plus ensuite.
  const { data: targetProfile } = await ctx.supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  // Supprime le compte auth ; les tables applicatives suivent (on delete cascade)
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: "generic" };
  await logAction(ctx, "user.delete", userId, undefined, targetProfile?.full_name || targetProfile?.email);
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
      custom_domain_enabled: p.limits.custom_domain_enabled === true,
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

  await logAction(
    ctx,
    planId ? "plan.update" : "plan.create",
    planId ?? row.name,
    { price_monthly: row.price_monthly },
    row.name
  );
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
  const { data, error } = await admin
    .from("qr_codes")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("title")
    .single();
  if (error) return { error: "generic" };
  await logAction(ctx, isActive ? "qr.activate" : "qr.deactivate", id, undefined, data.title);
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

  await logAction(ctx, "qr.edit", id, undefined, title);
  revalidatePath("/admin/qrcodes");
  revalidatePath(`/admin/qrcodes/${id}`);
}

export async function adminDeleteQr(id: string): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };

  // Capturé AVANT suppression : le QR n'existera plus ensuite.
  const { data: target } = await ctx.supabase.from("qr_codes").select("title").eq("id", id).single();

  const { error } = await ctx.supabase.from("qr_codes").delete().eq("id", id);
  if (error) return { error: "generic" };
  await logAction(ctx, "qr.delete", id, undefined, target?.title);
  revalidatePath("/admin/qrcodes");
}

// ------------------------------------------------------------ Paiements

export async function refundPayment(paymentId: string): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, status, amount, currency, user_id")
    .eq("id", paymentId)
    .single();
  if (!payment || payment.status !== "completed") return { error: "generic" };

  const { error } = await admin
    .from("payments")
    .update({ status: "refunded" })
    .eq("id", paymentId);
  if (error) return { error: "generic" };

  const { data: payer } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", payment.user_id)
    .maybeSingle();
  const who = payer?.full_name || payer?.email;
  const amountLabel = `${payment.amount} ${payment.currency}`;
  await logAction(
    ctx,
    "payment.refund",
    paymentId,
    undefined,
    who ? `${who} — ${amountLabel}` : amountLabel
  );
  revalidatePath("/admin/payments");
}

export interface ManualPaymentPayload {
  email: string;
  planId: string;
  amount: number;
  note: string;
}

/**
 * Enregistre un paiement hors-ligne (virement bancaire, espèces…) et active
 * l'abonnement correspondant — même logique d'activation que verifyAndActivate
 * pour PayDunya, mais déclenchée manuellement par un admin.
 */
export async function recordManualPayment(
  payload: ManualPaymentPayload
): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };

  const email = payload.email.trim().toLowerCase();
  const amount = Math.max(Number(payload.amount) || 0, 0);
  if (!email || !payload.planId || amount <= 0) return { error: "generic" };

  const admin = createAdminClient();
  const [{ data: profile }, { data: plan }] = await Promise.all([
    admin.from("profiles").select("id").eq("email", email).maybeSingle(),
    admin.from("plans").select("id, name, price_monthly").eq("id", payload.planId).single(),
  ]);
  if (!profile) return { error: "userNotFound" };
  if (!plan) return { error: "generic" };

  await admin
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", profile.id)
    .eq("status", "active");

  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: sub, error: subError } = await admin
    .from("subscriptions")
    .insert({
      user_id: profile.id,
      plan_id: plan.id,
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd,
      gateway: "manual",
    })
    .select("id")
    .single();
  if (subError) return { error: "generic" };

  const { error: paymentError } = await admin.from("payments").insert({
    user_id: profile.id,
    subscription_id: sub?.id ?? null,
    gateway: "manual",
    gateway_ref: null,
    amount,
    currency: "XOF",
    status: "completed",
    raw_response: { note: payload.note.trim(), recorded_by: ctx.email },
  });
  if (paymentError) return { error: "generic" };

  await logAction(
    ctx,
    "payment.manual",
    profile.id,
    { amount, note: payload.note.trim() },
    `${email} — ${plan.name}`
  );
  revalidatePath("/admin/payments");
  revalidatePath("/admin/users");
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
  await logAction(ctx, "settings.update");
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
  await logAction(ctx, "settings.paydunya", undefined, { mode: config.mode });
  revalidatePath("/admin/settings");
}

// ------------------------------------------------------------ Domaines personnalisés

/**
 * Bascule une demande en "active" — l'admin exécute ceci APRÈS avoir lancé
 * scripts/add-custom-domain.sh sur le VPS (nginx + certbot), pas avant :
 * cette action ne touche jamais à l'infra elle-même (voir DEPLOY.md).
 */
export async function activateCustomDomain(id: string): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };

  const { data, error } = await ctx.supabase
    .from("custom_domains")
    .update({
      status: "active",
      verified_at: new Date().toISOString(),
      activated_by: ctx.userId,
    })
    .eq("id", id)
    .select("domain")
    .single();
  if (error) return { error: "generic" };
  await logAction(ctx, "domain.activate", id, undefined, data.domain);
  revalidatePath("/admin/domains");
}

export async function rejectCustomDomain(
  id: string,
  note: string
): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "forbidden" };

  const { data, error } = await ctx.supabase
    .from("custom_domains")
    .update({ status: "failed", notes: note.trim() || null })
    .eq("id", id)
    .select("domain")
    .single();
  if (error) return { error: "generic" };
  await logAction(ctx, "domain.reject", id, { note: note.trim() }, data.domain);
  revalidatePath("/admin/domains");
}

export type DnsCheckResult =
  | { ok: true; resolvedTo: string }
  | { ok: false; reason: "notFound" | "mismatch" | "forbidden"; resolvedTo?: string };

/**
 * Vérification DNS en lecture seule (aucune commande shell, aucun accès au
 * VPS) : compare les IP vers lesquelles résolvent le domaine du client et
 * notre domaine canonique. Sert uniquement à donner un statut avant de
 * lancer scripts/add-custom-domain.sh à la main — ne modifie rien.
 */
export async function checkDomainDns(domain: string): Promise<DnsCheckResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, reason: "forbidden" };

  const canonicalHost = new URL(appUrl()).hostname;

  const [targetIps, canonicalIps] = await Promise.all([
    dns.resolve4(domain).catch((): string[] => []),
    dns.resolve4(canonicalHost).catch((): string[] => []),
  ]);

  if (targetIps.length === 0) return { ok: false, reason: "notFound" };

  const matches = targetIps.some((ip) => canonicalIps.includes(ip));
  return matches
    ? { ok: true, resolvedTo: targetIps[0] }
    : { ok: false, reason: "mismatch", resolvedTo: targetIps.join(", ") };
}
