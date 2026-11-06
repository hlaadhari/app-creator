import { expect, test } from "@playwright/test";
import { attendreAucuneAnomalie, identifiants, seConnecter, surveiller } from "./helpers";

test.describe("Parcours élève (lecture seule)", () => {
  test.skip(!identifiants("ELEVE"), "E2E_ELEVE_EMAIL / E2E_ELEVE_PASSWORD absents");

  test("catalogue et cours sans erreur 4xx/5xx", async ({ page }) => {
    const anomalies = surveiller(page);
    await seConnecter(page, "ELEVE");
    await expect(page.locator("body")).toContainText(/ex-|Exercice|Sujet/i);

    await page.goto("/cours");
    await expect(page.locator("main").first()).toBeVisible();

    attendreAucuneAnomalie(anomalies);
  });

  test("ouverture d'un sujet sans erreur 4xx/5xx", async ({ page }) => {
    // Bug connu : rpc initialiser_projet renvoie 400 sur ex-html-css-01 (#186).
    // test.fail() fait échouer la CI quand le bug sera corrigé : retirer alors cette ligne.
    test.fail(true, "#186 : initialiser_projet renvoie 400");

    const anomalies = surveiller(page);
    await seConnecter(page, "ELEVE");
    await page.goto("/sujet/ex-html-css-01");
    await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
    attendreAucuneAnomalie(anomalies);
  });
});
