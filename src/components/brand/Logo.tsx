import Link from "next/link";

export function LogoIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="url(#logo-g)" />
      <path
        fill="#fff"
        d="M8 8h7v7H8V8Zm2 2v3h3v-3h-3Zm7-2h7v7h-7V8Zm2 2v3h3v-3h-3ZM8 17h7v7H8v-7Zm2 2v3h3v-3h-3Zm7-2h3v3h-3v-3Zm4 4h3v3h-3v-3Zm-4 0h2v3h-2v-3Zm6-4h1v3h-1v-3Z"
      />
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#4f46e5" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({
  href = "/",
  name = "QRHub",
}: {
  href?: string;
  name?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <LogoIcon />
      <span className="text-lg font-bold tracking-tight text-slate-900">
        {name}
      </span>
    </Link>
  );
}
