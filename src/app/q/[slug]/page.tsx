import { cache } from "react";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { UAParser } from "ua-parser-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractIp, trackScan } from "@/lib/scan/track";
import { passwordCookieName, passwordCookieValue } from "@/lib/scan/password";
import { getQrType } from "@/lib/qr-types/registry";
import { ensureHttp } from "@/lib/qr-types/encoders";
import type { QrCode, QrCodeData } from "@/lib/types";
import { LANDINGS, WIDE_LANDINGS } from "@/components/scan/landings";
import { str } from "@/components/scan/landings/util";
import { ScanShell, StatusScreen } from "@/components/scan/ScanShell";
import { PasswordGate } from "@/components/scan/PasswordGate";
import { AutoOpen } from "@/components/scan/AutoOpen";

type QrWithData = QrCode & { qr_code_data: QrCodeData[] };

// Client service_role : la route est publique, la RLS ne s'applique pas ici.
// cache() partage la requête entre generateMetadata et la page.
const getQr = cache(async (slug: string): Promise<QrWithData | null> => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("qr_codes")
    .select("*, qr_code_data(data)")
    .eq("slug", slug)
    .maybeSingle();
  return (data as QrWithData | null) ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const qr = await getQr(slug);
  if (!qr) return { robots: { index: false } };

  const data = (qr.qr_code_data?.[0]?.data ?? {}) as Record<string, unknown>;
  const title = str(data.pageTitle) || str(data.title) || qr.title;
  const description = str(data.description) || undefined;

  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, type: "website" },
  };
}

export default async function ScanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const qr = await getQr(slug);
  if (!qr) notFound();

  // 1. Vérifications d'état — aucune n'enregistre de scan
  if (!qr.is_active) {
    return (
      <StatusScreen icon="🚫" titleKey="inactive.title" messageKey="inactive.message" />
    );
  }
  if (qr.expires_at && new Date(qr.expires_at) < new Date()) {
    return (
      <StatusScreen icon="⏳" titleKey="expired.title" messageKey="expired.message" />
    );
  }

  // 2. Protection par mot de passe
  if (qr.password) {
    const store = await cookies();
    const cookie = store.get(passwordCookieName(qr.id))?.value;
    if (cookie !== passwordCookieValue(qr.password)) {
      return (
        <ScanShell>
          <PasswordGate slug={slug} />
        </ScanShell>
      );
    }
  }

  const type = getQrType(qr.type);
  const data = (qr.qr_code_data?.[0]?.data ?? {}) as Record<string, unknown>;

  // 3. Tracking après envoi de la réponse. Les en-têtes sont lus ici :
  // interdits à l'intérieur du callback after() dans un Server Component.
  const hdrs = await headers();
  const ua = hdrs.get("user-agent");
  const ip = extractIp(hdrs.get("x-forwarded-for"));
  after(() => trackScan(qr.id, ua, ip));

  // 4a. Applications : redirection directe vers le bon store selon l'OS
  if (qr.type === "app") {
    const os = (UAParser(ua ?? "").os.name ?? "").toLowerCase();
    const playUrl = ensureHttp(data.playStoreUrl);
    const appleUrl = ensureHttp(data.appStoreUrl);
    if (os.includes("android") && playUrl) redirect(playUrl);
    if (os === "ios" && appleUrl) redirect(appleUrl);
  }

  // 4b. Types "redirection"
  if (type?.scanBehavior === "redirect") {
    const url = type.getRedirectUrl?.(data) ?? "";
    if (!url) {
      return (
        <StatusScreen
          icon="🔗"
          titleKey="unavailable.title"
          messageKey="unavailable.message"
        />
      );
    }
    if (/^https?:\/\//i.test(url)) redirect(url);

    // tel:, mailto: — un 302 vers ces schémas est mal géré : ouverture client
    const t = await getTranslations("scan");
    return (
      <ScanShell>
        <AutoOpen url={url} label={t("openLink")} />
      </ScanShell>
    );
  }

  // 4c. Types "landing" : page publique rendue côté serveur
  const Landing = LANDINGS[qr.type];
  if (!Landing) {
    return (
      <StatusScreen
        icon="❓"
        titleKey="unavailable.title"
        messageKey="unavailable.message"
      />
    );
  }

  const locale = await getLocale();
  return (
    <ScanShell wide={WIDE_LANDINGS.has(qr.type)}>
      <Landing title={qr.title} data={data} locale={locale} />
    </ScanShell>
  );
}
