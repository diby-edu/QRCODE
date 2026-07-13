import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { AdminActivityFilters } from "@/components/admin/AdminActivityFilters";

interface ActivityRow {
  id: string;
  admin_email: string | null;
  action: string;
  target: string | null;
  target_label: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const CATEGORY_BADGE: Record<string, string> = {
  user: "badge-indigo",
  plan: "badge-amber",
  qr: "badge-green",
  payment: "badge-amber",
  settings: "badge-gray",
  domain: "badge-indigo",
};

function summarizeDetails(details: Record<string, unknown>): string {
  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== "");
  if (entries.length === 0) return "—";
  return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
}

const PAGE_SIZE = 50;

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    admin?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const { q = "", category = "", admin = "", from = "", to = "" } = params;
  const page = Math.max(Number(params.page) || 1, 1);

  const t = await getTranslations("admin.activity");
  const tActions = await getTranslations("admin.activity.actions");
  const tNav = await getTranslations("admin.nav");
  const locale = await getLocale();
  const supabase = await createClient();

  let query = supabase
    .from("admin_activity_log")
    .select("id, admin_email, action, target, target_label, details, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`admin_email.ilike.%${q}%,target_label.ilike.%${q}%`);
  }
  if (category) query = query.ilike("action", `${category}.%`);
  if (admin) query = query.eq("admin_email", admin);
  if (from) query = query.gte("created_at", `${from}T00:00:00`);
  if (to) query = query.lt("created_at", `${to}T23:59:59.999`);

  const offset = (page - 1) * PAGE_SIZE;
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const [{ data: rowsRaw, count }, { data: adminRowsRaw }] = await Promise.all([
    query,
    supabase
      .from("admin_activity_log")
      .select("admin_email")
      .not("admin_email", "is", null)
      .order("admin_email")
      .limit(500),
  ]);

  const rows = (rowsRaw ?? []) as ActivityRow[];
  const admins = [...new Set((adminRowsRaw ?? []).map((r) => r.admin_email as string))];
  const totalPages = Math.max(Math.ceil((count ?? 0) / PAGE_SIZE), 1);
  const hasFilters = Boolean(q || category || admin || from || to);

  function pageHref(p: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category) sp.set("category", category);
    if (admin) sp.set("admin", admin);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/admin/activity?${qs}` : "/admin/activity";
  }

  return (
    <div className="animate-fade-up">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">{tNav("activity")}</h1>
      <p className="mb-6 text-sm text-slate-500">{t("subtitle")}</p>

      <AdminActivityFilters admins={admins} initial={{ q, category, admin, from, to }} />

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">
            {hasFilters ? t("noResults") : t("empty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">{t("columns.date")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.admin")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.action")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.target")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.details")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const [cat] = row.action.split(".");
                  return (
                    <tr key={row.id} className="text-slate-700">
                      <td className="whitespace-nowrap px-6 py-3">
                        {formatDateTime(row.created_at, locale)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{row.admin_email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={CATEGORY_BADGE[cat] ?? "badge-gray"}>
                          {tActions.has(row.action) ? tActions(row.action) : row.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {row.target_label ?? (row.target ? `#${row.target.slice(0, 8)}` : "—")}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {summarizeDetails(row.details)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Link
            href={pageHref(page - 1)}
            aria-disabled={page <= 1}
            className={`btn-secondary btn-sm ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            ← {t("pagination.previous")}
          </Link>
          <span className="text-sm text-slate-500">
            {t("pagination.page", { page, total: totalPages })}
          </span>
          <Link
            href={pageHref(page + 1)}
            aria-disabled={page >= totalPages}
            className={`btn-secondary btn-sm ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
          >
            {t("pagination.next")} →
          </Link>
        </div>
      )}
    </div>
  );
}
