import { test, expect } from "@playwright/test";
import { E2E_PASSWORD } from "./helpers/supabase-admin";

// L'inscription réelle (/auth/register) exige une confirmation par email
// que Playwright ne peut pas intercepter ici : le compte est pré-créé et
// pré-confirmé dans global-setup.ts, ce test couvre connexion → création
// d'un QR → vérification de la redirection réelle.
const EMAIL = "e2e-test+basic@qrhub.local";

test("login → create website QR → verify redirect works", async ({ page, request }) => {
  await page.goto("/auth/login");
  await page.getByLabel("Adresse email").fill(EMAIL);
  await page.getByLabel("Mot de passe").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/qr/new?type=website");
  await page.getByPlaceholder("Ex. : Menu du restaurant").fill("QR Playwright");
  await page.getByPlaceholder("https://mon-site.com").fill("https://example.com");
  await page.getByRole("button", { name: "Enregistrer le QR code" }).click();
  await page.waitForURL(/\/qr\/[^/]+\?created=1/);

  const shortUrl = (
    await page.locator("code").filter({ hasText: "/q/" }).innerText()
  ).trim();

  const res = await request.get(shortUrl, { maxRedirects: 0 });
  expect([301, 302, 303, 307, 308]).toContain(res.status());
  expect(res.headers()["location"]).toBe("https://example.com");
});
