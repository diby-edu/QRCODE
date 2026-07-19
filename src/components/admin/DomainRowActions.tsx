"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  activateCustomDomain,
  checkDomainDns,
  deleteCustomDomainAdmin,
  rejectCustomDomain,
  type DnsCheckResult,
} from "@/app/(admin)/admin/actions";

export function DomainRowActions({
  id,
  domain,
  status,
}: {
  id: string;
  domain: string;
  status: "pending" | "active" | "failed";
}) {
  const t = useTranslations("admin.domains");
  const tc = useTranslations("common");
  const [rejecting, setRejecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [note, setNote] = useState("");
  const [dnsResult, setDnsResult] = useState<DnsCheckResult | null>(null);
  const [checkingDns, setCheckingDns] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(
        `cd /var/www/qrhub && ./scripts/add-custom-domain.sh ${domain}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible : rien à faire
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1.5">
        <button type="button" className="btn-ghost btn-sm" onClick={copyCommand}>
          {copied ? tc("actions.copied") : t("copyCommand")}
        </button>
        {status !== "active" && (
          <>
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
          </>
        )}
        <button
          type="button"
          disabled={isPending}
          className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
          onClick={() => setDeleting(true)}
        >
          {tc("actions.delete")}
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

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDeleting(false)} />
          <div className="card relative w-full max-w-sm p-6 animate-fade-up text-left">
            <h3 className="text-base font-semibold text-slate-900">
              {tc("confirmDelete.title")}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {tc("confirmDelete.message", { name: domain })}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setDeleting(false)}
              >
                {tc("actions.cancel")}
              </button>
              <button
                type="button"
                disabled={isPending}
                className="btn-danger btn-sm"
                onClick={() =>
                  startTransition(async () => {
                    await deleteCustomDomainAdmin(id);
                    setDeleting(false);
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
