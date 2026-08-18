"use client";

import dynamic from "next/dynamic";
import type { AreaTrendChartImpl } from "./AreaTrendChartImpl";

/**
 * Chargement différé de recharts (~300 Ko).
 *
 * Contrairement à `qr-code-styling` et `jspdf`, déjà différés, recharts
 * partait dans le bundle initial du tableau de bord et des pages admin :
 * chaque visiteur le téléchargeait avant même de voir un graphique, alors
 * qu'il n'est utile qu'une fois la page rendue.
 *
 * `ssr: false` : les graphiques mesurent leur conteneur pour se dimensionner,
 * ils n'ont donc rien à produire côté serveur. Le squelette ci-dessous occupe
 * exactement la même hauteur (h-64) que le graphique final, pour éviter que
 * la page ne saute au moment où il apparaît.
 */
const Lazy = dynamic(
  () => import("./AreaTrendChartImpl").then((m) => m.AreaTrendChartImpl),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-xl bg-slate-100" />
    ),
  }
  // `dynamic()` renvoie un composant aux props inférées et perd la généricité
  // de l'original ; ce cast la restaure pour les appelants (dataKey doit
  // rester contraint aux clés de T).
) as typeof AreaTrendChartImpl;

export const AreaTrendChart = Lazy;
