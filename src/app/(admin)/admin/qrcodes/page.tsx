import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getQrType } from "@/lib/qr-types/registry";
import { formatDate, formatNumber } from "@/lib/utils";
import type { QrCode } from "@/lib/types";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { QrRowActions } from "@/components/admin/QrRowActions";

export default async function AdminQrCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const t = await getTranslations("admin.qrcodes");
  const tNav = await getTranslations("admin.nav");
  const tc = await getTranslations("common");
  const locale = (await getLocale()) as "fr" | "en";
  const supabase = await createClient();

  let query = supabase
    .from("qr_codes")
    .select("id, user_id, type, title, is_dynamic, is_active, scan_count, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data: qrRaw } = await query;
  const qrCodes = (qrRaw ?? []) as Pick<
    QrCode,
    "id" | "user_id" | "type" | "title" | "is_dynamic" | "is_active" | "scan_count" | "created_at"
  >[];

  const userIds = [...new Set(qrCodes.map((qr) => qr.user_id))];
  const { data: profilesRaw } = userIds.length
    ? await supabase.from("profiles").select("id, email").in("id", userIds)
    : { data: [] };
  const emailById = new Map(
    (profilesRaw ?? []).map((p) => [p.id as string, p.email as string | null])
  );

  return (
    <div className="animate-fade-up">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{tNav("qrcodes")}</h1>
      <div className="mb-4">
        <AdminSearch placeholder={t("searchPlaceholder")} initial={q} />
      </div>

      <div className="card overflow-hidden">
        {qrCodes.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">{t("columns.title")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.owner")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.type")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.scans")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.created")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {qrCodes.map((qr) => {
                  const qtype = getQrType(qr.type);
                  return (
                    <tr key={qr.id} className="text-slate-700 hover:bg-slate-50/60">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm">
                            {qtype?.icon ?? "🔳"}
                          </span>
                          <span className="max-w-52 truncate font-semibold text-slate-800">
                            {qr.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="block max-w-44 truncate text-slate-500">
                          {emailById.get(qr.user_id) ?? qr.user_id}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {qtype?.name[locale] ?? qr.type}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        {qr.is_dynamic ? formatNumber(qr.scan_count, locale) : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        {qr.is_active ? (
                          <span className="badge-green">{tc("status.active")}</span>
                        ) : (
                          <span className="badge-red">{tc("status.inactive")}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">
                        {formatDate(qr.created_at, locale)}
                      </td>
                      <td className="px-4 py-3.5">
                        <QrRowActions id={qr.id} title={qr.title} isActive={qr.is_active} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
