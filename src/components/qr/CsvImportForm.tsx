"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import { useTranslations } from "next-intl";
import {
  importWebsiteQrCodesFromCsv,
  type CsvImportResult,
} from "@/app/(app)/qr/import-actions";

interface CsvRow {
  title: string;
  url: string;
  folder: string;
  is_dynamic: boolean;
  valid: boolean;
}

const TEMPLATE = "title,url,folder,is_dynamic\nMon site,https://example.com,,true\n";

function parseIsDynamic(raw: string | undefined): boolean {
  if (!raw) return true;
  return raw.trim().toLowerCase() !== "false";
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modele-qrhub.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function CsvImportForm({
  foldersEnabled,
  folders,
}: {
  foldersEnabled: boolean;
  folders: { id: string; name: string }[];
}) {
  const t = useTranslations("qr");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File | undefined) {
    if (!file) return;
    setResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map((r) => {
          const title = (r.title ?? "").trim();
          const url = (r.url ?? "").trim();
          return {
            title,
            url,
            folder: (r.folder ?? "").trim(),
            is_dynamic: parseIsDynamic(r.is_dynamic),
            valid: title !== "" && url !== "",
          };
        });
        setRows(parsed);
      },
    });
  }

  function submit() {
    const validRows = rows.filter((r) => r.valid);
    startTransition(async () => {
      const res = await importWebsiteQrCodesFromCsv(
        validRows.map((r) => ({
          title: r.title,
          url: r.url,
          folder: r.folder || undefined,
          is_dynamic: r.is_dynamic,
        }))
      );
      setResult(res);
      if (!res.error) setRows([]);
    });
  }

  function errorMessage(code: string) {
    const [key, limit] = code.split(":");
    if (key === "qrLimit") return t("builder.qrLimitReached", { limit: limit ?? "" });
    if (key === "dynamicLimit") return t("builder.dynamicLimitReached", { limit: limit ?? "" });
    return t("import.genericError");
  }

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-secondary cursor-pointer">
            {t("import.chooseFile")}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          <button type="button" onClick={downloadTemplate} className="btn-ghost">
            {t("import.templateLink")}
          </button>
        </div>
        {foldersEnabled && folders.length > 0 && (
          <p className="mt-3 text-xs text-slate-400">{t("import.folderHint")}</p>
        )}
      </div>

      {rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2 font-medium">{t("import.columns.title")}</th>
                  <th className="px-4 py-2 font-medium">{t("import.columns.url")}</th>
                  <th className="px-4 py-2 font-medium">{t("import.columns.folder")}</th>
                  <th className="px-4 py-2 font-medium">{t("import.columns.dynamic")}</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={i} className={r.valid ? "" : "bg-red-50/40"}>
                    <td className="px-4 py-2">{r.title || "—"}</td>
                    <td className="max-w-xs truncate px-4 py-2">{r.url || "—"}</td>
                    <td className="px-4 py-2">{r.folder || "—"}</td>
                    <td className="px-4 py-2">{r.is_dynamic ? "✓" : "—"}</td>
                    <td className="px-4 py-2 text-xs text-red-600">
                      {!r.valid && t("import.invalidRow")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              {t("import.preview", { count: validCount })}
              {invalidCount > 0 && ` · ${t("import.previewInvalid", { count: invalidCount })}`}
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={isPending || validCount === 0}
              className="btn-primary btn-sm"
            >
              {isPending ? t("import.importing") : t("import.submit")}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            result.error
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {result.error ? (
            errorMessage(result.error)
          ) : (
            <>
              {t("import.resultSummary", { count: result.imported })}
              {result.skipped.length > 0 &&
                ` ${t("import.resultSkipped", { count: result.skipped.length })}`}
            </>
          )}
        </div>
      )}
    </div>
  );
}
