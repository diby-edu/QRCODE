import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getQrType } from "@/lib/qr-types/registry";
import { qrShortUrl } from "@/lib/url";
import { resolveQrDomain } from "@/lib/domains";
import { formatDate } from "@/lib/utils";
import type { QrCode, QrCodeData, QrDesign } from "@/lib/types";
import { AdminQrEditForm } from "@/components/admin/AdminQrEditForm";
import { QRPreview } from "@/components/qr/QRPreview";
import { CopyButton, DownloadButtons } from "@/components/qr/qr-actions-ui";

// Vue admin : accès à tous les formats d'export, indépendamment du plan du
// propriétaire — outil de support, pas un avantage payant à faire respecter.
const ALL_FORMATS: ("png" | "svg" | "pdf")[] = ["png", "svg", "pdf"];

export default async function AdminQrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [t, tQr] = await Promise.all([
    getTranslations("admin.qrcodes"),
    getTranslations("qr"),
  ]);
  const locale = (await getLocale()) as "fr" | "en";
  const supabase = await createClient();

  const { data: qrRaw } = await supabase
    .from("qr_codes")
    .select("*, qr_code_data(data)")
    .eq("id", id)
    .single();
  if (!qrRaw) notFound();

  const qr = qrRaw as QrCode & { qr_code_data: QrCodeData[] };
  const type = getQrType(qr.type);
  const data = (qr.qr_code_data?.[0]?.data ?? {}) as Record<string, unknown>;
  const design = qr.design as QrDesign;

  const [{ data: owner }, customDomain] = await Promise.all([
    supabase.from("profiles").select("email, full_name").eq("id", qr.user_id).single(),
    resolveQrDomain(supabase, qr.custom_domain_id),
  ]);

  const value =
    !qr.is_dynamic && type?.staticEncoder
      ? type.staticEncoder(data)
      : qrShortUrl(qr.slug, customDomain);

  return (
    <div className="animate-fade-up">
      <Link
        href="/admin/qrcodes"
        className="text-sm font-medium text-indigo-600 hover:underline"
      >
        ← {t("backToList")}
      </Link>

      <div className="mt-2 mb-6 flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl">
          {type?.icon ?? "🔳"}
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{qr.title}</h1>
          <p className="text-sm text-slate-500">
            {t("owner")} : {owner?.full_name || owner?.email || qr.user_id}
            {" · "}
            {type?.name[locale] ?? qr.type}
            {" · "}
            {t("createdOn", { date: formatDate(qr.created_at, locale) })}
          </p>
        </div>
      </div>

      <div className="card mb-6 flex flex-col gap-6 p-6 sm:flex-row">
        <div className="flex shrink-0 justify-center rounded-xl border border-slate-100 bg-slate-50/60 p-6 sm:justify-start">
          <QRPreview value={value} design={design} size={180} />
        </div>
        <div className="flex-1 space-y-5">
          <div>
            <p className="label">{tQr("download.title")}</p>
            <DownloadButtons value={value} design={design} title={qr.title} allowedFormats={ALL_FORMATS} />
          </div>
          <div>
            <p className="label">{tQr("detail.shortUrl")}</p>
            {qr.is_dynamic ? (
              <div className="flex items-center gap-2">
                <code className="block flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                  {qrShortUrl(qr.slug, customDomain)}
                </code>
                <CopyButton text={qrShortUrl(qr.slug, customDomain)} />
              </div>
            ) : (
              <p className="text-xs text-slate-400">{tQr("detail.notScannable")}</p>
            )}
          </div>
        </div>
      </div>

      <AdminQrEditForm
        id={qr.id}
        fields={type?.fields ?? []}
        initial={{
          title: qr.title,
          isActive: qr.is_active,
          expiresAt: qr.expires_at,
          hasPassword: Boolean(qr.password),
          data,
        }}
      />
    </div>
  );
}
