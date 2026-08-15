import { announcementId, getAnnouncement } from "@/lib/announcement";
import { NotificationBanner } from "@/components/shell/NotificationBanner";

/**
 * Bannière d'annonce sur les pages publiques (landing, contact, pages
 * légales). Rendue par SiteHeader, donc automatiquement présente partout où
 * l'en-tête public l'est — et nulle part ailleurs : les pages de scan /q/*
 * ont leur propre layout, un message d'exploitation de QRHub n'a rien à
 * faire sur la page publique d'un client.
 *
 * Réutilise NotificationBanner (et donc son stockage des bannières fermées) :
 * un visiteur qui ferme l'annonce ici ne la revoit pas après connexion.
 */
export async function SiteAnnouncement() {
  const announcement = await getAnnouncement();
  if (!announcement) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 lg:px-8">
      <NotificationBanner
        notifications={[
          {
            id: announcementId(announcement),
            level: "info",
            message: announcement,
          },
        ]}
      />
    </div>
  );
}
