import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

interface ActivityRow {
  id: string;
  admin_email: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

function summarizeDetails(details: Record<string, unknown>): string {
  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== "");
  if (entries.length === 0) return "—";
  return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
}

export default async function AdminActivityPage() {
  const t = await getTranslations("admin.activity");
  const tActions = await getTranslations("admin.activity.actions");
  const tNav = await getTranslations("admin.nav");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: rowsRaw } = await supabase
    .from("admin_activity_log")
    .select("id, admin_email, action, target, details, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (rowsRaw ?? []) as ActivityRow[];

  return (
    <div className="animate-fade-up">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">{tNav("activity")}</h1>
      <p className="mb-6 text-sm text-slate-500">{t("subtitle")}</p>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">{t("columns.date")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.admin")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.action")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.details")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="text-slate-700">
                    <td className="whitespace-nowrap px-6 py-3">
                      {formatDateTime(row.created_at, locale)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.admin_email ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {tActions.has(row.action) ? tActions(row.action) : row.action}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {summarizeDetails(row.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
