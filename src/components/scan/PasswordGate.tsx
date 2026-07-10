"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { verifyQrPassword } from "@/app/q/[slug]/actions";

export function PasswordGate({ slug }: { slug: string }) {
  const t = useTranslations("scan.password");
  const [state, action, pending] = useActionState(
    verifyQrPassword.bind(null, slug),
    null
  );

  return (
    <div className="card p-8 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
        🔒
      </span>
      <h1 className="mt-5 text-xl font-bold text-slate-900">{t("title")}</h1>
      <p className="mt-2 text-sm text-slate-500">{t("message")}</p>

      <form action={action} className="mt-6 space-y-3">
        <input
          type="password"
          name="password"
          required
          autoFocus
          placeholder={t("placeholder")}
          className="input text-center"
        />
        {state?.error && (
          <p className="text-sm font-medium text-red-600">{t("error")}</p>
        )}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? t("checking") : t("submit")}
        </button>
      </form>
    </div>
  );
}
