import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/types";
import { PlanEditor } from "@/components/admin/PlanEditor";

type PlanWithCount = Plan & { subscriptions: { count: number }[] };

export default async function AdminPlansPage() {
  const t = await getTranslations("admin.plans");
  const tNav = await getTranslations("admin.nav");
  const supabase = await createClient();

  const { data: plansRaw } = await supabase
    .from("plans")
    .select("*, subscriptions(count)")
    .order("sort_order");

  const plans = (plansRaw ?? []) as PlanWithCount[];

  return (
    <div className="animate-fade-up">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">{tNav("plans")}</h1>
      <p className="mb-6 text-sm text-slate-500">{t("subtitle")}</p>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {plans.map((plan) => (
          <PlanEditor
            key={plan.id}
            plan={plan}
            subscriberCount={plan.subscriptions?.[0]?.count ?? 0}
          />
        ))}
        <PlanEditor plan={null} />
      </div>
    </div>
  );
}
