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

/**
 * Tronque une IP avant tout stockage ou envoi à un tiers : dernier octet en
 * IPv4 (192.168.1.37 → 192.168.1.0), 64 derniers bits en IPv6. La donnée
 * cesse d'identifier une personne — ce qui rend enfin exacte la mention
 * « statistiques anonymisées » de notre politique de confidentialité — tout
 * en restant suffisante pour la géolocalisation pays/ville, qui travaille de
 * toute façon à l'échelle du réseau et non de l'abonné.
 */
export function anonymizeIp(ip: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(":")) {
    const blocks = ip.split(":").slice(0, 4);
    return blocks.length === 4 ? `${blocks.join(":")}::` : null;
  }
  const octets = ip.split(".");
  return octets.length === 4 ? `${octets[0]}.${octets[1]}.${octets[2]}.0` : null;
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
