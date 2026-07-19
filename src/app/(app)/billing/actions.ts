"use server";

import { createClient } from "@/lib/supabase/server";
import { paydunya } from "@/lib/payments/paydunya";
import { appUrl } from "@/lib/url";
import type { Plan } from "@/lib/types";

export type CheckoutResult = { error: string } | { url: string };

/** Crée une facture PayDunya pour le plan choisi et redirige vers le paiement. */
export async function startCheckout(planId: string): Promise<CheckoutResult> {
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

  try {
    const session = await paydunya.createCheckout({
      userId: user.id,
      planId: plan.id,
      planName: plan.name,
      amount: Number(plan.price_monthly),
      currency: plan.currency,
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
