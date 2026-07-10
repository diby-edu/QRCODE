"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Folder } from "@/lib/types";
import {
  createFolder,
  deleteFolder,
  updateFolder,
} from "@/app/(app)/folders/actions";

export const FOLDER_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // rose
  "#ef4444", // rouge
  "#f59e0b", // ambre
  "#10b981", // émeraude
  "#06b6d4", // cyan
  "#64748b", // slate
];

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FOLDER_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`h-6 w-6 cursor-pointer rounded-full transition-transform hover:scale-110 ${
            value === c ? "ring-2 ring-slate-900 ring-offset-2" : ""
          }`}
          style={{ backgroundColor: c }}
          aria-label={c}
        />
      ))}
    </div>
  );
}

export function CreateFolderForm() {
  const t = useTranslations("qr.folders");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createFolder(name, color);
          if (result?.error) setError(tc("errors.generic"));
          else setName("");
        });
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("namePlaceholder")}
        required
        className="input flex-1"
      />
      <ColorPicker value={color} onChange={setColor} />
      <button type="submit" disabled={isPending} className="btn-primary shrink-0">
        {isPending ? tc("actions.loading") : `+ ${t("create")}`}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function FolderCard({
  folder,
  qrCount,
}: {
  folder: Pick<Folder, "id" | "name" | "color">;
  qrCount: number;
}) {
  const t = useTranslations("qr.folders");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(folder.name);
  const [color, setColor] = useState(folder.color);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="card space-y-3 p-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          autoFocus
        />
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              setEditing(false);
              setName(folder.name);
              setColor(folder.color);
            }}
          >
            {tc("actions.cancel")}
          </button>
          <button
            type="button"
            disabled={isPending}
            className="btn-primary btn-sm"
            onClick={() =>
              startTransition(async () => {
                await updateFolder(folder.id, name, color);
                setEditing(false);
              })
            }
          >
            {isPending ? "…" : tc("actions.save")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ backgroundColor: `${folder.color}1a` }}
        >
          📁
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-800">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: folder.color }}
            />
            {folder.name}
          </p>
          <p className="text-xs text-slate-400">{t("qrCount", { count: qrCount })}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <Link
          href={`/qr?folder=${folder.id}`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          {t("viewQr")} →
        </Link>
        <div className="flex gap-1.5">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setEditing(true)}
          >
            {tc("actions.edit")}
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
            onClick={() => setConfirming(true)}
          >
            {tc("actions.delete")}
          </button>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setConfirming(false)}
          />
          <div className="card relative w-full max-w-sm p-6 animate-fade-up">
            <h3 className="text-base font-semibold text-slate-900">
              {tc("confirmDelete.title")}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {tc("confirmDelete.message", { name: folder.name })}
            </p>
            <p className="mt-1 text-xs text-slate-400">{t("confirmDelete")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setConfirming(false)}
              >
                {tc("actions.cancel")}
              </button>
              <button
                type="button"
                disabled={isPending}
                className="btn-danger btn-sm"
                onClick={() =>
                  startTransition(async () => {
                    await deleteFolder(folder.id);
                    setConfirming(false);
                  })
                }
              >
                {isPending ? "…" : tc("confirmDelete.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
