export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Chemin de redirection interne sûr, pour les paramètres `next` d'après
 * connexion. Tester `next.startsWith("/")` ne suffit PAS : "//evil.com" et
 * "/\evil.com" commencent bien par "/" mais sont des URL protocole-relatives
 * que le navigateur résout vers un domaine externe. D'où la redirection
 * ouverte : /auth/login?next=//evil.com affiche la vraie page de connexion,
 * puis expédie l'utilisateur chez l'attaquant une fois authentifié.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!next || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** customDomain : domaine personnalisé actif du propriétaire du QR, s'il en a un
 * (voir active_custom_domain_for_user()) — remplace le domaine partagé. */
export function qrShortUrl(slug: string, customDomain?: string | null): string {
  if (customDomain) return `https://${customDomain}/q/${slug}`;
  return `${appUrl()}/q/${slug}`;
}
