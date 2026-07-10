import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CATEGORIES, typesByCategory } from "@/lib/qr-types/registry";

export async function TypePicker() {
  const t = await getTranslations("qr");
  const locale = (await getLocale()) as "fr" | "en";

  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-bold text-slate-900">
        {t("typePicker.title")}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{t("typePicker.subtitle")}</p>

      <div className="mt-8 space-y-10">
        {CATEGORIES.map((category) => (
          <div key={category.id}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              <span>{category.icon}</span>
              {category.name[locale]}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {typesByCategory(category.id).map((type) => (
                <Link
                  key={type.id}
                  href={`/qr/new?type=${type.id}`}
                  className="card group flex items-start gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl transition-colors group-hover:bg-indigo-100">
                    {type.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      {type.name[locale]}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      {type.description[locale]}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
