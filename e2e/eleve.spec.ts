import { expect, test } from "@playwright/test";
import { attendreAucuneAnomalie, identifiants, seConnecter, surveiller } from "./helpers";

test.describe("Parcours élève complet (#192)", () => {
  test.skip(!identifiants("ELEVE"), "E2E_ELEVE_EMAIL / E2E_ELEVE_PASSWORD absents");

  test("catalogue et cours sans erreur 4xx/5xx", async ({ page }) => {
    const anomalies = surveiller(page);
    await seConnecter(page, "ELEVE");
    await expect(page.locator("body")).toContainText(/ex-|Exercice|Sujet/i);

    await page.goto("/cours");
    await expect(page.locator("main").first()).toBeVisible();

    attendreAucuneAnomalie(anomalies);
  });

  test("éditeur, vérification du code et modale de contestation sans erreur 4xx/5xx", async ({
    page,
  }) => {
    const anomalies = surveiller(page);
    await seConnecter(page, "ELEVE");
    await page.goto("/sujet/ex-html-css-01");
    await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });

    // Déclencher une vérification formative sur le code de départ
    const verifierBtn = page.getByRole("button", { name: /Vérifier mon code/i }).first();
    await expect(verifierBtn).toBeVisible();
    await verifierBtn.click();

    // Attendre que le panneau des résultats affiche les critères évalués et l'action de contestation
    const contesterBtn = page.getByRole("button", { name: /Contester ce critère/i }).first();
    await expect(contesterBtn).toBeVisible({ timeout: 15_000 });
    await contesterBtn.click();

    // Vérifier l'ouverture de la boîte de dialogue de contestation puis l'annuler proprement
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
    const annulerBtn = page.getByRole("button", { name: /Annuler/i }).first();
    if (await annulerBtn.isVisible()) {
      await annulerBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }

    attendreAucuneAnomalie(anomalies);
  });

  test("réservation de poste TP (/calendrier) et examen écrit (/examen-ecrit) sans erreur 4xx/5xx", async ({
    page,
  }) => {
    const anomalies = surveiller(page);
    await seConnecter(page, "ELEVE");

    // 1. Planning & réservation de poste TP côté élève
    await page.goto("/calendrier");
    await expect(
      page.getByRole("heading", { name: /Réservation de Poste en Salle de TP/i }),
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    // Aucun nom d'élève fictif de démo ne doit être exposé (#187, #199)
    await expect(page.locator("body")).not.toContainText("Dupont Camille");

    // 2. Environnement d'examen écrit théorique
    await page.goto("/examen-ecrit/exam-bac2022-controle-ecrit");
    await expect(page.locator("body")).toContainText(/Épreuve Écrite|Mode Examen Strict/i, {
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /Remettre ma Copie/i })).toBeVisible();

    attendreAucuneAnomalie(anomalies);
  });
});
