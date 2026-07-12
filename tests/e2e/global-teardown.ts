import { existsSync } from "node:fs";
import { join } from "node:path";
import { deleteTestUsers, testAdminClient } from "./helpers/supabase-admin";

for (const envFile of [".env.local", ".env"]) {
  const path = join(process.cwd(), envFile);
  if (existsSync(path)) process.loadEnvFile(path);
}

export default async function globalTeardown() {
  await deleteTestUsers(testAdminClient());
}
