"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export interface FilterOption {
  value: string;
  label: string;
}

export interface QrFilterValues {
  q: string;
  type: string;
  status: string;
  folder: string;
}

/** Barre de filtres de la liste : synchronise les query params de /qr. */
export function QrFilters({
  types,
  folders,
  initial,
}: {
  types: FilterOption[];
  folders: FilterOption[];
  initial: QrFilterValues;
}) {
  const t = useTranslations("qr.list");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [values, setValues] = useState(initial);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  function apply(next: QrFilterValues, immediate: boolean) {
    setValues(next);
    if (debounce.current) clearTimeout(debounce.current);
    const push = () => {
      const params = new URLSearchParams();
      if (next.q) params.set("q", next.q);
      if (next.type) params.set("type", next.type);
      if (next.status) params.set("status", next.status);
      if (next.folder) params.set("folder", next.folder);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };
    if (immediate) push();
    else debounce.current = setTimeout(push, 350);
  }

  const selectClass = "input w-auto min-w-36 py-2";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          🔍
        </span>
        <input
          type="search"
          value={values.q}
          onChange={(e) => apply({ ...values, q: e.target.value }, false)}
          placeholder={t("searchPlaceholder")}
          className="input pl-9"
        />
      </div>
      <select
        value={values.type}
        onChange={(e) => apply({ ...values, type: e.target.value }, true)}
        className={selectClass}
      >
        <option value="">{t("allTypes")}</option>
        {types.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={values.status}
        onChange={(e) => apply({ ...values, status: e.target.value }, true)}
        className={selectClass}
      >
        <option value="">{t("allStatuses")}</option>
        <option value="active">{tc("status.active")}</option>
        <option value="inactive">{tc("status.inactive")}</option>
        <option value="expired">{tc("status.expired")}</option>
      </select>
      {folders.length > 0 && (
        <select
          value={values.folder}
          onChange={(e) => apply({ ...values, folder: e.target.value }, true)}
          className={selectClass}
        >
          <option value="">{t("allFolders")}</option>
          {folders.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
