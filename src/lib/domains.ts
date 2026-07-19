import type { SupabaseClient } from "@supabase/supabase-js";

/** Domaines actifs d'un utilisateur — pour le sélecteur du formulaire QR. */
export async function fetchActiveDomains(
  supabase: SupabaseClient,
  userId: string
): Promise<{ id: string; domain: string }[]> {
  const { data } = await supabase
    .from("custom_domains")
    .select("id, domain")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("domain");
  return data ?? [];
}

/** Domaine d'un QR précis (null si aucun assigné, ou si le domaine assigné
 * n'est plus actif — retombe alors sur le domaine partagé par défaut). */
export async function resolveQrDomain(
  supabase: SupabaseClient,
  customDomainId: string | null
): Promise<string | null> {
  if (!customDomainId) return null;
  const { data } = await supabase
    .from("custom_domains")
    .select("domain")
    .eq("id", customDomainId)
    .eq("status", "active")
    .maybeSingle();
  return data?.domain ?? null;
}

/** Même résolution que resolveQrDomain, en masse pour une liste de QR codes
 * (évite le N+1 dans les tableaux/exports). */
export async function resolveQrDomainsBatch(
  supabase: SupabaseClient,
  customDomainIds: (string | null)[]
): Promise<Map<string, string>> {
  const ids = [...new Set(customDomainIds.filter((id): id is string => id != null))];
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from("custom_domains")
    .select("id, domain")
    .in("id", ids)
    .eq("status", "active");
  return new Map((data ?? []).map((d) => [d.id as string, d.domain as string]));
}
