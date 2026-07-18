import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/marketing/LegalPage";

export default async function AboutPage() {
  const t = await getTranslations("legal.about");

  return (
    <LegalPage
      title={t("title")}
      lead={t("lead")}
      sections={t.raw("sections")}
    />
  );
}
