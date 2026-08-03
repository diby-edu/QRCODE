"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Enveloppe de révélation au scroll : fait apparaître ses enfants (fondu +
 * glissement) quand ils entrent dans le viewport. Le vrai contenu est rendu
 * côté serveur et simplement passé en children — ce composant ne fait que
 * piloter la classe CSS `.reveal` via IntersectionObserver.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Compteur animé de 0 → `to`, déclenché quand il devient visible. */
export function CountUp({
  to,
  suffix = "",
  duration = 1400,
  className = "",
}: {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(Math.round(eased * to));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {value}
      {suffix}
    </span>
  );
}

const QR_CELLS = [
  "1111111010011111111",
  "1000001001010000001",
  "1011101110101011101",
  "1011101011001011101",
  "1011101100111011101",
  "1000001010010000001",
  "1111111010101111111",
  "0000000110100000000",
  "1101011011011010110",
  "0110100101100111010",
  "1010111001010110011",
  "0000000101101001010",
  "1111111011010110101",
  "1000001001110011010",
  "1011101010011010111",
  "1011101101010110010",
  "1011101011101011101",
  "1000001110010100110",
  "1111111010110101011",
];

/**
 * Pièce maîtresse du héros : un unique QR code (fixe, "imprimé") au-dessus
 * d'une barre de destination qui change en boucle — visualise directement
 * la promesse centrale du produit : le même QR, une destination modifiable.
 */
export function DynamicQrShowcase({
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
    <div className="relative mx-auto w-full max-w-sm">
      {/* Halo dégradé animé derrière la carte */}
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-indigo-300/50 via-violet-300/40 to-fuchsia-200/40 blur-3xl animate-blob"
      />
      <div className="card animate-float relative rotate-1 p-6 shadow-xl transition-transform duration-500 hover:rotate-0 sm:p-8">
        <div className="flex items-center gap-1.5 pb-4">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-2 text-xs font-medium text-slate-400">{label}</span>
        </div>

        <div className="rounded-2xl bg-slate-50/70 p-5 ring-1 ring-slate-100">
          <svg viewBox="0 0 19 19" className="mx-auto h-48 w-48" aria-hidden>
            <defs>
              <linearGradient id="showcase-qr-g" x1="0" y1="0" x2="19" y2="19">
                <stop stopColor="#4f46e5" />
                <stop offset="1" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
            {QR_CELLS.flatMap((row, y) =>
              row.split("").map((cell, x) =>
                cell === "1" ? (
                  <rect
                    key={`${x}-${y}`}
                    x={x + 0.08}
                    y={y + 0.08}
                    width={0.84}
                    height={0.84}
                    rx={0.2}
                    fill="url(#showcase-qr-g)"
                  />
                ) : null
              )
            )}
          </svg>
        </div>

        {/* Barre de destination : change en boucle, le QR ne bouge jamais */}
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs text-white">
            →
          </span>
          <span
            key={index}
            className="animate-dest truncate text-sm font-semibold text-slate-800"
          >
            {destinations[index]}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {destinations.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-5 bg-indigo-600" : "w-1.5 bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      <p className="mt-5 text-center text-sm font-medium text-slate-500">
        {caption}
      </p>
    </div>
  );
}
