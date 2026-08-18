import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatMoney } from "@/lib/utils";
import type { Payment } from "@/lib/types";
import { ManualPaymentForm } from "@/components/admin/ManualPaymentForm";
import { PaymentRowActions } from "@/components/admin/PaymentRowActions";

export default async function AdminPaymentsPage() {
  const t = await getTranslations("admin.payments");
  const tNav = await getTranslations("admin.nav");
  const tb = await getTranslations("billing.history.statuses");
  const locale = await getLocale();
  const supabase = await createClient();

  const [{ data: paymentsRaw }, { data: plansRaw }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, user_id, gateway, gateway_ref, amount, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("plans")
      .select("id, name, price_monthly, price_quarterly, price_yearly")
      .eq("is_active", true)
      // Le plan gratuit n'a pas sa place dans un formulaire de paiement :
      // enregistrer un règlement hors-ligne pour un plan à 0 n'a pas de sens,
      // et l'action refuse de toute façon un montant nul. Faire redescendre
      // quelqu'un en Free relève de /admin/users.
      .gt("price_monthly", 0)
      .order("sort_order"),
  ]);

  const payments = (paymentsRaw ?? []) as Pick<
    Payment,
    "id" | "user_id" | "gateway" | "gateway_ref" | "amount" | "currency" | "status" | "created_at"
  >[];
  const plans = (plansRaw ?? []) as {
    id: string;
    name: string;
    price_monthly: number;
    price_quarterly: number | null;
    price_yearly: number | null;
  }[];

  // Liste des comptes pour le sélecteur du formulaire manuel : saisir l'email
  // à la main faisait échouer l'enregistrement à la moindre faute de frappe.
  const { data: allUsersRaw } = await supabase
    .from("profiles")
    .select("email, full_name")
    .not("email", "is", null)
    .order("full_name");
  const selectableUsers = (allUsersRaw ?? []) as {
    email: string;
    full_name: string | null;
  }[];

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{tNav("payments")}</h1>
        {plans.length > 0 && <ManualPaymentForm plans={plans} users={selectableUsers} />}
      </div>

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
                <th className="px-4 py-3" />
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
                    <td className="px-4 py-3">
                      {/* Libellé lisible plutôt que la valeur brute : distinguer
                          d'un coup d'œil ce qui vient de la passerelle de ce qui
                          a été saisi à la main change la lecture des chiffres. */}
                      <span
                        className={
                          p.gateway === "paydunya" ? "badge-indigo" : "badge-amber"
                        }
                      >
                        {t(`origin.${p.gateway === "paydunya" ? "auto" : "manual"}`)}
                      </span>
                    </td>
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
                              : p.status === "refunded"
                                ? "badge-gray"
                                : "badge-red"
                        }
                      >
                        {tb(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "completed" && <PaymentRowActions paymentId={p.id} />}
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
