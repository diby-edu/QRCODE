"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  deleteUser,
  setUserPlan,
  setUserSuspended,
} from "@/app/(admin)/admin/actions";

export function UserRowActions({
  userId,
  isSuspended,
  isSelf,
  planId,
  plans,
}: {
  userId: string;
  isSuspended: boolean;
  isSelf: boolean;
  planId: string | null;
  plans: { id: string; name: string }[];
}) {
  const t = useTranslations("admin.users.actions");
  const tc = useTranslations("common");
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

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
          startTransition(async () => {
            await setUserPlan(userId, next);
          });
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
        className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
        onClick={() => setConfirming(true)}
      >
        {t("delete")}
      </button>

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
