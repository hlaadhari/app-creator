/**
 * Labo STI - Exam Security Guard (T-06 & T-07, PRD §12, docs/SECURITY.md)
 *
 * Assure l'intégrité temporelle et la conformité d'état des examens :
 * - T-06 : Blocage strict des écritures post-échéance basé sur l'horloge serveur.
 * - T-07 : Rejet des transitions d'états illégales dans la machine à états de l'examen.
 */

export type StatutPassageExamen = "non_demarre" | "en_cours" | "rendu" | "clos" | "corrige";

export interface SessionExamenInfo {
  id: string;
  echeance_serveur: string | Date; // ISO string ou objet Date du serveur
  statut: "brouillon" | "en_cours" | "terminee" | "archivee";
}

export interface PassageExamenInfo {
  id: string;
  session_id: string;
  eleve_id: string;
  statut: StatutPassageExamen;
  date_debut?: string | Date;
  date_rendu?: string | Date;
}

/**
 * Matrice stricte des transitions autorisées (T-07)
 */
const TRANSITIONS_AUTORISEES: Record<StatutPassageExamen, StatutPassageExamen[]> = {
  non_demarre: ["en_cours"],
  en_cours: ["rendu", "clos"],
  rendu: ["clos", "corrige"],
  clos: ["corrige"],
  corrige: [],
};

/**
 * Vérifie si une écriture d'élève est recevable par rapport à l'échéance officielle du serveur (T-06).
 * Rejette toute tentative dès que l'horloge serveur dépasse l'échéance, sans tenir compte
 * de l'horloge de la machine cliente.
 */
export function verifierEcheanceExamen(
  session: SessionExamenInfo,
  horlogeServeur: Date = new Date(),
): { autorise: boolean; motif?: string; delaiRestantMs: number } {
  const echeance = new Date(session.echeance_serveur);
  const now = horlogeServeur.getTime();
  const echeanceTime = echeance.getTime();

  if (isNaN(echeanceTime)) {
    return {
      autorise: false,
      motif: "Date d'échéance serveur invalide",
      delaiRestantMs: 0,
    };
  }

  const delaiRestantMs = echeanceTime - now;

  if (delaiRestantMs <= 0) {
    return {
      autorise: false,
      motif: `Échéance d'examen dépassée (${Math.abs(delaiRestantMs)}ms de retard). Dépôt verrouillé par le serveur.`,
      delaiRestantMs: 0,
    };
  }

  if (session.statut !== "en_cours") {
    return {
      autorise: false,
      motif: `La session d'examen n'est pas active (statut: ${session.statut}).`,
      delaiRestantMs,
    };
  }

  return {
    autorise: true,
    delaiRestantMs,
  };
}

/**
 * Valide une transition d'état d'un passage d'examen (T-07).
 * Empêche notamment de repasser un examen au statut 'en_cours' s'il a déjà été 'rendu' ou 'clos'.
 */
export function validerTransitionExamen(
  statutActuel: StatutPassageExamen,
  nouveauStatut: StatutPassageExamen,
): { valide: boolean; erreur?: string } {
  if (statutActuel === nouveauStatut) {
    return {
      valide: false,
      erreur: `Transition no-op : l'examen est déjà dans l'état '${statutActuel}'.`,
    };
  }

  const autorisees = TRANSITIONS_AUTORISEES[statutActuel] || [];

  if (!autorisees.includes(nouveauStatut)) {
    return {
      valide: false,
      erreur: `Transition d'état illégale : '${statutActuel}' -> '${nouveauStatut}' est strictement interdite (T-07).`,
    };
  }

  return { valide: true };
}
