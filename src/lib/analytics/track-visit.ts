import { createHmac } from "node:crypto";
import { UAParser } from "ua-parser-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPrivateIp } from "@/lib/net";

const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview/i;

// Cache IP -> géo (process Node unique, pas serverless — voir le cache de
// domaine dans src/proxy.ts pour le même principe). ip-api.com est limité à
// 45 req/min : au niveau de trafic d'un site (contrairement aux scans QR,
// plus rares), interroger l'API à CHAQUE page vue serait risqué. La plupart
// des visites répétées viennent des mêmes IP (un visiteur qui navigue sur
// plusieurs pages, un bureau, un foyer) : ce cache ramène le taux d'appels
// réel à peu près au nombre d'IP uniques par heure, pas au nombre de pages
// vues — largement dans le quota gratuit à cette échelle.
const geoCache = new Map<string, { country: string | null; city: string | null; expires: number }>();
const GEO_CACHE_TTL_MS = 60 * 60 * 1000;

async function lookupGeo(ip: string): Promise<{ country: string | null; city: string | null }> {
  const cached = geoCache.get(ip);
  if (cached && cached.expires > Date.now()) return cached;

  let country: string | null = null;
  let city: string | null = null;
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`,
      { signal: AbortSignal.timeout(2000), cache: "no-store" }
    );
    if (res.ok) {
      const geo = (await res.json()) as { status: string; country?: string; city?: string };
      if (geo.status === "success") {
        country = geo.country ?? null;
        city = geo.city ?? null;
      }
    }
  } catch {
    // Géolocalisation indisponible : on enregistre quand même la visite
  }

  const entry = { country, city, expires: Date.now() + GEO_CACHE_TTL_MS };
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

    let referrerHost: string | null = null;
    if (referrer) {
      try {
        referrerHost = new URL(referrer).host || null;
      } catch {
        referrerHost = null;
      }
    }

    const usableIp = ip && !isPrivateIp(ip) ? ip : null;
    const { country, city } = usableIp ? await lookupGeo(usableIp) : { country: null, city: null };
    const visitorHash = usableIp ? hashVisitor(usableIp) : null;

    await createAdminClient()
      .from("site_visits")
      .insert({ path, referrer_host: referrerHost, device, os, browser, country, city, visitor_hash: visitorHash });
  } catch (err) {
    console.error("trackVisit failed:", err);
  }
}
