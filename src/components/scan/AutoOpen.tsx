"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * Ouvre automatiquement une URL à schéma non-http (tel:, mailto:) —
 * un 302 serveur vers ces schémas est mal géré par certains navigateurs.
 * Affiche un bouton de secours.
 */
export function AutoOpen({ url, label }: { url: string; label: string }) {
  const t = useTranslations("scan");

  useEffect(() => {
    window.location.href = url;
  }, [url]);

  return (
    <div className="card p-8 text-center">
      <p className="text-sm text-slate-500">{t("autoOpen")}</p>
      <a href={url} className="btn-primary mt-5 w-full">
        {label}
      </a>
    </div>
  );
}
