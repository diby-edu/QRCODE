import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";
import { getQrType } from "@/lib/qr-types/registry";
import { qrShortUrl } from "@/lib/url";
import { formatDateTime, formatNumber } from "@/lib/utils";
import type { QrCode, QrCodeData, QrDesign } from "@/lib/types";
import { QRPreview } from "@/components/qr/QRPreview";
import {
  ActiveToggle,
  CopyButton,
  DeleteQrButton,
  DownloadButtons,
  DuplicateButton,
} from "@/components/qr/qr-actions-ui";

export default async function QrDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const { id } = await params;
  const { created, updated } = await searchParams;
  const t = await getTranslations("qr");
  const tc = await getTranslations("common");
  const locale = await getLocale();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: qrRaw }, { limits }, { data: customDomain }] = await Promise.all([
    supabase.from("qr_codes").select("*, qr_code_data(data)").eq("id", id).single(),
    getUserPlan(supabase, user!.id),
    supabase.rpc("active_custom_domain_for_user", { p_user_id: user!.id }),
  ]);
  if (!qrRaw) notFound();

  const qr = qrRaw as QrCode & { qr_code_data: QrCodeData[] };
  const type = getQrType(qr.type);
  const data = (qr.qr_code_data?.[0]?.data ?? {}) as Record<string, unknown>;
  const design = qr.design as QrDesign;

  const value =
    !qr.is_dynamic && type?.staticEncoder
      ? type.staticEncoder(data)
      : qrShortUrl(qr.slug, customDomain);

  const isExpired = qr.expires_at != null && new Date(qr.expires_at) < new Date();

  return (
    <div className="animate-fade-up">
      <Link
        href="/qr"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
      >
        ← {t("detail.backToList")}
      </Link>

      {(created || updated) && (
        <div className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-600/20">
          {created ? t("detail.createdBanner") : t("detail.updatedBanner")}
        </div>
      )}

      {/* En-tête */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl">
            {type?.icon ?? "🔳"}
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{qr.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="badge-indigo">
                {type?.name[locale as "fr" | "en"] ?? qr.type}
              </span>
              <span className={qr.is_dynamic ? "badge-indigo" : "badge-gray"}>
                {qr.is_dynamic ? tc("status.dynamic") : tc("status.static")}
              </span>
              {isExpired ? (
                <span className="badge-amber">{tc("status.expired")}</span>
              ) : qr.is_active ? (
                <span className="badge-green">{tc("status.active")}</span>
              ) : (
                <span className="badge-red">{tc("status.inactive")}</span>
              )}
              {qr.password && (
                <span className="badge-gray">🔒 {tc("status.protected")}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {qr.is_dynamic && (
            <Link href={`/qr/${qr.id}/stats`} className="btn-secondary btn-sm">
              📊 {t("list.actions.stats")}
            </Link>
          )}
          <Link href={`/qr/${qr.id}/edit`} className="btn-primary btn-sm">
            {t("list.actions.edit")}
          </Link>
          <DuplicateButton id={qr.id} />
          <DeleteQrButton id={qr.id} name={qr.title} redirectTo="/qr" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* QR + téléchargements */}
        <div className="card p-6">
          <div className="flex justify-center rounded-xl border border-slate-100 bg-slate-50/60 p-6">
            <QRPreview value={value} design={design} size={240} />
          </div>
          <div className="mt-5">
            <p className="label">{t("download.title")}</p>
            <DownloadButtons
              value={value}
              design={design}
              title={qr.title}
              allowedFormats={limits.formats}
            />
          </div>
          <div className="mt-5">
            <p className="label">{t("detail.shortUrl")}</p>
            {qr.is_dynamic ? (
              <div className="flex items-center gap-2">
                <code className="block flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                  {qrShortUrl(qr.slug, customDomain)}
                </code>
                <CopyButton text={qrShortUrl(qr.slug, customDomain)} />
              </div>
            ) : (
              <p className="text-xs text-slate-400">{t("detail.notScannable")}</p>
            )}
          </div>
        </div>

        {/* Infos */}
        <div className="card p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            {t("detail.info")}
          </h2>
          <dl className="divide-y divide-slate-100">
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-slate-500">
                {t("list.columns.scans")}
              </dt>
              <dd className="text-sm font-bold text-slate-900">
                {formatNumber(qr.scan_count, locale)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-slate-500">
                {t("list.columns.created")}
              </dt>
              <dd className="text-sm font-medium text-slate-700">
                {formatDateTime(qr.created_at, locale)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-slate-500">
                {t("builder.expiresLabel")}
              </dt>
              <dd className="text-sm font-medium text-slate-700">
                {formatDateTime(qr.expires_at, locale)}
              </dd>
            </div>
            {qr.is_dynamic && (
              <div className="flex items-center justify-between py-3">
                <dt className="text-sm text-slate-500">
                  {t("builder.activeToggle")}
                </dt>
                <dd>
                  <ActiveToggle id={qr.id} isActive={qr.is_active} />
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
