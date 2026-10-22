/**
 * Construction du document d'évaluation formative : le même pour la page du sujet et pour les
 * tests, afin que les tests de notation exercent exactement ce que l'élève exécute.
 */

export type FichiersEvaluation = Record<string, string>;

/** Page HTML principale : index.html, à défaut le premier fichier .html. */
export function pageParDefaut(fichiers: FichiersEvaluation): string {
  return fichiers["index.html"] !== undefined
    ? "index.html"
    : (Object.keys(fichiers).find((k) => k.endsWith(".html")) ?? "index.html");
}

/**
 * Assemble la page de l'élève : la page demandée (par défaut la page principale), avec tous les
 * .css dans <style> et tous les .js dans <script>.
 */
export function construireDocumentEvaluation(fichiers: FichiersEvaluation, page?: string): string {
  const html = fichiers[page ?? pageParDefaut(fichiers)] ?? "";
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
