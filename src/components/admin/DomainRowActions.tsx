"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  activateCustomDomain,
  checkDomainDns,
  rejectCustomDomain,
  type DnsCheckResult,
} from "@/app/(admin)/admin/actions";

export function DomainRowActions({ id, domain }: { id: string; domain: string }) {
  const t = useTranslations("admin.domains");
  const tc = useTranslations("common");
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [dnsResult, setDnsResult] = useState<DnsCheckResult | null>(null);
  const [checkingDns, setCheckingDns] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          disabled={checkingDns}
          className="btn-ghost btn-sm"
          onClick={() => {
            setCheckingDns(true);
            setDnsResult(null);
            checkDomainDns(domain)
              .then(setDnsResult)
              .finally(() => setCheckingDns(false));
          }}
        >
          {checkingDns ? t("checkingDns") : t("checkDns")}
        </button>
        <button
          type="button"
          disabled={isPending}
          className="btn-secondary btn-sm"
          onClick={() =>
            startTransition(async () => {
              await activateCustomDomain(id);
            })
          }
        >
          {t("activate")}
        </button>
        <button
          type="button"
          disabled={isPending}
          className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
          onClick={() => setRejecting(true)}
        >
          {t("reject")}
        </button>
      </div>

      {dnsResult && (
        <p className={`text-xs ${dnsResult.ok ? "text-emerald-600" : "text-amber-600"}`}>
          {dnsResult.ok
            ? t("dnsOk", { ip: dnsResult.resolvedTo })
            : dnsResult.reason === "notFound"
              ? t("dnsNotFound")
              : t("dnsMismatch", { ip: dnsResult.resolvedTo ?? "" })}
        </p>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setRejecting(false)}
          />
          <div className="card relative w-full max-w-sm p-6 animate-fade-up text-left">
            <h3 className="text-base font-semibold text-slate-900">{t("confirmRejectTitle")}</h3>
            <textarea
              className="input mt-3 resize-y"
              rows={3}
              placeholder={t("rejectNotePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setRejecting(false)}
              >
                {tc("actions.cancel")}
              </button>
              <button
                type="button"
                disabled={isPending}
                className="btn-danger btn-sm"
                onClick={() =>
                  startTransition(async () => {
                    await rejectCustomDomain(id, note);
                    setRejecting(false);
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
