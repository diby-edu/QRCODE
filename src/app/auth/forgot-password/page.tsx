"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { forgotPassword, type AuthState } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [state, action] = useActionState<AuthState, FormData>(
    forgotPassword,
    null
  );

  return (
    <div className="card p-8">
      <h1 className="text-2xl font-bold text-slate-900">{t("forgot.title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("forgot.subtitle")}</p>

      {state?.success ? (
        <p className="mt-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {t("forgot.sent")}
        </p>
      ) : (
        <form action={action} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="label">
              {t("forgot.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              placeholder="vous@exemple.com"
            />
          </div>
          <SubmitButton>{t("forgot.submit")}</SubmitButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm">
        <Link
          href="/auth/login"
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          ← {t("forgot.backToLogin")}
        </Link>
      </p>
    </div>
  );
}
