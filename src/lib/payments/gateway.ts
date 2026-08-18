import type { BillingPeriod } from "@/lib/types";

// Abstraction des passerelles de paiement. PayDunya est la première
// implémentation ; en ajouter une autre = un fichier de plus qui
// implémente PaymentGateway (Stripe, CinetPay…).

export interface CheckoutRequest {
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  /** Durée achetée — voyage dans custom_data et revient à la vérification,
   *  seul moyen de savoir quelle échéance activer au retour du paiement. */
  billingPeriod: BillingPeriod;
  /** Pré-remplit le nom et l'email sur la page de paiement hébergée */
  customerName?: string;
  customerEmail?: string;
  /** URL de retour utilisateur (succès/annulation) et webhook */
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
}

export interface CheckoutSession {
  /** URL de la page de paiement vers laquelle rediriger l'utilisateur */
  redirectUrl: string;
  /** Référence de la facture chez la passerelle */
  reference: string;
}

export interface VerifiedPayment {
  status: "completed" | "pending" | "cancelled" | "failed";
  amount: number;
  userId: string | null;
  planId: string | null;
  billingPeriod: BillingPeriod | null;
  raw: Record<string, unknown>;
}

export interface PaymentGateway {
  id: string;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  verifyPayment(reference: string): Promise<VerifiedPayment>;
}
