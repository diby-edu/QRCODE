"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { FieldDef } from "@/lib/qr-types/registry";
import { DynamicForm } from "@/components/qr/DynamicForm";
import { adminUpdateQrCode } from "@/app/(admin)/admin/actions";

export function AdminQrEditForm({
  id,
  fields,
  initial,
}: {
  id: string;
  fields: FieldDef[];
  initial: {
    title: string;
    isActive: boolean;
    expiresAt: string | null;
    hasPassword: boolean;
    data: Record<string, unknown>;
  };
}) {
  const t = useTranslations("admin.qrcodes");
  const tq = useTranslations("qr");
  const tc = useTranslations("common");

  const [title, setTitle] = useState(initial.title);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [expiresAt, setExpiresAt] = useState(initial.expiresAt?.slice(0, 10) ?? "");
  const [removePassword, setRemovePassword] = useState(false);
  const [data, setData] = useState(initial.data);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(false);
        startTransition(async () => {
          const result = await adminUpdateQrCode(id, {
            title,
            isActive,
            expiresAt: expiresAt || null,
            removePassword,
            data,
          });
          if (result?.error) setError(true);
          else setSaved(true);
        });
      }}
    >
      <div className="card space-y-4 p-6">
        <h2 className="text-base font-semibold text-slate-900">{t("editTitle")}</h2>
        <label className="block">
          <span className="label">{tq("builder.titleLabel")}</span>
          <input
            value={title}
            onChange={(e) => {
              setSaved(false);
              setTitle(e.target.value);
            }}
            required
            className="input"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 py-1">
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                isActive ? "bg-indigo-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
              <input
                type="checkbox"
                className="sr-only"
                checked={isActive}
                onChange={(e) => {
                  setSaved(false);
                  setIsActive(e.target.checked);
                }}
              />
            </span>
            <span className="text-sm font-medium text-slate-700">
              {tq("builder.activeToggle")}
            </span>
          </label>

          <label className="block">
            <span className="label">{tq("builder.expiresLabel")}</span>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => {
                setSaved(false);
                setExpiresAt(e.target.value);
              }}
              className="input"
            />
          </label>
        </div>

        {initial.hasPassword && (
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={removePassword}
              onChange={(e) => {
                setSaved(false);
                setRemovePassword(e.target.checked);
              }}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <span className="text-sm text-slate-700">{t("removePassword")}</span>
          </label>
        )}
      </div>

      {fields.length > 0 && (
        <div className="card p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            {tq("builder.contentSection")}
          </h2>
          <DynamicForm
            fields={fields}
            data={data}
            onChange={(patch) => {
              setSaved(false);
              setData((d) => ({ ...d, ...patch }));
            }}
            readOnlyFiles
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
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
