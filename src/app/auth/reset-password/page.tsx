"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { resetPassword, type AuthState } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const [state, action] = useActionState<AuthState, FormData>(
    resetPassword,
    null
  );

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
            {state.error === "mismatch"
              ? t("reset.mismatch")
              : t(`errors.${state.error}`)}
          </p>
        )}

        <SubmitButton>{t("reset.submit")}</SubmitButton>
      </form>
    </div>
  );
}
