import { createHmac } from "node:crypto";
import { UAParser } from "ua-parser-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { anonymizeIp, isPrivateIp } from "@/lib/net";
import { appUrl } from "@/lib/url";

const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview/i;

// Beaucoup de scanners/robots se font passer pour un vrai navigateur dans
// leur User-Agent (BOT_UA ne les attrape pas) mais tournent depuis des IP
// d'hébergeurs cloud — jamais utilisées par de vrais visiteurs résidentiels
// ou mobiles. Filet complémentaire au filtre par User-Agent.
const DATACENTER_ISP_RE =
  /amazon|aws|google cloud|googleusercontent|microsoft|azure|ovh|hetzner|digitalocean|digital ocean|linode|akamai|vultr|alibaba|aliyun|oracle cloud|contabo|scaleway|online s\.?a\.?s|leaseweb|choopa|m247|datacamp|hostinger|cloudflare/i;

// Cache IP -> géo (process Node unique, pas serverless — voir le cache de
// domaine dans src/proxy.ts pour le même principe). ip-api.com est limité à
// 45 req/min : au niveau de trafic d'un site (contrairement aux scans QR,
// plus rares), interroger l'API à CHAQUE page vue serait risqué. La plupart
// des visites répétées viennent des mêmes IP (un visiteur qui navigue sur
// plusieurs pages, un bureau, un foyer) : ce cache ramène le taux d'appels
// réel à peu près au nombre d'IP uniques par heure, pas au nombre de pages
// vues — largement dans le quota gratuit à cette échelle.
const geoCache = new Map<
  string,
  { country: string | null; city: string | null; isDatacenter: boolean; expires: number }
>();
const GEO_CACHE_TTL_MS = 60 * 60 * 1000;

async function lookupGeo(
  ip: string
): Promise<{ country: string | null; city: string | null; isDatacenter: boolean }> {
  const cached = geoCache.get(ip);
  if (cached && cached.expires > Date.now()) return cached;

  let country: string | null = null;
  let city: string | null = null;
  let isDatacenter = false;
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,isp,org`,
      { signal: AbortSignal.timeout(2000), cache: "no-store" }
    );
    if (res.ok) {
      const geo = (await res.json()) as {
        status: string;
        country?: string;
        city?: string;
        isp?: string;
        org?: string;
      };
      if (geo.status === "success") {
        country = geo.country ?? null;
        city = geo.city ?? null;
        const provider = `${geo.isp ?? ""} ${geo.org ?? ""}`;
        isDatacenter = DATACENTER_ISP_RE.test(provider);
      }
    }
  } catch {
    // Géolocalisation indisponible : on enregistre quand même la visite
  }

  const entry = { country, city, isDatacenter, expires: Date.now() + GEO_CACHE_TTL_MS };
  geoCache.set(ip, entry);
  return entry;
}

/**
 * Identifiant anonyme de visiteur pour compter les "visiteurs uniques" —
 * un HMAC de l'IP (jamais l'IP elle-même, cohérent avec le choix de ne
 * stocker aucune IP dans site_visits). La clé service_role sert de sel :
 * déjà secrète, déjà présente sur le serveur, pas de nouvelle variable
 * d'environnement à gérer. Non réversible sans cette clé.
 */
function hashVisitor(ip: string): string | null {
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!pepper) return null;
  return createHmac("sha256", pepper).update(ip).digest("hex").slice(0, 32);
}

/**
 * Enregistre une visite de page (trafic du site, distinct des scans de QR).
 * Conçu pour tourner en arrière-plan via event.waitUntil() dans src/proxy.ts :
 * ne bloque jamais la réponse, et toute erreur est silencieuse — l'analytics
 * ne doit jamais faire échouer une page.
 */
export async function trackVisit(
  path: string,
  userAgent: string | null,
  referrer: string | null,
  ip: string | null
): Promise<void> {
  try {
    if (userAgent && BOT_UA.test(userAgent)) return;

    const parsed = userAgent ? UAParser(userAgent) : null;
    const device = parsed ? (parsed.device.type ?? "desktop") : null;
    const os = parsed?.os.name ?? null;
    const browser = parsed?.browser.name ?? null;

    // Un referrer sur le même domaine (clic d'une page à l'autre chez nous)
    // n'est pas une source de trafic externe — l'exclure pour que "Référents"
    // ne reflète que du vrai trafic entrant (Google, réseaux sociaux, etc.).
    let referrerHost: string | null = null;
    if (referrer) {
      try {
        const host = new URL(referrer).host || null;
        referrerHost = host && host !== new URL(appUrl()).host ? host : null;
      } catch {
        referrerHost = null;
      }
    }

    const usableIp = ip && !isPrivateIp(ip) ? ip : null;
    // Seule une IP tronquée sort vers ip-api.com, qui n'est joignable qu'en
    // HTTP simple sur l'offre gratuite (voir anonymizeIp). Le hash visiteur
    // ci-dessous continue, lui, de porter sur l'IP complète : il ne quitte
    // jamais le serveur, n'est pas réversible, et le tronquer ferait compter
    // un réseau entier comme un seul visiteur unique.
    const anonIp = anonymizeIp(usableIp);
    const { country, city, isDatacenter } = anonIp
      ? await lookupGeo(anonIp)
      : { country: null, city: null, isDatacenter: false };
    // Adresse d'un hébergeur cloud (AWS, OVH, Hetzner…) : jamais un vrai
    // visiteur résidentiel/mobile, quasi toujours un scanner ou un robot
    // qui usurpe un User-Agent de navigateur pour passer le filtre BOT_UA.
    if (isDatacenter) return;
    const visitorHash = usableIp ? hashVisitor(usableIp) : null;

    await createAdminClient()
      .from("site_visits")
      .insert({ path, referrer_host: referrerHost, device, os, browser, country, city, visitor_hash: visitorHash });
  } catch (err) {
    console.error("trackVisit failed:", err);
  }
}
