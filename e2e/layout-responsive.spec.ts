import { expect, test, type Page } from "@playwright/test";

/**
 * Mises en page tablette (2 colonnes + tiroir) et desktop (3 colonnes redimensionnables)
 * du workspace (#244). Consultation anonyme du catalogue embarqué, sans écriture.
 */
const SUJET = "/sujet/ex-html-css-01";
const LARGEUR_MIN = 320;

async function largeur(page: Page, testId: string): Promise<number> {
  const box = await page.getByTestId(testId).boundingBox();
  expect(box, `${testId} visible attendu`).not.toBeNull();
  return box!.width;
}

async function ouvrir(page: Page) {
  await page.goto(SUJET);
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
}

async function sansDebordement(page: Page) {
  const debordement = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(debordement, "débordement horizontal (px)").toBeLessThanOrEqual(0);
}

for (const [nom, viewport] of [
  ["tablette portrait", { width: 768, height: 1024 }],
  ["tablette paysage", { width: 1024, height: 768 }],
] as const) {
  test.describe(`Workspace ${nom} (#244)`, () => {
    test.use({ viewport });

    test("deux colonnes éditeur | aperçu et énoncé dans un tiroir", async ({ page }) => {
      await ouvrir(page);

      // Deux colonnes côte à côte, aucune sous 320 px, énoncé masqué
      expect(await largeur(page, "workspace-editor")).toBeGreaterThanOrEqual(LARGEUR_MIN);
      expect(await largeur(page, "workspace-preview")).toBeGreaterThanOrEqual(LARGEUR_MIN);
      await expect(page.getByTestId("workspace-sidebar")).toHaveCount(0);
      const editeur = (await page.getByTestId("workspace-editor").boundingBox())!;
      const apercu = (await page.getByTestId("workspace-preview").boundingBox())!;
      expect(apercu.x).toBeGreaterThan(editeur.x);
      await expect(page.getByText(/Mode consultation/i)).toHaveCount(0);

      // Le bouton « Sujet » ouvre le tiroir avec l'énoncé
      await page.getByRole("button", { name: "Ouvrir l'énoncé et les fichiers" }).click();
      const tiroir = page.getByRole("dialog");
      await expect(tiroir).toBeVisible();
      await expect(tiroir.getByTestId("workspace-sidebar")).toBeVisible();
      expect((await tiroir.boundingBox())!.width).toBeGreaterThanOrEqual(LARGEUR_MIN);
      await expect(tiroir.getByRole("heading", { level: 2 }).first()).toBeVisible();

      await sansDebordement(page);
    });
  });
}

test.describe("Workspace desktop 3 colonnes redimensionnables (#244)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("trois colonnes ≥ 320 px, clavier, double-clic et mémorisation", async ({ page }) => {
    await ouvrir(page);

    for (const id of ["workspace-sidebar", "workspace-editor", "workspace-preview"]) {
      expect(await largeur(page, id), id).toBeGreaterThanOrEqual(LARGEUR_MIN - 1);
    }
    const separateurs = page.getByRole("separator", { name: /Redimensionner/ });
    await expect(separateurs).toHaveCount(2);
    await expect(page.getByText(/Mode consultation/i)).toHaveCount(0);

    // Redimensionnement au clavier : flèche droite sur le premier séparateur
    const initiale = await largeur(page, "workspace-sidebar");
    await separateurs.first().focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    const agrandie = await largeur(page, "workspace-sidebar");
    expect(agrandie).toBeGreaterThan(initiale);

    // Les tailles sont mémorisées entre deux chargements
    await page.reload();
    await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
    expect(Math.abs((await largeur(page, "workspace-sidebar")) - agrandie)).toBeLessThanOrEqual(3);

    // Double-clic sur le séparateur : retour à la taille par défaut
    await page
      .getByRole("separator", { name: /Redimensionner/ })
      .first()
      .dblclick();
    expect(Math.abs((await largeur(page, "workspace-sidebar")) - initiale)).toBeLessThanOrEqual(3);

    await sansDebordement(page);
  });

  test("un stockage local refusé n'empêche pas d'afficher le workspace", async ({ page }) => {
    await page.addInitScript(() => {
      // Seule la clé de mise en page est refusée : le reste de l'app garde son stockage.
      const cle = "labo-sti-workspace";
      const lire = Storage.prototype.getItem;
      const ecrire = Storage.prototype.setItem;
      Storage.prototype.getItem = function (k: string) {
        if (k.includes(cle)) throw new Error("stockage refusé");
        return lire.call(this, k);
      };
      Storage.prototype.setItem = function (k: string, v: string) {
        if (k.includes(cle)) throw new Error("quota dépassé");
        ecrire.call(this, k, v);
      };
    });
    await ouvrir(page);
    await expect(page.getByRole("separator", { name: /Redimensionner/ })).toHaveCount(2);
  });
});
