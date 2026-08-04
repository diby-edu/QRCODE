import Script from "next/script";

// Identifiant de mesure Google Analytics 4. Public par nature (visible dans
// le source de n'importe quelle page), donc aucun secret ici — pas besoin
// d'en faire une variable d'environnement.
const GA_ID = "G-1EFWZ1G8KE";

/**
 * Charge Google Analytics (gtag.js) sur toutes les pages, uniquement en
 * production — le trafic de développement ne doit jamais polluer les
 * statistiques (même principe que le tracking interne dans src/proxy.ts).
 * `afterInteractive` : chargé tôt mais sans bloquer l'hydratation.
 */
export function GoogleAnalytics() {
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
