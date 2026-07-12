import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Convention de nommage des comptes de test — permet un nettoyage ciblé
// (globalSetup/globalTeardown) sans toucher aux vrais comptes utilisateurs.
export const E2E_EMAIL_PREFIX = "e2e-test+";
export const E2E_PASSWORD = "PlaywrightTest123!";
// Slug fixe du QR protégé par mot de passe créé par global-setup.ts.
export const E2E_PASSWORD_QR_SLUG = "e2e-password-test";

export function testAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour lancer les tests e2e (mêmes variables que .env.local)."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createConfirmedUser(
  admin: SupabaseClient,
  localPart: string,
  opts?: { fullName?: string; role?: "admin" | "user" }
): Promise<{ id: string; email: string }> {
  const email = `${E2E_EMAIL_PREFIX}${localPart}@qrhub.local`;
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: opts?.fullName ?? "Playwright Test" },
  });
  if (error || !created.user) {
    throw error ?? new Error(`createUser a échoué pour ${email}`);
  }
  if (opts?.role) {
    await admin.from("profiles").update({ role: opts.role }).eq("id", created.user.id);
  }
  return { id: created.user.id, email };
}

// auth.users → profiles/qr_codes/qr_code_data sont en ON DELETE CASCADE
// (voir supabase/migrations/001_schema.sql) : supprimer l'utilisateur suffit.
export async function deleteTestUsers(admin: SupabaseClient): Promise<void> {
  const { data } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", `${E2E_EMAIL_PREFIX}%`);
  for (const row of (data ?? []) as { id: string; email: string }[]) {
    await admin.auth.admin.deleteUser(row.id);
  }
}
