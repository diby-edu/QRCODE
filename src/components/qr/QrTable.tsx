"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getQrType } from "@/lib/qr-types/registry";
import { qrShortUrl } from "@/lib/url";
import { formatDate, formatNumber } from "@/lib/utils";
import type { QrCode } from "@/lib/types";
import {
  ActiveToggle,
  DeleteQrButton,
  DuplicateButton,
} from "@/components/qr/qr-actions-ui";
import { SortHeader } from "@/components/ui/SortHeader";
import { bulkDeleteQr, bulkMoveToFolder } from "@/app/(app)/qr/actions";

type Row = Pick<
  QrCode,
  | "id" | "type" | "title" | "slug" | "is_dynamic" | "is_active"
  | "expires_at" | "scan_count" | "folder_id" | "created_at" | "custom_domain_id"
>;

export function QrTable({
  qrCodes,
  folders,
  foldersEnabled,
  locale,
  domainById,
}: {
  qrCodes: Row[];
  folders: { id: string; name: string }[];
  foldersEnabled: boolean;
  locale: "fr" | "en";
  domainById: Record<string, string>;
}) {
  const t = useTranslations("qr");
  const tc = useTranslations("common");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const allSelected = qrCodes.length > 0 && selected.size === qrCodes.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(qrCodes.map((qr) => qr.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const statusBadge = (qr: Row) => {
    const isExpired = qr.expires_at != null && new Date(qr.expires_at) < new Date();
    if (isExpired) return <span className="badge-amber">{tc("status.expired")}</span>;
    if (!qr.is_active) return <span className="badge-red">{tc("status.inactive")}</span>;
    return <span className="badge-green">{tc("status.active")}</span>;
  };

  return (
    <>
      {/* Table desktop */}
      <div className="card hidden overflow-hidden lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  aria-label={t("list.selectAll")}
                />
              </th>
              <SortHeader field="title" className="px-2">
                {t("list.columns.name")}
              </SortHeader>
              <SortHeader field="type">{t("list.columns.type")}</SortHeader>
              <SortHeader field="scan_count">{t("list.columns.scans")}</SortHeader>
              <th className="px-4 py-3 font-medium">{t("list.columns.status")}</th>
              <SortHeader field="created_at">{t("list.columns.created")}</SortHeader>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {qrCodes.map((qr) => {
              const qtype = getQrType(qr.type);
              const isSelected = selected.has(qr.id);
              return (
                <tr
                  key={qr.id}
                  className={`group hover:bg-slate-50/60 ${isSelected ? "bg-indigo-50/40" : ""}`}
                >
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(qr.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      aria-label={qr.title}
                    />
                  </td>
                  <td className="px-2 py-3.5">
                    <Link href={`/qr/${qr.id}`} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-base">
                        {qtype?.icon ?? "🔳"}
                      </span>
                      <span className="min-w-0">
                        <span className="block max-w-56 truncate font-semibold text-slate-800 group-hover:text-indigo-700">
                          {qr.title}
                        </span>
                        {qr.is_dynamic && (
                          <span className="block max-w-56 truncate text-xs text-slate-400">
                            {qrShortUrl(
                              qr.slug,
                              qr.custom_domain_id ? domainById[qr.custom_domain_id] : null
                            )}
                          </span>
                        )}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {qtype?.name[locale] ?? qr.type}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-slate-600">
                    {qr.is_dynamic ? formatNumber(qr.scan_count, locale) : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      {statusBadge(qr)}
                      {qr.is_dynamic && <ActiveToggle id={qr.id} isActive={qr.is_active} />}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">
                    {formatDate(qr.created_at, locale)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      {qr.is_dynamic && (
                        <Link
                          href={`/qr/${qr.id}/stats`}
                          className="btn-ghost btn-sm"
                          title={t("list.actions.stats")}
                        >
                          📊
                        </Link>
                      )}
                      <Link href={`/qr/${qr.id}/edit`} className="btn-ghost btn-sm">
                        {t("list.actions.edit")}
                      </Link>
                      <DuplicateButton id={qr.id} className="btn-ghost btn-sm" />
                      <DeleteQrButton
                        id={qr.id}
                        name={qr.title}
                        className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cartes mobile (sans sélection groupée) */}
      <ul className="space-y-3 lg:hidden">
        {qrCodes.map((qr) => {
          const qtype = getQrType(qr.type);
          return (
            <li key={qr.id} className="card p-4">
              <Link href={`/qr/${qr.id}`} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg">
                  {qtype?.icon ?? "🔳"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{qr.title}</p>
                  <p className="text-xs text-slate-400">
                    {qtype?.name[locale] ?? qr.type} · {formatDate(qr.created_at, locale)}
                  </p>
                </div>
                {statusBadge(qr)}
              </Link>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">
                  {qr.is_dynamic ? tc("scans", { count: qr.scan_count }) : tc("status.static")}
                </span>
                <div className="flex gap-1.5">
                  {qr.is_dynamic && (
                    <Link href={`/qr/${qr.id}/stats`} className="btn-ghost btn-sm">
                      📊
                    </Link>
                  )}
                  <Link href={`/qr/${qr.id}/edit`} className="btn-ghost btn-sm">
                    {t("list.actions.edit")}
                  </Link>
                  <DeleteQrButton
                    id={qr.id}
                    name={qr.title}
                    className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Barre d'actions groupées */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <span className="text-sm font-medium text-slate-700">
              {t("list.selectedCount", { count: selected.size })}
            </span>
            {foldersEnabled && folders.length > 0 && (
              <select
                defaultValue=""
                disabled={isPending}
                className="input w-auto py-1.5 text-xs"
                onChange={(e) => {
                  const folderId = e.target.value || null;
                  const ids = Array.from(selected);
                  startTransition(async () => {
                    await bulkMoveToFolder(ids, folderId);
                    clearSelection();
                  });
                }}
              >
                <option value="" disabled>
                  {t("list.moveToFolder")}
                </option>
                <option value="">{t("builder.noFolder")}</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              disabled={isPending}
              className="btn-danger btn-sm"
              onClick={() => setConfirming(true)}
            >
              {t("list.actions.delete")}
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={clearSelection}
            >
              {tc("actions.cancel")}
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setConfirming(false)} />
          <div className="card relative w-full max-w-sm p-6 animate-fade-up">
            <h3 className="text-base font-semibold text-slate-900">
              {tc("confirmDelete.title")}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {t("list.confirmBulkDelete", { count: selected.size })}
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
                onClick={() => {
                  const ids = Array.from(selected);
                  startTransition(async () => {
                    await bulkDeleteQr(ids);
                    clearSelection();
                    setConfirming(false);
                  });
                }}
              >
                {isPending ? "…" : tc("confirmDelete.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
