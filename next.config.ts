import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  serverExternalPackages: ["bcryptjs"],
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
