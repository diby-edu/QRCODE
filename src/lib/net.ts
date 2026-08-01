/** Détecte les IP privées/locales (jamais géolocalisables) — source unique
 * partagée entre le tracking des scans QR et celui du trafic du site. */
export function isPrivateIp(ip: string): boolean {
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

/** Nginx (seul proxy de confiance devant l'appli) est configuré avec
 * `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`, qui
 * AJOUTE la vraie IP à la suite de ce que le client a éventuellement déjà
 * envoyé — il ne l'écrase pas. Un client malveillant peut donc falsifier
 * cet en-tête (ex. "X-Forwarded-For: 1.1.1.1"), nginx transmettant alors
 * "1.1.1.1, VRAIE_IP". Prendre le PREMIER élément lirait la valeur
 * falsifiée ; on prend le DERNIER, celui que seul nginx a pu ajouter. */
export function extractIp(forwardedFor: string | null): string | null {
  if (!forwardedFor) return null;
  const parts = forwardedFor.split(",");
  return parts[parts.length - 1]?.trim() || null;
}
