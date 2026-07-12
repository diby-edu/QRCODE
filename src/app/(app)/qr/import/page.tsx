import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";
import { CsvImportForm } from "@/components/qr/CsvImportForm";

export default async function QrImportPage() {
  const t = await getTranslations("qr");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ limits }, { data: folders }] = await Promise.all([
    getUserPlan(supabase, user!.id),
    supabase.from("folders").select("id, name").order("name"),
  ]);

  return (
    <div className="animate-fade-up">
      <Link
        href="/qr"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
      >
        ← {t("detail.backToList")}
      </Link>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">{t("import.title")}</h1>
      <p className="mb-6 text-sm text-slate-500">{t("import.subtitle")}</p>
      <CsvImportForm foldersEnabled={limits.folders_enabled} folders={folders ?? []} />
    </div>
  );
}
