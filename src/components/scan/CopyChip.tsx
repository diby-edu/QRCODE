"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** Valeur mise en évidence (code promo, mot de passe Wi-Fi…) avec bouton copier. */
export function CopyChip({ value, mono = true }: { value: string; mono?: boolean }) {
  const t = useTranslations("scan");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (http non sécurisé…) : rien à faire
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code
        className={`block flex-1 truncate rounded-lg border-2 border-dashed border-indigo-200 bg-indigo-50/60 px-4 py-3 text-center text-lg font-bold tracking-wider text-indigo-700 ${
          mono ? "font-mono" : "font-sans"
        }`}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        className="btn-secondary shrink-0"
        aria-live="polite"
      >
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
