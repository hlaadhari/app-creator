import { expect, test } from "@playwright/test";
import {
  attendreAucuneAnomalie,
  identifiants,
  seConnecter,
  surveiller,
  type Role,
} from "./helpers";

const PARCOURS: { role: Role; route: string }[] = [
  { role: "ENSEIGNANT", route: "/enseignant" },
  { role: "ADMIN", route: "/admin" },
];

for (const { role, route } of PARCOURS) {
  test.describe(`Parcours ${role.toLowerCase()} (lecture seule)`, () => {
    test.skip(!identifiants(role), `E2E_${role}_* absents`);

    test(`${route} se charge sans erreur 4xx/5xx`, async ({ page }) => {
      const anomalies = surveiller(page);
      await seConnecter(page, role);
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      await page.waitForLoadState("networkidle");
      attendreAucuneAnomalie(anomalies);
    });
  });
}

test.describe("Contrôle d'accès par rôle", () => {
  test.skip(!identifiants("ELEVE"), "E2E_ELEVE_* absents");

  for (const route of ["/admin", "/enseignant"]) {
    test(`un élève n'accède pas à ${route}`, async ({ page }) => {
      await seConnecter(page, "ELEVE");
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).toContainText(/refus|accès|autoris|réservé|interdit/i);
    });
  }
});
