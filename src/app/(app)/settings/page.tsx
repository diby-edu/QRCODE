import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";
import {
  CustomDomainForm,
  LanguageForm,
  PasswordForm,
  ProfileForm,
} from "@/components/settings/settings-forms";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const locale = await getLocale();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { limits }, { data: domain }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
    getUserPlan(supabase, user!.id),
    supabase
      .from("custom_domains")
      .select("domain, status")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      <div className="grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ProfileForm
            initialName={profile?.full_name ?? ""}
            email={user?.email ?? ""}
          />
          <CustomDomainForm enabled={limits.custom_domain_enabled} current={domain ?? null} />
        </div>
        <div className="space-y-6">
          <PasswordForm />
          <LanguageForm initialLocale={locale} />
        </div>
      </div>
    </div>
  );
}
