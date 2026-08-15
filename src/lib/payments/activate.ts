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
  const { error: cancelError } = await admin
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", payment.userId)
    .eq("status", "active");
  if (cancelError) {
    // L'ancien abonnement n'a pas pu être clos : l'index unique
    // subscriptions_one_active_idx ferait de toute façon échouer l'insertion
    // qui suit. On s'arrête avant d'avoir touché quoi que ce soit.
    throw new Error(`activation failed (cancel): ${cancelError.message}`);
  }

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const { data: sub, error: subError } = await admin
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

  // Le cas à ne surtout pas laisser passer silencieusement : sans cette
  // vérification, l'ancien abonnement venait d'être annulé, le nouveau
  // n'existait pas, et le paiement était quand même enregistré « completed »
  // — client débité, aucun service actif, et la fonction renvoyait
  // « activated ». On remet l'abonnement précédent en place et on remonte
  // l'erreur : l'IPN sera rejoué par PayDunya, et /billing affichera l'état
  // d'échec au lieu d'un faux succès.
  if (subError || !sub) {
    await admin
      .from("subscriptions")
      .update({ status: "active" })
      .eq("user_id", payment.userId)
      .eq("status", "cancelled")
      .gte("current_period_end", new Date().toISOString());
    throw new Error(`activation failed (insert): ${subError?.message ?? "no row"}`);
  }

  const { error: paymentError } = await admin.from("payments").insert({
    user_id: payment.userId,
    subscription_id: sub.id,
    gateway: paydunya.id,
    gateway_ref: token,
    amount: payment.amount,
    currency: "XOF",
    status: "completed",
    raw_response: payment.raw,
  });
  // L'abonnement est actif : le client a bien ce qu'il a payé. Mais sans
  // ligne de paiement, l'idempotence (gateway, gateway_ref) ne joue plus et
  // un rejeu d'IPN relancerait une activation. On journalise pour Sentry
  // sans faire échouer l'activation elle-même.
  if (paymentError) {
    console.error(
      `Abonnement ${sub.id} activé mais paiement ${token} non enregistré:`,
      paymentError.message
    );
  }

  return "activated";
}
