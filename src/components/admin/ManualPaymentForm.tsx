"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { recordManualPayment } from "@/app/(admin)/admin/actions";

export function ManualPaymentForm({
  plans,
}: {
  plans: { id: string; name: string; price_monthly: number }[];
}) {
  const t = useTranslations("admin.payments");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [amount, setAmount] = useState(String(plans[0]?.price_monthly ?? ""));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        + {t("manualPayment.cta")}
      </button>
    );
  }

  return (
    <form
      className="card space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await recordManualPayment({
            email,
            planId,
            amount: Number(amount),
            note,
          });
          if (result?.error === "userNotFound") setError(t("manualPayment.userNotFound"));
          else if (result?.error) setError(tc("errors.generic"));
          else {
            setSaved(true);
            setEmail("");
            setNote("");
          }
        });
      }}
    >
      <h2 className="text-base font-semibold text-slate-900">
        {t("manualPayment.title")}
      </h2>
      <p className="text-xs text-slate-500">{t("manualPayment.hint")}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">{t("manualPayment.email")}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="client@exemple.com"
          />
        </label>
        <label className="block">
          <span className="label">{t("manualPayment.plan")}</span>
          <select
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value);
              const plan = plans.find((p) => p.id === e.target.value);
              if (plan) setAmount(String(plan.price_monthly));
            }}
            className="input"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{t("manualPayment.amount")}</span>
          <input
            type="number"
            min={0}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">{t("manualPayment.note")}</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            placeholder={t("manualPayment.notePlaceholder")}
          />
        </label>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        {saved && (
          <span className="text-sm font-medium text-emerald-600">
            ✓ {t("manualPayment.saved")}
          </span>
        )}
        {error && <span className="text-sm font-medium text-red-600">{error}</span>}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setOpen(false)}
        >
          {tc("actions.cancel")}
        </button>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? tc("actions.saving") : tc("actions.save")}
        </button>
      </div>
    </form>
  );
}
