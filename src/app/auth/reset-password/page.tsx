"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { resetPassword, type AuthState } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, action] = useActionState<AuthState, FormData>(
    resetPassword,
    null
  );

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => router.push("/dashboard"), 1500);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);

  if (state?.success) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-7 w-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">{t("reset.success")}</p>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <h1 className="text-2xl font-bold text-slate-900">{t("reset.title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("reset.subtitle")}</p>

      <form action={action} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="label">
            {t("reset.password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="label">
            {t("reset.confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
            placeholder="••••••••"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {t(`errors.${state.error}`)}
          </p>
        )}

        <SubmitButton>{t("reset.submit")}</SubmitButton>
      </form>
    </div>
  );
}
