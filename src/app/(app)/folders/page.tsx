import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plans";
import type { Folder } from "@/lib/types";
import { CreateFolderForm, FolderCard } from "@/components/folders/folders-ui";

type FolderWithCount = Pick<Folder, "id" | "name" | "color"> & {
  qr_codes: { count: number }[];
};

export default async function FoldersPage() {
  const t = await getTranslations("qr.folders");
  const tc = await getTranslations("common");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: foldersRaw }, { limits }] = await Promise.all([
    supabase
      .from("folders")
      .select("id, name, color, qr_codes(count)")
      .order("created_at", { ascending: true }),
    getUserPlan(supabase, user!.id),
  ]);

  const folders = (foldersRaw ?? []) as FolderWithCount[];

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      {!limits.folders_enabled ? (
        <div className="card flex flex-col items-center gap-3 bg-gradient-to-br from-indigo-50 to-violet-50 p-10 text-center">
          <span className="text-3xl">🔒</span>
          <p className="max-w-md text-sm text-slate-500">{t("locked")}</p>
          <Link href="/billing" className="btn-primary mt-2">
            {tc("actions.upgrade")}
          </Link>
        </div>
      ) : (
        <>
          <CreateFolderForm />

          {folders.length === 0 ? (
            <div className="card mt-5 p-12 text-center">
              <span className="text-4xl">📁</span>
              <p className="mt-3 text-sm text-slate-400">{t("empty")}</p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {folders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  qrCount={folder.qr_codes?.[0]?.count ?? 0}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
