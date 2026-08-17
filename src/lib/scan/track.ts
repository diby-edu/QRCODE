import { UAParser } from "ua-parser-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { anonymizeIp, isPrivateIp } from "@/lib/net";

// Cache réseau -> géolocalisation (process Node unique, pas serverless —
// même principe que dans src/lib/analytics/track-visit.ts).
//
// Sans lui, CHAQUE scan appelait ip-api.com, dont l'offre gratuite plafonne à
// 45 requêtes/minute pour tout le serveur : une affiche scannée par une foule
// — le moment où le produit sert le plus — épuisait le quota, et plus
// personne n'obtenait pays/ville. C'est aussi ce qui rendait tentant de poser
// une limite de débit nginx sur /q/, au risque de bloquer de vrais scans
// derrière le NAT des opérateurs mobiles (voir RATE-LIMITING.md § 3.1).
//
// La clé est l'IP DÉJÀ TRONQUÉE, donc un /24 entier : tous les abonnés d'un
// même réseau partagent une seule entrée, ce qui rend les collisions
// fréquentes et le cache très efficace.
const geoCache = new Map<string, { country: string | null; city: string | null; expires: number }>();
const GEO_CACHE_TTL_MS = 60 * 60 * 1000;
// Purge des entrées expirées au-delà de ce seuil : une Map qui ne perd jamais
// d'entrée fuit lentement sur un process qui tourne des mois.
const GEO_CACHE_MAX_ENTRIES = 5000;

async function lookupGeo(
  anonIp: string
): Promise<{ country: string | null; city: string | null }> {
  const cached = geoCache.get(anonIp);
  if (cached && cached.expires > Date.now()) {
    return { country: cached.country, city: cached.city };
  }

  let country: string | null = null;
  let city: string | null = null;
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(anonIp)}?fields=status,country,city`,
      { signal: AbortSignal.timeout(2000), cache: "no-store" }
    );
    if (res.ok) {
      const geo = (await res.json()) as {
        status: string;
        country?: string;
        city?: string;
      };
      if (geo.status === "success") {
        country = geo.country ?? null;
        city = geo.city ?? null;
      }
    }
  } catch {
    // Géolocalisation indisponible : on enregistre quand même le scan.
    // Volontairement NON mis en cache, pour retenter au scan suivant.
    return { country: null, city: null };
  }

  if (geoCache.size >= GEO_CACHE_MAX_ENTRIES) {
    const now = Date.now();
    for (const [key, entry] of geoCache) {
      if (entry.expires <= now) geoCache.delete(key);
    }
  }
  geoCache.set(anonIp, { country, city, expires: Date.now() + GEO_CACHE_TTL_MS });
  return { country, city };
}

/**
 * Enregistre un scan (appareil, navigateur, OS, pays/ville via IP).
 * Conçu pour tourner dans after() : ne bloque jamais la réponse,
 * et toute erreur (géo indisponible, etc.) est silencieuse.
 */
export async function trackScan(
  qrCodeId: string,
  userAgent: string | null,
  ip: string | null
) {
  try {
    const parsed = UAParser(userAgent ?? "");
    const device = parsed.device.type ?? "desktop";
    const browser = parsed.browser.name ?? null;
    const os = parsed.os.name ?? null;

    // IP tronquée AVANT la géolocalisation et avant l'écriture en base :
    // ip-api.com est interrogé en HTTP simple (l'offre gratuite n'expose pas
    // HTTPS), donc aucune IP complète ne doit sortir du serveur en clair.
    // La précision pays/ville est préservée : les bases de géolocalisation
    // raisonnent par plage réseau, pas par abonné.
    const anonIp = ip && !isPrivateIp(ip) ? anonymizeIp(ip) : null;

    const { country, city } = anonIp
      ? await lookupGeo(anonIp)
      : { country: null, city: null };

    const admin = createAdminClient();
    await admin.rpc("record_scan", {
      p_qr_code_id: qrCodeId,
      p_country: country,
      p_city: city,
      p_device: device,
      p_browser: browser,
      p_os: os,
      p_ip: anonIp,
    });
  } catch (err) {
    console.error("trackScan failed:", err);
  }
}

export { extractIp } from "@/lib/net";
