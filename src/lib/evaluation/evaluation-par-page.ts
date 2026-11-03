/**
 * Évaluation des critères page par page : un critère qui vise `utilisateur.html` est évalué sur
 * cette page, et non sur la page principale. Avant, tous les critères étaient évalués sur
 * index.html : un élève qui réussissait une autre page ne gagnait aucun de ses points.
 */

import { score, type Criterion, type Result } from "@/lib/exercises";
import { pageParDefaut, type FichiersEvaluation } from "@/lib/evaluation/document-evaluation";
import { estCritereSqlOuPhp, evaluerCritereSqlPhp } from "./sql-php-evaluator";

/** Évalue un groupe de critères sur une page (iframe dans l'application, JSDOM dans les tests). */
export type EvaluerPage = (page: string, criteres: Criterion[]) => Promise<Result[]>;

/** Fabrique l'évaluateur d'une page à partir des fichiers de la copie évaluée. */
export type FabriqueEvaluateur = (fichiers: FichiersEvaluation) => EvaluerPage;

export const messagePageAbsente = (page: string) =>
  `La page ${page} est absente de votre projet : ce critère ne peut pas être vérifié.`;

const resultatNonValide = (c: Criterion, message: string): Result => ({
  id: c.id,
  label: c.label,
  points: c.points,
  ok: false,
  automatique: c.automatique !== false,
  message,
  cause: "absent",
});

/** Page visée par chaque critère (la page principale quand le critère n'en précise pas). */
export function grouperCriteresParPage(
  criteres: Criterion[],
  fichiers: FichiersEvaluation,
): Map<string, Criterion[]> {
  const principale = pageParDefaut(fichiers);
  const groupes = new Map<string, Criterion[]>();
  for (const critere of criteres) {
    const page = critere.fichier ?? principale;
    groupes.set(page, [...(groupes.get(page) ?? []), critere]);
  }
  return groupes;
}

/**
 * Évalue tous les critères, chacun sur sa page, et renvoie les résultats dans l'ordre d'origine.
 * Un critère dont la page n'existe pas dans le projet de l'élève n'est jamais validé.
 */
export async function evaluerParPage(
  criteres: Criterion[],
  fichiers: FichiersEvaluation,
  evaluerPage: EvaluerPage,
): Promise<Result[]> {
  const parCritere = new Map<string, Result>();

  // 1. Évaluation des critères SQL et PHP sur l'état réel de la base et des scripts (PED-03 / TEC-01 / TEC-02)
  const criteresSqlPhp = criteres.filter((c) => estCritereSqlOuPhp(c));
  const criteresDom = criteres.filter((c) => !estCritereSqlOuPhp(c));

  for (const c of criteresSqlPhp) {
    const res = await evaluerCritereSqlPhp(c, fichiers);
    parCritere.set(c.id, res);
  }

  // 2. Évaluation des critères DOM / CSS / JS page par page
  if (criteresDom.length > 0) {
    for (const [page, groupe] of grouperCriteresParPage(criteresDom, fichiers)) {
      if (fichiers[page] === undefined) {
        for (const c of groupe)
          parCritere.set(c.id, resultatNonValide(c, messagePageAbsente(page)));
        continue;
      }
      for (const resultat of await evaluerPage(page, groupe)) {
        parCritere.set(resultat.id, resultat);
      }
    }
  }

  // Un critère sans résultat (ne devrait pas arriver) n'est jamais validé.
  return criteres.map(
    (c) => parCritere.get(c.id) ?? resultatNonValide(c, "Ce critère n'a pas pu être évalué."),
  );
}

/** Résultat complet de l'évaluation d'une copie : détail par critère et bilan chiffré. */
export interface EvaluationCopie {
  resultats: Result[];
  bilan: ReturnType<typeof score>;
}

/**
 * Moteur d'évaluation unique (TEC-05 / issue #127) : vérification formative de l'élève, banc
 * didactique du Studio et rejouage officiel d'un snapshot passent tous par cette fonction.
 * Seul l'évaluateur de page change selon le contexte (frame sandboxée dans le navigateur, JSDOM
 * dans les tests) : critères, découpage par page et calcul de la note sont strictement identiques.
 */
export async function evaluerCopie(
  criteres: Criterion[],
  fichiers: FichiersEvaluation,
  evaluerPage: EvaluerPage,
): Promise<EvaluationCopie> {
  const resultats = await evaluerParPage(criteres, fichiers, evaluerPage);
  return { resultats, bilan: score(resultats) };
}
