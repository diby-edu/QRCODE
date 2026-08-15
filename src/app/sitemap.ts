import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/url";

/** Uniquement les pages publiques : rien de ce qui exige une connexion, et
 * aucune page de scan (voir robots.ts). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/gdpr`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
