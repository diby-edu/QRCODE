"use client";

import { useState } from "react";
import Link from "next/link";

type NavLink = { href: string; label: string };

/**
 * Menu mobile (visible < sm) : bouton hamburger qui ouvre un panneau avec
 * les liens d'ancre de la landing + les actions de compte. Se referme au
 * clic sur un lien pour laisser le défilement fluide se faire.
 */
export function MobileNav({
  links,
  isLoggedIn,
  labels,
}: {
  links: NavLink[];
  isLoggedIn: boolean;
  labels: { dashboard: string; login: string; register: string };
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
      >
        {open ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-20 bg-slate-900/20"
            onClick={close}
          />
          <div className="absolute inset-x-0 top-full z-40 border-b border-slate-200 bg-white shadow-lg">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className="rounded-lg px-3 py-2.5 text-base font-medium text-slate-700 hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-4">
                {isLoggedIn ? (
                  <Link href="/dashboard" onClick={close} className="btn-primary w-full">
                    {labels.dashboard}
                  </Link>
                ) : (
                  <>
                    <Link href="/auth/login" onClick={close} className="btn-secondary w-full">
                      {labels.login}
                    </Link>
                    <Link href="/auth/register" onClick={close} className="btn-primary w-full">
                      {labels.register}
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
