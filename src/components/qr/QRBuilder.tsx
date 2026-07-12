"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { getQrType } from "@/lib/qr-types/registry";
import type { PlanLimits, QrDesign } from "@/lib/types";
import { DEFAULT_DESIGN } from "./qr-options";
import { DynamicForm } from "./DynamicForm";
import { QRCustomizer } from "./QRCustomizer";
import { QRPreview } from "./QRPreview";
import {
  createQrCode,
  updateQrCode,
  type QrPayload,
} from "@/app/(app)/qr/actions";
import { qrShortUrl } from "@/lib/url";

export interface QrInitial {
  title: string;
  data: Record<string, unknown>;
  design: QrDesign;
  isDynamic: boolean;
  isActive: boolean;
  folderId: string | null;
  expiresAt: string | null;
  hasPassword: boolean;
}

function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-indigo-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
      </span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export function QRBuilder({
  typeId,
  mode,
  qrId,
  slug,
  initial,
  folders,
  limits,
  customDomain,
}: {
  typeId: string;
  mode: "create" | "edit";
  qrId?: string;
  slug?: string;
  initial?: QrInitial;
  folders: { id: string; name: string }[];
  limits: PlanLimits;
  customDomain?: string | null;
}) {
  const t = useTranslations("qr");
  const tc = useTranslations("common");
  const locale = useLocale() as "fr" | "en";
  const type = getQrType(typeId);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [data, setData] = useState<Record<string, unknown>>(
    initial?.data ?? {}
  );
  const [design, setDesign] = useState<QrDesign>(
    initial?.design ?? DEFAULT_DESIGN
  );
  const [isDynamic, setIsDynamic] = useState(initial?.isDynamic ?? true);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [folderId, setFolderId] = useState<string | null>(
    initial?.folderId ?? null
  );
  const [expiresAt, setExpiresAt] = useState(initial?.expiresAt ?? "");
  const [password, setPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewValue = useMemo(() => {
    if (!type) return "";
    if (!isDynamic && type.staticEncoder) {
      try {
        return type.staticEncoder(data) || " ";
      } catch {
        return " ";
      }
    }
    return qrShortUrl(slug ?? "apercu", customDomain);
  }, [type, isDynamic, data, slug, customDomain]);

  if (!type) return null;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const payload: QrPayload = {
      typeId,
      title,
      data,
      design,
      isDynamic: type!.canBeStatic ? isDynamic : true,
      isActive,
      folderId,
      expiresAt: expiresAt || null,
      password: password || null,
      removePassword,
    };
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createQrCode(payload)
          : await updateQrCode(qrId!, payload);
      if (result?.error) setError(result.error);
    });
  }

  function errorMessage(code: string) {
    const [key, limit] = code.split(":");
    if (key === "qrLimit")
      return t("builder.qrLimitReached", { limit: limit ?? "" });
    if (key === "dynamicLimit")
      return t("builder.dynamicLimitReached", { limit: limit ?? "" });
    return tc("errors.generic");
  }

  const isLimitError =
    error != null && (error.startsWith("qrLimit") || error.startsWith("dynamicLimit"));

  return (
    <form onSubmit={submit} className="animate-fade-up">
      <Link
        href={mode === "create" ? "/qr/new" : `/qr/${qrId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
      >
        ← {mode === "create" ? t("builder.backToTypes") : t("builder.backToQr")}
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl">
          {type.icon}
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {mode === "create" ? t("builder.newTitle") : t("builder.editTitle")}
          </h1>
          <p className="text-sm text-slate-500">{type.name[locale]}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Mode : statique ou dynamique — la toute première décision */}
          {type.canBeStatic && mode === "create" && (
            <Section title={t("builder.modeLabel")}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setIsDynamic(true)}
                  className={`relative rounded-xl border-2 p-4 text-left transition-colors cursor-pointer ${
                    isDynamic
                      ? "border-indigo-600 bg-indigo-50/60"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className="badge-indigo absolute right-3 top-3">
                    {t("builder.recommended")}
                  </span>
                  <span className="text-2xl">⚡</span>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {t("builder.dynamicToggle")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("builder.dynamicHint")}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDynamic(false)}
                  className={`rounded-xl border-2 p-4 text-left transition-colors cursor-pointer ${
                    !isDynamic
                      ? "border-indigo-600 bg-indigo-50/60"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className="text-2xl">🖨️</span>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {t("builder.staticToggle")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("builder.staticHint")}
                  </p>
                </button>
              </div>
            </Section>
          )}

          {/* Contenu */}
          <Section title={t("builder.contentSection")}>
            <div className="mb-4">
              <label className="label">
                {t("builder.titleLabel")}
                <span className="ml-0.5 text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input"
                required
                value={title}
                placeholder={t("builder.titlePlaceholder")}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <DynamicForm
              fields={type.fields}
              data={data}
              onChange={(patch) => setData((d) => ({ ...d, ...patch }))}
            />
          </Section>

          {/* Personnalisation */}
          <Section title={t("builder.designSection")}>
            <QRCustomizer
              design={design}
              onChange={(patch) => setDesign((d) => ({ ...d, ...patch }))}
              logoEnabled={limits.logo_enabled}
            />
          </Section>

          {/* Options avancées */}
          <Section title={t("builder.optionsSection")}>
            <div className="space-y-5">
              {mode === "edit" && !isDynamic && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {t("builder.staticWarning")}
                </p>
              )}

              <Toggle
                checked={isActive}
                onChange={setIsActive}
                label={t("builder.activeToggle")}
              />

              {folders.length > 0 && limits.folders_enabled && (
                <div>
                  <label className="label">{t("builder.folderLabel")}</label>
                  <select
                    className="input"
                    value={folderId ?? ""}
                    onChange={(e) => setFolderId(e.target.value || null)}
                  >
                    <option value="">{t("builder.noFolder")}</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isDynamic && (
                <div>
                  <label className="label">{t("builder.expiresLabel")}</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {t("builder.expiresHint")}
                  </p>
                </div>
              )}

              {isDynamic &&
                (limits.password_enabled ? (
                  <div>
                    <label className="label">{t("builder.passwordLabel")}</label>
                    {initial?.hasPassword && !removePassword && (
                      <p className="mb-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                        {t("builder.passwordSet")}{" "}
                        <button
                          type="button"
                          className="font-semibold underline cursor-pointer"
                          onClick={() => setRemovePassword(true)}
                        >
                          {t("builder.removePassword")}
                        </button>
                      </p>
                    )}
                    <input
                      type="text"
                      className="input"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setRemovePassword(false);
                      }}
                      autoComplete="off"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      {t("builder.passwordHint")}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="label">{t("builder.passwordLabel")}</label>
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      {t("builder.featureLocked")}{" "}
                      <Link href="/billing" className="font-semibold underline">
                        {t("customize.upgradeLink")}
                      </Link>
                    </p>
                  </div>
                ))}
            </div>
          </Section>
        </div>

        {/* Aperçu sticky */}
        <div>
          <div className="card sticky top-20 p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              {t("builder.previewTitle")}
            </h2>
            <div className="flex justify-center rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <QRPreview value={previewValue} design={design} size={220} />
            </div>
            {isDynamic && (
              <p className="mt-3 break-all text-center text-xs text-slate-400">
                {t("builder.previewUrlHint")}{" "}
                <span className="font-mono text-slate-600">
                  {qrShortUrl(slug ?? "…", customDomain)}
                </span>
              </p>
            )}

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage(error)}
                {isLimitError && (
                  <Link
                    href="/billing"
                    className="mt-1 block font-semibold underline"
                  >
                    {t("builder.upgradeCta")}
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary mt-5 w-full"
            >
              {isPending ? t("builder.creating") : t("builder.save")}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
