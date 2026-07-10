import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Enveloppe commune des pages publiques de scan : contenu centré,
 * largeur limitée, mention discrète QRHub en pied de page.
 */
export async function ScanShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  const t = await getTranslations("scan");
  return (
    <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} animate-fade-up`}>
      {children}
      <p className="mt-6 text-center text-xs text-slate-400">
        {t("poweredBy")}{" "}
        <Link href="/" className="font-semibold text-indigo-500 hover:underline">
          QRHub
        </Link>
      </p>
    </div>
  );
}

/** Écran d'état (introuvable, désactivé, expiré, contenu indisponible). */
export async function StatusScreen({
  icon,
  titleKey,
  messageKey,
}: {
  icon: string;
  titleKey: string;
  messageKey: string;
}) {
  const t = await getTranslations("scan");
  return (
    <ScanShell>
      <div className="card p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
          {icon}
        </span>
        <h1 className="mt-5 text-xl font-bold text-slate-900">{t(titleKey)}</h1>
        <p className="mt-2 text-sm text-slate-500">{t(messageKey)}</p>
      </div>
    </ScanShell>
  );
}
