import { loader } from "@monaco-editor/react";

export const SUPPORTED_MONACO_LANGUAGES = ["html", "css", "javascript", "php", "sql"] as const;

let configuredPromise: Promise<void> | null = null;

/**
 * Configure Monaco Editor en mode auto-hébergé (sans requête vers cdn.jsdelivr.net)
 * et charge uniquement les 5 langages du programme Bac STI (HTML, CSS, JS, PHP, SQL).
 *
 * Chemins conformes au champ `exports` de monaco-editor@0.57 (`./*` -> `./esm/vs/*.js`).
 */
export async function ensureMonacoConfigured(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  // En environnement de test JSDOM, éviter le chargement lourd des bundles ESM Monaco
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
    return;
  }

  if (!configuredPromise) {
    configuredPromise = (async () => {
      const monaco = await import("monaco-editor/editor/editor.api");
      await Promise.all([
        import("monaco-editor/languages/definitions/html/register"),
        import("monaco-editor/languages/definitions/css/register"),
        import("monaco-editor/languages/definitions/javascript/register"),
        import("monaco-editor/languages/definitions/php/register"),
        import("monaco-editor/languages/definitions/sql/register"),
      ]);
      loader.config({ monaco });
    })();
  }

  return configuredPromise;
}
