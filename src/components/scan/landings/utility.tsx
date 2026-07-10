import { getTranslations } from "next-intl/server";
import { buildICS, ensureHttp, toIcsDate } from "@/lib/qr-types/encoders";
import { formatDateTime } from "@/lib/utils";
import { CopyChip } from "@/components/scan/CopyChip";
import { str, type LandingProps } from "./util";

/** Identifiants Wi-Fi (version dynamique : page d'information). */
export async function WifiLanding({ data }: LandingProps) {
  const t = await getTranslations("scan.wifi");
  const security = str(data.security) || "WPA";
  const password = str(data.password);
  const isOpen = security === "nopass";

  return (
    <div className="card p-8">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-3xl">
          📶
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-900">{t("title")}</h1>
      </div>

      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("network")}
          </dt>
          <dd className="mt-1 text-base font-bold text-slate-900">
            {str(data.ssid)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("security")}
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-700">
            {isOpen ? t("open") : security}
          </dd>
        </div>
        {!isOpen && password && (
          <div>
            <dt className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("password")}
            </dt>
            <dd>
              <CopyChip value={password} />
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-6 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
        💡 {t("hint")}
      </p>
    </div>
  );
}

function googleCalendarUrl(data: Record<string, unknown>): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: str(data.title),
  });
  const start = toIcsDate(data.startDate);
  const end = toIcsDate(data.endDate) || start;
  if (start) params.set("dates", `${start}/${end}`);
  if (str(data.location)) params.set("location", str(data.location));
  if (str(data.description)) params.set("details", str(data.description));
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Événement : détails + ajout au calendrier (.ics ou Google Agenda). */
export async function EventLanding({ data, locale }: LandingProps) {
  const t = await getTranslations("scan.event");
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(buildICS(data))}`;
  const url = ensureHttp(data.url);
  const start = str(data.startDate);
  const end = str(data.endDate);

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-br from-violet-600 to-indigo-600 px-8 pb-6 pt-8 text-center text-white">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl ring-4 ring-white/15">
          📅
        </span>
        <h1 className="mt-4 text-xl font-bold">{str(data.title)}</h1>
        {start && (
          <p className="mt-2 text-sm text-violet-100">
            {formatDateTime(start, locale)}
            {end ? ` → ${formatDateTime(end, locale)}` : ""}
          </p>
        )}
      </div>

      <div className="space-y-4 p-6">
        {str(data.location) && (
          <p className="flex items-center gap-2 text-sm text-slate-700">
            <span>📍</span>
            <span>
              <span className="block text-xs text-slate-400">{t("location")}</span>
              <span className="font-medium">{str(data.location)}</span>
            </span>
          </p>
        )}
        {str(data.description) && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {str(data.description)}
          </p>
        )}
        {url && (
          <a
            href={url}
            rel="noopener noreferrer"
            className="btn-secondary w-full"
          >
            🔗 {t("link")}
          </a>
        )}
        <div className="flex gap-2">
          <a
            href={googleCalendarUrl(data)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex-1"
          >
            {t("addGoogle")}
          </a>
          <a
            href={icsHref}
            download={`${str(data.title) || "event"}.ics`}
            className="btn-secondary flex-1"
          >
            {t("downloadIcs")}
          </a>
        </div>
      </div>
    </div>
  );
}
