import { defineConfig } from "@playwright/test";

/**
 * Suite E2E (#192). Elle vise une URL déployée (preview Vercel ou production)
 * et la base Supabase correspondante. Les tests sont en lecture seule et
 * utilisent des comptes dédiés fournis par variables d'environnement.
 */
const baseURL = process.env["E2E_BASE_URL"] || "https://app-creator-phi.vercel.app";
const useLocalServer = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(baseURL);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env["CI"] ? 1 : 0,
  workers: 1,
  reporter: process.env["CI"] ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  ...(useLocalServer
    ? {
        webServer: {
          command: "node .output/server/index.mjs",
          env: {
            ...process.env,
            NITRO_PORT: "4173",
            NITRO_HOST: "127.0.0.1",
          },
          url: "http://127.0.0.1:4173",
          reuseExistingServer: !process.env["CI"],
          timeout: 60_000,
        },
      }
    : {}),
});
