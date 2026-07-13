"use client";

import { useTranslations } from "next-intl";

const EXAMPLE_DOMAIN = "maboutique.com";
const EXAMPLE_SUBDOMAIN = "go.maboutique.com";

/**
 * Explication pas-à-pas du domaine personnalisé, avec un exemple concret
 * de bout en bout — affichée à côté du formulaire pour lever toute
 * ambiguïté sur "qui fait quoi" (le client possède déjà son domaine,
 * QRHub n'en vend pas) et "qui paie quoi" (la fonctionnalité est incluse
 * dans l'abonnement, le nom de domaine est un achat séparé chez un
 * registrar, indépendant de QRHub).
 */
export function CustomDomainExplainer() {
  const t = useTranslations("settings.customDomain.explainer");

  return (
    <div className="card space-y-5 border-indigo-100 bg-indigo-50/30 p-6">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          💡
        </span>
        <h3 className="text-sm font-bold text-slate-900">{t("title")}</h3>
      </div>

      <p className="text-sm text-slate-600">{t("prerequisite")}</p>

      <div className="rounded-lg bg-white p-3 ring-1 ring-slate-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          {t("exampleLabel")}
        </p>
        <p className="mt-1 text-sm text-slate-700">
          {t("exampleIntro", { domain: EXAMPLE_DOMAIN })}
        </p>
      </div>

      <ol className="space-y-4">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            1
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">{t("step1.title")}</p>
            <p className="mt-0.5 text-xs text-slate-500">{t("step1.description")}</p>
            <div className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
              <div>Type&nbsp;&nbsp;: CNAME</div>
              <div>Nom&nbsp;&nbsp;&nbsp;: go</div>
              <div>Cible&nbsp;: qrcode.numerik360.com</div>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {t("step1.result", { domain: EXAMPLE_SUBDOMAIN })}
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            2
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">{t("step2.title")}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("step2.description", { domain: EXAMPLE_SUBDOMAIN })}
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            3
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">{t("step3.title")}</p>
            <p className="mt-0.5 text-xs text-slate-500">{t("step3.description")}</p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            4
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">{t("step4.title")}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("step4.description", { domain: EXAMPLE_SUBDOMAIN })}
            </p>
          </div>
        </li>
      </ol>

      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        💰 {t("pricingNote", { domain: EXAMPLE_DOMAIN })}
      </div>
    </div>
  );
}
