// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Identité de build affichée sur /a-propos (#237) : version, révision git, date.
function gitCommit(): string {
  const fromEnv = process.env["VERCEL_GIT_COMMIT_SHA"] || process.env["GITHUB_SHA"];
  if (fromEnv) return fromEnv.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "inconnue";
  }
}

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
  version?: string;
};
const buildIdentity = {
  __APP_VERSION__: JSON.stringify(pkg.version ?? "0.0.0"),
  __APP_COMMIT__: JSON.stringify(gitCommit()),
  __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
};

const nitroPreset = process.env["NITRO_PRESET"] || (process.env["VERCEL"] ? "vercel" : undefined);

export default defineConfig({
  vite: { define: buildIdentity },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  ...(nitroPreset ? { nitro: { preset: nitroPreset } } : {}),
});
