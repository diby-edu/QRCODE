import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/marketing/LegalPage";

export default async function GdprPage() {
  const t = await getTranslations("legal.gdpr");

  return (
    <LegalPage
      title={t("title")}
      updated={t("updated")}
      lead={t("lead")}
      sections={t.raw("sections")}
    />
  );
}
