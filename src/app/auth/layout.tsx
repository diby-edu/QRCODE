import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />
        <Logo name={t("appName")} />
        <div className="relative">
          <h2 className="max-w-md text-4xl font-bold leading-tight text-white">
            {t("tagline")}
          </h2>
          <p className="mt-4 max-w-md text-lg text-indigo-100">
            {t("footer.madeWith")}
          </p>
        </div>
        <p className="relative text-sm text-indigo-200">
          © {new Date().getFullYear()} {t("appName")} — {t("footer.rights")}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col bg-slate-50 px-6 py-8">
        <div className="flex items-center justify-between lg:justify-end">
          <span className="lg:hidden">
            <Logo name={t("appName")} />
          </span>
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md animate-fade-up">{children}</div>
        </div>
      </div>
    </div>
  );
}
