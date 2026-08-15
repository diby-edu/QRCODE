import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { WhatsAppBubble } from "@/components/WhatsAppBubble";
import { appUrl } from "@/lib/url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Créez des QR codes dynamiques personnalisés, suivez vos scans en temps réel et gérez tout depuis un tableau de bord moderne.";

export const metadata: Metadata = {
  // Sans metadataBase, les URL relatives (dont l'image OpenGraph générée par
  // src/app/opengraph-image.tsx) ne peuvent pas être résolues en absolu, et
  // les réseaux sociaux affichent le lien sans vignette.
  metadataBase: new URL(appUrl()),
  title: {
    default: "QRHub — QR codes dynamiques & statistiques",
    template: "%s · QRHub",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "QRHub",
    title: "QRHub — QR codes dynamiques & statistiques",
    description: DESCRIPTION,
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "QRHub — QR codes dynamiques & statistiques",
    description: DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          {children}
          <WhatsAppBubble />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
