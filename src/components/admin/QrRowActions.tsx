"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { adminDeleteQr, adminToggleQr } from "@/app/(admin)/admin/actions";

export function QrRowActions({
  id,
  title,
  isActive,
}: {
  id: string;
  title: string;
  isActive: boolean;
}) {
  const tc = useTranslations("common");
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        disabled={isPending}
        className="btn-ghost btn-sm"
        onClick={() =>
          startTransition(async () => {
            await adminToggleQr(id, !isActive);
          })
        }
      >
        {isActive ? tc("actions.deactivate") : tc("actions.activate")}
      </button>
      <button
        type="button"
        disabled={isPending}
        className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
        onClick={() => setConfirming(true)}
      >
        {tc("actions.delete")}
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
            <p className="mt-2 text-sm text-slate-500">
              {tc("confirmDelete.message", { name: title })}
            </p>
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
                    await adminDeleteQr(id);
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
