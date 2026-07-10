import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  const t = await getTranslations("admin.settings");
  const tNav = await getTranslations("admin.nav");
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["site_name", "support_email", "announcement"]);

  const text = (key: string) => {
    const value = rows?.find((r) => r.key === key)?.value as
      | { text?: string }
      | undefined;
    return value?.text ?? "";
  };

  return (
    <div className="animate-fade-up">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">{tNav("settings")}</h1>
      <p className="mb-6 text-sm text-slate-500">{t("subtitle")}</p>
      <SettingsForm
        initial={{
          site_name: text("site_name") || "QRHub",
          support_email: text("support_email"),
          announcement: text("announcement"),
        }}
      />
    </div>
  );
}
