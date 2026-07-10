// Activation d'un abonnement après paiement vérifié. Appelée par l'IPN
// et par la page de retour (/billing?token=…) — idempotente : un même
// token PayDunya ne crée jamais deux abonnements.

import { createAdminClient } from "@/lib/supabase/admin";
import { paydunya } from "./paydunya";

export type ActivationResult = "activated" | "already" | "invalid";

export async function verifyAndActivate(token: string): Promise<ActivationResult> {
  const admin = createAdminClient();

  // Idempotence : paiement déjà enregistré pour ce token ?
  const { data: existing } = await admin
    .from("payments")
    .select("id, status")
    .eq("gateway", paydunya.id)
    .eq("gateway_ref", token)
    .maybeSingle();
  if (existing?.status === "completed") return "already";

  const payment = await paydunya.verifyPayment(token);
  if (payment.status !== "completed" || !payment.userId || !payment.planId) {
    return "invalid";
  }

  // Le plan doit exister et le montant payé correspondre à son prix
  const { data: plan } = await admin
    .from("plans")
    .select("id, price_monthly")
    .eq("id", payment.planId)
    .single();
  if (!plan || payment.amount < Number(plan.price_monthly)) return "invalid";

  // Remplace l'abonnement actif éventuel
  await admin
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", payment.userId)
    .eq("status", "active");

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const { data: sub } = await admin
    .from("subscriptions")
    .insert({
      user_id: payment.userId,
      plan_id: payment.planId,
      status: "active",
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      gateway: paydunya.id,
    })
    .select("id")
    .single();

  await admin.from("payments").insert({
    user_id: payment.userId,
    subscription_id: sub?.id ?? null,
    gateway: paydunya.id,
    gateway_ref: token,
    amount: payment.amount,
    currency: "XOF",
    status: "completed",
    raw_response: payment.raw,
  });

  return "activated";
}
