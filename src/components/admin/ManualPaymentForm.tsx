"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { recordManualPayment } from "@/app/(admin)/admin/actions";
import { availablePeriods, planPrice } from "@/lib/billing-period";
import { formatMoney } from "@/lib/utils";
import type { BillingPeriod } from "@/lib/types";

interface PlanOption {
  id: string;
  name: string;
  price_monthly: number;
  price_quarterly: number | null;
  price_yearly: number | null;
}

/**
 * Sélecteur de compte : la saisie libre de l'email faisait échouer
 * l'enregistrement à la moindre faute de frappe (« utilisateur introuvable »).
 * On filtre la liste réelle des comptes, ce qui supprime cette classe
 * d'erreur — et reste utilisable avec beaucoup d'utilisateurs, contrairement
 * à une liste déroulante qu'il faudrait faire défiler.
 */
function UserPicker({
  users,
  value,
  onChange,
  label,
  placeholder,
}: {
  users: { email: string; full_name: string | null }[];
  value: string;
  onChange: (email: string) => void;
  label: string;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users.slice(0, 8);
    return users
      .filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [users, query]);

  return (
    <div className="relative block">
      <span className="label">{label}</span>
      <input
        type="text"
        required
        value={open ? query : value}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onChange("");
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        // Laisse le clic sur une suggestion se produire avant la fermeture.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="input"
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {matches.map((u) => (
            <li key={u.email}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50"
                onMouseDown={() => {
                  onChange(u.email);
                  setQuery(u.email);
                  setOpen(false);
                }}
              >
                <span className="text-sm font-medium text-slate-800">
                  {u.full_name || u.email}
                </span>
                {u.full_name && (
                  <span className="text-xs text-slate-500">{u.email}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ManualPaymentForm({
  plans,
  users,
}: {
  plans: PlanOption[];
  users: { email: string; full_name: string | null }[];
}) {
  const t = useTranslations("admin.payments");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [amount, setAmount] = useState(String(plans[0]?.price_monthly ?? ""));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const plan = plans.find((p) => p.id === planId);
  const periods = plan ? availablePeriods(plan) : (["monthly"] as BillingPeriod[]);
  const catalogPrice = plan ? planPrice(plan, period) : null;

  /** Le montant suit le plan et la durée, mais reste modifiable : un règlement
   *  hors-ligne ne correspond pas toujours au tarif (remise négociée, acompte,
   *  arrondi en espèces). L'enregistrement comptable doit refléter ce qui a
   *  réellement été reçu. */
  function syncAmount(nextPlanId: string, nextPeriod: BillingPeriod) {
    const p = plans.find((x) => x.id === nextPlanId);
    const price = p ? planPrice(p, nextPeriod) : null;
    if (price !== null) setAmount(String(price));
  }

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
        if (!email) {
          setError(t("manualPayment.userNotFound"));
          return;
        }
        startTransition(async () => {
          const result = await recordManualPayment({
            email,
            planId,
            amount: Number(amount),
            note,
            billingPeriod: period,
          });
          if (result?.error === "userNotFound") setError(t("manualPayment.userNotFound"));
          else if (result?.error === "periodUnavailable")
            setError(t("manualPayment.periodUnavailable"));
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
        <UserPicker
          users={users}
          value={email}
          onChange={setEmail}
          label={t("manualPayment.email")}
          placeholder={t("manualPayment.emailPlaceholder")}
        />
        <label className="block">
          <span className="label">{t("manualPayment.plan")}</span>
          <select
            value={planId}
            onChange={(e) => {
              const next = e.target.value;
              setPlanId(next);
              const p = plans.find((x) => x.id === next);
              const allowed = p ? availablePeriods(p) : [];
              // La durée courante peut ne pas exister sur le nouveau plan.
              const nextPeriod = allowed.includes(period) ? period : "monthly";
              setPeriod(nextPeriod);
              syncAmount(next, nextPeriod);
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
          <span className="label">{t("manualPayment.period")}</span>
          <select
            value={period}
            onChange={(e) => {
              const next = e.target.value as BillingPeriod;
              setPeriod(next);
              syncAmount(planId, next);
            }}
            className="input"
          >
            {periods.map((p) => (
              <option key={p} value={p}>
                {t(`manualPayment.periods.${p}`)}
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
          {catalogPrice !== null && (
            <span className="mt-1 block text-xs text-slate-500">
              {t("manualPayment.amountHint", {
                price: formatMoney(catalogPrice, "XOF", "fr"),
              })}
            </span>
          )}
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
