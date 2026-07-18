import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/marketing/LegalPage";

export default async function PrivacyPage() {
  const t = await getTranslations("legal.privacy");

  return (
    <LegalPage
      title={t("title")}
      updated={t("updated")}
      lead={t("lead")}
      sections={t.raw("sections")}
    />
  );
}
