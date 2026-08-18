import bcrypt from "bcryptjs";
import {
  E2E_PASSWORD_QR_SLUG,
  createConfirmedUser,
  deleteTestUsers,
  testAdminClient,
} from "./helpers/supabase-admin";
import { loadTestEnv } from "./helpers/env";

export default async function globalSetup() {
  // Refuse de tourner contre la production — voir helpers/env.ts.
  loadTestEnv();

  const admin = testAdminClient();

  // Repartir propre si un run précédent a été interrompu avant le teardown.
  await deleteTestUsers(admin);

  await createConfirmedUser(admin, "basic");
  const adminUser = await createConfirmedUser(admin, "admin", { role: "admin" });
  await createConfirmedUser(admin, "suspend-target");

  const passwordHash = await bcrypt.hash("secret123", 10);
  const { data: qr } = await admin
    .from("qr_codes")
    .insert({
      user_id: adminUser.id,
      type: "website",
      title: "E2E — QR protégé",
      slug: E2E_PASSWORD_QR_SLUG,
      is_dynamic: true,
      is_active: true,
      password: passwordHash,
    })
    .select("id")
    .single();
  if (qr) {
    await admin.from("qr_code_data").insert({
      qr_code_id: qr.id,
      data: { url: "https://example.com" },
    });
  }
}
