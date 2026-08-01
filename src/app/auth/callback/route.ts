import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/url";

// Origine fixée via NEXT_PUBLIC_APP_URL plutôt que déduite de request.url :
// derrière le proxy nginx (standalone Next.js sur 127.0.0.1:3100), l'origine
// vue par le serveur peut refléter l'adresse interne au lieu du domaine
// public, ce qui redirigeait vers http://localhost:3100 en production.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = appUrl();
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") ? rawNext : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
