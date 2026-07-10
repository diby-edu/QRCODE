"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signIn, type AuthState } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState<AuthState, FormData>(signIn, null);

  return (
    <div className="card p-8">
      <h1 className="text-2xl font-bold text-slate-900">{t("login.title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("login.subtitle")}</p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className="label">
            {t("login.email")}
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
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">
              {t("login.password")}
            </label>
            <Link
              href="/auth/forgot-password"
              className="mb-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              {t("login.forgot")}
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
            placeholder="••••••••"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {t(`errors.${state.error}`)}
          </p>
        )}

        <SubmitButton>{t("login.submit")}</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {t("login.noAccount")}{" "}
        <Link
          href="/auth/register"
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          {t("login.signupLink")}
        </Link>
      </p>
    </div>
  );
}
