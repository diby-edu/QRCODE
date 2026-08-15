import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin();

// En-têtes de sécurité appliqués à toutes les réponses. Placés ici plutôt que
// dans nginx pour qu'ils soient versionnés avec le code et suivent
// automatiquement les domaines personnalisés des clients (chaque bloc nginx
// généré par scripts/add-custom-domain.sh proxifie vers la même app).
const SECURITY_HEADERS = [
  // Impose HTTPS pour les visites suivantes (le certificat vient de certbot,
  // voir DEPLOY.md § 9). Sans `preload` : c'est un engagement difficile à
  // annuler, à activer sciemment plus tard si souhaité.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Empêche l'affichage du site dans une iframe tierce — sans quoi le
  // tableau de bord est exposé au clickjacking (un attaquant superpose une
  // page piège au-dessus des vrais boutons).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Interdit au navigateur de "deviner" un type MIME différent de celui
  // annoncé (pertinent pour les fichiers uploadés par les utilisateurs).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Ne fuite pas l'URL complète (qui contient des slugs de QR) vers les
  // sites externes atteints depuis une page de scan.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Aucune page n'a besoin de ces capteurs.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  serverExternalPackages: ["bcryptjs"],
  // N'annonce pas la techno employée (x-powered-by: Next.js).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  experimental: {
    // Défaut Next.js 10 Mo — trop bas pour /api/upload (photos/vidéos).
    // Aligné sur client_max_body_size dans la config nginx (voir DEPLOY.md).
    proxyClientMaxBodySize: "25mb",
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
});
