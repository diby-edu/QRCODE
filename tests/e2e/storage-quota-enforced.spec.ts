import { test, expect } from "@playwright/test";
import { E2E_PASSWORD } from "./helpers/supabase-admin";

const EMAIL = "e2e-test+basic@qrhub.local";

test("free-plan user attempts an upload exceeding their storage quota → upload is rejected", async ({
  page,
}) => {
  await page.goto("/auth/login");
  await page.getByLabel("Adresse email").fill(EMAIL);
  await page.getByLabel("Mot de passe").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  // Test au niveau API plutôt qu'un vrai input file : le point vérifié est
  // l'application du quota côté serveur (route /api/upload), pas l'UI.
  // 15 Mo : au-dessus du quota du plan gratuit, en dessous du plafond de
  // taille de requête (proxyClientMaxBodySize, next.config.ts) pour
  // exercer le rejet par quota et non une simple troncature de body.
  const res = await page.request.post("/api/upload", {
    multipart: {
      bucket: "uploads",
      file: {
        name: "too-big.bin",
        mimeType: "application/octet-stream",
        buffer: Buffer.alloc(15 * 1024 * 1024),
      },
    },
  });

  expect(res.status()).toBe(413);
  const body = await res.json();
  expect(body.error).toBe("storage");
  expect(typeof body.limitMb).toBe("number");
});
