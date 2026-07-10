"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { paydunya } from "@/lib/payments/paydunya";
import { appUrl } from "@/lib/url";
import type { Plan } from "@/lib/types";

export type CheckoutResult = { error: string } | undefined;

/** Crée une facture PayDunya pour le plan choisi et redirige vers le paiement. */
export async function startCheckout(planId: string): Promise<CheckoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "generic" };

  const { data: planRaw } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .eq("is_active", true)
    .single();
  const plan = planRaw as Plan | null;
  if (!plan || Number(plan.price_monthly) <= 0) return { error: "generic" };

  let redirectUrl: string;
  try {
    const session = await paydunya.createCheckout({
      userId: user.id,
      planId: plan.id,
      planName: plan.name,
      amount: Number(plan.price_monthly),
      currency: plan.currency,
      // PayDunya ajoute lui-même ?token=… à l'URL de retour
      returnUrl: `${appUrl()}/billing`,
      cancelUrl: `${appUrl()}/billing?status=cancelled`,
      callbackUrl: `${appUrl()}/api/paydunya/ipn`,
    });
    redirectUrl = session.redirectUrl;
  } catch (err) {
    console.error("PayDunya checkout error:", err);
    return { error: "checkoutFailed" };
  }

  redirect(redirectUrl);
}
