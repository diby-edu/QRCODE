// Encodage de contenus QR statiques (vCard, Wi-Fi, ICS…)

export type QrData = Record<string, unknown>;

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Échappe les caractères spéciaux du format WIFI: */
function escapeWifi(value: string) {
  return value.replace(/([\\;,:"'])/g, "\\$1");
}

export function buildWifiString(data: QrData): string {
  const security = s(data.security) || "WPA";
  const parts = [
    `T:${security === "nopass" ? "nopass" : security}`,
    `S:${escapeWifi(s(data.ssid))}`,
  ];
  if (security !== "nopass" && s(data.password)) {
    parts.push(`P:${escapeWifi(s(data.password))}`);
  }
  if (data.hidden === true || data.hidden === "true") parts.push("H:true");
  return `WIFI:${parts.join(";")};;`;
}

export function buildVCard(data: QrData): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  const first = s(data.firstName);
  const last = s(data.lastName);
  lines.push(`N:${last};${first};;;`);
  lines.push(`FN:${[first, last].filter(Boolean).join(" ")}`);
  if (s(data.organization)) lines.push(`ORG:${s(data.organization)}`);
  if (s(data.jobTitle)) lines.push(`TITLE:${s(data.jobTitle)}`);
  if (s(data.phone)) lines.push(`TEL;TYPE=WORK,VOICE:${s(data.phone)}`);
  if (s(data.mobile)) lines.push(`TEL;TYPE=CELL:${s(data.mobile)}`);
  if (s(data.email)) lines.push(`EMAIL:${s(data.email)}`);
  if (s(data.website)) lines.push(`URL:${s(data.website)}`);
  const addr = [s(data.address), s(data.city), s(data.country)];
  if (addr.some(Boolean)) {
    lines.push(`ADR;TYPE=WORK:;;${addr[0]};${addr[1]};;;${addr[2]}`);
  }
  if (s(data.note)) lines.push(`NOTE:${s(data.note)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function toIcsDate(value: unknown): string {
  const d = new Date(s(value));
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function buildICS(data: QrData): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//QRHub//FR",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@qrhub`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
  ];
  const start = toIcsDate(data.startDate);
  const end = toIcsDate(data.endDate);
  if (start) lines.push(`DTSTART:${start}`);
  if (end) lines.push(`DTEND:${end}`);
  lines.push(`SUMMARY:${s(data.title)}`);
  if (s(data.location)) lines.push(`LOCATION:${s(data.location)}`);
  if (s(data.description))
    lines.push(`DESCRIPTION:${s(data.description).replace(/\n/g, "\\n")}`);
  if (s(data.url)) lines.push(`URL:${s(data.url)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function normalizePhone(value: unknown): string {
  return s(value).replace(/[^\d+]/g, "");
}

export function buildMailto(data: QrData): string {
  const params = new URLSearchParams();
  if (s(data.subject)) params.set("subject", s(data.subject));
  if (s(data.body)) params.set("body", s(data.body));
  const qs = params.toString();
  return `mailto:${s(data.to)}${qs ? `?${qs}` : ""}`;
}

export function buildWhatsAppUrl(data: QrData): string {
  const phone = normalizePhone(data.phone).replace(/^\+/, "");
  const msg = s(data.message);
  return `https://wa.me/${phone}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
}

/** Garantit un schéma http(s) sur une URL saisie librement */
export function ensureHttp(value: unknown): string {
  const url = s(value);
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
