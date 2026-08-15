import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/url";

/**
 * Les pages de scan /q/* sont exclues volontairement : ce sont les
 * destinations privées des clients (souvent une page unique par campagne),
 * elles envoient déjà `robots: { index: false }` dans leurs métadonnées.
 * L'espace connecté et les routes techniques n'ont rien à faire dans un
 * index non plus.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/q/", "/api/", "/admin", "/dashboard", "/qr", "/stats", "/folders", "/settings", "/billing", "/domain", "/auth/"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
