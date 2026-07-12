import { test, expect } from "@playwright/test";
import { E2E_PASSWORD } from "./helpers/supabase-admin";

const ADMIN_EMAIL = "e2e-test+admin@qrhub.local";
const TARGET_EMAIL = "e2e-test+suspend-target@qrhub.local";

test("admin suspends a user → suspended user loses access", async ({ browser }) => {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto("/auth/login");
  await adminPage.getByLabel("Adresse email").fill(ADMIN_EMAIL);
  await adminPage.getByLabel("Mot de passe").fill(E2E_PASSWORD);
  await adminPage.getByRole("button", { name: "Se connecter" }).click();
  await adminPage.waitForURL("**/dashboard");

  await adminPage.goto(`/admin/users?q=${encodeURIComponent(TARGET_EMAIL)}`);
  const row = adminPage.locator("tr", { hasText: TARGET_EMAIL });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Suspendre" }).click();
  await expect(row.getByText("Suspendu")).toBeVisible();
  await adminContext.close();

  // Compte cible : une session déjà ouverte doit être coupée dès la
  // prochaine requête vers une page (app) — voir src/app/(app)/layout.tsx.
  const targetContext = await browser.newContext();
  const targetPage = await targetContext.newPage();
  await targetPage.goto("/auth/login");
  await targetPage.getByLabel("Adresse email").fill(TARGET_EMAIL);
  await targetPage.getByLabel("Mot de passe").fill(E2E_PASSWORD);
  await targetPage.getByRole("button", { name: "Se connecter" }).click();
  await expect(
    targetPage.getByText("Votre compte a été suspendu. Contactez le support.")
  ).toBeVisible();
  await targetContext.close();
});
