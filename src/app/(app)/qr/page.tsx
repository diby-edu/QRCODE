import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { QR_TYPES, getQrType } from "@/lib/qr-types/registry";
import { qrShortUrl } from "@/lib/url";
import { formatDate, formatNumber } from "@/lib/utils";
import type { Folder, QrCode } from "@/lib/types";
import { QrFilters } from "@/components/qr/QrFilters";
import {
  ActiveToggle,
  DeleteQrButton,
  DuplicateButton,
} from "@/components/qr/qr-actions-ui";
import { readSort, SortHeader } from "@/components/ui/SortHeader";

interface QrListSearchParams {
  q?: string;
  type?: string;
  status?: string;
  folder?: string;
  sort?: string;
  dir?: string;
}

const SORT_COLUMNS = ["title", "type", "scan_count", "created_at"] as const;

export default async function QrListPage({
  searchParams,
}: {
  searchParams: Promise<QrListSearchParams>;
}) {
  const params = await searchParams;
  const { q = "", type = "", status = "", folder = "" } = params;
  const { field: sortField, dir: sortDir } = readSort(params, SORT_COLUMNS, "created_at");
  const t = await getTranslations("qr");
  const tc = await getTranslations("common");
  const locale = (await getLocale()) as "fr" | "en";

  const supabase = await createClient();

  let query = supabase
    .from("qr_codes")
    .select("id, type, title, slug, is_dynamic, is_active, expires_at, scan_count, folder_id, created_at")
    .order(sortField, { ascending: sortDir === "asc" });

  if (q) query = query.ilike("title", `%${q}%`);
  if (type) query = query.eq("type", type);
  if (folder) query = query.eq("folder_id", folder);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);
  if (status === "expired") query = query.lt("expires_at", new Date().toISOString());

  const [{ data: qrRaw }, { data: foldersRaw }] = await Promise.all([
    query,
    supabase.from("folders").select("id, name").order("name"),
  ]);

  const qrCodes = (qrRaw ?? []) as Pick<
    QrCode,
    | "id" | "type" | "title" | "slug" | "is_dynamic" | "is_active"
    | "expires_at" | "scan_count" | "folder_id" | "created_at"
  >[];
  const folders = (foldersRaw ?? []) as Pick<Folder, "id" | "name">[];
  const hasFilters = Boolean(q || type || status || folder);

  const statusBadge = (qr: (typeof qrCodes)[number]) => {
    const isExpired = qr.expires_at != null && new Date(qr.expires_at) < new Date();
    if (isExpired) return <span className="badge-amber">{tc("status.expired")}</span>;
    if (!qr.is_active) return <span className="badge-red">{tc("status.inactive")}</span>;
    return <span className="badge-green">{tc("status.active")}</span>;
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("list.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("list.subtitle", { count: qrCodes.length })}
          </p>
        </div>
        <Link href="/qr/new" className="btn-primary">
          + {tc("nav.create")}
        </Link>
      </div>

      <div className="mb-5">
        <QrFilters
          types={QR_TYPES.map((qt) => ({ value: qt.id, label: `${qt.icon} ${qt.name[locale]}` }))}
          folders={folders.map((f) => ({ value: f.id, label: f.name }))}
          initial={{ q, type, status, folder }}
        />
      </div>

      {qrCodes.length === 0 ? (
        <div className="card p-12 text-center">
          <span className="text-4xl">🔳</span>
          <p className="mt-3 text-sm text-slate-400">
            {hasFilters ? t("list.noResults") : t("list.empty")}
          </p>
          {!hasFilters && (
            <Link href="/qr/new" className="btn-primary mt-5">
              + {t("list.emptyCta")}
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Table desktop */}
          <div className="card hidden overflow-hidden lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                  <SortHeader field="title" className="px-6">
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
                  return (
                    <tr key={qr.id} className="group hover:bg-slate-50/60">
                      <td className="px-6 py-3.5">
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
                                {qrShortUrl(qr.slug)}
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
                          {qr.is_dynamic && (
                            <ActiveToggle id={qr.id} isActive={qr.is_active} />
                          )}
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

          {/* Cartes mobile */}
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
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {qr.title}
                      </p>
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
        </>
      )}
    </div>
  );
}
