import { getTranslations } from "next-intl/server";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";

export default async function ContactPage() {
  const t = await getTranslations("legal.contact");

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">{t("lead")}</p>

        <div className="card mt-10 divide-y divide-slate-100 p-2">
          <a
            href="mailto:support@qrcode.numerik360.com"
            className="flex items-center gap-4 p-6 transition-colors hover:bg-slate-50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl">
              ✉️
            </span>
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("email.label")}
              </span>
              <span className="block text-sm font-medium text-slate-900">
                {t("email.value")}
              </span>
            </span>
          </a>
          <a
            href="https://wa.me/225554585927"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-6 transition-colors hover:bg-slate-50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">
              💬
            </span>
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("whatsapp.label")}
              </span>
              <span className="block text-sm font-medium text-slate-900">
                {t("whatsapp.value")}
              </span>
            </span>
          </a>
        </div>

        <p className="mt-6 text-sm text-slate-400">{t("hours")}</p>
      </main>

      <SiteFooter />
    </div>
  );
}
