"use client";

import { useState, useTransition } from "react";
import { BILLING_PERIODS } from "@/lib/billing-period";
import type { BillingPeriod } from "@/lib/types";
import { useTranslations } from "next-intl";
import {
  deleteUser,
  setUserPlan,
  setUserRole,
  setUserSuspended,
} from "@/app/(admin)/admin/actions";

export function UserRowActions({
  userId,
  isSuspended,
  isSelf,
  role,
  planId,
  plans,
}: {
  userId: string;
  isSuspended: boolean;
  isSelf: boolean;
  role: string;
  planId: string | null;
  plans: { id: string; name: string }[];
}) {
  const t = useTranslations("admin.users.actions");
  const tc = useTranslations("common");
  const [confirming, setConfirming] = useState(false);
  const [confirmingRole, setConfirmingRole] = useState(false);
  // Le changement de plan était la SEULE action de cette ligne sans
  // confirmation, alors que c'est celle qui a des conséquences de
  // facturation : un clic de travers annulait l'abonnement en cours et en
  // créait un autre, immédiatement et sans retour possible.
  const [pendingPlan, setPendingPlan] = useState<{ id: string; name: string } | null>(null);
  const [pendingPeriod, setPendingPeriod] = useState<BillingPeriod>("monthly");
  const [isPending, startTransition] = useTransition();
  const isAdmin = role === "admin";

  if (isSelf) return null;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <select
        defaultValue={planId ?? ""}
        disabled={isPending}
        title={t("changePlan")}
        className="input w-auto py-1.5 text-xs"
        onChange={(e) => {
          const next = e.target.value;
          if (!next || next === planId) return;
          const plan = plans.find((p) => p.id === next);
          if (plan) setPendingPlan({ id: plan.id, name: plan.name });
          setPendingPeriod("monthly");
          // La liste revient à sa valeur d'origine : elle ne reflétera le
          // nouveau plan qu'une fois le changement réellement confirmé.
          e.target.value = planId ?? "";
        }}
      >
        <option value="" disabled>
          {t("changePlan")}
        </option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={isPending}
        className="btn-ghost btn-sm"
        onClick={() =>
          startTransition(async () => {
            await setUserSuspended(userId, !isSuspended);
          })
        }
      >
        {isSuspended ? t("unsuspend") : t("suspend")}
      </button>

      <button
        type="button"
        disabled={isPending}
        className="btn-ghost btn-sm"
        onClick={() => setConfirmingRole(true)}
      >
        {isAdmin ? t("demote") : t("promote")}
      </button>

      <button
        type="button"
        disabled={isPending}
        className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
        onClick={() => setConfirming(true)}
      >
        {t("delete")}
      </button>

      {pendingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setPendingPlan(null)}
          />
          <div className="card relative w-full max-w-sm p-6 animate-fade-up">
            <h3 className="text-base font-semibold text-slate-900">
              {t("confirmPlanTitle")}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {t("confirmPlanMessage", { plan: pendingPlan.name })}
            </p>
            <label className="mt-4 block">
              <span className="label">{t("planPeriod")}</span>
              <select
                value={pendingPeriod}
                onChange={(e) => setPendingPeriod(e.target.value as BillingPeriod)}
                className="input"
              >
                {BILLING_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {t(`planPeriods.${p}`)}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setPendingPlan(null)}
              >
                {tc("actions.cancel")}
              </button>
              <button
                type="button"
                disabled={isPending}
                className="btn-primary btn-sm"
                onClick={() => {
                  const target = pendingPlan;
                  startTransition(async () => {
                    await setUserPlan(userId, target.id, pendingPeriod);
                    setPendingPlan(null);
                  });
                }}
              >
                {isPending ? "…" : tc("actions.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setConfirmingRole(false)}
          />
          <div className="card relative w-full max-w-sm p-6 animate-fade-up text-left">
            <h3 className="text-base font-semibold text-slate-900">
              {isAdmin ? t("confirmDemoteTitle") : t("confirmPromoteTitle")}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {isAdmin ? t("confirmDemoteMessage") : t("confirmPromoteMessage")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setConfirmingRole(false)}
              >
                {tc("actions.cancel")}
              </button>
              <button
                type="button"
                disabled={isPending}
                className="btn-primary btn-sm"
                onClick={() =>
                  startTransition(async () => {
                    await setUserRole(userId, isAdmin ? "user" : "admin");
                    setConfirmingRole(false);
                  })
                }
              >
                {isPending ? "…" : tc("actions.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setConfirming(false)}
          />
          <div className="card relative w-full max-w-sm p-6 animate-fade-up text-left">
            <h3 className="text-base font-semibold text-slate-900">
              {tc("confirmDelete.title")}
            </h3>
            <p className="mt-2 text-sm text-slate-500">{t("confirmDelete")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setConfirming(false)}
              >
                {tc("actions.cancel")}
              </button>
              <button
                type="button"
                disabled={isPending}
                className="btn-danger btn-sm"
                onClick={() =>
                  startTransition(async () => {
                    await deleteUser(userId);
                    setConfirming(false);
                  })
                }
              >
                {isPending ? "…" : tc("confirmDelete.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
