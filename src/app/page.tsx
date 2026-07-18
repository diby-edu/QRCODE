import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CATEGORIES, QR_TYPES } from "@/lib/qr-types/registry";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";

/** Visuel décoratif : QR stylisé avec le dégradé de la marque. */
function HeroQr() {
  const cells = [
    "1111111010011111111",
    "1000001001010000001",
    "1011101110101011101",
    "1011101011001011101",
    "1011101100111011101",
    "1000001010010000001",
    "1111111010101111111",
    "0000000110100000000",
    "1101011011011010110",
    "0110100101100111010",
    "1010111001010110011",
    "0000000101101001010",
    "1111111011010110101",
    "1000001001110011010",
    "1011101010011010111",
    "1011101101010110010",
    "1011101011101011101",
    "1000001110010100110",
    "1111111010110101011",
  ];
  return (
    <svg viewBox="0 0 19 19" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="hero-qr-g" x1="0" y1="0" x2="19" y2="19">
          <stop stopColor="#4f46e5" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      {cells.flatMap((row, y) =>
        row.split("").map((cell, x) =>
          cell === "1" ? (
            <rect
              key={`${x}-${y}`}
              x={x + 0.08}
              y={y + 0.08}
              width={0.84}
              height={0.84}
              rx={0.2}
              fill="url(#hero-qr-g)"
            />
          ) : null
        )
      )}
    </svg>
  );
}

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

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Héros */}
        <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-16 lg:grid-cols-2 lg:px-8 lg:pt-24">
            <div className="animate-fade-up">
              <span className="badge-indigo">{t("hero.badge")}</span>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                {t("hero.title")}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
                {t("hero.subtitle")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/auth/register" className="btn-primary px-6 py-3 text-base">
                  {t("hero.ctaPrimary")}
                </Link>
                <Link href="/pricing" className="btn-secondary px-6 py-3 text-base">
                  {t("hero.ctaSecondary")}
                </Link>
              </div>
              <p className="mt-3 text-sm text-slate-400">✓ {t("hero.noCard")}</p>
            </div>

            <div className="relative mx-auto w-full max-w-sm animate-fade-up">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-200/60 to-violet-200/60 blur-2xl" />
              <div className="card relative rotate-1 p-8 transition-transform duration-300 hover:rotate-0">
                <HeroQr />
              </div>
            </div>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {t("features.title")}
            </h2>
            <p className="mt-3 text-slate-500">{t("features.subtitle")}</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(FEATURE_ICONS).map(([key, icon]) => (
              <div
                key={key}
                className="card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
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
            ))}
          </div>
        </section>

        {/* Types de QR */}
        <section className="bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                {t("types.title")}
              </h2>
              <p className="mt-3 text-slate-500">{t("types.subtitle")}</p>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {CATEGORIES.map((category) => {
                const count = QR_TYPES.filter((qt) => qt.category === category.id).length;
                return (
                  <div key={category.id} className="card p-5 text-center">
                    <span className="text-2xl">{category.icon}</span>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {category.name[locale]}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {count} types
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3 étapes */}
        <section className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
            {t("steps.title")}
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {(["one", "two", "three"] as const).map((step, i) => (
              <div key={step} className="relative text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-bold text-white shadow-md">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {t(`steps.${step}.title`)}
                </h3>
                <p className="mt-1.5 text-sm text-slate-500">
                  {t(`steps.${step}.description`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-4 pb-20 lg:px-8">
          <div className="card overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-600 p-10 text-center text-white sm:p-14">
            <h2 className="text-3xl font-bold tracking-tight">{t("finalCta.title")}</h2>
            <p className="mt-2 text-indigo-100">{t("finalCta.subtitle")}</p>
            <Link
              href="/auth/register"
              className="btn mt-7 bg-white px-6 py-3 text-base font-semibold text-indigo-700 shadow-md hover:bg-indigo-50"
            >
              {t("finalCta.button")} →
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
