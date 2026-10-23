/**
 * Évaluation dans le navigateur : la page de l'élève est chargée dans une frame masquée confinée
 * (`sandbox="allow-scripts"`, SANS `allow-same-origin` — SEC-04 / T-17), puis les sondes sont
 * exécutées à l'intérieur de la frame et renvoyées par `postMessage` authentifié par `requestId`
 * et `event.source === frame.contentWindow`.
 */

import type { Criterion, Result } from "@/lib/exercises";
import {
  construireDocumentEvaluationSandbox,
  type FichiersEvaluation,
} from "@/lib/evaluation/document-evaluation";
import { validerIframeSandbox } from "@/lib/security/sandbox-watchdog";

export const EVALUATION_IFRAME_SANDBOX = "allow-scripts";
const EVALUATION_TIMEOUT_MS = 3000;

interface EvalPostMessagePayload {
  type?: unknown;
  requestId?: unknown;
  results?: unknown;
}

export function evaluerDansFrame(
  fichiers: FichiersEvaluation,
  page: string,
  criteres: Criterion[],
): Promise<Result[]> {
  return new Promise((resolve, reject) => {
    const validation = validerIframeSandbox(EVALUATION_IFRAME_SANDBOX);
    if (!validation.securise) {
      reject(new Error(`Configuration sandbox invalide : ${validation.violations.join(", ")}`));
      return;
    }

    const requestId = `eval-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", EVALUATION_IFRAME_SANDBOX);
    frame.style.cssText = "position:absolute;width:800px;height:600px;left:-9999px;";

    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      frame.remove();
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return;
      const data = event.data as EvalPostMessagePayload | null;
      if (!data || typeof data !== "object") return;
      if (data.type !== "LABO_STI_EVAL_RESULT" || data.requestId !== requestId) return;
      if (!Array.isArray(data.results)) return;

      cleanup();
      resolve(data.results as Result[]);
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error("Interruption d'urgence (Watchdog 3s) : l'évaluation dans la frame a expiré."),
      );
    }, EVALUATION_TIMEOUT_MS);

    window.addEventListener("message", onMessage);
    document.body.appendChild(frame);
    frame.srcdoc = construireDocumentEvaluationSandbox(fichiers, page, criteres, requestId);
  });
}
