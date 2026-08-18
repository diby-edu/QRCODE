"use client";

import { useEffect, useState } from "react";

/**
 * Démonstration animée de la promesse « Imprimez une fois. Modifiez à
 * l'infini. » sur le panneau des pages de connexion et d'inscription.
 *
 * Variante compacte de DynamicQrShowcase : le principe est le même — un QR
 * qui ne bouge jamais pendant que sa destination défile — mais le composant
 * de la landing est conçu pour un fond clair et occupe trop de hauteur ici,
 * où il doit cohabiter avec le titre, le logo et la mention légale.
 *
 * Montrer plutôt que dire : la valeur du produit se comprend en deux
 * secondes, sans avoir à lire un argumentaire.
 */

// Motif décoratif, pas un vrai QR : il ne mène nulle part et n'a pas à être
// scannable — l'afficher scannable inviterait à le tester pour rien.
const CELLS = [
  "1111111011101111111",
  "1000001010101000001",
  "1011101000101011101",
  "1011101011101011101",
  "1011101010001011101",
  "1000001001101000001",
  "1111111010101111111",
  "0000000011000000000",
  "1101101100110110110",
  "0010011010101001101",
  "1101110001010110011",
  "0100101101101001010",
  "1110011010011100110",
  "0000000110101101011",
  "1111111001100101101",
  "1000001010011010010",
  "1011101101101101101",
  "1011101001010011010",
  "1111111011011101101",
];

export function AuthShowcase({
  label,
  destinations,
  caption,
}: {
  label: string;
  destinations: string[];
  caption: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (destinations.length <= 1) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % destinations.length),
      2400
    );
    return () => clearInterval(id);
  }, [destinations.length]);

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
          {label}
        </p>

        <div className="mt-3 flex items-center gap-5">
          <div className="shrink-0 rounded-xl bg-white p-2.5">
            <svg viewBox="0 0 19 19" className="h-24 w-24" aria-hidden>
              {CELLS.flatMap((row, y) =>
                row.split("").map((cell, x) =>
                  cell === "1" ? (
                    <rect
                      key={`${x}-${y}`}
                      x={x + 0.08}
                      y={y + 0.08}
                      width={0.84}
                      height={0.84}
                      rx={0.2}
                      fill="#4f46e5"
                    />
                  ) : null
                )
              )}
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <span className="block text-xl text-indigo-200">↓</span>
            {/* La clé change à chaque destination : elle force React à
                remonter l'élément, ce qui relance l'animation d'entrée. */}
            <span
              key={index}
              className="animate-dest mt-1 block truncate text-lg font-bold text-white"
            >
              {destinations[index]}
            </span>
            <div className="mt-3 flex gap-1.5">
              {destinations.map((d, i) => (
                <span
                  key={d}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === index ? "w-6 bg-white" : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 max-w-sm text-sm text-indigo-100">{caption}</p>
    </div>
  );
}
