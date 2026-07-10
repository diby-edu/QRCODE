// Coercitions sûres pour les données JSONB des QR (saisies utilisateur).

export const str = (v: unknown): string =>
  typeof v === "string" ? v.trim() : "";

export const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export const objArr = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    : [];

export interface LandingProps {
  title: string;
  data: Record<string, unknown>;
  locale: string;
}
