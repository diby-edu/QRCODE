import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";
import { getQrType } from "@/lib/qr-types/registry";
import type { QrCode, QrCodeData, QrDesign } from "@/lib/types";
import { QRBuilder } from "@/components/qr/QRBuilder";

export default async function EditQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: qrRaw }, { limits }, { data: folders }] = await Promise.all([
    supabase.from("qr_codes").select("*, qr_code_data(data)").eq("id", id).single(),
    getUserPlan(supabase, user!.id),
    supabase.from("folders").select("id, name").order("name"),
  ]);
  if (!qrRaw) notFound();

  const qr = qrRaw as QrCode & { qr_code_data: QrCodeData[] };
  if (!getQrType(qr.type)) notFound();

  return (
    <QRBuilder
      typeId={qr.type}
      mode="edit"
      qrId={qr.id}
      slug={qr.slug}
      folders={folders ?? []}
      limits={limits}
      initial={{
        title: qr.title,
        data: (qr.qr_code_data?.[0]?.data ?? {}) as Record<string, unknown>,
        design: qr.design as QrDesign,
        isDynamic: qr.is_dynamic,
        isActive: qr.is_active,
        folderId: qr.folder_id,
        expiresAt: qr.expires_at ? qr.expires_at.slice(0, 16) : null,
        hasPassword: qr.password != null,
      }}
    />
  );
}
