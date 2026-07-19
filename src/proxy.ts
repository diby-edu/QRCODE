import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { trackVisit } from "@/lib/analytics/track-visit";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";
import { extractIp } from "@/lib/net";

// Cache mémoire (process Node unique, pas serverless) : évite une requête
// DB à chaque hit sur un domaine personnalisé. TTL court, acceptable pour
// une opération admin-assistée à faible fréquence (voir DEPLOY.md § 13).
const domainCache = new Map<string, { active: boolean; expires: number }>();
const DOMAIN_CACHE_TTL_MS = 5 * 60 * 1000;

async function isActiveCustomDomain(host: string): Promise<boolean> {
  const cached = domainCache.get(host);
  if (cached && cached.expires > Date.now()) return cached.active;

  const { data } = await createAdminClient()
    .from("custom_domains")
    .select("id")
    .eq("domain", host)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const active = Boolean(data);
  domainCache.set(host, { active, expires: Date.now() + DOMAIN_CACHE_TTL_MS });
  return active;
}

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/qr",
  "/stats",
  "/folders",
  "/settings",
  "/billing",
  "/domain",
  "/admin",
];

const AUTH_PAGES = ["/auth/login", "/auth/register"];

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  // Domaine personnalisé client (go.exemple.com au lieu de
  // qrcode.numerik360.com) : /q/[slug] résout déjà par slug seul et ignore
  // le Host (voir src/app/q/[slug]/page.tsx), donc rien à faire pour les
  // scans — mais le matcher ci-dessous exclut déjà /q/*, donc tout ce qui
  // atteint cette fonction sur un domaine personnalisé actif n'est PAS un
  // scan : on bloque plutôt que d'exposer /dashboard, /admin, etc. sur le
  // domaine d'un client. Si le host ne correspond à aucun domaine actif
  // connu, on laisse passer normalement (le server_name exact de nginx est
  // déjà la protection primaire, ceci est une défense en profondeur).
  const host = request.headers.get("host");
  if (host && host !== new URL(appUrl()).host && (await isActiveCustomDomain(host))) {
    return new NextResponse("Not Found", { status: 404 });
  }

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
  // Un refresh token invalide/expiré (cookie ancien, session révoquée…)
  // fait rejeter getUser() au lieu de renvoyer simplement user: null — un
  // visiteur dans cet état doit être traité comme anonyme, pas planter la
  // requête (vu en prod : "Invalid Refresh Token: Refresh Token Not Found").
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;

  // Trafic du site (pages vues) — exclut l'usage admin et les appels API,
  // qui ne sont pas du "trafic visiteur". Les scans de QR (/q/*) sont déjà
  // exclus par le matcher ci-dessous et trackés séparément (record_scan).
  // NODE_ENV !== "production" exclut `npm run dev` ET les tests Playwright
  // (qui tournent dessus) : dev et prod partagent la même base Supabase,
  // sans ce garde-fou chaque itération locale polluait site_visits avec du
  // faux trafic (déjà arrivé une fois, cf. nettoyage du 13/07/2026).
  if (
    process.env.NODE_ENV === "production" &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api")
  ) {
    event.waitUntil(
      trackVisit(
        pathname,
        request.headers.get("user-agent"),
        request.headers.get("referer"),
        extractIp(request.headers.get("x-forwarded-for"))
      )
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
