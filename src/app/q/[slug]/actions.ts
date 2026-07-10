"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { passwordCookieName, passwordCookieValue } from "@/lib/scan/password";

/**
 * Vérifie le mot de passe d'un QR protégé. En cas de succès, pose un
 * cookie de session dont la valeur est un fragment du hash bcrypt
 * (invérifiable sans connaître le hash).
 */
export async function verifyQrPassword(
  slug: string,
  _prev: { error: boolean } | null,
  formData: FormData
): Promise<{ error: boolean } | null> {
  const password = String(formData.get("password") ?? "");
  const admin = createAdminClient();
  const { data: qr } = await admin
    .from("qr_codes")
    .select("id, password")
    .eq("slug", slug)
    .single();

  if (!qr?.password) return { error: true };

  const ok = await bcrypt.compare(password, qr.password);
  if (!ok) return { error: true };

  const store = await cookies();
  store.set(passwordCookieName(qr.id), passwordCookieValue(qr.password), {
    path: `/q/${slug}`,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60, // 1 h
  });

  redirect(`/q/${slug}`);
}
