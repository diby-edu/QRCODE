import { getTranslations } from "next-intl/server";
import { ensureHttp } from "@/lib/qr-types/encoders";
import { objArr, str, type LandingProps } from "./util";

/** Applications : boutons App Store / Play Store / site (si l'OS n'a pas déjà redirigé). */
export async function AppLanding({ title, data }: LandingProps) {
  const t = await getTranslations("scan.app");
  const appName = str(data.appName) || title;
  const stores = [
    { url: str(data.playStoreUrl), label: t("playStore"), icon: "▶️" },
    { url: str(data.appStoreUrl), label: t("appStore"), icon: "🍎" },
    { url: str(data.fallbackUrl), label: t("fallback"), icon: "🌐" },
  ].filter((s) => s.url);

  return (
    <div className="card p-8 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
        📱
      </span>
      <h1 className="mt-5 text-xl font-bold text-slate-900">{appName}</h1>
      <p className="mt-2 text-sm text-slate-500">{t("download")}</p>
      <div className="mt-6 space-y-3">
        {stores.map((s) => (
          <a
            key={s.url}
            href={ensureHttp(s.url)}
            className="btn-secondary w-full"
            rel="noopener noreferrer"
          >
            <span>{s.icon}</span> {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}

/** Liste de liens (type Linktree). */
export async function LinksLanding({ title, data }: LandingProps) {
  const pageTitle = str(data.pageTitle) || title;
  const description = str(data.description);
  const links = objArr(data.links)
    .map((l) => ({ label: str(l.label), url: ensureHttp(l.url) }))
    .filter((l) => l.label && l.url);

  return (
    <div className="card p-8">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
          {pageTitle.slice(0, 1).toUpperCase()}
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-900">{pageTitle}</h1>
        {description && (
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        )}
      </div>
      <div className="mt-6 space-y-3">
        {links.map((l, i) => (
          <a
            key={i}
            href={l.url}
            rel="noopener noreferrer"
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-center text-sm font-semibold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow"
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}

const NETWORK_META: Record<string, { icon: string; label: string }> = {
  facebook: { icon: "📘", label: "Facebook" },
  instagram: { icon: "📸", label: "Instagram" },
  x: { icon: "✖️", label: "X (Twitter)" },
  tiktok: { icon: "🎵", label: "TikTok" },
  youtube: { icon: "▶️", label: "YouTube" },
  linkedin: { icon: "💼", label: "LinkedIn" },
  snapchat: { icon: "👻", label: "Snapchat" },
  telegram: { icon: "✈️", label: "Telegram" },
  whatsapp: { icon: "💚", label: "WhatsApp" },
  website: { icon: "🌐", label: "Site web" },
};

/** Hub réseaux sociaux. */
export async function SocialLanding({ title, data }: LandingProps) {
  const pageTitle = str(data.pageTitle) || title;
  const description = str(data.description);
  const networks = objArr(data.networks)
    .map((n) => ({
      meta: NETWORK_META[str(n.network)] ?? { icon: "🔗", label: str(n.network) },
      url: ensureHttp(n.url),
    }))
    .filter((n) => n.url);

  return (
    <div className="card p-8">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
          {pageTitle.slice(0, 1).toUpperCase()}
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-900">{pageTitle}</h1>
        {description && (
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        )}
      </div>
      <div className="mt-6 space-y-3">
        {networks.map((n, i) => (
          <a
            key={i}
            href={n.url}
            rel="noopener noreferrer"
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow"
          >
            <span className="text-xl">{n.meta.icon}</span>
            <span className="flex-1 text-left">{n.meta.label}</span>
            <span className="text-slate-300">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
