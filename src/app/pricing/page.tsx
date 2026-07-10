import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/types";
import { PlanCard } from "@/components/billing/PlanCard";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";

export default async function PricingPage() {
  const t = await getTranslations("landing.pricing");
  const locale = await getLocale();

  const supabase = await createClient();
  const [{ data: plansRaw }, { data: auth }] = await Promise.all([
    supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
    supabase.auth.getUser(),
  ]);
  const plans = (plansRaw ?? []) as Plan[];
  const ctaHref = auth.user ? "/billing" : "/auth/register";

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            {t("title")}
          </h1>
          <p className="mt-3 text-lg text-slate-500">{t("subtitle")}</p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              locale={locale}
              action={
                <Link
                  href={ctaHref}
                  className={`${Number(plan.price_monthly) > 0 ? "btn-primary" : "btn-secondary"} w-full`}
                >
                  {t("cta")}
                </Link>
              }
            />
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">💳 {t("payWith")}</p>
      </main>

      <SiteFooter />
    </div>
  );
}
