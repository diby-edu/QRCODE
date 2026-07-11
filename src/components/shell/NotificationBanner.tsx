"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AppNotification } from "./AppShell";

const DISMISSED_KEY = "qrhub_dismissed_notifications";

function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

/** Bannières d'alerte (limites de plan, abonnement bientôt expiré) —
 * fermeture mémorisée pour la session du navigateur uniquement. */
export function NotificationBanner({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Lecture ponctuelle de sessionStorage au montage : sûr côté SSR (le
    // rendu serveur/premier rendu client démarrent tous deux avec un Set
    // vide, identiques), puis synchronisé avec l'état du navigateur.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(readDismissed());
  }, []);

  const visible = notifications.filter((n) => !dismissed.has(n.id));
  if (visible.length === 0) return null;

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
  }

  return (
    <div className="mb-5 space-y-2">
      {visible.map((n) => (
        <div
          key={n.id}
          className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ring-1 ${
            n.level === "warning"
              ? "bg-amber-50 text-amber-800 ring-amber-600/20"
              : "bg-indigo-50 text-indigo-800 ring-indigo-600/20"
          }`}
        >
          <span className="flex items-center gap-2">
            <span>{n.level === "warning" ? "⚠️" : "ℹ️"}</span>
            {n.message}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {n.href && n.cta && (
              <Link href={n.href} className="font-semibold underline">
                {n.cta}
              </Link>
            )}
            <button
              type="button"
              onClick={() => dismiss(n.id)}
              className="text-current opacity-60 hover:opacity-100 cursor-pointer"
              aria-label="✕"
            >
              ✕
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
