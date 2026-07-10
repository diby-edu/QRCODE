import type { BreakdownItem } from "@/lib/stats";

/**
 * Répartition en lignes à barres : une teinte unique (magnitude),
 * piste claire du même ramp, valeur en texte — jamais dans la couleur.
 */
export function BarRows({
  title,
  items,
  emptyLabel,
  locale,
  labelMap,
}: {
  title: string;
  items: BreakdownItem[];
  emptyLabel: string;
  locale: string;
  labelMap?: Record<string, string>;
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  const nf = new Intl.NumberFormat(locale);

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium text-slate-700">
                  {labelMap?.[item.label] ?? item.label}
                </span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {nf.format(item.count)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${Math.max((item.count / max) * 100, 2)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
