import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils";
import { AdminUsersFilters } from "@/components/admin/AdminUsersFilters";
import { UserRowActions } from "@/components/admin/UserRowActions";
import { readSort, SortHeader } from "@/components/ui/SortHeader";

interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_suspended: boolean;
  created_at: string;
  plan_id: string | null;
  plan_name: string | null;
  qr_count: number;
  storage_mb: number;
}

const SORT_COLUMNS = ["full_name", "plan_name", "qr_count", "storage_mb", "created_at"] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; sort?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const { q = "", plan = "" } = params;
  const { field: sortField, dir: sortDir } = readSort(params, SORT_COLUMNS, "created_at");
  const t = await getTranslations("admin.users");
  const tNav = await getTranslations("admin.nav");
  const tc = await getTranslations("common");
  const locale = await getLocale();

  const supabase = await createClient();
  const {
    data: { user: me },
  } = await supabase.auth.getUser();

  const [{ data: usersRaw }, { data: plansRaw }] = await Promise.all([
    supabase.rpc("admin_list_users", { p_search: q || null, p_limit: 100 }),
    supabase.from("plans").select("id, name").eq("is_active", true).order("sort_order"),
  ]);

  const plans = (plansRaw ?? []) as { id: string; name: string }[];

  // Le RPC trie par date d'inscription et filtre par recherche ; le filtre
  // plan et les autres tris se font ici (jusqu'à 100 lignes, sans coût réel).
  const users = ((usersRaw ?? []) as AdminUserRow[])
    .filter((u) => !plan || u.plan_id === plan)
    .slice()
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "qr_count") return (a.qr_count - b.qr_count) * dir;
      if (sortField === "storage_mb") return (a.storage_mb - b.storage_mb) * dir;
      if (sortField === "created_at") {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
      const av = (sortField === "plan_name" ? a.plan_name : a.full_name || a.email) ?? "";
      const bv = (sortField === "plan_name" ? b.plan_name : b.full_name || b.email) ?? "";
      return av.localeCompare(bv) * dir;
    });

  return (
    <div className="animate-fade-up">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{tNav("users")}</h1>
      <AdminUsersFilters plans={plans} initial={{ q, plan }} />

      <div className="card overflow-hidden">
        {users.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">
            {t("empty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                  <SortHeader field="full_name" className="px-6">
                    {t("columns.user")}
                  </SortHeader>
                  <SortHeader field="plan_name">{t("columns.plan")}</SortHeader>
                  <SortHeader field="qr_count">{t("columns.qrcodes")}</SortHeader>
                  <SortHeader field="storage_mb">{t("columns.storage")}</SortHeader>
                  <SortHeader field="created_at">{t("columns.joined")}</SortHeader>
                  <th className="px-4 py-3 font-medium">{t("columns.status")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                          {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-semibold text-slate-800">
                            {u.full_name || "—"}
                            {u.role === "admin" && (
                              <span className="badge-indigo">{t("adminBadge")}</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {u.plan_name ?? t("noPlan")}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-slate-600">
                      {formatNumber(Number(u.qr_count), locale)}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-slate-600">
                      {formatNumber(Number(u.storage_mb), locale)} Mo
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">
                      {formatDate(u.created_at, locale)}
                    </td>
                    <td className="px-4 py-3.5">
                      {u.is_suspended ? (
                        <span className="badge-red">{tc("status.suspended")}</span>
                      ) : (
                        <span className="badge-green">{tc("status.active")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <UserRowActions
                        userId={u.id}
                        isSuspended={u.is_suspended}
                        isSelf={u.id === me?.id}
                        role={u.role}
                        planId={u.plan_id}
                        plans={plans}
                      />
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
