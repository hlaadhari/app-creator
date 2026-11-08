import { expect, test } from "@playwright/test";
import { attendreAucuneAnomalie, identifiants, seConnecter, surveiller } from "./helpers";

test.describe("Parcours enseignant : classes, suivi des copies et séances TP (#192)", () => {
  test.skip(!identifiants("ENSEIGNANT"), "E2E_ENSEIGNANT_* absents");

  test("/enseignant et /calendrier permettent le pilotage de classe et des postes TP sans erreur 4xx/5xx", async ({
    page,
  }) => {
    const anomalies = surveiller(page);
    await seConnecter(page, "ENSEIGNANT");
    await page.goto("/enseignant");
    await expect(page.getByRole("heading", { name: /Tableau de Bord Enseignant/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForLoadState("networkidle");

    // Vérifier l'ouverture du formulaire de création de classe (sans écriture parasite)
    const nouvelleClasseBtn = page.getByRole("button", { name: /Nouvelle classe/i }).first();
    if (await nouvelleClasseBtn.isVisible()) {
      await nouvelleClasseBtn.click();
      await expect(page.getByPlaceholder(/Nom de la classe/i)).toBeVisible();
      await page
        .getByRole("button", { name: /Annuler/i })
        .first()
        .click();
    }

    // Si une classe est active, parcourir les onglets de suivi des copies et des séances TP
    const tabTp = page.getByRole("tab", { name: /Séances TP/i });
    if (await tabTp.isVisible()) {
      await tabTp.click();
      await expect(page.locator("body")).toContainText(/Séance|Créer un créneau TP|Postes/i);
    }

    const tabContestations = page.getByRole("tab", { name: /Contestations/i });
    if (await tabContestations.isVisible()) {
      await tabContestations.click();
    }

    // Vérifier également la vue supervision enseignant sur /calendrier
    await page.goto("/calendrier");
    await expect(page.locator("body")).toContainText(
      /Mode Supervision Enseignant|Planning|Séance/i,
      { timeout: 15_000 },
    );
    await page.waitForLoadState("networkidle");

    attendreAucuneAnomalie(anomalies);
  });
});

test.describe("Parcours admin : gestion des rôles, audit sécurité et simulation de rôle (#192, #189)", () => {
  test.skip(!identifiants("ADMIN"), "E2E_ADMIN_* absents");

  test("/admin charge les rôles, l'audit de sécurité et permet la simulation de rôle élève", async ({
    page,
  }) => {
    const anomalies = surveiller(page);
    await seConnecter(page, "ADMIN");
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: /Panneau d'Administration Centrale/i }),
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // 1. Onglet Utilisateurs & Rôles visible par défaut
    await expect(page.locator("body")).toContainText(/Répertoire de tous les comptes/i);

    // 2. Onglet Audit Sécurité & RGPD
    const tabSecurite = page.getByRole("tab", { name: /Audit Sécurité/i });
    await tabSecurite.click();
    await expect(page.locator("body")).toContainText(/Audit|RLS|Sécurité/i);

    // 3. Simulation du rôle Élève via le menu profil (#189)
    const profileTrigger = page.getByTestId("user-profile-menu-trigger");
    await expect(profileTrigger).toBeVisible();
    await profileTrigger.click();

    const optionEleve = page.getByTestId("role-preview-option-eleve");
    await expect(optionEleve).toBeVisible({ timeout: 5_000 });
    await optionEleve.click();

    // Le bandeau permanent « Vue élève simulée — quitter » s'affiche et /admin est verrouillé comme pour un élève
    const banner = page.getByTestId("role-preview-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/Vue élève simulée — quitter/i);
    await expect(page.locator("body")).toContainText(/nécessite le rôle administrateur|Accès/i);

    // Retour au rôle réel Admin en un clic
    await page.getByTestId("role-preview-exit").click();
    await expect(banner).toBeHidden();
    await expect(
      page.getByRole("heading", { name: /Panneau d'Administration Centrale/i }),
    ).toBeVisible();

    attendreAucuneAnomalie(anomalies);
  });
});

test.describe("Contrôle d'accès par rôle", () => {
  test.skip(!identifiants("ELEVE"), "E2E_ELEVE_* absents");

  for (const route of ["/admin", "/enseignant"]) {
    test(`un élève n'accède pas à ${route}`, async ({ page }) => {
      const anomalies = surveiller(page);
      await seConnecter(page, "ELEVE");
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).toContainText(/refus|accès|autoris|réservé|interdit/i);
      attendreAucuneAnomalie(anomalies);
    });
  }
});
