"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { FieldDef, LString } from "@/lib/qr-types/registry";
import { checkUpload } from "@/app/(app)/qr/actions";

type Data = Record<string, unknown>;

function useL() {
  const locale = useLocale();
  return (ls?: LString) => (ls ? ls[locale as "fr" | "en"] ?? ls.fr : "");
}

export function DynamicForm({
  fields,
  data,
  onChange,
}: {
  fields: FieldDef[];
  data: Data;
  onChange: (patch: Data) => void;
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
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
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
          <FileField field={field} value={value} onChange={onChange} />
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

// ------------------------------------------------------------------
// Upload de fichiers vers Supabase Storage (bucket "uploads")
// ------------------------------------------------------------------

type UploadError =
  | null
  | { type: "generic" }
  | { type: "video" }
  | { type: "storage"; limitMb: number };

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
    setUploading(true);
    setError(null);

    // Quota de stockage + droit vidéo du plan, vérifiés avant l'envoi
    const list = Array.from(files);
    const totalBytes = list.reduce((sum, f) => sum + f.size, 0);
    const hasVideo = list.some((f) => f.type.startsWith("video/"));
    const check = await checkUpload(totalBytes, hasVideo);
    if (!check.ok) {
      setError(
        check.error === "video"
          ? { type: "video" }
          : { type: "storage", limitMb: check.limitMb }
      );
      setUploading(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      setError({ type: "generic" });
      return;
    }
    const uploaded: string[] = [];
    for (const file of list) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("uploads")
        .upload(path, file);
      if (upErr) {
        setError({ type: "generic" });
        continue;
      }
      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      uploaded.push(data.publicUrl);
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
    // Libère réellement l'espace de stockage (le quota mesure les fichiers)
    const path = url.split("/object/public/uploads/")[1];
    if (path) {
      createClient()
        .storage.from("uploads")
        .remove([decodeURIComponent(path)])
        .catch(() => {});
    }
  }

  return (
    <div className="space-y-2">
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
      {error && (
        <p className="text-xs text-red-600">
          {error.type === "generic" && t("form.uploadError")}
          {error.type === "video" && t("form.videoLocked")}
          {error.type === "storage" &&
            t("form.storageQuota", { limit: error.limitMb })}{" "}
          {error.type !== "generic" && (
            <Link href="/billing" className="font-semibold underline">
              {t("builder.upgradeCta")}
            </Link>
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
