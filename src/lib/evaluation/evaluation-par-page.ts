/**
 * Évaluation des critères page par page : un critère qui vise `utilisateur.html` est évalué sur
 * cette page, et non sur la page principale. Avant, tous les critères étaient évalués sur
 * index.html : un élève qui réussissait une autre page ne gagnait aucun de ses points.
 */

import type { Criterion, Result } from "@/lib/exercises";
import { pageParDefaut, type FichiersEvaluation } from "@/lib/evaluation/document-evaluation";

/** Évalue un groupe de critères sur une page (iframe dans l'application, JSDOM dans les tests). */
export type EvaluerPage = (page: string, criteres: Criterion[]) => Promise<Result[]>;

export const messagePageAbsente = (page: string) =>
  `La page ${page} est absente de votre projet : ce critère ne peut pas être vérifié.`;

const resultatNonValide = (c: Criterion, message: string): Result => ({
  id: c.id,
  label: c.label,
  points: c.points,
  ok: false,
  automatique: c.automatique !== false,
  message,
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

  for (const [page, groupe] of grouperCriteresParPage(criteres, fichiers)) {
    if (fichiers[page] === undefined) {
      for (const c of groupe) parCritere.set(c.id, resultatNonValide(c, messagePageAbsente(page)));
      continue;
    }
    for (const resultat of await evaluerPage(page, groupe)) {
      parCritere.set(resultat.id, resultat);
    }
  }

  // Un critère sans résultat (ne devrait pas arriver) n'est jamais validé.
  return criteres.map(
    (c) => parCritere.get(c.id) ?? resultatNonValide(c, "Ce critère n'a pas pu être évalué."),
  );
}
