/**
 * Construction du document d'évaluation formative : le même pour la page du sujet et pour les
 * tests, afin que les tests de notation exercent exactement ce que l'élève exécute.
 */

export type FichiersEvaluation = Record<string, string>;

/**
 * Assemble la page de l'élève : le HTML principal (index.html ou, à défaut, le premier .html),
 * avec tous les .css dans <style> et tous les .js dans <script>.
 */
export function construireDocumentEvaluation(fichiers: FichiersEvaluation): string {
  const cleHtml =
    fichiers["index.html"] !== undefined
      ? "index.html"
      : (Object.keys(fichiers).find((k) => k.endsWith(".html")) ?? "index.html");
  const html = fichiers[cleHtml] ?? "";
  const css = Object.entries(fichiers)
    .filter(([k]) => k.endsWith(".css"))
    .map(([, contenu]) => contenu)
    .join("\n");
  const js = Object.entries(fichiers)
    .filter(([k]) => k.endsWith(".js"))
    .map(([, contenu]) => contenu)
    .join("\n");

  return `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html.replace(/<!DOCTYPE.*?>/i, "")}<script>${js}</script></body></html>`;
}
