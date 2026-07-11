"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  savePaydunyaSettings,
} from "@/app/(admin)/admin/actions";
import type { PaydunyaConfig } from "@/lib/payments/config";

export function PaydunyaSettingsForm({ initial }: { initial: PaydunyaConfig }) {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("common");
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const set = (patch: Partial<PaydunyaConfig>) => {
    setSaved(false);
    setForm((f) => ({ ...f, ...patch }));
  };

  return (
    <form
      className="card max-w-2xl space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(false);
        startTransition(async () => {
          const result = await savePaydunyaSettings(form);
          if (result?.error) setError(true);
          else setSaved(true);
        });
      }}
    >
      <div>
        <h2 className="text-base font-semibold text-slate-900">{t("paydunya.title")}</h2>
        <p className="mt-1 text-xs text-slate-500">{t("paydunya.hint")}</p>
      </div>

      <label className="block">
        <span className="label">{t("paydunya.mode")}</span>
        <select
          value={form.mode}
          onChange={(e) => set({ mode: e.target.value as "test" | "live" })}
          className="input"
        >
          <option value="test">{t("paydunya.modeTest")}</option>
          <option value="live">{t("paydunya.modeLive")}</option>
        </select>
        {form.mode === "live" && (
          <span className="mt-1.5 block rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            ⚠️ {t("paydunya.liveWarning")}
          </span>
        )}
      </label>

      <label className="block">
        <span className="label">{t("paydunya.masterKey")}</span>
        <input
          type="password"
          value={form.masterKey}
          onChange={(e) => set({ masterKey: e.target.value })}
          className="input font-mono"
          autoComplete="off"
        />
      </label>
      <label className="block">
        <span className="label">{t("paydunya.privateKey")}</span>
        <input
          type="password"
          value={form.privateKey}
          onChange={(e) => set({ privateKey: e.target.value })}
          className="input font-mono"
          autoComplete="off"
        />
      </label>
      <label className="block">
        <span className="label">{t("paydunya.publicKey")}</span>
        <input
          type="text"
          value={form.publicKey}
          onChange={(e) => set({ publicKey: e.target.value })}
          className="input font-mono"
          autoComplete="off"
        />
      </label>
      <label className="block">
        <span className="label">{t("paydunya.token")}</span>
        <input
          type="password"
          value={form.token}
          onChange={(e) => set({ token: e.target.value })}
          className="input font-mono"
          autoComplete="off"
        />
      </label>

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        {saved && (
          <span className="text-sm font-medium text-emerald-600">✓ {t("saved")}</span>
        )}
        {error && (
          <span className="text-sm font-medium text-red-600">{tc("errors.generic")}</span>
        )}
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? tc("actions.saving") : tc("actions.save")}
        </button>
      </div>
    </form>
  );
}
