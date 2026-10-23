/**
 * Labo STI - Service de gestion des sessions d'examen (PRD F-49 à F-53, F-56, T-06, T-07)
 *
 * Gère le cycle de vie des examens, la salle d'attente synchronisée, le verrouillage
 * des aides pédagogiques (indices masqués, IA désactivée) et le refus d'écriture post-échéance.
 */

import { supabase } from "@/integrations/supabase/client";
import { calculerCompteARebours, getTempsServeurSynchronise } from "./server-clock";
import type {
  ExamPassage,
  ExamSecurityRestrictions,
  ExamSession,
  StatutPassageExamen,
  StatutSessionExamen,
} from "./types";

/**
 * Calcule les restrictions de sécurité actives pour un passage d'examen
 */
export function verifierRestrictionsExamen(options: {
  isExamMode: boolean;
  statutPassage?: StatutPassageExamen;
  echeance?: string | Date | null;
  horlogeServeur?: Date;
}): ExamSecurityRestrictions {
  if (!options.isExamMode) {
    return {
      isExamMode: false,
      aidesAutorisees: true,
      indicesAutorises: true,
      corrigesAutorises: true,
      editeurVerrouille: false,
    };
  }

  const statut = options.statutPassage || "en_attente";
  let editeurVerrouille = false;
  let motifVerrouillage: string | undefined;

  // 1. Si l'élève est encore dans la salle d'attente
  if (statut === "en_attente") {
    editeurVerrouille = true;
    motifVerrouillage = "Examen en salle d'attente : en attente du coup d'envoi par l'enseignant.";
  }

  // 2. Si l'examen est déjà rendu, clos ou corrigé
  if (statut === "rendu" || statut === "corrige" || statut === "verrouille") {
    editeurVerrouille = true;
    motifVerrouillage = `Votre copie d'examen a été finalisée (${statut}). Les modifications sont verrouillées.`;
  }

  // 3. Si l'échéance serveur est dépassée
  if (options.echeance && !editeurVerrouille) {
    const countdown = calculerCompteARebours(options.echeance, options.horlogeServeur);
    if (countdown.isExpired) {
      editeurVerrouille = true;
      motifVerrouillage =
        "Échéance d'examen dépassée : l'éditeur est verrouillé en lecture seule (T-06).";
    }
  }

  return {
    isExamMode: true,
    aidesAutorisees: false, // Pas d'aides extérieures en examen
    indicesAutorises: false, // Indices formels masqués
    corrigesAutorises: false, // Corrigés inaccessibles
    editeurVerrouille,
    ...(motifVerrouillage ? { motifVerrouillage } : {}),
  };
}

/**
 * Calcule l'échéance individuelle d'un élève en tenant compte d'un tiers-temps éventuel
 */
export function calculerEcheanceEleve(
  debut: string | Date,
  dureeMin: number,
  tempsSuppMin: number = 0,
): Date {
  const debutDate = typeof debut === "string" ? new Date(debut) : debut;
  const dureeTotaleMs = (dureeMin + tempsSuppMin) * 60 * 1000;
  return new Date(debutDate.getTime() + dureeTotaleMs);
}

/**
 * Simule le coup d'envoi simultané par l'enseignant pour une session et ses élèves
 */
export function declencherCoupDenvoiLocal(
  session: ExamSession,
  passages: ExamPassage[],
  nowServeur: Date = getTempsServeurSynchronise(),
): {
  sessionMiseAJour: ExamSession;
  passagesMisAJour: ExamPassage[];
  elevesDemarres: number;
} {
  const echeanceServeurDate = new Date(nowServeur.getTime() + session.dureeMin * 60 * 1000);

  const sessionMiseAJour: ExamSession = {
    ...session,
    statut: "en_cours" as StatutSessionExamen,
    debutServeur: nowServeur.toISOString(),
    echeanceServeur: echeanceServeurDate.toISOString(),
  };

  let count = 0;
  const passagesMisAJour = passages.map((p) => {
    if (p.sessionId !== session.id) return p;

    if (p.statut === "en_attente") {
      count++;
      const echeanceEleve = calculerEcheanceEleve(nowServeur, session.dureeMin, p.tempsSuppMin);
      return {
        ...p,
        statut: "en_cours" as StatutPassageExamen,
        debutReel: nowServeur.toISOString(),
        echeanceEleve: echeanceEleve.toISOString(),
        evenements: [
          ...p.evenements,
          {
            type: "COUP_DENVOI_SIMULTANE",
            timestamp: nowServeur.toISOString(),
            details: { echeance: echeanceEleve.toISOString() },
          },
        ],
      };
    }
    return p;
  });

  return {
    sessionMiseAJour,
    passagesMisAJour,
    elevesDemarres: count,
  };
}

/**
 * Valide une transition de statut pour un passage d'examen (T-07)
 */
export function validerChangementStatutPassage(
  statutActuel: StatutPassageExamen,
  nouveauStatut: StatutPassageExamen,
): { valide: boolean; erreur?: string } {
  // Mapping vers les statuts de sécurité
  if ((statutActuel === "rendu" || statutActuel === "corrige") && nouveauStatut === "en_cours") {
    return {
      valide: false,
      erreur: "Transition strictement interdite (T-07) : un examen rendu ne peut pas être rouvert",
    };
  }

  if (statutActuel === "verrouille" && nouveauStatut === "en_cours") {
    return {
      valide: false,
      erreur: "Transition interdite : le passage d'examen est déjà verrouillé (T-07)",
    };
  }

  return { valide: true };
}

function mapperPassageExamenRow(row: {
  id: string;
  session_id: string;
  eleve_id: string;
  projet_id: string | null;
  statut: string;
  debut_reel: string | null;
  echeance_eleve: string | null;
  temps_supp_min: number;
  evenements: unknown;
  snapshot_final_id: string | null;
  created_at: string;
}): ExamPassage {
  return {
    id: row.id,
    sessionId: row.session_id,
    eleveId: row.eleve_id,
    projetId: row.projet_id,
    statut: row.statut as StatutPassageExamen,
    debutReel: row.debut_reel,
    echeanceEleve: row.echeance_eleve,
    tempsSuppMin: row.temps_supp_min,
    evenements: Array.isArray(row.evenements)
      ? (row.evenements as Array<{ type: string; timestamp: string; details?: unknown }>)
      : [],
    snapshotFinalId: row.snapshot_final_id,
    createdAt: row.created_at,
  };
}

/**
 * Démarre ou rejoint un passage d'examen via la RPC serveur `demarrer_passage` (SEC-01 / T-06).
 * L'échéance `echeance_eleve` est calculée exclusivement par PostgreSQL à partir de `echeance_serveur`.
 */
export async function demarrerPassageExamen(
  sessionId: string,
  projetId?: string | null,
): Promise<{ success: boolean; passage?: ExamPassage; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("demarrer_passage", {
      _session_id: sessionId,
      _projet_id: projetId ?? null,
    });

    if (error || !data) {
      return {
        success: false,
        error: error?.message || "Impossible de démarrer le passage d'examen.",
      };
    }

    return { success: true, passage: mapperPassageExamenRow(data) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Remet définitivement un passage d'examen via la RPC serveur `rendre_passage` (SEC-01 / T-06 / T-07).
 */
export async function rendrePassageExamen(
  passageId: string,
): Promise<{ success: boolean; passage?: ExamPassage; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("rendre_passage", {
      _passage_id: passageId,
    });

    if (error || !data) {
      return {
        success: false,
        error: error?.message || "Impossible de rendre le passage d'examen.",
      };
    }

    return { success: true, passage: mapperPassageExamenRow(data) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Accorde un temps supplémentaire (tiers-temps) par l'enseignant via la RPC `accorder_temps_supp_passage`.
 */
export async function accorderTempsSuppPassage(
  passageId: string,
  tempsSuppMin: number,
): Promise<{ success: boolean; passage?: ExamPassage; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("accorder_temps_supp_passage", {
      _passage_id: passageId,
      _temps_supp_min: tempsSuppMin,
    });

    if (error || !data) {
      return {
        success: false,
        error: error?.message || "Impossible d'accorder le temps supplémentaire.",
      };
    }

    return { success: true, passage: mapperPassageExamenRow(data) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
