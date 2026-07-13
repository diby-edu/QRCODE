"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const CATEGORIES = ["user", "plan", "qr", "payment", "settings", "domain"] as const;

export function AdminActivityFilters({
  admins,
  initial,
}: {
  admins: string[];
  initial: { q: string; category: string; admin: string; from: string; to: string };
}) {
  const t = useTranslations("admin.activity");
  const router = useRouter();
  const pathname = usePathname();
  const [values, setValues] = useState(initial);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  function apply(next: typeof values, immediate: boolean) {
    setValues(next);
    if (debounce.current) clearTimeout(debounce.current);
    const push = () => {
      const params = new URLSearchParams();
      if (next.q) params.set("q", next.q);
      if (next.category) params.set("category", next.category);
      if (next.admin) params.set("admin", next.admin);
      if (next.from) params.set("from", next.from);
      if (next.to) params.set("to", next.to);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };
    if (immediate) push();
    else debounce.current = setTimeout(push, 350);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          🔍
        </span>
        <input
          type="search"
          value={values.q}
          onChange={(e) => apply({ ...values, q: e.target.value }, false)}
          placeholder={t("filters.searchPlaceholder")}
          className="input pl-9"
        />
      </div>
      <select
        value={values.category}
        onChange={(e) => apply({ ...values, category: e.target.value }, true)}
        className="input w-auto min-w-36 py-2"
      >
        <option value="">{t("filters.allCategories")}</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {t(`filters.categories.${c}`)}
          </option>
        ))}
      </select>
      {admins.length > 0 && (
        <select
          value={values.admin}
          onChange={(e) => apply({ ...values, admin: e.target.value }, true)}
          className="input w-auto min-w-40 py-2"
        >
          <option value="">{t("filters.allAdmins")}</option>
          {admins.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>
      )}
      <input
        type="date"
        value={values.from}
        onChange={(e) => apply({ ...values, from: e.target.value }, true)}
        className="input w-auto py-2"
        aria-label={t("filters.from")}
      />
      <input
        type="date"
        value={values.to}
        onChange={(e) => apply({ ...values, to: e.target.value }, true)}
        className="input w-auto py-2"
        aria-label={t("filters.to")}
      />
    </div>
  );
}
