/** Tuile KPI : libellé + valeur (+ précision optionnelle + description discrète). */
export function StatTile({
  label,
  value,
  hint,
  description,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  description?: string;
  icon?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {description && <p className="mt-1 text-xs text-slate-300">{description}</p>}
    </div>
  );
}
