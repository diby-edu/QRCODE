import { UAParser } from "ua-parser-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { anonymizeIp, isPrivateIp } from "@/lib/net";

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

    let country: string | null = null;
    let city: string | null = null;
    if (anonIp) {
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
        // Géolocalisation indisponible : on enregistre quand même le scan
      }
    }

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
