/**
 * Évaluateur de page JSDOM pour les tests : équivalent de la frame sandboxée de l'application
 * (document d'évaluation identique, scripts de la copie exécutés).
 */

import { JSDOM } from "jsdom";
import { construireDocumentEvaluation } from "@/lib/evaluation/document-evaluation";
import type { FabriqueEvaluateur } from "@/lib/evaluation/evaluation-par-page";
import { runCriteria } from "@/lib/exercises";

export const evaluateurJsdom: FabriqueEvaluateur = (fichiers) => async (page, criteres) => {
  const dom = new JSDOM(construireDocumentEvaluation(fichiers, page), {
    runScripts: "dangerously",
  });
  try {
    return runCriteria(criteres, dom.window.document, dom.window as never);
  } finally {
    dom.window.close();
  }
};
