"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { startCheckout } from "@/app/(app)/billing/actions";
import type { BillingPeriod } from "@/lib/types";

export function CheckoutButton({
  planId,
  highlighted = false,
  period = "monthly",
}: {
  planId: string;
  highlighted?: boolean;
  period?: BillingPeriod;
}) {
  const t = useTranslations("billing");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={isPending}
        className={`${highlighted ? "btn-primary" : "btn-secondary"} w-full`}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startCheckout(planId, period);
            if ("error" in result) setError(t("errors.checkoutFailed"));
            else window.open(result.url, "_blank", "noopener,noreferrer");
          });
        }}
      >
        {isPending ? t("plans.redirecting") : t("plans.choose")}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
