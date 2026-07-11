// Passerelle PayDunya (Orange Money, MTN MoMo, Moov, Wave, cartes).
// Docs : https://developers.paydunya.com — API "Checkout Invoice".
// Mode test → API sandbox (paiements fictifs), live → production.
// Clés éditables dans /admin/settings (voir ./config.ts).

import { createHash } from "node:crypto";
import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentGateway,
  VerifiedPayment,
} from "./gateway";
import { getPaydunyaConfig, type PaydunyaConfig } from "./config";

function apiBase(config: PaydunyaConfig) {
  return config.mode === "live"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1";
}

function apiHeaders(config: PaydunyaConfig) {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": config.masterKey,
    "PAYDUNYA-PRIVATE-KEY": config.privateKey,
    "PAYDUNYA-TOKEN": config.token,
  };
}

interface PayDunyaCreateResponse {
  response_code?: string;
  response_text?: string;
  token?: string;
  description?: string;
}

interface PayDunyaConfirmResponse {
  response_code?: string;
  status?: string;
  invoice?: {
    status?: string;
    total_amount?: number | string;
    token?: string;
  };
  custom_data?: Record<string, unknown>;
}

export const paydunya: PaymentGateway = {
  id: "paydunya",

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const config = await getPaydunyaConfig();
    const res = await fetch(`${apiBase(config)}/checkout-invoice/create`, {
      method: "POST",
      headers: apiHeaders(config),
      cache: "no-store",
      body: JSON.stringify({
        invoice: {
          total_amount: req.amount,
          description: `${req.planName} — abonnement mensuel`,
        },
        store: { name: "QRHub" },
        actions: {
          return_url: req.returnUrl,
          cancel_url: req.cancelUrl,
          callback_url: req.callbackUrl,
        },
        custom_data: { user_id: req.userId, plan_id: req.planId },
      }),
    });

    const json = (await res.json()) as PayDunyaCreateResponse;
    if (!res.ok || json.response_code !== "00" || !json.token) {
      throw new Error(
        `PayDunya create failed: ${json.response_code ?? res.status} ${json.description ?? json.response_text ?? ""}`
      );
    }

    return {
      redirectUrl:
        json.response_text?.startsWith("http") === true
          ? json.response_text
          : config.mode === "live"
            ? `https://paydunya.com/checkout/invoice/${json.token}`
            : `https://paydunya.com/sandbox-checkout/invoice/${json.token}`,
      reference: json.token,
    };
  },

  async verifyPayment(reference: string): Promise<VerifiedPayment> {
    const config = await getPaydunyaConfig();
    const res = await fetch(
      `${apiBase(config)}/checkout-invoice/confirm/${encodeURIComponent(reference)}`,
      { headers: apiHeaders(config), cache: "no-store" }
    );
    const json = (await res.json()) as PayDunyaConfirmResponse;

    const rawStatus = json.status ?? json.invoice?.status ?? "";
    const status: VerifiedPayment["status"] =
      rawStatus === "completed"
        ? "completed"
        : rawStatus === "cancelled"
          ? "cancelled"
          : rawStatus === "pending"
            ? "pending"
            : "failed";

    const custom = json.custom_data ?? {};
    return {
      status,
      amount: Number(json.invoice?.total_amount ?? 0),
      userId: typeof custom.user_id === "string" ? custom.user_id : null,
      planId: typeof custom.plan_id === "string" ? custom.plan_id : null,
      raw: json as Record<string, unknown>,
    };
  },
};

/**
 * Vérifie le hash d'une notification IPN : PayDunya envoie
 * hash = SHA-512(master key). Rejette toute notification forgée.
 */
export async function verifyIpnHash(hash: string | null | undefined): Promise<boolean> {
  const config = await getPaydunyaConfig();
  if (!hash || !config.masterKey) return false;
  return (
    createHash("sha512").update(config.masterKey).digest("hex").toLowerCase() ===
    hash.toLowerCase()
  );
}
