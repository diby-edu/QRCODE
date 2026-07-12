"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { Plan, PlanLimits } from "@/lib/types";
import { DEFAULT_LIMITS } from "@/lib/plans";
import { savePlan, type PlanPayload } from "@/app/(admin)/admin/actions";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-700">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-indigo-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

/** Éditeur d'un plan (existant ou nouveau) : prix, limites JSONB, visibilité. */
export function PlanEditor({
  plan,
  subscriberCount,
}: {
  plan: Plan | null;
  subscriberCount?: number;
}) {
  const t = useTranslations("admin.plans");
  const tc = useTranslations("common");
  const limits = { ...DEFAULT_LIMITS, ...(plan?.limits ?? {}) };

  const [form, setForm] = useState<PlanPayload>({
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    price_monthly: Number(plan?.price_monthly ?? 0),
    currency: plan?.currency ?? "XOF",
    sort_order: plan?.sort_order ?? 0,
    is_active: plan?.is_active ?? true,
    limits,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const set = (patch: Partial<PlanPayload>) => {
    setSaved(false);
    setForm((f) => ({ ...f, ...patch }));
  };
  const setLimits = (patch: Partial<PlanLimits>) => {
    setSaved(false);
    setForm((f) => ({ ...f, limits: { ...f.limits, ...patch } }));
  };

  const toggleFormat = (format: string) => {
    const has = form.limits.formats.includes(format);
    setLimits({
      formats: has
        ? form.limits.formats.filter((f) => f !== format)
        : [...form.limits.formats, format],
    });
  };

  const numberInput = (
    label: string,
    value: number,
    onChange: (v: number) => void
  ) => (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="number"
        value={value}
        min={-1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input"
      />
    </label>
  );

  return (
    <form
      className="card space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(false);
        startTransition(async () => {
          const result = await savePlan(plan?.id ?? null, form);
          if (result?.error) setError(true);
          else setSaved(true);
        });
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-slate-900">
          {plan ? plan.name : t("newPlan")}
        </h3>
        {plan && subscriberCount !== undefined && (
          <span className="badge-gray">
            {t("subscribers", { count: subscriberCount })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">{t("fields.name")}</span>
          <input
            value={form.name}
            required
            onChange={(e) => set({ name: e.target.value })}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">{t("fields.description")}</span>
          <input
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">{t("fields.price")}</span>
          <input
            type="number"
            min={0}
            value={form.price_monthly}
            onChange={(e) => set({ price_monthly: Number(e.target.value) })}
            className="input"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">{t("fields.currency")}</span>
            <input
              value={form.currency}
              onChange={(e) => set({ currency: e.target.value })}
              className="input"
            />
          </label>
          <label className="block">
            <span className="label">{t("fields.sortOrder")}</span>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => set({ sort_order: Number(e.target.value) })}
              className="input"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
        {numberInput(t("fields.maxQr"), form.limits.max_qr_codes, (v) =>
          setLimits({ max_qr_codes: v })
        )}
        {numberInput(t("fields.maxDynamic"), form.limits.max_dynamic, (v) =>
          setLimits({ max_dynamic: v })
        )}
        {numberInput(t("fields.maxScans"), form.limits.max_scans_month, (v) =>
          setLimits({ max_scans_month: v })
        )}
        {numberInput(t("fields.maxStorage"), form.limits.max_storage_mb, (v) =>
          setLimits({ max_storage_mb: v })
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <span className="label">{t("fields.formats")}</span>
          <div className="flex gap-2">
            {["png", "svg", "pdf"].map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => toggleFormat(format)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
                  form.limits.formats.includes(format)
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {format}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="label">{t("fields.statsLevel")}</span>
          <select
            value={form.limits.stats_level}
            onChange={(e) =>
              setLimits({ stats_level: e.target.value as "basic" | "full" })
            }
            className="input"
          >
            <option value="basic">{t("fields.statsBasic")}</option>
            <option value="full">{t("fields.statsFull")}</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <Toggle
          label={t("fields.logo")}
          checked={form.limits.logo_enabled}
          onChange={(v) => setLimits({ logo_enabled: v })}
        />
        <Toggle
          label={t("fields.video")}
          checked={form.limits.video_enabled}
          onChange={(v) => setLimits({ video_enabled: v })}
        />
        <Toggle
          label={t("fields.folders")}
          checked={form.limits.folders_enabled}
          onChange={(v) => setLimits({ folders_enabled: v })}
        />
        <Toggle
          label={t("fields.password")}
          checked={form.limits.password_enabled}
          onChange={(v) => setLimits({ password_enabled: v })}
        />
        <Toggle
          label={t("fields.customDomain")}
          checked={form.limits.custom_domain_enabled}
          onChange={(v) => setLimits({ custom_domain_enabled: v })}
        />
        <Toggle
          label={t("fields.isActive")}
          checked={form.is_active}
          onChange={(v) => set({ is_active: v })}
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        {saved && <span className="text-sm font-medium text-emerald-600">✓ {t("saved")}</span>}
        {error && (
          <span className="text-sm font-medium text-red-600">
            {tc("errors.generic")}
          </span>
        )}
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? tc("actions.saving") : tc("actions.save")}
        </button>
      </div>
    </form>
  );
}
