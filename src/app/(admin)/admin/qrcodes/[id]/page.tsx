import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getQrType } from "@/lib/qr-types/registry";
import { qrShortUrl } from "@/lib/url";
import { formatDate } from "@/lib/utils";
import type { QrCode, QrCodeData } from "@/lib/types";
import { AdminQrEditForm } from "@/components/admin/AdminQrEditForm";

export default async function AdminQrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("admin.qrcodes");
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

  const [{ data: owner }, { data: customDomain }] = await Promise.all([
    supabase.from("profiles").select("email, full_name").eq("id", qr.user_id).single(),
    supabase.rpc("active_custom_domain_for_user", { p_user_id: qr.user_id }),
  ]);

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
          {qr.is_dynamic && (
            <p className="mt-1 text-xs text-slate-400">{qrShortUrl(qr.slug, customDomain)}</p>
          )}
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
