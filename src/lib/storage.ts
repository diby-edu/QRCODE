// Helpers partagés pour les fichiers utilisateur dans Supabase Storage
// (buckets logos/uploads/qr-previews). Source unique pour parser une URL
// publique, copier ou supprimer l'objet correspondant — évite que chaque
// composant réimplémente son propre parsing d'URL (fragile et divergent).

import type { SupabaseClient } from "@supabase/supabase-js";

const USER_BUCKETS = ["logos", "uploads", "qr-previews"] as const;
export type UserBucket = (typeof USER_BUCKETS)[number];

export interface StorageRef {
  bucket: UserBucket;
  path: string;
}

/** Extrait bucket + chemin d'une URL publique Supabase Storage, sinon null. */
export function parseStorageUrl(url: string): StorageRef | null {
  for (const bucket of USER_BUCKETS) {
    const marker = `/object/public/${bucket}/`;
    const index = url.indexOf(marker);
    if (index !== -1) {
      const path = decodeURIComponent(url.slice(index + marker.length));
      return { bucket, path };
    }
  }
  return null;
}

/** Supprime le fichier pointé par une URL publique (silencieux si non reconnue). */
export async function deleteStorageUrl(
  supabase: SupabaseClient,
  url: string
): Promise<void> {
  const ref = parseStorageUrl(url);
  if (!ref) return;
  await supabase.storage.from(ref.bucket).remove([ref.path]);
}

/**
 * Copie le fichier pointé par une URL publique vers un nouveau chemin sous
 * `userId/`, et renvoie la nouvelle URL publique. Utilisé à la duplication
 * d'un QR code : chaque copie doit posséder ses propres fichiers, jamais
 * partager un objet Storage que l'une des deux pourrait supprimer.
 * Renvoie l'URL d'origine inchangée si elle ne pointe pas vers notre Storage.
 */
export async function duplicateStorageUrl(
  supabase: SupabaseClient,
  url: string,
  userId: string
): Promise<string> {
  const ref = parseStorageUrl(url);
  if (!ref) return url;

  const ext = ref.path.split(".").pop() ?? "bin";
  const newPath = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(ref.bucket)
    .copy(ref.path, newPath);
  if (error) return url; // échec de copie : on garde l'URL d'origine plutôt que de casser la duplication

  const { data } = supabase.storage.from(ref.bucket).getPublicUrl(newPath);
  return data.publicUrl;
}

/**
 * Duplique tous les fichiers référencés par les champs de type "file" d'un
 * type de QR (photos, vidéo, logo…) et renvoie une copie de `data` avec les
 * nouvelles URLs. Générique : couvre tout type présent ou futur du registre
 * sans cas particulier par type.
 */
export async function duplicateFileFields(
  supabase: SupabaseClient,
  fields: { name: string; type: string }[],
  data: Record<string, unknown>,
  userId: string
): Promise<Record<string, unknown>> {
  const next = { ...data };
  for (const field of fields) {
    if (field.type !== "file") continue;
    const value = next[field.name];
    if (Array.isArray(value)) {
      next[field.name] = await Promise.all(
        value
          .filter((v): v is string => typeof v === "string" && v.length > 0)
          .map((url) => duplicateStorageUrl(supabase, url, userId))
      );
    } else if (typeof value === "string" && value) {
      next[field.name] = await duplicateStorageUrl(supabase, value, userId);
    }
  }
  return next;
}
