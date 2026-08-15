import { ImageResponse } from "next/og";

// Vignette affichée quand un lien vers le site est partagé (WhatsApp,
// Facebook, LinkedIn, X…). Générée à la construction plutôt que dessinée à
// la main : reprend le dégradé du logo (voir src/components/brand/Logo.tsx)
// et se met à jour toute seule si la marque change.
export const alt = "QRHub — QR codes dynamiques & statistiques";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 92,
            fontWeight: 800,
            letterSpacing: -3,
          }}
        >
          {/* Motif QR dessiné en div plutôt qu'en glyphe : Satori tente de
              télécharger une police pour tout caractère non latin (échec en
              build hors ligne), un carré vide s'affichant alors à la place. */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              width: 104,
              height: 104,
              padding: 14,
              borderRadius: 26,
              background: "rgba(255,255,255,0.16)",
            }}
          >
            {[1, 1, 0, 1, 0, 1, 0, 1, 1].map((on, i) => (
              <div
                key={i}
                style={{
                  width: 20,
                  height: 20,
                  margin: 2,
                  borderRadius: 4,
                  background: on ? "white" : "rgba(255,255,255,0.28)",
                }}
              />
            ))}
          </div>
          QRHub
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 38,
            opacity: 0.92,
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          QR codes dynamiques, personnalisés, avec statistiques en temps réel
        </div>
      </div>
    ),
    size
  );
}
