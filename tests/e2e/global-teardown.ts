import { deleteTestUsers, testAdminClient } from "./helpers/supabase-admin";
import { loadTestEnv } from "./helpers/env";

export default async function globalTeardown() {
  loadTestEnv();
  await deleteTestUsers(testAdminClient());
}
