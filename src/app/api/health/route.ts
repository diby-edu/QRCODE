import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { error } = await createAdminClient()
    .from("site_settings")
    .select("key")
    .limit(1);

  if (error) {
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }

  return NextResponse.json({ ok: true, db: true });
}
