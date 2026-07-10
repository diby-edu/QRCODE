"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Champ de recherche synchronisé avec le query param ?q= (pages admin). */
export function AdminSearch({
  placeholder,
  initial,
}: {
  placeholder: string;
  initial: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initial);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  return (
    <div className="relative max-w-md">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        🔍
      </span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        className="input pl-9"
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          if (debounce.current) clearTimeout(debounce.current);
          debounce.current = setTimeout(() => {
            router.replace(
              next ? `${pathname}?q=${encodeURIComponent(next)}` : pathname,
              { scroll: false }
            );
          }, 350);
        }}
      />
    </div>
  );
}
