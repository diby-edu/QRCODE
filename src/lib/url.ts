export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** customDomain : domaine personnalisé actif du propriétaire du QR, s'il en a un
 * (voir active_custom_domain_for_user()) — remplace le domaine partagé. */
export function qrShortUrl(slug: string, customDomain?: string | null): string {
  if (customDomain) return `https://${customDomain}/q/${slug}`;
  return `${appUrl()}/q/${slug}`;
}
