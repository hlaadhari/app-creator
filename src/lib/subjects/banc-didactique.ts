/**
 * Banc didactique pré-publication (PRD §10.4, F-35) évalué comme le fait l'application pour un
 * élève : chaque critère est évalué sur sa page, les scripts de la solution sont exécutés, et
 * un critère sans vérification automatique réelle bloque la publication.
 */

import { score, type Criterion, type Files } from "@/lib/exercises";
import { evaluerParPage, type EvaluerPage } from "@/lib/evaluation/evaluation-par-page";
import type {
  DidacticValidationResult,
  PreValidationReport,
  ValidationSolution,
} from "@/lib/subjects/subject-studio";

type TypeSolution = ValidationSolution["type"];

/** Fabrique l'évaluateur d'une page à partir des fichiers de la solution testée. */
export type FabriqueEvaluateur = (fichiers: Files) => EvaluerPage;

export async function testerSolutionReelle(
  criteres: Criterion[],
  solution: ValidationSolution,
  evaluateurPour: FabriqueEvaluateur,
): Promise<DidacticValidationResult> {
  const resultats = await evaluerParPage(criteres, solution.files, evaluateurPour(solution.files));
  const bilan = score(resultats);
  const verifiables = resultats.filter((r) => r.automatique);
  const reussis = verifiables.filter((r) => r.ok).length;
  const total = verifiables.length;
  const complet = total > 0 && reussis === total;

  const attendValide = solution.type !== "invalide";
  const success = attendValide ? complet : !complet;
  const message = attendValide
    ? success
      ? `Solution valide (${solution.type}) : ${reussis}/${total} critères vérifiables validés.`
      : `Échec didactique : la solution ${solution.type} n'a validé que ${reussis}/${total} critères vérifiables.`
    : success
      ? `Solution invalide : correctement rejetée (${total - reussis} critère(s) en échec comme attendu).`
      : "Échec didactique : la solution invalide a obtenu tous les points, les critères ne sont pas assez discriminants.";

  return {
    solutionId: solution.id,
    solutionNom: solution.nom,
    type: solution.type,
    success,
    scorePct: total > 0 ? Math.round((reussis / total) * 100) : 0,
    note20: bilan.note20,
    criteresPasses: reussis,
    totalCriteres: total,
    message,
  };
}

const LIBELLE_MANQUANT: Record<TypeSolution, string> = {
  canonique: "Solution A (Canonique valide) manquante.",
  alternative: "Solution B (Alternative valide) manquante.",
  invalide: "Solution C (Invalide didactique) manquante.",
};

/** 2 solutions valides + 1 invalide, évaluées avec le moteur des élèves. */
export async function validerBancDidactiqueReel(
  criteres: Criterion[],
  solutions: ValidationSolution[],
  evaluateurPour: FabriqueEvaluateur,
): Promise<PreValidationReport> {
  const errors: string[] = [];

  if (criteres.length === 0) {
    errors.push("Le sujet doit comporter au moins un critère d'évaluation.");
  }
  for (const c of criteres) {
    // Un critère sans vérification réelle doit être déclaré « corrigé par l'enseignant ».
    if (c.automatique === false && !c.manuel) {
      errors.push(
        `Le critère « ${c.label} » n'a pas de vérification automatique réelle : il ne pourrait jamais être validé pour un élève. Écrivez une vérification, ou déclarez-le « correction »: « enseignant ».`,
      );
    }
  }
  if (criteres.length > 0 && !criteres.some((c) => c.automatique !== false)) {
    errors.push(
      "Au moins un critère doit avoir une vérification automatique : le banc ne peut rien tester sinon.",
    );
  }

  const results: DidacticValidationResult[] = [];
  const succes: Record<TypeSolution, boolean> = {
    canonique: false,
    alternative: false,
    invalide: false,
  };

  for (const type of ["canonique", "alternative", "invalide"] as const) {
    const solution = solutions.find((s) => s.type === type);
    if (!solution) {
      errors.push(LIBELLE_MANQUANT[type]);
      continue;
    }
    const res = await testerSolutionReelle(criteres, solution, evaluateurPour);
    results.push(res);
    succes[type] = res.success;
    if (!res.success) errors.push(res.message);
  }

  return {
    readyToPublish: errors.length === 0,
    canoniquePassed: succes.canonique,
    alternativePassed: succes.alternative,
    invalideFailedAsExpected: succes.invalide,
    results,
    errors,
    validatedAt: Date.now(),
  };
}
