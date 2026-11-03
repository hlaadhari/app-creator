/**
 * Diagnostic de la cause d'échec d'un critère (PRD §8, PED-05 / Issue #130)
 *
 * Causes typées :
 * - "absent" : élément DOM absent, fonction JavaScript absente, champ absent, fichier ou table absent.
 * - "valeur" : l'élément ou la fonction existe, mais la valeur, le résultat ou le style est incorrect.
 * - "execution" : exception levée lors de l'exécution du code JavaScript ou d'une requête SQL/PHP.
 * - "syntaxe" : erreur de syntaxe empêchant l'évaluation du script ou de la requête.
 */

import type { Criterion, CriterionFailureCause } from "@/lib/exercises";

export function diagnostiquerCause(
  critere: Criterion,
  doc: Document,
  win: Window,
  executionError?: unknown,
): CriterionFailureCause {
  // 1. Erreur explicite levée lors de l'exécution du check
  if (executionError) {
    if (executionError instanceof SyntaxError || String(executionError).includes("SyntaxError")) {
      return "syntaxe";
    }
    return "execution";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const winAny = win as any;

  // 2. Erreur d'exécution mémorisée sur la fenêtre lors de l'appel d'une fonction élève
  if (winAny?.__dernierErreurExecution) {
    const err = winAny.__dernierErreurExecution;
    if (err instanceof SyntaxError || String(err).includes("SyntaxError")) {
      return "syntaxe";
    }
    return "execution";
  }

  if (winAny?.__dernierErreurSyntaxe) {
    return "syntaxe";
  }

  // 3. Vérifier si un script présent dans le document a une erreur de syntaxe
  try {
    const scripts = doc.querySelectorAll("script");
    for (const s of Array.from(scripts)) {
      const code = s.textContent ?? "";
      if (code.trim()) {
        try {
          new Function(code);
        } catch (e) {
          if (e instanceof SyntaxError || String(e).includes("SyntaxError")) {
            return "syntaxe";
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // 4. Élément explicitement marqué absent lors des vérifications déclarées
  if (winAny?.__dernierElementAbsent) {
    return "absent";
  }

  const raw = (critere.raw || {}) as Record<string, unknown>;
  const sonde = (raw["sonde"] || {}) as Record<string, unknown>;
  const sondeType = sonde["type"] as string | undefined;

  // 5. Sondes DOM / CSS
  if (sondeType === "dom_selector" || sondeType === "css_property") {
    const selector = (sonde["selector"] as string | undefined)?.trim();
    if (selector && !doc.querySelector(selector)) {
      return "absent";
    }
    return "valeur";
  }

  if (sondeType === "css_rule_contains") {
    const selector = (sonde["selector"] as string | undefined)?.trim();
    if (selector && !doc.querySelector(selector)) {
      return "absent";
    }
    return "valeur";
  }

  // 6. Sondes JS (js_test_cas)
  if (sondeType === "js_test_cas") {
    const fnName =
      (sonde["function_name"] as string | undefined) ||
      (raw["function_name"] as string | undefined) ||
      "verif";

    const candidate = winAny?.[fnName];
    if (typeof candidate !== "function") {
      const standards = ["verif", "verif1", "valide1", "verif2", "valide2", "controle"];
      const anyExists = standards.some((f) => typeof winAny?.[f] === "function");
      if (!anyExists) return "absent";
    }

    const casList = sonde["cas"] as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(casList)) {
      for (const cas of casList) {
        const saisies = cas["saisies"] as Record<string, unknown> | undefined;
        if (saisies && typeof saisies === "object") {
          for (const nom of Object.keys(saisies)) {
            const champ = doc.getElementById(nom) ?? doc.getElementsByName(nom)[0];
            if (!champ) return "absent";
          }
        }
      }
    }

    return "valeur";
  }

  // 7. Critères déclarés
  const rawSelector = raw["selector"] as string | undefined;
  if (rawSelector && !doc.querySelector(rawSelector)) {
    return "absent";
  }

  const rawFnName = raw["function_name"] as string | undefined;
  if (rawFnName && typeof winAny?.[rawFnName] !== "function") {
    return "absent";
  }

  // 8. Indicateurs dans le message d'échec
  const failMsg = (critere.fail || "").toLowerCase();
  if (
    failMsg.includes("absent") ||
    failMsg.includes("aucun") ||
    failMsg.includes("introuvable") ||
    failMsg.includes("manquant")
  ) {
    return "absent";
  }

  return "valeur";
}
