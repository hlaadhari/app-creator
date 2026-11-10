import { expect, test } from "@playwright/test";

/**
 * Workspace d'un sujet en viewport mobile 375×812 (#243). Consultation anonyme du
 * catalogue embarqué : aucun compte requis, aucune écriture.
 */
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

const CIBLE_TACTILE_MIN = 44;
const LARGEUR_ECRAN = 375;

/**
 * Sur mobile, un contenu plus large que l'écran élargit le viewport de mise en page :
 * `scrollWidth - innerWidth` vaut alors 0 alors que la page déborde. On vérifie donc
 * que `innerWidth` est resté égal à la largeur de l'écran.
 */
async function sansDebordement(page: import("@playwright/test").Page) {
  const largeur = await page.evaluate(() => window.innerWidth);
  expect(largeur, "largeur de mise en page (px) : la page déborde de l'écran").toBeLessThanOrEqual(
    LARGEUR_ECRAN,
  );
}

async function hauteur(locator: ReturnType<import("@playwright/test").Page["locator"]>) {
  const box = await locator.boundingBox();
  expect(box, "élément visible attendu").not.toBeNull();
  return box!.height;
}

test.describe("Workspace mobile (#243)", () => {
  test("lire, coder, vérifier, résultat sans scroll horizontal", async ({ page }) => {
    await page.goto("/sujet/ex-html-css-01");

    const nav = page.getByRole("navigation", { name: "Navigation du workspace" });
    await expect(nav).toBeVisible({ timeout: 30_000 });

    // Lire : l'énoncé est le seul panneau affiché
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    await expect(page.locator(".monaco-editor").first()).toBeHidden();

    // Cibles tactiles de la navigation du bas
    for (const bouton of await nav.getByRole("button").all()) {
      expect(await hauteur(bouton)).toBeGreaterThanOrEqual(CIBLE_TACTILE_MIN);
    }

    // Coder : l'éditeur apparaît, avec le bouton flottant « Vérifier mon code »
    await nav.getByRole("button", { name: /éditeur de code/i }).click();
    await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
    const verifier = page.getByRole("button", { name: "Vérifier mon code" });
    await expect(verifier).toHaveCount(1);
    expect(await hauteur(verifier)).toBeGreaterThanOrEqual(CIBLE_TACTILE_MIN);

    // Vérifier : on retombe sur le panneau Résultats
    await verifier.click();
    await expect(nav.getByRole("button", { name: /résultats de vérification/i })).toHaveAttribute(
      "aria-current",
      "page",
      { timeout: 15_000 },
    );

    await sansDebordement(page);
  });

  test("l'ancien bandeau « Mode consultation » n'est plus affiché sur mobile", async ({ page }) => {
    await page.goto("/sujet/ex-html-css-01");
    await expect(page.getByRole("navigation", { name: "Navigation du workspace" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/Mode consultation/i)).toBeHidden();
  });

  test("accueil et cours tiennent dans l'écran, sans débordement horizontal", async ({ page }) => {
    for (const route of ["/", "/cours"]) {
      await page.goto(route);
      await expect(page.locator("main").first()).toBeVisible({ timeout: 30_000 });
      await sansDebordement(page);
    }
  });
});
