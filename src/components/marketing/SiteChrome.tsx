import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/** En-tête public (landing, tarifs) : nav marketing + connexion/dashboard. */
export async function SiteHeader() {
  const tc = await getTranslations("common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
          <Link href="/#features" className="hover:text-slate-900">
            {tc("nav.features")}
          </Link>
          <Link href="/pricing" className="hover:text-slate-900">
            {tc("nav.pricing")}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {user ? (
            <Link href="/dashboard" className="btn-primary btn-sm">
              {tc("nav.dashboard")}
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="btn-ghost btn-sm">
                {tc("nav.login")}
              </Link>
              <Link href="/auth/register" className="btn-primary btn-sm">
                {tc("nav.register")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("landing.footer");
  const tc = await getTranslations("common");

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:justify-between lg:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-slate-500">{tc("footer.madeWith")}</p>
        </div>
        <div className="flex flex-wrap gap-x-16 gap-y-8 text-sm">
          <div>
            <p className="mb-3 font-semibold text-slate-900">{t("product")}</p>
            <ul className="space-y-2 text-slate-500">
              <li>
                <Link href="/#features" className="hover:text-slate-900">
                  {t("features")}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-slate-900">
                  {t("pricing")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-semibold text-slate-900">{t("account")}</p>
            <ul className="space-y-2 text-slate-500">
              <li>
                <Link href="/auth/login" className="hover:text-slate-900">
                  {t("login")}
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-slate-900">
                  {t("register")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-semibold text-slate-900">{t("company")}</p>
            <ul className="space-y-2 text-slate-500">
              <li>
                <Link href="/about" className="hover:text-slate-900">
                  {t("about")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-slate-900">
                  {t("contact")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-semibold text-slate-900">{t("legal")}</p>
            <ul className="space-y-2 text-slate-500">
              <li>
                <Link href="/privacy" className="hover:text-slate-900">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-slate-900">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/gdpr" className="hover:text-slate-900">
                  {t("gdpr")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} QRHub. {tc("footer.rights")}
      </div>
    </footer>
  );
}
