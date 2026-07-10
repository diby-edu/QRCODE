import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { UserRowActions } from "@/components/admin/UserRowActions";

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
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
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

  const users = (usersRaw ?? []) as AdminUserRow[];
  const plans = (plansRaw ?? []) as { id: string; name: string }[];

  return (
    <div className="animate-fade-up">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{tNav("users")}</h1>
      <div className="mb-4">
        <AdminSearch placeholder={t("searchPlaceholder")} initial={q} />
      </div>

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
                  <th className="px-6 py-3 font-medium">{t("columns.user")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.plan")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.qrcodes")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.joined")}</th>
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
