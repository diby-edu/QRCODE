import { getTranslations } from "next-intl/server";
import { buildVCard, ensureHttp, normalizePhone } from "@/lib/qr-types/encoders";
import { str, type LandingProps } from "./util";

/** vCard : profil + lignes de contact cliquables + téléchargement .vcf. */
export async function VCardLanding({ data }: LandingProps) {
  const t = await getTranslations("scan.vcard");
  const first = str(data.firstName);
  const last = str(data.lastName);
  const fullName = [first, last].filter(Boolean).join(" ");
  const initials = `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase() || "👤";
  const org = str(data.organization);
  const job = str(data.jobTitle);
  const address = [str(data.address), str(data.city), str(data.country)]
    .filter(Boolean)
    .join(", ");

  const vcf = buildVCard(data);
  const vcfHref = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcf)}`;

  const rows = [
    {
      icon: "📞",
      label: t("phone"),
      value: str(data.phone),
      href: `tel:${normalizePhone(data.phone)}`,
    },
    {
      icon: "📱",
      label: t("mobile"),
      value: str(data.mobile),
      href: `tel:${normalizePhone(data.mobile)}`,
    },
    {
      icon: "✉️",
      label: t("email"),
      value: str(data.email),
      href: `mailto:${str(data.email)}`,
    },
    {
      icon: "🌐",
      label: t("website"),
      value: str(data.website),
      href: ensureHttp(data.website),
    },
    { icon: "📍", label: t("address"), value: address, href: "" },
  ].filter((r) => r.value);

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 px-8 pb-6 pt-8 text-center text-white">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-2xl font-bold ring-4 ring-white/20">
          {initials}
        </span>
        <h1 className="mt-4 text-xl font-bold">{fullName}</h1>
        {(job || org) && (
          <p className="mt-1 text-sm text-indigo-100">
            {[job, org].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <div className="p-6">
        <dl className="divide-y divide-slate-100">
          {rows.map((r, i) => {
            const inner = (
              <>
                <span className="text-lg">{r.icon}</span>
                <span className="flex-1">
                  <span className="block text-xs text-slate-400">{r.label}</span>
                  <span className="block text-sm font-medium text-slate-800">
                    {r.value}
                  </span>
                </span>
              </>
            );
            return r.href ? (
              <a key={i} href={r.href} className="flex items-center gap-3 py-3 hover:bg-slate-50">
                {inner}
              </a>
            ) : (
              <div key={i} className="flex items-center gap-3 py-3">
                {inner}
              </div>
            );
          })}
        </dl>
        {str(data.note) && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {str(data.note)}
          </p>
        )}
        <a href={vcfHref} download={`${fullName || "contact"}.vcf`} className="btn-primary mt-5 w-full">
          💾 {t("download")}
        </a>
      </div>
    </div>
  );
}
