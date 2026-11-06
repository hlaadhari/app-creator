import { defineConfig } from "@playwright/test";

/**
 * Suite E2E (#192). Elle vise une URL déployée (preview Vercel ou production)
 * et la base Supabase correspondante. Les tests sont en lecture seule et
 * utilisent des comptes dédiés fournis par variables d'environnement.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env["CI"] ? 1 : 0,
  workers: 1,
  reporter: process.env["CI"] ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env["E2E_BASE_URL"] || "https://app-creator-phi.vercel.app",
    trace: "retain-on-failure",
  },
});
