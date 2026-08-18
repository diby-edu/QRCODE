import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AuthShowcase } from "@/components/marketing/AuthShowcase";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("common");
  const tl = await getTranslations("landing.hero.showcase");

  return (
    <div className="flex min-h-screen">
      {/* Panneau de marque.
          Il répétait le nom du produit et une phrase de catégorie — l'espace
          le plus visible du parcours ne disait rien à quelqu'un qui hésite
          encore. Il montre désormais la promesse au lieu de l'énoncer : le QR
          reste identique pendant que sa destination change en boucle. */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5 animate-blob" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />

        {/* Logo cliquable : sans ça, un visiteur arrivé ici n'avait aucun
            moyen de revenir consulter les tarifs. */}
        <Link href="/" className="relative w-fit">
          <Logo name={t("appName")} />
        </Link>

        {/* Bloc central : le panneau fait 720x900 sur un écran courant, la
            démonstration doit être à cette échelle. En max-w-sm elle occupait
            20% de la hauteur et se lisait comme une vignette perdue. */}
        <div className="relative flex w-full max-w-lg flex-col justify-center py-6">
          <h2 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
            {t("tagline")}
          </h2>
          <div className="mt-10">
            <AuthShowcase
              label={tl("label")}
              destinations={tl.raw("destinations") as string[]}
              caption={tl("caption")}
            />
          </div>
        </div>

        <p className="relative text-sm text-indigo-200">
          © {new Date().getFullYear()} {t("appName")} — {t("footer.rights")}
        </p>
      </div>

      {/* Panneau formulaire */}
      <div className="flex flex-1 flex-col bg-slate-50 px-6 py-8">
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="lg:hidden">
            <Logo name={t("appName")} />
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md animate-fade-up">{children}</div>
        </div>
      </div>
    </div>
  );
}
