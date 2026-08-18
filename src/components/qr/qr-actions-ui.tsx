"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PlanLimits, QrDesign } from "@/lib/types";
import { downloadQr, type DownloadFormat } from "@/lib/qr/download";
import {
  deleteQrCode,
  duplicateQrCode,
  toggleQrActive,
} from "@/app/(app)/qr/actions";

export function CopyButton({ text }: { text: string }) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="btn-secondary btn-sm shrink-0"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? t("actions.copied") : t("actions.copy")}
    </button>
  );
}

export function DownloadButtons({
  value,
  design,
  title,
  allowedFormats,
}: {
  value: string;
  design: QrDesign;
  title: string;
  allowedFormats: PlanLimits["formats"];
}) {
  const t = useTranslations("qr");
  const [busy, setBusy] = useState<DownloadFormat | null>(null);
  const formats: DownloadFormat[] = ["png", "svg", "pdf"];

  return (
    <div className="flex flex-wrap gap-2">
      {formats.map((format) => {
        const allowed = allowedFormats.includes(format);
        if (!allowed) {
          return (
            <Link
              key={format}
              href="/billing"
              title={t("download.locked")}
              className="btn-secondary btn-sm opacity-60"
            >
              🔒 {t(`download.${format}`)}
            </Link>
          );
        }
        return (
          <button
            key={format}
            type="button"
            disabled={busy !== null}
            className="btn-secondary btn-sm"
            onClick={async () => {
              setBusy(format);
              try {
                await downloadQr(value, design, format, title);
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === format ? "…" : `⬇ ${t(`download.${format}`)}`}
          </button>
        );
      })}
    </div>
  );
}

export function ActiveToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const t = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleQrActive(id, !isActive);
          setFailed(Boolean(result?.error));
        })
      }
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
        failed ? "bg-red-400" : isActive ? "bg-emerald-500" : "bg-slate-300"
      }`}
      title={
        failed
          ? t("errors.generic")
          : isActive
            ? t("actions.deactivate")
            : t("actions.activate")
      }
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          isActive ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function DuplicateButton({
  id,
  className = "btn-secondary btn-sm",
}: {
  id: string;
  className?: string;
}) {
  const t = useTranslations("qr");
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className={className}
      onClick={() =>
        startTransition(async () => {
          await duplicateQrCode(id);
        })
      }
    >
      {isPending ? "…" : t("list.actions.duplicate")}
    </button>
  );
}

export function DeleteQrButton({
  id,
  name,
  redirectTo,
  className = "btn-secondary btn-sm text-red-600 hover:bg-red-50",
}: {
  id: string;
  name: string;
  redirectTo?: string;
  className?: string;
}) {
  const t = useTranslations("common");
  const tq = useTranslations("qr");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {tq("list.actions.delete")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
          />
          <div className="card relative w-full max-w-sm p-6 animate-fade-up">
            <h3 className="text-base font-semibold text-slate-900">
              {t("confirmDelete.title")}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {t("confirmDelete.message", { name })}
            </p>
            {error && (
              <p className="mt-3 text-sm font-medium text-red-600">
                {t("errors.generic")}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setOpen(false)}
              >
                {t("actions.cancel")}
              </button>
              <button
                type="button"
                disabled={isPending}
                className="btn-danger btn-sm"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteQrCode(id);
                    if (result?.error) {
                      // La boîte reste ouverte : l'utilisateur doit voir que
                      // la suppression n'a PAS eu lieu, au lieu de la croire
                      // faite en voyant la fenêtre se fermer.
                      setError(true);
                      return;
                    }
                    setOpen(false);
                    if (redirectTo) router.push(redirectTo);
                  })
                }
              >
                {isPending ? "…" : t("confirmDelete.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
