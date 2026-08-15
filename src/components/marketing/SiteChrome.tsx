import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileNav } from "@/components/marketing/MobileNav";
import { SiteAnnouncement } from "@/components/marketing/SiteAnnouncement";

const SUPPORT_PHONE_DISPLAY = "+225 05 54 58 59 27";
const SUPPORT_PHONE_TEL = "+2250554585927";
const SUPPORT_EMAIL = "support@qrcode.numerik360.com";

/** En-tête public (landing) : nav ancres + connexion/dashboard + menu mobile. */
export async function SiteHeader() {
  const tc = await getTranslations("common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Liens d'ancre vers les sections de la landing (défilement, pas navigation).
  const navLinks = [
    { href: "/#features", label: tc("nav.features") },
    { href: "/#how", label: tc("nav.howItWorks") },
    { href: "/#pricing", label: tc("nav.pricing") },
    { href: "/#contact", label: tc("nav.contact") },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="hidden items-center gap-2 sm:flex">
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
            <MobileNav
              links={navLinks}
              isLoggedIn={Boolean(user)}
              labels={{
                dashboard: tc("nav.dashboard"),
                login: tc("nav.login"),
                register: tc("nav.register"),
              }}
            />
          </div>
        </div>
      </header>
      {/* Sous l'en-tête, hors du bloc sticky : une annonce longue ne doit pas
          coller en haut de l'écran pendant tout le défilement. */}
      <SiteAnnouncement />
    </>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("landing.footer");
  const tc = await getTranslations("common");

  return (
    <footer id="contact" className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:justify-between lg:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-slate-500">{tc("footer.madeWith")}</p>
          <div className="mt-5">
            <p className="text-sm font-semibold text-slate-900">
              {t("contactTitle")}
            </p>
            <a
              href={`tel:${SUPPORT_PHONE_TEL}`}
              className="mt-2 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
            >
              <span aria-hidden>📞</span> {SUPPORT_PHONE_DISPLAY}
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-1.5 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
            >
              <span aria-hidden>✉️</span> {SUPPORT_EMAIL}
            </a>
          </div>
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
                <Link href="/#pricing" className="hover:text-slate-900">
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
