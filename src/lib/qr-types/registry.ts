// Registre central des types de QR codes. Chaque entrée pilote :
// le formulaire de création/édition, l'encodage statique éventuel,
// et le comportement au scan (redirection ou page publique).

import {
  buildICS,
  buildMailto,
  buildVCard,
  buildWhatsAppUrl,
  buildWifiString,
  ensureHttp,
  normalizePhone,
  type QrData,
} from "./encoders";

export type LString = { fr: string; en: string };

export type FieldType =
  | "text"
  | "url"
  | "textarea"
  | "tel"
  | "email"
  | "number"
  | "select"
  | "date"
  | "datetime"
  | "file"
  | "toggle"
  | "list";

export interface FieldDef {
  name: string;
  type: FieldType;
  label: LString;
  placeholder?: string;
  hint?: LString;
  required?: boolean;
  options?: { value: string; label: LString }[];
  accept?: string; // file: types MIME acceptés
  multiple?: boolean; // file: plusieurs fichiers
  fields?: FieldDef[]; // list: champs de chaque élément
  maxItems?: number;
  rows?: number;
  half?: boolean; // hint de mise en page (demi-largeur)
}

export type QrCategory =
  | "links"
  | "contact"
  | "social"
  | "business"
  | "content"
  | "utility";

export interface QrTypeDef {
  id: string;
  category: QrCategory;
  icon: string;
  name: LString;
  description: LString;
  fields: FieldDef[];
  /** Peut être encodé directement dans le QR (pas d'URL courte) */
  canBeStatic: boolean;
  staticEncoder?: (data: QrData) => string;
  /** Au scan d'un QR dynamique : redirection ou page publique */
  scanBehavior: "redirect" | "landing";
  getRedirectUrl?: (data: QrData) => string | null;
}

export const CATEGORIES: { id: QrCategory; name: LString; icon: string }[] = [
  { id: "links", name: { fr: "Liens", en: "Links" }, icon: "🔗" },
  { id: "contact", name: { fr: "Contact", en: "Contact" }, icon: "👤" },
  { id: "social", name: { fr: "Réseaux sociaux", en: "Social media" }, icon: "💬" },
  { id: "business", name: { fr: "Business", en: "Business" }, icon: "💼" },
  { id: "content", name: { fr: "Contenu", en: "Content" }, icon: "📁" },
  { id: "utility", name: { fr: "Utilitaires", en: "Utilities" }, icon: "🛠️" },
];

const urlField = (over: Partial<FieldDef> = {}): FieldDef => ({
  name: "url",
  type: "url",
  label: { fr: "URL", en: "URL" },
  placeholder: "https://…",
  required: true,
  ...over,
});

export const QR_TYPES: QrTypeDef[] = [
  // ------------------------------------------------- Liens
  {
    id: "website",
    category: "links",
    icon: "🌐",
    name: { fr: "Site web", en: "Website" },
    description: {
      fr: "Redirige vers n'importe quelle page web",
      en: "Redirects to any web page",
    },
    fields: [urlField({ placeholder: "https://mon-site.com" })],
    canBeStatic: true,
    staticEncoder: (d) => ensureHttp(d.url),
    scanBehavior: "redirect",
    getRedirectUrl: (d) => ensureHttp(d.url) || null,
  },
  {
    id: "facebook",
    category: "links",
    icon: "📘",
    name: { fr: "Facebook", en: "Facebook" },
    description: {
      fr: "Vers votre page ou profil Facebook",
      en: "To your Facebook page or profile",
    },
    fields: [urlField({ placeholder: "https://facebook.com/mapage" })],
    canBeStatic: true,
    staticEncoder: (d) => ensureHttp(d.url),
    scanBehavior: "redirect",
    getRedirectUrl: (d) => ensureHttp(d.url) || null,
  },
  {
    id: "instagram",
    category: "links",
    icon: "📸",
    name: { fr: "Instagram", en: "Instagram" },
    description: {
      fr: "Vers votre profil Instagram",
      en: "To your Instagram profile",
    },
    fields: [
      {
        name: "username",
        type: "text",
        label: { fr: "Nom d'utilisateur", en: "Username" },
        placeholder: "moncompte",
        required: true,
      },
    ],
    canBeStatic: true,
    staticEncoder: (d) =>
      `https://instagram.com/${String(d.username ?? "").replace(/^@/, "").trim()}`,
    scanBehavior: "redirect",
    getRedirectUrl: (d) =>
      `https://instagram.com/${String(d.username ?? "").replace(/^@/, "").trim()}`,
  },
  {
    id: "video",
    category: "links",
    icon: "🎬",
    name: { fr: "Vidéo", en: "Video" },
    description: {
      fr: "YouTube, TikTok, Vimeo…",
      en: "YouTube, TikTok, Vimeo…",
    },
    fields: [urlField({ placeholder: "https://youtube.com/watch?v=…" })],
    canBeStatic: true,
    staticEncoder: (d) => ensureHttp(d.url),
    scanBehavior: "redirect",
    getRedirectUrl: (d) => ensureHttp(d.url) || null,
  },
  {
    id: "app",
    category: "links",
    icon: "📱",
    name: { fr: "Applications", en: "Apps" },
    description: {
      fr: "App Store / Play Store selon l'appareil",
      en: "App Store / Play Store based on device",
    },
    fields: [
      {
        name: "appName",
        type: "text",
        label: { fr: "Nom de l'application", en: "App name" },
        required: true,
      },
      {
        name: "playStoreUrl",
        type: "url",
        label: { fr: "Lien Play Store (Android)", en: "Play Store link (Android)" },
        placeholder: "https://play.google.com/store/apps/…",
      },
      {
        name: "appStoreUrl",
        type: "url",
        label: { fr: "Lien App Store (iOS)", en: "App Store link (iOS)" },
        placeholder: "https://apps.apple.com/…",
      },
      {
        name: "fallbackUrl",
        type: "url",
        label: { fr: "Lien de secours (autres)", en: "Fallback link (others)" },
        placeholder: "https://mon-site.com",
      },
    ],
    canBeStatic: false,
    scanBehavior: "landing",
  },
  {
    id: "links",
    category: "links",
    icon: "🌳",
    name: { fr: "Liste de liens", en: "Link list" },
    description: {
      fr: "Une page regroupant tous vos liens (type Linktree)",
      en: "One page for all your links (Linktree style)",
    },
    fields: [
      {
        name: "pageTitle",
        type: "text",
        label: { fr: "Titre de la page", en: "Page title" },
        required: true,
      },
      {
        name: "description",
        type: "textarea",
        label: { fr: "Description", en: "Description" },
        rows: 2,
      },
      {
        name: "links",
        type: "list",
        label: { fr: "Liens", en: "Links" },
        maxItems: 20,
        fields: [
          {
            name: "label",
            type: "text",
            label: { fr: "Libellé", en: "Label" },
            required: true,
            half: true,
          },
          urlField({ half: true }),
        ],
      },
    ],
    canBeStatic: false,
    scanBehavior: "landing",
  },

  // ------------------------------------------------- Contact
  {
    id: "vcard",
    category: "contact",
    icon: "💳",
    name: { fr: "vCard", en: "vCard" },
    description: {
      fr: "Carte de visite numérique à enregistrer",
      en: "Digital business card to save",
    },
    fields: [
      { name: "firstName", type: "text", label: { fr: "Prénom", en: "First name" }, required: true, half: true },
      { name: "lastName", type: "text", label: { fr: "Nom", en: "Last name" }, required: true, half: true },
      { name: "organization", type: "text", label: { fr: "Entreprise", en: "Company" }, half: true },
      { name: "jobTitle", type: "text", label: { fr: "Fonction", en: "Job title" }, half: true },
      { name: "phone", type: "tel", label: { fr: "Téléphone fixe", en: "Phone" }, half: true },
      { name: "mobile", type: "tel", label: { fr: "Mobile", en: "Mobile" }, half: true },
      { name: "email", type: "email", label: { fr: "Email", en: "Email" }, half: true },
      { name: "website", type: "url", label: { fr: "Site web", en: "Website" }, half: true },
      { name: "address", type: "text", label: { fr: "Adresse", en: "Address" } },
      { name: "city", type: "text", label: { fr: "Ville", en: "City" }, half: true },
      { name: "country", type: "text", label: { fr: "Pays", en: "Country" }, half: true },
      { name: "note", type: "textarea", label: { fr: "Note", en: "Note" }, rows: 2 },
    ],
    canBeStatic: true,
    staticEncoder: buildVCard,
    scanBehavior: "landing",
  },
  {
    id: "whatsapp",
    category: "contact",
    icon: "💚",
    name: { fr: "WhatsApp", en: "WhatsApp" },
    description: {
      fr: "Ouvre une conversation WhatsApp",
      en: "Opens a WhatsApp chat",
    },
    fields: [
      {
        name: "phone",
        type: "tel",
        label: { fr: "Numéro (avec indicatif)", en: "Number (with country code)" },
        placeholder: "+225 07 00 00 00 00",
        required: true,
      },
      {
        name: "message",
        type: "textarea",
        label: { fr: "Message pré-rempli", en: "Pre-filled message" },
        rows: 2,
      },
    ],
    canBeStatic: true,
    staticEncoder: buildWhatsAppUrl,
    scanBehavior: "redirect",
    getRedirectUrl: buildWhatsAppUrl,
  },
  {
    id: "email",
    category: "contact",
    icon: "✉️",
    name: { fr: "Email", en: "Email" },
    description: {
      fr: "Ouvre un email pré-rempli",
      en: "Opens a pre-filled email",
    },
    fields: [
      { name: "to", type: "email", label: { fr: "Destinataire", en: "Recipient" }, required: true },
      { name: "subject", type: "text", label: { fr: "Objet", en: "Subject" } },
      { name: "body", type: "textarea", label: { fr: "Message", en: "Message" }, rows: 3 },
    ],
    canBeStatic: true,
    staticEncoder: buildMailto,
    scanBehavior: "redirect",
    getRedirectUrl: buildMailto,
  },
  {
    id: "phone",
    category: "contact",
    icon: "📞",
    name: { fr: "Téléphone", en: "Phone" },
    description: { fr: "Lance un appel téléphonique", en: "Starts a phone call" },
    fields: [
      {
        name: "phone",
        type: "tel",
        label: { fr: "Numéro (avec indicatif)", en: "Number (with country code)" },
        placeholder: "+225 07 00 00 00 00",
        required: true,
      },
    ],
    canBeStatic: true,
    staticEncoder: (d) => `tel:${normalizePhone(d.phone)}`,
    scanBehavior: "redirect",
    getRedirectUrl: (d) => `tel:${normalizePhone(d.phone)}`,
  },

  // ------------------------------------------------- Réseaux sociaux
  {
    id: "social",
    category: "social",
    icon: "🌟",
    name: { fr: "Réseaux sociaux", en: "Social hub" },
    description: {
      fr: "Une page regroupant tous vos réseaux",
      en: "One page for all your social profiles",
    },
    fields: [
      {
        name: "pageTitle",
        type: "text",
        label: { fr: "Titre de la page", en: "Page title" },
        required: true,
      },
      {
        name: "description",
        type: "textarea",
        label: { fr: "Description", en: "Description" },
        rows: 2,
      },
      {
        name: "networks",
        type: "list",
        label: { fr: "Réseaux", en: "Networks" },
        maxItems: 12,
        fields: [
          {
            name: "network",
            type: "select",
            label: { fr: "Réseau", en: "Network" },
            required: true,
            half: true,
            options: [
              { value: "facebook", label: { fr: "Facebook", en: "Facebook" } },
              { value: "instagram", label: { fr: "Instagram", en: "Instagram" } },
              { value: "x", label: { fr: "X (Twitter)", en: "X (Twitter)" } },
              { value: "tiktok", label: { fr: "TikTok", en: "TikTok" } },
              { value: "youtube", label: { fr: "YouTube", en: "YouTube" } },
              { value: "linkedin", label: { fr: "LinkedIn", en: "LinkedIn" } },
              { value: "snapchat", label: { fr: "Snapchat", en: "Snapchat" } },
              { value: "telegram", label: { fr: "Telegram", en: "Telegram" } },
              { value: "whatsapp", label: { fr: "WhatsApp", en: "WhatsApp" } },
              { value: "website", label: { fr: "Site web", en: "Website" } },
            ],
          },
          urlField({ half: true }),
        ],
      },
    ],
    canBeStatic: false,
    scanBehavior: "landing",
  },

  // ------------------------------------------------- Business
  {
    id: "business",
    category: "business",
    icon: "🏢",
    name: { fr: "Entreprise", en: "Company" },
    description: {
      fr: "Page de présentation de votre entreprise",
      en: "Your company presentation page",
    },
    fields: [
      { name: "name", type: "text", label: { fr: "Nom de l'entreprise", en: "Company name" }, required: true },
      { name: "tagline", type: "text", label: { fr: "Slogan", en: "Tagline" } },
      { name: "description", type: "textarea", label: { fr: "Description", en: "Description" }, rows: 3 },
      { name: "phone", type: "tel", label: { fr: "Téléphone", en: "Phone" }, half: true },
      { name: "email", type: "email", label: { fr: "Email", en: "Email" }, half: true },
      { name: "website", type: "url", label: { fr: "Site web", en: "Website" } },
      { name: "address", type: "text", label: { fr: "Adresse", en: "Address" } },
      {
        name: "hours",
        type: "textarea",
        label: { fr: "Horaires", en: "Opening hours" },
        rows: 3,
        hint: {
          fr: "Une ligne par jour, ex. : Lun–Ven : 8h–18h",
          en: "One line per day, e.g.: Mon–Fri: 8am–6pm",
        },
      },
      {
        name: "cover",
        type: "file",
        label: { fr: "Photo de couverture (optionnelle)", en: "Cover photo (optional)" },
        accept: "image/*",
      },
      {
        name: "photos",
        type: "file",
        label: { fr: "Photos (optionnelles)", en: "Photos (optional)" },
        accept: "image/*",
        multiple: true,
      },
      {
        name: "video",
        type: "file",
        label: { fr: "Vidéo de présentation (optionnelle)", en: "Presentation video (optional)" },
        accept: "video/*",
        hint: {
          fr: "MP4 recommandé, léger (moins de 50 Mo) pour un chargement rapide.",
          en: "MP4 recommended, small (under 50 MB) so it loads fast.",
        },
      },
    ],
    canBeStatic: false,
    scanBehavior: "landing",
  },
  {
    id: "menu",
    category: "business",
    icon: "🍽️",
    name: { fr: "Menu de restaurant", en: "Restaurant menu" },
    description: {
      fr: "Menu consultable en scannant le QR",
      en: "Menu customers open by scanning",
    },
    fields: [
      { name: "restaurantName", type: "text", label: { fr: "Nom du restaurant", en: "Restaurant name" }, required: true },
      { name: "description", type: "textarea", label: { fr: "Description", en: "Description" }, rows: 2 },
      {
        name: "currency",
        type: "text",
        label: { fr: "Devise", en: "Currency" },
        placeholder: "FCFA",
        half: true,
      },
      {
        name: "sections",
        type: "list",
        label: { fr: "Sections du menu", en: "Menu sections" },
        maxItems: 15,
        fields: [
          { name: "name", type: "text", label: { fr: "Nom de la section", en: "Section name" }, placeholder: "Entrées", required: true },
          {
            name: "items",
            type: "textarea",
            label: { fr: "Plats (un par ligne)", en: "Items (one per line)" },
            rows: 4,
            required: true,
            hint: {
              fr: "Format : Nom du plat | Prix | Description (optionnelle)",
              en: "Format: Item name | Price | Description (optional)",
            },
            placeholder: "Poulet braisé | 5000 | Avec attiéké et sauce tomate",
          },
        ],
      },
    ],
    canBeStatic: false,
    scanBehavior: "landing",
  },
  {
    id: "coupon",
    category: "business",
    icon: "🎟️",
    name: { fr: "Bon de réduction", en: "Coupon" },
    description: {
      fr: "Coupon avec code promotionnel",
      en: "Coupon with a promo code",
    },
    fields: [
      { name: "businessName", type: "text", label: { fr: "Nom du commerce", en: "Business name" }, required: true },
      { name: "offer", type: "text", label: { fr: "Offre", en: "Offer" }, placeholder: "-20% sur tout le magasin", required: true },
      { name: "code", type: "text", label: { fr: "Code promo", en: "Promo code" }, placeholder: "PROMO20", required: true },
      { name: "description", type: "textarea", label: { fr: "Détails", en: "Details" }, rows: 2 },
      { name: "validUntil", type: "date", label: { fr: "Valable jusqu'au", en: "Valid until" }, half: true },
      { name: "terms", type: "textarea", label: { fr: "Conditions", en: "Terms" }, rows: 2 },
    ],
    canBeStatic: false,
    scanBehavior: "landing",
  },
  {
    id: "payment",
    category: "business",
    icon: "💰",
    name: { fr: "Paiement", en: "Payment" },
    description: {
      fr: "Page de paiement avec lien et instructions",
      en: "Payment page with link and instructions",
    },
    fields: [
      { name: "title", type: "text", label: { fr: "Titre", en: "Title" }, placeholder: "Payer ma boutique", required: true },
      { name: "amount", type: "text", label: { fr: "Montant", en: "Amount" }, placeholder: "5000", half: true },
      { name: "currency", type: "text", label: { fr: "Devise", en: "Currency" }, placeholder: "FCFA", half: true },
      {
        name: "paymentUrl",
        type: "url",
        label: { fr: "Lien de paiement", en: "Payment link" },
        hint: {
          fr: "Wave, Orange Money, PayDunya, PayPal…",
          en: "Wave, Orange Money, PayDunya, PayPal…",
        },
      },
      { name: "instructions", type: "textarea", label: { fr: "Instructions", en: "Instructions" }, rows: 3 },
    ],
    canBeStatic: false,
    scanBehavior: "landing",
  },

  // ------------------------------------------------- Contenu
  {
    id: "pdf",
    category: "content",
    icon: "📄",
    name: { fr: "PDF", en: "PDF" },
    description: {
      fr: "Partagez un document PDF",
      en: "Share a PDF document",
    },
    fields: [
      { name: "title", type: "text", label: { fr: "Titre du document", en: "Document title" }, required: true },
      { name: "description", type: "textarea", label: { fr: "Description", en: "Description" }, rows: 2 },
      {
        name: "file",
        type: "file",
        label: { fr: "Fichier PDF", en: "PDF file" },
        accept: "application/pdf",
        required: true,
      },
    ],
    canBeStatic: false,
    scanBehavior: "landing",
  },
  {
    id: "images",
    category: "content",
    icon: "🖼️",
    name: { fr: "Images", en: "Images" },
    description: {
      fr: "Galerie de photos",
      en: "Photo gallery",
    },
    fields: [
      { name: "title", type: "text", label: { fr: "Titre de la galerie", en: "Gallery title" }, required: true },
      { name: "description", type: "textarea", label: { fr: "Description", en: "Description" }, rows: 2 },
      {
        name: "files",
        type: "file",
        label: { fr: "Images", en: "Images" },
        accept: "image/*",
        multiple: true,
        required: true,
      },
    ],
    canBeStatic: false,
    scanBehavior: "landing",
  },
  {
    id: "mp3",
    category: "content",
    icon: "🎵",
    name: { fr: "MP3", en: "MP3" },
    description: {
      fr: "Lecteur audio en ligne",
      en: "Online audio player",
    },
    fields: [
      { name: "title", type: "text", label: { fr: "Titre", en: "Title" }, required: true },
      { name: "artist", type: "text", label: { fr: "Artiste", en: "Artist" }, half: true },
      {
        name: "file",
        type: "file",
        label: { fr: "Fichier audio", en: "Audio file" },
        accept: "audio/*",
        required: true,
      },
      {
        name: "cover",
        type: "file",
        label: { fr: "Pochette (optionnelle)", en: "Cover (optional)" },
        accept: "image/*",
      },
    ],
    canBeStatic: false,
    scanBehavior: "landing",
  },
  {
    id: "videofile",
    category: "content",
    icon: "📹",
    name: { fr: "Vidéo (fichier)", en: "Video (file)" },
    description: {
      fr: "Hébergez votre vidéo, lue directement au scan",
      en: "Host your video, played right on scan",
    },
    fields: [
      { name: "title", type: "text", label: { fr: "Titre", en: "Title" }, required: true },
      {
        name: "description",
        type: "textarea",
        label: { fr: "Description", en: "Description" },
        rows: 2,
      },
      {
        name: "file",
        type: "file",
        label: { fr: "Fichier vidéo", en: "Video file" },
        accept: "video/*",
        required: true,
        hint: {
          fr: "MP4 recommandé. Gardez le fichier léger (moins de 50 Mo) pour un chargement rapide au scan.",
          en: "MP4 recommended. Keep the file small (under 50 MB) so it loads fast on scan.",
        },
      },
      {
        name: "cover",
        type: "file",
        label: { fr: "Miniature (optionnelle)", en: "Thumbnail (optional)" },
        accept: "image/*",
      },
    ],
    canBeStatic: false,
    scanBehavior: "landing",
  },
  {
    id: "text",
    category: "content",
    icon: "📝",
    name: { fr: "Texte", en: "Text" },
    description: {
      fr: "Affiche un texte simple",
      en: "Displays plain text",
    },
    fields: [
      { name: "title", type: "text", label: { fr: "Titre", en: "Title" } },
      {
        name: "content",
        type: "textarea",
        label: { fr: "Texte", en: "Text" },
        rows: 6,
        required: true,
      },
    ],
    canBeStatic: true,
    staticEncoder: (d) => String(d.content ?? ""),
    scanBehavior: "landing",
  },

  // ------------------------------------------------- Utilitaires
  {
    id: "wifi",
    category: "utility",
    icon: "📶",
    name: { fr: "Wi-Fi", en: "Wi-Fi" },
    description: {
      fr: "Connexion automatique au réseau",
      en: "Automatic network connection",
    },
    fields: [
      { name: "ssid", type: "text", label: { fr: "Nom du réseau (SSID)", en: "Network name (SSID)" }, required: true },
      {
        name: "security",
        type: "select",
        label: { fr: "Sécurité", en: "Security" },
        half: true,
        options: [
          { value: "WPA", label: { fr: "WPA / WPA2", en: "WPA / WPA2" } },
          { value: "WEP", label: { fr: "WEP", en: "WEP" } },
          { value: "nopass", label: { fr: "Aucune", en: "None" } },
        ],
      },
      { name: "password", type: "text", label: { fr: "Mot de passe", en: "Password" }, half: true },
      { name: "hidden", type: "toggle", label: { fr: "Réseau masqué", en: "Hidden network" } },
    ],
    canBeStatic: true,
    staticEncoder: buildWifiString,
    scanBehavior: "landing",
  },
  {
    id: "geo",
    category: "utility",
    icon: "📍",
    name: { fr: "Géolocalisation", en: "Location" },
    description: {
      fr: "Ouvre un point sur la carte",
      en: "Opens a point on the map",
    },
    fields: [
      { name: "latitude", type: "text", label: { fr: "Latitude", en: "Latitude" }, placeholder: "5.3599", required: true, half: true },
      { name: "longitude", type: "text", label: { fr: "Longitude", en: "Longitude" }, placeholder: "-4.0083", required: true, half: true },
      { name: "placeName", type: "text", label: { fr: "Nom du lieu", en: "Place name" } },
    ],
    canBeStatic: true,
    staticEncoder: (d) => `geo:${String(d.latitude).trim()},${String(d.longitude).trim()}`,
    scanBehavior: "redirect",
    getRedirectUrl: (d) =>
      `https://maps.google.com/?q=${String(d.latitude).trim()},${String(d.longitude).trim()}`,
  },
  {
    id: "event",
    category: "utility",
    icon: "📅",
    name: { fr: "Événement", en: "Event" },
    description: {
      fr: "Ajout au calendrier en un scan",
      en: "Add to calendar in one scan",
    },
    fields: [
      { name: "title", type: "text", label: { fr: "Nom de l'événement", en: "Event name" }, required: true },
      { name: "location", type: "text", label: { fr: "Lieu", en: "Location" } },
      { name: "startDate", type: "datetime", label: { fr: "Début", en: "Start" }, required: true, half: true },
      { name: "endDate", type: "datetime", label: { fr: "Fin", en: "End" }, half: true },
      { name: "description", type: "textarea", label: { fr: "Description", en: "Description" }, rows: 3 },
      { name: "url", type: "url", label: { fr: "Lien (billetterie…)", en: "Link (tickets…)" } },
    ],
    canBeStatic: true,
    staticEncoder: buildICS,
    scanBehavior: "landing",
  },
];

export function getQrType(id: string): QrTypeDef | undefined {
  return QR_TYPES.find((t) => t.id === id);
}

export function typesByCategory(category: QrCategory): QrTypeDef[] {
  return QR_TYPES.filter((t) => t.category === category);
}
