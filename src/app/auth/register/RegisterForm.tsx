"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signUp, resendConfirmation, type AuthState } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action] = useActionState<AuthState, FormData>(signUp, null);
  const [resendState, resendAction] = useActionState<AuthState, FormData>(
    resendConfirmation,
    null
  );

  if (state?.success) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-7 w-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          {t("register.checkEmail", { email: state.success })}
        </p>

        {resendState?.success ? (
          <p className="mt-4 text-xs font-medium text-emerald-600">
            {t("register.resendSent")}
          </p>
        ) : (
          <form action={resendAction} className="mt-4">
            <input type="hidden" name="email" value={state.success} />
            {resendState?.error && (
              <p className="mb-2 text-xs text-red-600">
                {t(`errors.${resendState.error}`)}
              </p>
            )}
            <SubmitButton className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              {t("register.resend")}
            </SubmitButton>
          </form>
        )}

        <Link href="/auth/login" className="btn-secondary mt-6 w-full">
          {t("forgot.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <h1 className="text-2xl font-bold text-slate-900">
        {t("register.title")}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{t("register.subtitle")}</p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="language" value={locale} />
        <div>
          <label htmlFor="fullName" className="label">
            {t("register.fullName")}
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="email" className="label">
            {t("register.email")}
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
        <div>
          <label htmlFor="password" className="label">
            {t("register.password")}
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
          <p className="mt-1 text-xs text-slate-400">
            {t("register.passwordHint")}
          </p>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="label">
            {t("register.confirmPassword")}
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

        <SubmitButton>{t("register.submit")}</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {t("register.hasAccount")}{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          {t("register.loginLink")}
        </Link>
      </p>
    </div>
  );
}
