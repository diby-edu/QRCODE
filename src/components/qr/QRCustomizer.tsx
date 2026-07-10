"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { QrDesign } from "@/lib/types";

const DOT_STYLES: QrDesign["dotStyle"][] = [
  "square",
  "rounded",
  "dots",
  "classy",
  "classy-rounded",
  "extra-rounded",
];

const CORNER_STYLES: QrDesign["cornerStyle"][] = [
  "square",
  "dot",
  "extra-rounded",
];

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          className="input font-mono uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}

export function QRCustomizer({
  design,
  onChange,
  logoEnabled,
}: {
  design: QrDesign;
  onChange: (patch: Partial<QrDesign>) => void;
  logoEnabled: boolean;
}) {
  const t = useTranslations("qr");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    setUploadingLogo(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("logos").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("logos").getPublicUrl(path);
        onChange({ logoUrl: data.publicUrl });
      }
    }
    setUploadingLogo(false);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ColorInput
          label={t("customize.fgColor")}
          value={design.fgColor}
          onChange={(v) => onChange({ fgColor: v })}
        />
        <ColorInput
          label={t("customize.bgColor")}
          value={design.bgColor}
          onChange={(v) => onChange({ bgColor: v })}
        />
      </div>

      <div>
        <span className="label">{t("customize.dotStyle")}</span>
        <div className="flex flex-wrap gap-2">
          {DOT_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onChange({ dotStyle: style })}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                design.dotStyle === style
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {t(`customize.dotStyles.${style}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">{t("customize.cornerStyle")}</span>
        <div className="flex flex-wrap gap-2">
          {CORNER_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onChange({ cornerStyle: style })}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                design.cornerStyle === style
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {t(`customize.cornerStyles.${style}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">{t("customize.logo")}</span>
        {logoEnabled ? (
          <div className="flex items-center gap-3">
            <label className="btn-secondary btn-sm cursor-pointer">
              {uploadingLogo ? t("form.uploading") : t("customize.uploadLogo")}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploadingLogo}
                onChange={(e) => uploadLogo(e.target.files?.[0])}
              />
            </label>
            {design.logoUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={design.logoUrl}
                  alt=""
                  className="h-10 w-10 rounded-lg border border-slate-200 object-contain"
                />
                <button
                  type="button"
                  onClick={() => onChange({ logoUrl: null })}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                >
                  {t("customize.removeLogo")}
                </button>
              </>
            )}
          </div>
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {t("customize.logoLocked")}{" "}
            <Link href="/billing" className="font-semibold underline">
              {t("customize.upgradeLink")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
