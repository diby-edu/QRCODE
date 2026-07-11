"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function AdminUsersFilters({
  plans,
  initial,
}: {
  plans: { id: string; name: string }[];
  initial: { q: string; plan: string };
}) {
  const t = useTranslations("admin.users");
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
      if (next.plan) params.set("plan", next.plan);
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
          placeholder={t("searchPlaceholder")}
          className="input pl-9"
        />
      </div>
      <select
        value={values.plan}
        onChange={(e) => apply({ ...values, plan: e.target.value }, true)}
        className="input w-auto min-w-36 py-2"
      >
        <option value="">{t("allPlans")}</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
