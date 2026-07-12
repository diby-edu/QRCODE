import { test, expect } from "@playwright/test";
import { E2E_PASSWORD_QR_SLUG } from "./helpers/supabase-admin";

test("password-protected QR: gate without cookie, wrong password rejected, correct password unlocks redirect", async ({
  page,
}) => {
  await page.goto(`/q/${E2E_PASSWORD_QR_SLUG}`);
  await expect(page.getByText("Contenu protégé")).toBeVisible();

  await page.getByPlaceholder("Mot de passe").fill("wrong-password");
  await page.getByRole("button", { name: "Accéder" }).click();
  await expect(page.getByText("Mot de passe incorrect.")).toBeVisible();

  // Bon mot de passe : le cookie posé par verifyQrPassword() débloque le
  // contenu, la page /q/<slug> redirige alors réellement vers example.com.
  await page.getByPlaceholder("Mot de passe").fill("secret123");
  await page.getByRole("button", { name: "Accéder" }).click();
  await page.waitForURL("https://example.com/**");
});
