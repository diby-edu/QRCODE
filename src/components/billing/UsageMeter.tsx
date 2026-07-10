import { getTranslations } from "next-intl/server";
import { isUnlimited } from "@/lib/plans";

/** Jauge de consommation : piste du même ramp, alerte à l'approche de la limite. */
export async function UsageMeter({
  label,
  used,
  limit,
  locale,
}: {
  label: string;
  used: number;
  limit: number;
  locale: string;
}) {
  const t = await getTranslations("billing.usage");
  const nf = new Intl.NumberFormat(locale);
  const unlimited = isUnlimited(limit);
  const ratio = unlimited ? 0 : Math.min(used / Math.max(limit, 1), 1);

  const fill =
    ratio >= 1 ? "bg-red-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-indigo-500";
  const track =
    ratio >= 1 ? "bg-red-100" : ratio >= 0.8 ? "bg-amber-100" : "bg-indigo-100";

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">
          {unlimited
            ? t("unlimited", { used: nf.format(used) })
            : t("of", { used: nf.format(used), limit: nf.format(limit) })}
        </span>
      </div>
      <div className={`h-2 overflow-hidden rounded-full ${unlimited ? "bg-indigo-100" : track}`}>
        <div
          className={`h-full rounded-full ${unlimited ? "bg-indigo-300" : fill}`}
          style={{ width: unlimited ? "100%" : `${Math.max(ratio * 100, 2)}%` }}
        />
      </div>
    </div>
  );
}
