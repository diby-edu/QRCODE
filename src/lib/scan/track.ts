import { UAParser } from "ua-parser-js";
import { createAdminClient } from "@/lib/supabase/admin";

function isPrivateIp(ip: string) {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith("fc") ||
    ip.startsWith("fe80")
  );
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

    let country: string | null = null;
    let city: string | null = null;
    if (ip && !isPrivateIp(ip)) {
      try {
        const res = await fetch(
          `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`,
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
      p_ip: ip,
    });
  } catch (err) {
    console.error("trackScan failed:", err);
  }
}

export function extractIp(forwardedFor: string | null): string | null {
  if (!forwardedFor) return null;
  return forwardedFor.split(",")[0]?.trim() || null;
}
