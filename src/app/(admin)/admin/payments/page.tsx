import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatMoney } from "@/lib/utils";
import type { Payment } from "@/lib/types";

export default async function AdminPaymentsPage() {
  const t = await getTranslations("admin.payments");
  const tNav = await getTranslations("admin.nav");
  const tb = await getTranslations("billing.history.statuses");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: paymentsRaw } = await supabase
    .from("payments")
    .select("id, user_id, gateway, gateway_ref, amount, currency, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const payments = (paymentsRaw ?? []) as Pick<
    Payment,
    "id" | "user_id" | "gateway" | "gateway_ref" | "amount" | "currency" | "status" | "created_at"
  >[];

  // Emails des payeurs (pas de FK profiles↔payments : jointure applicative)
  const userIds = [...new Set(payments.map((p) => p.user_id))];
  const { data: profilesRaw } = userIds.length
    ? await supabase.from("profiles").select("id, email, full_name").in("id", userIds)
    : { data: [] };
  const profileById = new Map(
    (profilesRaw ?? []).map((p) => [p.id as string, p as { email: string | null; full_name: string | null }])
  );

  return (
    <div className="animate-fade-up">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{tNav("payments")}</h1>
      <div className="card overflow-hidden">
      {payments.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">{t("columns.date")}</th>
                <th className="px-4 py-3 font-medium">{t("columns.user")}</th>
                <th className="px-4 py-3 font-medium">{t("columns.amount")}</th>
                <th className="px-4 py-3 font-medium">{t("columns.gateway")}</th>
                <th className="px-4 py-3 font-medium">{t("columns.reference")}</th>
                <th className="px-4 py-3 font-medium">{t("columns.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => {
                const profile = profileById.get(p.user_id);
                return (
                  <tr key={p.id} className="text-slate-700 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-6 py-3">
                      {formatDateTime(p.created_at, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block max-w-48 truncate">
                        {profile?.email ?? p.user_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatMoney(Number(p.amount), p.currency, locale)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.gateway}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-slate-400">
                        {p.gateway_ref ?? "—"}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          p.status === "completed"
                            ? "badge-green"
                            : p.status === "pending"
                              ? "badge-amber"
                              : "badge-red"
                        }
                      >
                        {tb(p.status)}
                      </span>
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
