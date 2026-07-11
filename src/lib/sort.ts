// Utilitaire de tri appelé depuis des Server Components — doit rester dans
// un module SANS "use client" : un fichier client ne peut exporter que des
// composants/props, jamais une fonction appelée directement côté serveur
// (Next.js lève une erreur runtime en production, silencieuse en dev).

export type SortDir = "asc" | "desc";

/** Lit sort/dir depuis les searchParams résolus d'une page serveur. */
export function readSort<T extends string>(
  params: { sort?: string; dir?: string },
  allowed: readonly T[],
  fallback: T
): { field: T; dir: SortDir } {
  const field = allowed.includes(params.sort as T) ? (params.sort as T) : fallback;
  const dir: SortDir = params.dir === "asc" ? "asc" : "desc";
  return { field, dir };
}
