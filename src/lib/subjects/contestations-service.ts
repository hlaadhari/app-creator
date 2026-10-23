/**
 * Service d'arbitrage des contestations de critères et recalcul automatique
 * des notes de classe sans re-soumission élève (PRD F-44, F-45)
 */

export interface ContestationRecord {
  id: string;
  critere_id: string;
  critere_code: string;
  critere_label: string;
  eleve_id: string;
  eleve_nom: string;
  classe_id: string;
  classe_nom: string;
  texte: string;
  statut: "en_attente" | "acceptee" | "rejetee";
  created_at: string;
  traitee_le?: string | null;
  motif_rejet?: string | null;
}

export interface StudentAttemptCriterion {
  id: string;
  code: string;
  label: string;
  points: number;
  valide: boolean;
}

export interface StudentAttemptRecord {
  id: string;
  eleve_id: string;
  eleve_nom: string;
  note20: number;
  points_obtenus: number;
  points_total: number;
  source?: "client" | "serveur" | "enseignant";
  criteres: StudentAttemptCriterion[];
}

/**
 * Exclut les tentatives déclaratives (`source = 'client'`) des agrégats et notes d'examen officielles (SEC-02 / T-15).
 */
export function filtrerTentativesOfficielles(
  tentatives: StudentAttemptRecord[],
): StudentAttemptRecord[] {
  return tentatives.filter((t) => t.source === "serveur" || t.source === "enseignant");
}

export interface RecalculationResult {
  classe_id: string;
  critere_desactive_id: string;
  eleves_impactes: number;
  moyenne_avant: number;
  moyenne_apres: number;
  copies_recalculees: StudentAttemptRecord[];
}

/**
 * Recalcule instantanément les notes de tous les élèves de la classe
 * lorsqu'un critère contesté est neutralisé/désactivé (PRD F-44, F-45).
 */
export function recalculerNotesClasseApresDesactivation(
  classeId: string,
  critereIdDesactive: string,
  tentatives: StudentAttemptRecord[],
): RecalculationResult {
  let sommeAvant = 0;
  let sommeApres = 0;
  let impactCount = 0;

  const copiesRecalculees = tentatives.map((t) => {
    sommeAvant += t.note20;

    // Critères conservés (le critère contesté est neutralisé du barème)
    const criteresActifs = t.criteres.filter((c) => c.id !== critereIdDesactive);

    const nouveauxPointsTotal = criteresActifs.reduce((sum, c) => sum + c.points, 0);
    const nouveauxPointsObtenus = criteresActifs
      .filter((c) => c.valide)
      .reduce((sum, c) => sum + c.points, 0);

    const nouvelleNote20 =
      nouveauxPointsTotal > 0
        ? Math.round((nouveauxPointsObtenus / nouveauxPointsTotal) * 200) / 10
        : 0;

    if (nouvelleNote20 !== t.note20) {
      impactCount++;
    }

    sommeApres += nouvelleNote20;

    return {
      ...t,
      note20: nouvelleNote20,
      points_obtenus: nouveauxPointsObtenus,
      points_total: nouveauxPointsTotal,
      criteres: criteresActifs,
    };
  });

  const total = tentatives.length;
  const moyenneAvant = total > 0 ? Math.round((sommeAvant / total) * 10) / 10 : 0;
  const moyenneApres = total > 0 ? Math.round((sommeApres / total) * 10) / 10 : 0;

  return {
    classe_id: classeId,
    critere_desactive_id: critereIdDesactive,
    eleves_impactes: impactCount,
    moyenne_avant: moyenneAvant,
    moyenne_apres: moyenneApres,
    copies_recalculees: copiesRecalculees,
  };
}

/**
 * Arbitre une contestation élève (PRD F-44)
 */
export function arbitrerContestation(
  contestation: ContestationRecord,
  decision: "accepter" | "rejeter",
  tentativesClasse: StudentAttemptRecord[],
  motifRejet?: string,
): {
  contestation: ContestationRecord;
  recalcul?: RecalculationResult;
} {
  const now = new Date().toISOString();

  if (decision === "rejeter") {
    return {
      contestation: {
        ...contestation,
        statut: "rejetee",
        traitee_le: now,
        motif_rejet: motifRejet || "Contestation jugée non fondée après analyse didactique.",
      },
    };
  }

  // Si acceptée : désactivation du critère et recalcul automatique pour la classe
  const recalcul = recalculerNotesClasseApresDesactivation(
    contestation.classe_id,
    contestation.critere_id,
    tentativesClasse,
  );

  return {
    contestation: {
      ...contestation,
      statut: "acceptee",
      traitee_le: now,
    },
    recalcul,
  };
}
