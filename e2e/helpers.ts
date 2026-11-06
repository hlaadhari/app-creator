import { expect, type Page } from "@playwright/test";

export type Role = "ELEVE" | "ENSEIGNANT" | "ADMIN";

export function identifiants(role: Role): { email: string; password: string } | null {
  const email = process.env[`E2E_${role}_EMAIL`];
  const password = process.env[`E2E_${role}_PASSWORD`];
  return email && password ? { email, password } : null;
}

/** Erreurs réseau 4xx/5xx et erreurs de console collectées pendant un parcours. */
export interface Anomalies {
  http: string[];
  console: string[];
}

// Réponses attendues (ex. consultation anonyme avant connexion).
const IGNOREES = [/\/auth\/v1\/(token|user)\b.*\b401\b/, /favicon/];

export function surveiller(page: Page): Anomalies {
  const a: Anomalies = { http: [], console: [] };
  page.on("response", (r) => {
    if (r.status() >= 400) {
      const ligne = `${r.request().method()} ${r.url()} ${r.status()}`;
      if (!IGNOREES.some((re) => re.test(ligne))) a.http.push(ligne);
    }
  });
  page.on("pageerror", (e) => a.console.push(String(e)));
  return a;
}

export function attendreAucuneAnomalie(a: Anomalies): void {
  expect(a.http, "requêtes 4xx/5xx inattendues").toEqual([]);
  expect(a.console, "erreurs JavaScript non interceptées").toEqual([]);
}

export async function seConnecter(page: Page, role: Role): Promise<void> {
  const id = identifiants(role);
  if (!id) throw new Error(`Identifiants E2E_${role}_* absents`);
  await page.goto("/");
  await page.getByRole("button", { name: /Connexion \/ Inscription/ }).click();
  await page.locator("#login-email").fill(id.email);
  await page.locator("#login-password").fill(id.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.locator("#login-email")).toBeHidden({ timeout: 15_000 });
}
