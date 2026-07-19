"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { FieldDef, LString } from "@/lib/qr-types/registry";
import { checkUpload } from "@/app/(app)/qr/actions";
import { deleteStorageUrl, uploadFile } from "@/lib/storage";

type Data = Record<string, unknown>;

function useL() {
  const locale = useLocale();
  return (ls?: LString) => (ls ? ls[locale as "fr" | "en"] ?? ls.fr : "");
}

export function DynamicForm({
  fields,
  data,
  onChange,
  readOnlyFiles = false,
}: {
  fields: FieldDef[];
  data: Data;
  onChange: (patch: Data) => void;
  /** Admin éditant le QR d'un autre utilisateur : fichiers affichés, pas modifiables (évite d'appliquer le quota du plan de l'admin). */
  readOnlyFiles?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.name}
          className={field.half ? "sm:col-span-1" : "sm:col-span-2"}
        >
          <Field
            field={field}
            value={data[field.name]}
            onChange={(v) => onChange({ [field.name]: v })}
            readOnlyFiles={readOnlyFiles}
          />
        </div>
      ))}
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
  readOnlyFiles = false,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  readOnlyFiles?: boolean;
}) {
  const L = useL();

  switch (field.type) {
    case "textarea":
      return (
        <Labeled field={field}>
          <textarea
            className="input resize-y"
            rows={field.rows ?? 3}
            required={field.required}
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </Labeled>
      );
    case "select":
      return (
        <Labeled field={field}>
          <select
            className="input"
            required={field.required}
            value={(value as string) ?? field.options?.[0]?.value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {L(o.label)}
              </option>
            ))}
          </select>
        </Labeled>
      );
    case "toggle":
      return (
        <label className="flex cursor-pointer items-center gap-3 py-1">
          <span
            className={`relative h-6 w-11 rounded-full transition-colors ${
              value ? "bg-indigo-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                value ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
            <input
              type="checkbox"
              className="sr-only"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
          </span>
          <span className="text-sm font-medium text-slate-700">
            {L(field.label)}
          </span>
        </label>
      );
    case "file":
      return (
        <Labeled field={field}>
          {readOnlyFiles ? (
            <ReadOnlyFiles field={field} value={value} />
          ) : (
            <FileField field={field} value={value} onChange={onChange} />
          )}
        </Labeled>
      );
    case "list":
      return (
        <Labeled field={field}>
          <ListField field={field} value={value} onChange={onChange} />
        </Labeled>
      );
    default: {
      const inputType =
        field.type === "datetime"
          ? "datetime-local"
          : field.type === "url"
            ? "text" // évite la validation navigateur trop stricte, normalisé côté encodeur
            : field.type;
      return (
        <Labeled field={field}>
          <input
            type={inputType}
            className="input"
            required={field.required}
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </Labeled>
      );
    }
  }
}

function Labeled({
  field,
  children,
}: {
  field: FieldDef;
  children: React.ReactNode;
}) {
  const L = useL();
  return (
    <div>
      <label className="label">
        {L(field.label)}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {field.hint && (
        <p className="mt-1 text-xs text-slate-400">{L(field.hint)}</p>
      )}
    </div>
  );
}

/** Affichage des fichiers d'un champ sans upload possible (édition admin). */
function ReadOnlyFiles({ field, value }: { field: FieldDef; value: unknown }) {
  const t = useTranslations("qr");
  const urls: string[] = field.multiple
    ? Array.isArray(value)
      ? (value as string[])
      : []
    : typeof value === "string" && value
      ? [value]
      : [];

  if (urls.length === 0) {
    return <p className="text-xs text-slate-400">{t("form.noFile")}</p>;
  }

  return (
    <ul className="space-y-1.5">
      {urls.map((url) => (
        <li key={url}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-indigo-600 hover:underline"
          >
            {decodeURIComponent(url.split("/").pop() ?? url)}
          </a>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------
// Upload de fichiers vers Supabase Storage (bucket "uploads")
// ------------------------------------------------------------------

type UploadError =
  | null
  | { type: "generic" }
  | { type: "auth" }
  | { type: "video" }
  | { type: "storage"; limitMb: number }
  | { type: "maxItems"; max: number };

function FileField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const t = useTranslations("qr");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<UploadError>(null);

  const urls: string[] = field.multiple
    ? Array.isArray(value)
      ? (value as string[])
      : []
    : typeof value === "string" && value
      ? [value]
      : [];

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    let list = Array.from(files);

    // Nombre maximum de fichiers pour ce champ (ex. 5 photos) — au-delà
    // du quota de stockage en Mo, certains champs ont aussi une limite de
    // nombre. Le reste ne part pas : seuls ceux qui rentrent sont envoyés.
    if (field.multiple && field.maxItems) {
      const remaining = field.maxItems - urls.length;
      if (remaining <= 0) {
        setError({ type: "maxItems", max: field.maxItems });
        return;
      }
      if (list.length > remaining) {
        list = list.slice(0, remaining);
        setError({ type: "maxItems", max: field.maxItems });
      }
    }

    setUploading(true);

    // Quota de stockage + droit vidéo du plan, vérifiés avant l'envoi
    const totalBytes = list.reduce((sum, f) => sum + f.size, 0);
    const hasVideo = list.some((f) => f.type.startsWith("video/"));
    const check = await checkUpload(totalBytes, hasVideo);
    if (!check.ok) {
      setError(
        check.error === "storage"
          ? { type: "storage", limitMb: check.limitMb }
          : { type: check.error }
      );
      setUploading(false);
      return;
    }

    const uploaded: string[] = [];
    for (const file of list) {
      const result = await uploadFile("uploads", file);
      if (!result.ok) {
        setError(
          result.error === "storage"
            ? { type: "storage", limitMb: result.limitMb ?? 0 }
            : { type: result.error }
        );
        continue;
      }
      uploaded.push(result.url);
    }
    if (uploaded.length > 0) {
      onChange(field.multiple ? [...urls, ...uploaded] : uploaded[0]);
    }
    setUploading(false);
  }

  function removeUrl(url: string) {
    if (field.multiple) {
      onChange(urls.filter((u) => u !== url));
    } else {
      onChange("");
    }
    // Libère réellement l'espace de stockage (le quota mesure les fichiers).
    // Sûr même si le QR a été dupliqué : chaque copie possède désormais son
    // propre fichier (voir duplicateFileFields dans qr/actions.ts).
    deleteStorageUrl(createClient(), url).catch(() => {});
  }

  const atMax = field.multiple && field.maxItems != null && urls.length >= field.maxItems;

  return (
    <div className="space-y-2">
      {field.multiple && field.maxItems != null && (
        <p className="text-xs text-slate-400">
          {t("form.fileCount", { count: urls.length, max: field.maxItems })}
        </p>
      )}
      {!atMax && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/40">
          <svg className="h-6 w-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-sm font-medium text-slate-600">
            {uploading ? t("form.uploading") : t("form.chooseFile")}
          </span>
          <input
            type="file"
            className="sr-only"
            accept={field.accept}
            multiple={field.multiple}
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      )}
      {error && (
        <p className="text-xs text-red-600">
          {error.type === "generic" && t("form.uploadError")}
          {error.type === "auth" && t("form.authError")}
          {error.type === "video" && t("form.videoLocked")}
          {error.type === "storage" &&
            t("form.storageQuota", { limit: error.limitMb })}
          {error.type === "maxItems" && t("form.maxItems", { max: error.max })}
          {(error.type === "video" || error.type === "storage") && (
            <>
              {" "}
              <Link href="/billing" className="font-semibold underline">
                {t("builder.upgradeCta")}
              </Link>
            </>
          )}
        </p>
      )}
      {urls.length > 0 && (
        <ul className="space-y-1.5">
          {urls.map((url) => (
            <li
              key={url}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600"
            >
              <span className="truncate">{decodeURIComponent(url.split("/").pop() ?? url)}</span>
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="shrink-0 font-semibold text-red-500 hover:text-red-700 cursor-pointer"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Groupes répétables (liste de liens, sections de menu, réseaux…)
// ------------------------------------------------------------------

function ListField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const t = useTranslations("qr");
  const items: Data[] = Array.isArray(value) ? (value as Data[]) : [];

  function updateItem(index: number, patch: Data) {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    onChange(next);
  }

  function addItem() {
    onChange([...items, {}]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-4"
        >
          <button
            type="button"
            onClick={() => removeItem(index)}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
            aria-label="✕"
          >
            ✕
          </button>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(field.fields ?? []).map((sub) => (
              <div
                key={sub.name}
                className={sub.half ? "sm:col-span-1" : "sm:col-span-2"}
              >
                <Field
                  field={sub}
                  value={item[sub.name]}
                  onChange={(v) => updateItem(index, { [sub.name]: v })}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      {items.length < (field.maxItems ?? 20) && (
        <button type="button" onClick={addItem} className="btn-secondary btn-sm">
          + {t("form.addItem")}
        </button>
      )}
    </div>
  );
}
