import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";
import { getQrType } from "@/lib/qr-types/registry";
import { TypePicker } from "@/components/qr/TypePicker";
import { QRBuilder } from "@/components/qr/QRBuilder";

export default async function NewQrPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeId } = await searchParams;
  const type = typeId ? getQrType(typeId) : undefined;

  if (!type) {
    return <TypePicker />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ limits }, { data: folders }, { data: customDomain }] = await Promise.all([
    getUserPlan(supabase, user!.id),
    supabase.from("folders").select("id, name").order("name"),
    supabase.rpc("active_custom_domain_for_user", { p_user_id: user!.id }),
  ]);

  return (
    <QRBuilder
      typeId={type.id}
      mode="create"
      folders={folders ?? []}
      limits={limits}
      customDomain={customDomain}
    />
  );
}
