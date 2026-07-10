export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function qrShortUrl(slug: string): string {
  return `${appUrl()}/q/${slug}`;
}
