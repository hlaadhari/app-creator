/**
 * Évaluation dans le navigateur : la page de l'élève est chargée dans une frame masquée, puis les
 * critères sont évalués sur le résultat (DOM, styles calculés, fonctions JavaScript).
 */

import { runCriteria, type Criterion, type Result } from "@/lib/exercises";
import {
  construireDocumentEvaluation,
  type FichiersEvaluation,
} from "@/lib/evaluation/document-evaluation";

export function evaluerDansFrame(
  fichiers: FichiersEvaluation,
  page: string,
  criteres: Criterion[],
): Promise<Result[]> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
    frame.style.cssText = "position:absolute;width:800px;height:600px;left:-9999px;";
    document.body.appendChild(frame);

    frame.onload = () => {
      try {
        const doc = frame.contentDocument;
        const win = frame.contentWindow;
        if (!doc || !win) throw new Error("Frame d'évaluation inaccessible");
        resolve(runCriteria(criteres, doc, win));
      } catch (erreur) {
        reject(erreur);
      } finally {
        frame.remove();
      }
    };
    frame.srcdoc = construireDocumentEvaluation(fichiers, page);
  });
}
