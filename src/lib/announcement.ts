import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Bannière d'annonce saisie dans /admin/settings (« vide = masquée »).
 *
 * Lue avec le client service_role et non celui du visiteur : depuis la
 * migration 015, site_settings n'est plus lisible que par un admin — sans
 * quoi les clés PayDunya qui y sont stockées étaient exposées à tout
 * Internet. Or l'annonce s'adresse justement aux non-admins, et même aux
 * visiteurs anonymes sur les pages publiques.
 *
 * cache() : dédoublonne la requête au sein d'un même rendu (l'en-tête public
 * et le shell de l'application peuvent tous deux la demander).
 */
export const getAnnouncement = cache(async (): Promise<string> => {
  const { data } = await createAdminClient()
    .from("site_settings")
    .select("value")
    .eq("key", "announcement")
    .maybeSingle();
  return ((data?.value as { text?: string } | null)?.text ?? "").trim();
});

/**
 * L'identifiant dérive du texte : quand une NOUVELLE annonce est publiée,
 * elle réapparaît même chez ceux qui avaient fermé la précédente
 * (NotificationBanner mémorise les id fermés dans sessionStorage).
 */
export function announcementId(text: string): string {
  return `announcement-${text.slice(0, 40)}`;
}
