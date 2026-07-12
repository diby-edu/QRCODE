import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { trackVisit } from "@/lib/analytics/track-visit";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/qr",
  "/stats",
  "/folders",
  "/settings",
  "/billing",
  "/admin",
];

const AUTH_PAGES = ["/auth/login", "/auth/register"];

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session if needed; do not add logic between client creation
  // and getUser() — it can cause session desync.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Trafic du site (pages vues) — exclut l'usage admin et les appels API,
  // qui ne sont pas du "trafic visiteur". Les scans de QR (/q/*) sont déjà
  // exclus par le matcher ci-dessous et trackés séparément (record_scan).
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    event.waitUntil(
      trackVisit(pathname, request.headers.get("user-agent"), request.headers.get("referer"))
    );
  }

  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets, the public scan route and payment webhooks.
    "/((?!_next/static|_next/image|favicon.ico|q/|api/paydunya|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
