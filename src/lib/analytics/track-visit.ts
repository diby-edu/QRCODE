import { UAParser } from "ua-parser-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPrivateIp } from "@/lib/net";

const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview/i;

// Cache IP -> pays (process Node unique, pas serverless — voir le cache de
// domaine dans src/proxy.ts pour le même principe). ip-api.com est limité à
// 45 req/min : au niveau de trafic d'un site (contrairement aux scans QR,
// plus rares), interroger l'API à CHAQUE page vue serait risqué. La plupart
// des visites répétées viennent des mêmes IP (un visiteur qui navigue sur
// plusieurs pages, un bureau, un foyer) : ce cache ramène le taux d'appels
// réel à peu près au nombre d'IP uniques par heure, pas au nombre de pages
// vues — largement dans le quota gratuit à cette échelle.
const countryCache = new Map<string, { country: string | null; expires: number }>();
const COUNTRY_CACHE_TTL_MS = 60 * 60 * 1000;

async function lookupCountry(ip: string): Promise<string | null> {
  const cached = countryCache.get(ip);
  if (cached && cached.expires > Date.now()) return cached.country;

  let country: string | null = null;
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country`,
      { signal: AbortSignal.timeout(2000), cache: "no-store" }
    );
    if (res.ok) {
      const geo = (await res.json()) as { status: string; country?: string };
      if (geo.status === "success") country = geo.country ?? null;
    }
  } catch {
    // Géolocalisation indisponible : on enregistre quand même la visite
  }

  countryCache.set(ip, { country, expires: Date.now() + COUNTRY_CACHE_TTL_MS });
  return country;
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

    const device = userAgent ? (UAParser(userAgent).device.type ?? "desktop") : null;

    let referrerHost: string | null = null;
    if (referrer) {
      try {
        referrerHost = new URL(referrer).host || null;
      } catch {
        referrerHost = null;
      }
    }

    const country = ip && !isPrivateIp(ip) ? await lookupCountry(ip) : null;

    await createAdminClient()
      .from("site_visits")
      .insert({ path, referrer_host: referrerHost, device, country });
  } catch (err) {
    console.error("trackVisit failed:", err);
  }
}
