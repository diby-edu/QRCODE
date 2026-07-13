import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";
import { CustomDomainForm } from "@/components/settings/settings-forms";

export default async function DomainPage() {
  const t = await getTranslations("domain");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ limits }, { data: domain }] = await Promise.all([
    getUserPlan(supabase, user!.id),
    supabase
      .from("custom_domains")
      .select("domain, status")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      <div className="max-w-2xl">
        <CustomDomainForm enabled={limits.custom_domain_enabled} current={domain ?? null} />
      </div>
    </div>
  );
}
