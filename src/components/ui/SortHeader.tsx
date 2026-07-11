"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * En-tête de colonne cliquable qui pilote le tri via les query params
 * ?sort=<field>&dir=asc|desc — état porté par l'URL, pas de state local,
 * pour rester cohérent avec les autres filtres server-rendered de l'app.
 */
export function SortHeader({
  field,
  children,
  className = "",
}: {
  field: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeField = searchParams.get("sort");
  const activeDir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const isActive = activeField === field;

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", field);
    params.set("dir", isActive && activeDir === "desc" ? "asc" : "desc");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <th className={`px-4 py-3 font-medium ${className}`}>
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-700"
      >
        {children}
        <span className={`text-[10px] ${isActive ? "text-indigo-600" : "text-slate-300"}`}>
          {isActive ? (activeDir === "asc" ? "▲" : "▼") : "▲▼"}
        </span>
      </button>
    </th>
  );
}
