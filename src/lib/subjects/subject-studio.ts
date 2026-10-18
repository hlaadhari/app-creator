/**
 * Studio de création de sujets, validation didactique pré-publication
 * et gestion de l'immuabilité pédagogique (PRD F-32, F-33, F-35, F-36, T-09, §10)
 */

import {
  evaluateCriteria,
  type CriterionDefinition,
  type EvaluationSummary,
} from "@/lib/evaluation/probe-runner";
import type { Files } from "@/lib/exercises";

export interface ValidationSolution {
  id: string;
  nom: string;
  type: "canonique" | "alternative" | "invalide";
  description: string;
  files: Files;
}

export interface DidacticValidationResult {
  solutionId: string;
  solutionNom: string;
  type: "canonique" | "alternative" | "invalide";
  success: boolean;
  scorePct: number;
  note20: number;
  criteresPasses: number;
  totalCriteres: number;
  message: string;
}

export interface PreValidationReport {
  readyToPublish: boolean;
  canoniquePassed: boolean;
  alternativePassed: boolean;
  invalideFailedAsExpected: boolean;
  results: DidacticValidationResult[];
  errors: string[];
  validatedAt: number;
}

export interface SubjectVersionRecord {
  id: string;
  sujet_id: string;
  numero: number;
  titre: string;
  enonce_md: string;
  niveau: "Facile" | "Moyen" | "Difficile";
  duree_min: number;
  publiee: boolean;
  published_at?: string | null;
  criteres: CriterionDefinition[];
  fichiers_depart: Record<string, string>;
  solutions_test: ValidationSolution[];
}

function createDomEnvironment(
  html: string,
  css: string = "",
  js: string = "",
): { doc: Document; win: Window } {
  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (css.trim()) {
      const styleEl = doc.createElement("style");
      styleEl.textContent = css;
      doc.head.appendChild(styleEl);
    }
    if (js.trim()) {
      const scriptEl = doc.createElement("script");
      scriptEl.textContent = js;
      doc.body.appendChild(scriptEl);
    }
    const win = (doc.defaultView || window) as unknown as Window;
    return { doc, win };
  }

  // Environnement Node.js (Vitest) via require dynamique
  try {
    const getRequire = new Function("return typeof require !== 'undefined' ? require : null")();
    if (getRequire) {
      const { JSDOM } = getRequire("jsdom");
      const dom = new JSDOM(html, { runScripts: "dangerously" });
      const win = dom.window as unknown as Window;
      const doc = win.document;
      if (css.trim()) {
        const styleEl = doc.createElement("style");
        styleEl.textContent = css;
        doc.head.appendChild(styleEl);
      }
      if (js.trim()) {
        const scriptEl = doc.createElement("script");
        scriptEl.textContent = js;
        doc.body.appendChild(scriptEl);
      }
      return { doc, win };
    }
  } catch (err) {
    console.error("[SubjectStudio] Initialisation JSDOM échouée :", err);
  }

  throw new Error("Environnement DOM non disponible");
}

/**
 * Exécute une solution contre les critères définis pour vérifier son comportement
 */
export function testerSolution(
  criteria: CriterionDefinition[],
  files: Files,
  solutionNom: string,
  solutionType: "canonique" | "alternative" | "invalide",
): DidacticValidationResult {
  const html = files["index.html"] || "<html><head></head><body></body></html>";
  const { doc, win } = createDomEnvironment(
    html,
    files["style.css"] || "",
    files["script.js"] || "",
  );

  const evalSummary: EvaluationSummary = evaluateCriteria(criteria, doc, win);
  const criteresPasses = evalSummary.results.filter((r) => r.passed).length;
  const totalCriteres = criteria.length;
  const scorePct = totalCriteres > 0 ? Math.round((criteresPasses / totalCriteres) * 100) : 0;

  // Règles didactiques :
  // - Canonique & Alternative : 100% des critères doivent être validés.
  // - Invalide : au moins un critère doit échouer (< 100%).
  let success = false;
  let message = "";

  if (solutionType === "canonique" || solutionType === "alternative") {
    success = criteresPasses === totalCriteres;
    message = success
      ? `Solution valide (${solutionType}) : 100% des critères validés (${criteresPasses}/${totalCriteres}).`
      : `Échec didactique : la solution ${solutionType} n'a validé que ${criteresPasses}/${totalCriteres} critères.`;
  } else if (solutionType === "invalide") {
    success = criteresPasses < totalCriteres;
    message = success
      ? `Solution invalide : correctement rejetée (${totalCriteres - criteresPasses} critère(s) en échec comme attendu).`
      : `Échec didactique : la solution invalide a été validée à 100%, les critères ne sont pas assez discriminants.`;
  }

  return {
    solutionId: `sol-${solutionType}`,
    solutionNom,
    type: solutionType,
    success,
    scorePct,
    note20: evalSummary.note20,
    criteresPasses,
    totalCriteres,
    message,
  };
}

/**
 * Valide le banc didactique complet : 2 solutions valides + 1 invalide (PRD §10.4, F-35)
 */
export function validerBancDidactique(
  criteria: CriterionDefinition[],
  solutions: ValidationSolution[],
): PreValidationReport {
  const errors: string[] = [];

  if (criteria.length === 0) {
    errors.push("Le sujet doit comporter au moins un critère d'évaluation.");
  }

  const solCanonique = solutions.find((s) => s.type === "canonique");
  const solAlternative = solutions.find((s) => s.type === "alternative");
  const solInvalide = solutions.find((s) => s.type === "invalide");

  if (!solCanonique) {
    errors.push("Solution A (Canonique valide) manquante.");
  }
  if (!solAlternative) {
    errors.push("Solution B (Alternative valide) manquante.");
  }
  if (!solInvalide) {
    errors.push("Solution C (Invalide didactique) manquante.");
  }

  const results: DidacticValidationResult[] = [];

  let canoniquePassed = false;
  let alternativePassed = false;
  let invalideFailedAsExpected = false;

  if (solCanonique) {
    const res = testerSolution(criteria, solCanonique.files, solCanonique.nom, "canonique");
    results.push(res);
    canoniquePassed = res.success;
    if (!res.success) errors.push(res.message);
  }

  if (solAlternative) {
    const res = testerSolution(criteria, solAlternative.files, solAlternative.nom, "alternative");
    results.push(res);
    alternativePassed = res.success;
    if (!res.success) errors.push(res.message);
  }

  if (solInvalide) {
    const res = testerSolution(criteria, solInvalide.files, solInvalide.nom, "invalide");
    results.push(res);
    invalideFailedAsExpected = res.success;
    if (!res.success) errors.push(res.message);
  }

  const readyToPublish =
    errors.length === 0 && canoniquePassed && alternativePassed && invalideFailedAsExpected;

  return {
    readyToPublish,
    canoniquePassed,
    alternativePassed,
    invalideFailedAsExpected,
    results,
    errors,
    validatedAt: Date.now(),
  };
}

/**
 * Tente de publier une version de sujet
 * Condition sine qua non : le banc didactique doit être validé !
 */
export function publierVersionSujet(
  version: SubjectVersionRecord,
  preValidationReport: PreValidationReport,
): { success: boolean; version?: SubjectVersionRecord; error?: string } {
  if (version.publiee) {
    return {
      success: false,
      error: "Cette version est déjà publiée et est strictement immuable (T-09).",
    };
  }

  if (!preValidationReport.readyToPublish) {
    return {
      success: false,
      error: `Publication refusée : la validation didactique (2 solutions valides et 1 invalide) est obligatoire. Détails : ${preValidationReport.errors.join("; ")}`,
    };
  }

  const updatedVersion: SubjectVersionRecord = {
    ...version,
    publiee: true,
    published_at: new Date().toISOString(),
  };

  return {
    success: true,
    version: updatedVersion,
  };
}

/**
 * Crée une nouvelle version incrémentale à partir d'une version publiée (PRD F-36, T-09)
 * Garantit que la version publiée reste inchangée et que les projets en cours ne sont pas corrompus.
 */
export function creerNouvelleVersion(
  currentVersion: SubjectVersionRecord,
  modifications: Partial<
    Omit<SubjectVersionRecord, "id" | "sujet_id" | "numero" | "publiee" | "published_at">
  >,
): SubjectVersionRecord {
  if (!currentVersion.publiee) {
    throw new Error("Impossible d'incrémenter une version qui n'est pas encore publiée.");
  }

  return {
    ...currentVersion,
    ...modifications,
    id: `v-${currentVersion.sujet_id}-${currentVersion.numero + 1}`,
    numero: currentVersion.numero + 1,
    publiee: false,
    published_at: null,
  };
}
