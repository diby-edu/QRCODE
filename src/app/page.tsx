import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CATEGORIES, QR_TYPES } from "@/lib/qr-types/registry";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";
import {
  CountUp,
  DynamicQrShowcase,
  Reveal,
} from "@/components/marketing/landing-animations";

const PROBLEM_ICONS: Record<string, string> = {
  dead: "⛔",
  blind: "🕶️",
  costly: "💸",
};

const SOLUTION_ICONS: Record<string, string> = {
  editable: "🔄",
  measure: "📈",
  printonce: "🖨️",
};

const FEATURE_ICONS: Record<string, string> = {
  dynamic: "⚡",
  stats: "📊",
  design: "🎨",
  types: "🧩",
  organize: "📁",
  secure: "🔒",
};

export default async function HomePage() {
  const t = await getTranslations("landing");
  const locale = (await getLocale()) as "fr" | "en";
  const destinations = t.raw("hero.showcase.destinations") as string[];

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader />

      <main className="flex-1">
        {/* ============================ Héros ============================ */}
        <section className="relative overflow-hidden">
          {/* Blobs décoratifs animés */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-200/50 blur-3xl animate-blob" />
            <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl animate-blob [animation-delay:-6s]" />
            <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-fuchsia-100/50 blur-3xl animate-blob [animation-delay:-12s]" />
          </div>

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-16 lg:grid-cols-2 lg:px-8 lg:pt-24">
            <div className="animate-fade-up">
              <span className="badge-indigo">✨ {t("hero.badge")}</span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                {t("hero.title")}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                {t("hero.subtitle")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/auth/register"
                  className="btn-primary px-7 py-3.5 text-base shadow-lg shadow-indigo-600/20 transition-transform hover:-translate-y-0.5"
                >
                  {t("hero.ctaPrimary")}
                </Link>
                <Link href="/pricing" className="btn-secondary px-7 py-3.5 text-base">
                  {t("hero.ctaSecondary")}
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-400">✓ {t("hero.noCard")}</p>
            </div>

            <div className="animate-fade-up [animation-delay:120ms]">
              <DynamicQrShowcase
                label={t("hero.showcase.label")}
                destinations={destinations}
                caption={t("hero.showcase.caption")}
              />
            </div>
          </div>
        </section>

        {/* ========================== Problème ========================== */}
        <section className="bg-slate-900 py-24 text-white">
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t("problem.title")}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-400">
                {t("problem.subtitle")}
              </p>
            </Reveal>
            <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
              {Object.entries(PROBLEM_ICONS).map(([key, icon], i) => (
                <Reveal key={key} delay={i * 120}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-colors hover:bg-white/[0.08]">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15 text-2xl ring-1 ring-red-500/20">
                      {icon}
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">
                      {t(`problem.items.${key}.title`)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      {t(`problem.items.${key}.description`)}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ========================== Solution ========================== */}
        <section className="relative overflow-hidden py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-indigo-50/80 to-transparent"
          />
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="badge-green">{t("hero.badge")}</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {t("solution.title")}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-500">
                {t("solution.subtitle")}
              </p>
            </Reveal>
            <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
              {Object.entries(SOLUTION_ICONS).map(([key, icon], i) => (
                <Reveal key={key} delay={i * 120}>
                  <div className="group h-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl shadow-md transition-transform duration-300 group-hover:scale-110">
                      {icon}
                    </span>
                    <h3 className="mt-5 text-lg font-semibold text-slate-900">
                      {t(`solution.items.${key}.title`)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {t(`solution.items.${key}.description`)}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== Bande de chiffres ===================== */}
        <section className="border-y border-slate-200 bg-slate-50 py-14">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 text-center sm:grid-cols-3 lg:px-8">
            <Reveal>
              <p className="text-4xl font-extrabold text-indigo-600 sm:text-5xl">
                <CountUp to={QR_TYPES.length} suffix="+" />
              </p>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {t("stats.types")}
              </p>
            </Reveal>
            <Reveal delay={120}>
              <p className="text-4xl font-extrabold text-indigo-600 sm:text-5xl">
                {t("stats.editableValue")}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {t("stats.editable")}
              </p>
            </Reveal>
            <Reveal delay={240}>
              <p className="text-4xl font-extrabold text-indigo-600 sm:text-5xl">
                <CountUp to={100} suffix="%" />
              </p>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {t("stats.tracking")}
              </p>
            </Reveal>
          </div>
        </section>

        {/* ======================= Fonctionnalités ======================= */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-24 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t("features.title")}
            </h2>
            <p className="mt-3 text-lg text-slate-500">{t("features.subtitle")}</p>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(FEATURE_ICONS).map(([key, icon], i) => (
              <Reveal key={key} delay={(i % 3) * 100}>
                <div className="card h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl">
                    {icon}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {t(`features.items.${key}.title`)}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    {t(`features.items.${key}.description`)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ========================= Types de QR ========================= */}
        <section className="bg-slate-50 py-24">
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {t("types.title")}
              </h2>
              <p className="mt-3 text-lg text-slate-500">{t("types.subtitle")}</p>
            </Reveal>
            <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {CATEGORIES.map((category, i) => {
                const count = QR_TYPES.filter((qt) => qt.category === category.id).length;
                return (
                  <Reveal key={category.id} delay={(i % 6) * 80}>
                    <div className="card p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                      <span className="text-3xl">{category.icon}</span>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {category.name[locale]}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">{count} types</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================== 3 étapes ========================== */}
        <section className="mx-auto max-w-6xl px-4 py-24 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t("steps.title")}
            </h2>
          </Reveal>
          <div className="relative mt-16 grid grid-cols-1 gap-10 sm:grid-cols-3">
            {/* Ligne de connexion entre les étapes (desktop) */}
            <div
              aria-hidden
              className="absolute left-1/2 top-6 hidden h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-indigo-200 to-transparent sm:block"
            />
            {(["one", "two", "three"] as const).map((step, i) => (
              <Reveal key={step} delay={i * 150} className="relative text-center">
                <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-600/25">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  {t(`steps.${step}.title`)}
                </h3>
                <p className="mt-1.5 text-sm text-slate-500">
                  {t(`steps.${step}.description`)}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ========================= CTA final ========================= */}
        <section className="mx-auto max-w-6xl px-4 pb-24 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-10 text-center text-white shadow-xl shadow-indigo-600/20 animate-gradient sm:p-16">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-2xl"
              />
              <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
                {t("finalCta.title")}
              </h2>
              <p className="relative mt-3 text-lg text-indigo-100">
                {t("finalCta.subtitle")}
              </p>
              <Link
                href="/auth/register"
                className="btn relative mt-8 bg-white px-8 py-3.5 text-base font-semibold text-indigo-700 shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-indigo-50"
              >
                {t("finalCta.button")} →
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
