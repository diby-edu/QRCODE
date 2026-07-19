"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  requestCustomDomain,
  updateCustomDomain,
  deleteCustomDomain,
} from "@/app/(app)/settings/actions";
import { CustomDomainExplainer } from "./CustomDomainExplainer";
import type { CustomDomain } from "@/lib/types";

type DomainRow = Pick<CustomDomain, "id" | "domain" | "status">;

function StatusBadge({ status }: { status: CustomDomain["status"] }) {
  const t = useTranslations("settings.customDomain");
  const badgeClass =
    status === "active" ? "badge-green" : status === "failed" ? "badge-red" : "badge-amber";
  return <span className={badgeClass}>{t(`status.${status}`)}</span>;
}

function DomainRowItem({ domain }: { domain: DomainRow }) {
  const t = useTranslations("settings.customDomain");
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(domain.domain);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="space-y-2 p-4">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input"
          autoFocus
        />
        <p className="text-xs text-slate-400">{t("editHint")}</p>
        {error && <p className="text-xs text-red-600">{t(`errors.${error}`)}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            className="btn-primary btn-sm"
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await updateCustomDomain(domain.id, value);
                if (result?.error) setError(result.error);
                else setEditing(false);
              })
            }
          >
            {t("save")}
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              setEditing(false);
              setValue(domain.domain);
              setError(null);
            }}
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50/60">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm">
          🌐
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-mono text-sm font-semibold text-slate-800">
              {domain.domain}
            </span>
            <StatusBadge status={domain.status} />
          </div>
          {domain.status === "pending" && (
            <p className="mt-1 text-xs text-slate-400">{t("pendingHint")}</p>
          )}
          {domain.status === "failed" && (
            <p className="mt-1 text-xs text-slate-400">{t("failedHint")}</p>
          )}
          {domain.status === "active" && (
            <p className="mt-1 text-xs text-slate-400">{t("assignHint")}</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(true)}>
          {t("edit")}
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
          onClick={() => setConfirmingDelete(true)}
        >
          {t("delete")}
        </button>
      </div>

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setConfirmingDelete(false)}
          />
          <div className="card relative w-full max-w-sm p-6 animate-fade-up text-left">
            <h3 className="text-base font-semibold text-slate-900">
              {t("confirmDeleteTitle")}
            </h3>
            <p className="mt-2 text-sm text-slate-500">{t("confirmDeleteMessage")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setConfirmingDelete(false)}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={isPending}
                className="btn-danger btn-sm"
                onClick={() =>
                  startTransition(async () => {
                    await deleteCustomDomain(domain.id);
                    setConfirmingDelete(false);
                  })
                }
              >
                {isPending ? "…" : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddDomainForm({ onAdded }: { onAdded: () => void }) {
  const t = useTranslations("settings.customDomain");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await requestCustomDomain(value);
          if (result?.error) setError(result.error);
          else {
            setValue("");
            onAdded();
          }
        });
      }}
    >
      <label className="block">
        <span className="label">{t("domainLabel")}</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="go.monsite.com"
          className="input"
          required
        />
      </label>
      {error && <p className="text-xs text-red-600">{t(`errors.${error}`)}</p>}
      <button type="submit" disabled={isPending} className="btn-primary btn-sm">
        {isPending ? "…" : t("save")}
      </button>
    </form>
  );
}

export function CustomDomainList({
  enabled,
  domains,
}: {
  enabled: boolean;
  domains: DomainRow[];
}) {
  const t = useTranslations("settings.customDomain");
  const [adding, setAdding] = useState(domains.length === 0);

  if (!enabled) {
    return (
      <div className="space-y-4">
        <div className="card space-y-3 p-6">
          <h2 className="text-base font-semibold text-slate-900">{t("title")}</h2>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {t("locked")}{" "}
            <Link href="/billing" className="font-semibold underline">
              {t("upgradeLink")}
            </Link>
          </p>
        </div>
        <CustomDomainExplainer />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">{t("yourDomains")}</h2>
          {domains.length > 0 && !adding && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => setAdding(true)}
            >
              + {t("addDomain")}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">{t("hint")}</p>

        {domains.length === 0 && !adding && (
          <p className="mt-4 text-sm text-slate-400">{t("noDomains")}</p>
        )}

        {domains.length > 0 && (
          <div className="mt-4 divide-y divide-slate-100 rounded-lg ring-1 ring-slate-100">
            {domains.map((d) => (
              <DomainRowItem key={d.id} domain={d} />
            ))}
          </div>
        )}

        {adding && (
          <div className="mt-4 rounded-lg ring-1 ring-slate-100">
            <AddDomainForm onAdded={() => setAdding(false)} />
          </div>
        )}
      </div>

      <CustomDomainExplainer />
    </div>
  );
}
