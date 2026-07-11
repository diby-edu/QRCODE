// Configuration PayDunya éditable depuis /admin/settings (stockée dans
// site_settings), avec repli sur les variables d'environnement pour ne pas
// casser un déploiement existant qui n'a pas encore renseigné ces valeurs
// via l'interface.

import { createAdminClient } from "@/lib/supabase/admin";

export interface PaydunyaConfig {
  masterKey: string;
  privateKey: string;
  publicKey: string;
  token: string;
  mode: "test" | "live";
}

const SETTINGS_KEY = "paydunya";

export async function getPaydunyaConfig(): Promise<PaydunyaConfig> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  const stored = (data?.value ?? {}) as Partial<PaydunyaConfig>;

  return {
    masterKey: stored.masterKey || process.env.PAYDUNYA_MASTER_KEY || "",
    privateKey: stored.privateKey || process.env.PAYDUNYA_PRIVATE_KEY || "",
    publicKey: stored.publicKey || process.env.PAYDUNYA_PUBLIC_KEY || "",
    token: stored.token || process.env.PAYDUNYA_TOKEN || "",
    mode:
      stored.mode === "live" || stored.mode === "test"
        ? stored.mode
        : process.env.PAYDUNYA_MODE === "live"
          ? "live"
          : "test",
  };
}

export async function savePaydunyaConfig(config: PaydunyaConfig): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("site_settings")
    .upsert({ key: SETTINGS_KEY, value: config }, { onConflict: "key" });
}
