import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";

type Section = { title: string; body: string };

export function LegalPage({
  title,
  updated,
  lead,
  sections,
}: {
  title: string;
  updated?: string;
  lead?: string;
  sections: Section[];
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {title}
        </h1>
        {updated && <p className="mt-2 text-sm text-slate-400">{updated}</p>}
        {lead && <p className="mt-4 text-lg leading-relaxed text-slate-600">{lead}</p>}

        <div className="card mt-10 divide-y divide-slate-100 p-2">
          {sections.map((section) => (
            <div key={section.title} className="p-6">
              <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{section.body}</p>
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
