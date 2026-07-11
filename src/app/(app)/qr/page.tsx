import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";
import { QR_TYPES } from "@/lib/qr-types/registry";
import { readSort } from "@/lib/sort";
import { QrFilters } from "@/components/qr/QrFilters";
import { QrTable } from "@/components/qr/QrTable";
import type { Folder, QrCode } from "@/lib/types";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const [{ data: qrRaw }, { data: foldersRaw }, { limits }] = await Promise.all([
    query,
    supabase.from("folders").select("id, name").order("name"),
    getUserPlan(supabase, user!.id),
  ]);

  const qrCodes = (qrRaw ?? []) as Pick<
    QrCode,
    | "id" | "type" | "title" | "slug" | "is_dynamic" | "is_active"
    | "expires_at" | "scan_count" | "folder_id" | "created_at"
  >[];
  const folders = (foldersRaw ?? []) as Pick<Folder, "id" | "name">[];
  const hasFilters = Boolean(q || type || status || folder);

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("list.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("list.subtitle", { count: qrCodes.length })}
          </p>
        </div>
        <div className="flex gap-2">
          {qrCodes.length > 0 && (
            <a href="/api/export/qr-codes" className="btn-secondary">
              ⬇ {t("list.exportCsv")}
            </a>
          )}
          <Link href="/qr/new" className="btn-primary">
            + {tc("nav.create")}
          </Link>
        </div>
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
        <QrTable
          qrCodes={qrCodes}
          folders={folders}
          foldersEnabled={limits.folders_enabled}
          locale={locale}
        />
      )}
    </div>
  );
}
