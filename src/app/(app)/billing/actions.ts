"use server";

import { createClient } from "@/lib/supabase/server";
import { paydunya } from "@/lib/payments/paydunya";
import { appUrl } from "@/lib/url";
import { isBillingPeriod, planPrice } from "@/lib/billing-period";
import type { BillingPeriod, Plan } from "@/lib/types";

export type CheckoutResult = { error: string } | { url: string };

/** Crée une facture PayDunya pour le plan choisi et redirige vers le paiement. */
export async function startCheckout(
  planId: string,
  billingPeriod: BillingPeriod = "monthly"
): Promise<CheckoutResult> {
  if (!isBillingPeriod(billingPeriod)) return { error: "generic" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "generic" };

  const [{ data: planRaw }, { data: profile }] = await Promise.all([
    supabase.from("plans").select("*").eq("id", planId).eq("is_active", true).single(),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);
  const plan = planRaw as Plan | null;
  if (!plan || Number(plan.price_monthly) <= 0) return { error: "generic" };

  // Prix de la durée demandée : null = ce plan ne propose pas cette durée,
  // il faut refuser plutôt que retomber sur le tarif mensuel.
  const amount = planPrice(plan, billingPeriod);
  if (amount === null || amount <= 0) return { error: "generic" };

  try {
    const session = await paydunya.createCheckout({
      userId: user.id,
      planId: plan.id,
      planName: plan.name,
      amount,
      currency: plan.currency,
      billingPeriod,
      customerName: profile?.full_name ?? undefined,
      customerEmail: user.email ?? undefined,
      // PayDunya ajoute lui-même ?token=… à l'URL de retour
      returnUrl: `${appUrl()}/billing`,
      cancelUrl: `${appUrl()}/billing?status=cancelled`,
      callbackUrl: `${appUrl()}/api/paydunya/ipn`,
    });
    return { url: session.redirectUrl };
  } catch (err) {
    console.error("PayDunya checkout error:", err);
    return { error: "checkoutFailed" };
  }
}
