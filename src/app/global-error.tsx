"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <p className="text-2xl font-bold text-slate-900">
            Une erreur est survenue
          </p>
          <p className="mt-2 text-sm text-slate-500">
            L&apos;équipe a été notifiée. Réessayez dans un instant.
          </p>
        </div>
      </body>
    </html>
  );
}
