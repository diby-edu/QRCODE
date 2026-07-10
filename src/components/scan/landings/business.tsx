import { getTranslations } from "next-intl/server";
import { ensureHttp, normalizePhone } from "@/lib/qr-types/encoders";
import { formatDate } from "@/lib/utils";
import { CopyChip } from "@/components/scan/CopyChip";
import { objArr, str, strArr, type LandingProps } from "./util";

/** Page de présentation d'entreprise. */
export async function BusinessLanding({ data }: LandingProps) {
  const t = await getTranslations("scan.business");
  const name = str(data.name);
  const logo = str(data.logo);
  const cover = str(data.cover);
  const photos = strArr(data.photos);
  const video = str(data.video);
  const contacts = [
    { icon: "📞", value: str(data.phone), href: `tel:${normalizePhone(data.phone)}` },
    { icon: "✉️", value: str(data.email), href: `mailto:${str(data.email)}` },
    { icon: "🌐", value: str(data.website), href: ensureHttp(data.website) },
    { icon: "📍", value: str(data.address), href: "" },
  ].filter((c) => c.value);

  return (
    <div className="card overflow-hidden">
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt={name}
          className="h-44 w-full object-cover"
        />
      )}
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 px-8 pb-6 pt-8 text-center text-white">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={name}
            className="mx-auto h-16 w-16 rounded-2xl bg-white object-cover ring-4 ring-white/10"
          />
        ) : (
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl ring-4 ring-white/10">
            🏢
          </span>
        )}
        <h1 className="mt-4 text-xl font-bold">{name}</h1>
        {str(data.tagline) && (
          <p className="mt-1 text-sm text-slate-300">{str(data.tagline)}</p>
        )}
      </div>

      <div className="space-y-5 p-6">
        {str(data.description) && (
          <p className="text-sm leading-relaxed text-slate-600">
            {str(data.description)}
          </p>
        )}

        {contacts.length > 0 && (
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("contact")}
            </h2>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {contacts.map((c, i) => {
                const inner = (
                  <>
                    <span>{c.icon}</span>
                    <span className="text-sm font-medium text-slate-800">
                      {c.value}
                    </span>
                  </>
                );
                return c.href ? (
                  <a key={i} href={c.href} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    {inner}
                  </a>
                ) : (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {str(data.hours) && (
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("hours")}
            </h2>
            <p className="whitespace-pre-line rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {str(data.hours)}
            </p>
          </div>
        )}

        {video && (
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("video")}
            </h2>
            <video
              controls
              playsInline
              preload="metadata"
              src={video}
              className="aspect-video w-full rounded-xl bg-slate-950"
            >
              {name}
            </video>
          </div>
        )}

        {photos.length > 0 && (
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("photos")}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${name} ${i + 1}`}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MenuItem {
  name: string;
  price: string;
  description: string;
}

/** "Poulet braisé | 5000 | Avec attiéké" → { name, price, description } */
function parseMenuItems(raw: string): MenuItem[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", price = "", description = ""] = line
        .split("|")
        .map((p) => p.trim());
      return { name, price, description };
    })
    .filter((i) => i.name);
}

/** Menu de restaurant par sections. */
export async function MenuLanding({ data }: LandingProps) {
  const name = str(data.restaurantName);
  const currency = str(data.currency) || "FCFA";
  const sections = objArr(data.sections)
    .map((s) => ({ name: str(s.name), items: parseMenuItems(str(s.items)) }))
    .filter((s) => s.name && s.items.length > 0);

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 px-8 pb-6 pt-8 text-center text-white">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl ring-4 ring-white/15">
          🍽️
        </span>
        <h1 className="mt-4 text-xl font-bold">{name}</h1>
        {str(data.description) && (
          <p className="mt-1 text-sm text-amber-50">{str(data.description)}</p>
        )}
      </div>

      <div className="space-y-6 p-6">
        {sections.map((section, i) => (
          <section key={i}>
            <h2 className="mb-3 border-b border-dashed border-slate-200 pb-2 text-base font-bold text-slate-900">
              {section.name}
            </h2>
            <ul className="space-y-3">
              {section.items.map((item, j) => (
                <li key={j} className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-500">{item.description}</p>
                    )}
                  </div>
                  {item.price && (
                    <p className="shrink-0 text-sm font-bold text-slate-900">
                      {item.price} {currency}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Bon de réduction avec code à copier. */
export async function CouponLanding({ data, locale }: LandingProps) {
  const t = await getTranslations("scan.coupon");
  const validUntil = str(data.validUntil);

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-500 px-8 pb-6 pt-8 text-center text-white">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl ring-4 ring-white/15">
          🎟️
        </span>
        <p className="mt-4 text-sm font-medium text-emerald-50">
          {str(data.businessName)}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">{str(data.offer)}</h1>
      </div>

      <div className="space-y-4 p-6">
        {str(data.description) && (
          <p className="text-center text-sm text-slate-600">
            {str(data.description)}
          </p>
        )}

        <div>
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("yourCode")}
          </p>
          <CopyChip value={str(data.code)} />
        </div>

        {validUntil && (
          <p className="text-center text-sm font-medium text-amber-600">
            ⏳ {t("validUntil", { date: formatDate(validUntil, locale) })}
          </p>
        )}

        {str(data.terms) && (
          <p className="whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {t("terms")} : {str(data.terms)}
          </p>
        )}
      </div>
    </div>
  );
}

/** Page de paiement : montant + lien + instructions. */
export async function PaymentLanding({ title, data }: LandingProps) {
  const t = await getTranslations("scan.payment");
  const amount = str(data.amount);
  const currency = str(data.currency) || "FCFA";
  const paymentUrl = ensureHttp(data.paymentUrl);

  return (
    <div className="card p-8 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
        💰
      </span>
      <h1 className="mt-5 text-xl font-bold text-slate-900">
        {str(data.title) || title}
      </h1>

      {amount && (
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("amount")}
          </p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">
            {amount} <span className="text-lg font-bold">{currency}</span>
          </p>
        </div>
      )}

      {paymentUrl && (
        <a
          href={paymentUrl}
          rel="noopener noreferrer"
          className="btn-primary mt-5 w-full"
        >
          {t("pay")}
        </a>
      )}

      {str(data.instructions) && (
        <div className="mt-5 text-left">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("instructions")}
          </p>
          <p className="whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {str(data.instructions)}
          </p>
        </div>
      )}
    </div>
  );
}
