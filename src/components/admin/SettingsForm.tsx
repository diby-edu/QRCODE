"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  saveSiteSettings,
  type SiteSettingsPayload,
} from "@/app/(admin)/admin/actions";

export function SettingsForm({ initial }: { initial: SiteSettingsPayload }) {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("common");
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const set = (patch: Partial<SiteSettingsPayload>) => {
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
          const result = await saveSiteSettings(form);
          if (result?.error) setError(true);
          else setSaved(true);
        });
      }}
    >
      <label className="block">
        <span className="label">{t("siteName")}</span>
        <input
          value={form.site_name}
          onChange={(e) => set({ site_name: e.target.value })}
          className="input"
        />
      </label>
      <label className="block">
        <span className="label">{t("supportEmail")}</span>
        <input
          type="email"
          value={form.support_email}
          onChange={(e) => set({ support_email: e.target.value })}
          className="input"
        />
      </label>
      <label className="block">
        <span className="label">{t("announcement")}</span>
        <textarea
          value={form.announcement}
          rows={2}
          onChange={(e) => set({ announcement: e.target.value })}
          className="input"
        />
      </label>

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        {saved && (
          <span className="text-sm font-medium text-emerald-600">✓ {t("saved")}</span>
        )}
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
