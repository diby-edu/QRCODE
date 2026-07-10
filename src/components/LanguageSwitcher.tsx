"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/lib/actions/locale";
import { locales } from "@/i18n/config";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold shadow-sm ${className}`}
    >
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await setLocale(l);
              router.refresh();
            })
          }
          className={`rounded-md px-2.5 py-1 uppercase transition-colors cursor-pointer ${
            l === locale
              ? "bg-indigo-600 text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
