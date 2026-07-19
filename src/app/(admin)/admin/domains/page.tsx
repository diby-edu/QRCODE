import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { DomainRowActions } from "@/components/admin/DomainRowActions";

interface DomainRow {
  id: string;
  domain: string;
  status: "pending" | "active" | "failed";
  created_at: string;
  user_id: string;
  notes: string | null;
}

export default async function AdminDomainsPage() {
  const t = await getTranslations("admin.domains");
  const tNav = await getTranslations("admin.nav");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: rowsRaw } = await supabase
    .from("custom_domains")
    .select("id, domain, status, created_at, user_id, notes")
    .order("created_at", { ascending: false });

  const rows = ((rowsRaw ?? []) as DomainRow[]).sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return 0;
  });

  // Emails des demandeurs (pas de FK profiles↔custom_domains : jointure applicative)
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profilesRaw } = userIds.length
    ? await supabase.from("profiles").select("id, email").in("id", userIds)
    : { data: [] };
  const emailById = new Map(
    (profilesRaw ?? []).map((p) => [p.id as string, p.email as string | null])
  );

  return (
    <div className="animate-fade-up">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">{tNav("domains")}</h1>
      <p className="mb-6 text-sm text-slate-500">{t("subtitle")}</p>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">{t("columns.domain")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.user")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.date")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("columns.notes")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="text-slate-700 hover:bg-slate-50/60">
                    <td className="px-6 py-3">
                      <code className="text-xs">{r.domain}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block max-w-48 truncate">
                        {emailById.get(r.user_id) ?? r.user_id}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatDateTime(r.created_at, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.status === "active"
                            ? "badge-green"
                            : r.status === "failed"
                              ? "badge-red"
                              : "badge-amber"
                        }
                      >
                        {t(`status.${r.status}`)}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-400">
                      {r.notes ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <DomainRowActions id={r.id} domain={r.domain} status={r.status} />
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
