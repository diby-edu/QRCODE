import { UAParser } from "ua-parser-js";
import { createAdminClient } from "@/lib/supabase/admin";

const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview/i;

/**
 * Enregistre une visite de page (trafic du site, distinct des scans de QR).
 * Conçu pour tourner en arrière-plan via event.waitUntil() dans src/proxy.ts :
 * ne bloque jamais la réponse, et toute erreur est silencieuse — l'analytics
 * ne doit jamais faire échouer une page.
 */
export async function trackVisit(
  path: string,
  userAgent: string | null,
  referrer: string | null
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

    await createAdminClient()
      .from("site_visits")
      .insert({ path, referrer_host: referrerHost, device });
  } catch (err) {
    console.error("trackVisit failed:", err);
  }
}
