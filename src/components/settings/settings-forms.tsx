"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  changeLanguage,
  changePassword,
  requestCustomDomain,
  updateProfile,
} from "@/app/(app)/settings/actions";
import { CustomDomainExplainer } from "./CustomDomainExplainer";

function SaveRow({
  saved,
  savedLabel,
  error,
  isPending,
}: {
  saved: boolean;
  savedLabel: string;
  error: string | null;
  isPending: boolean;
}) {
  const tc = useTranslations("common");
  return (
    <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
      {saved && (
        <span className="text-sm font-medium text-emerald-600">✓ {savedLabel}</span>
      )}
      {error && <span className="text-sm font-medium text-red-600">{error}</span>}
      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? tc("actions.saving") : tc("actions.save")}
      </button>
    </div>
  );
}

export function ProfileForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const t = useTranslations("settings.profile");
  const tc = useTranslations("common");
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="card space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await updateProfile(name);
          if (result?.error) setError(tc("errors.generic"));
          else setSaved(true);
        });
      }}
    >
      <h2 className="text-base font-semibold text-slate-900">{t("title")}</h2>
      <label className="block">
        <span className="label">{t("fullName")}</span>
        <input
          value={name}
          onChange={(e) => {
            setSaved(false);
            setName(e.target.value);
          }}
          className="input"
        />
      </label>
      <label className="block">
        <span className="label">{t("email")}</span>
        <input value={email} disabled className="input" />
        <span className="mt-1 block text-xs text-slate-400">{t("emailHint")}</span>
      </label>
      <SaveRow saved={saved} savedLabel={t("saved")} error={error} isPending={isPending} />
    </form>
  );
}

export function PasswordForm() {
  const t = useTranslations("settings.password");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="card space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await changePassword(password, confirm);
          if (result?.error) {
            setError(t(`errors.${result.error}`));
          } else {
            setSaved(true);
            setPassword("");
            setConfirm("");
          }
        });
      }}
    >
      <h2 className="text-base font-semibold text-slate-900">{t("title")}</h2>
      <label className="block">
        <span className="label">{t("new")}</span>
        <input
          type="password"
          value={password}
          required
          minLength={8}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
        <span className="mt-1 block text-xs text-slate-400">{t("hint")}</span>
      </label>
      <label className="block">
        <span className="label">{t("confirm")}</span>
        <input
          type="password"
          value={confirm}
          required
          minLength={8}
          onChange={(e) => setConfirm(e.target.value)}
          className="input"
        />
      </label>
      <SaveRow saved={saved} savedLabel={t("saved")} error={error} isPending={isPending} />
    </form>
  );
}

export function CustomDomainForm({
  enabled,
  current,
}: {
  enabled: boolean;
  current: { domain: string; status: string } | null;
}) {
  const t = useTranslations("settings.customDomain");
  const [domain, setDomain] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!enabled) {
    return (
      <div className="space-y-4">
        <div className="card space-y-3 p-6">
          <h2 className="text-base font-semibold text-slate-900">{t("title")}</h2>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {t("locked")}{" "}
            <Link href="/billing" className="font-semibold underline">
              {t("upgradeLink")}
            </Link>
          </p>
        </div>
        <CustomDomainExplainer />
      </div>
    );
  }

  if (current) {
    const badgeClass =
      current.status === "active"
        ? "badge-green"
        : current.status === "failed"
          ? "badge-red"
          : "badge-amber";
    return (
      <div className="space-y-4">
        <div className="card space-y-3 p-6">
          <h2 className="text-base font-semibold text-slate-900">{t("title")}</h2>
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-mono text-sm text-slate-700">{current.domain}</span>
            <span className={badgeClass}>{t(`status.${current.status}`)}</span>
          </div>
          {current.status === "pending" && (
            <p className="text-xs text-slate-400">{t("pendingHint")}</p>
          )}
          {current.status === "failed" && (
            <p className="text-xs text-slate-400">{current.domain && t("failedHint")}</p>
          )}
        </div>
        {current.status !== "active" && <CustomDomainExplainer />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CustomDomainExplainer />
      <form
        className="card space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await requestCustomDomain(domain);
            if (result?.error) setError(t(`errors.${result.error}`));
            else setSaved(true);
          });
        }}
      >
        <h2 className="text-base font-semibold text-slate-900">{t("title")}</h2>
        <p className="text-xs text-slate-500">{t("hint")}</p>
        <label className="block">
          <span className="label">{t("domainLabel")}</span>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="go.monsite.com"
            className="input"
            required
          />
        </label>
        <SaveRow saved={saved} savedLabel={t("requested")} error={error} isPending={isPending} />
      </form>
    </div>
  );
}

export function LanguageForm({ initialLocale }: { initialLocale: string }) {
  const t = useTranslations("settings.language");
  const tc = useTranslations("common");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-base font-semibold text-slate-900">{t("title")}</h2>
      <label className="block">
        <span className="label">{t("title")}</span>
        <select
          defaultValue={initialLocale}
          disabled={isPending}
          className="input"
          onChange={(e) => {
            setSaved(false);
            startTransition(async () => {
              await changeLanguage(e.target.value);
              setSaved(true);
            });
          }}
        >
          <option value="fr">{tc("language.fr")}</option>
          <option value="en">{tc("language.en")}</option>
        </select>
        <span className="mt-1 block text-xs text-slate-400">{t("hint")}</span>
      </label>
      {saved && (
        <p className="text-right text-sm font-medium text-emerald-600">
          ✓ {t("saved")}
        </p>
      )}
    </div>
  );
}
