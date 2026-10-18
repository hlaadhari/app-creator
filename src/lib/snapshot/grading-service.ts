/**
 * Labo STI - Service de Notation Enseignant et Décision Pédagogique (PRD §10, F-61 à F-70)
 *
 * Gère la pré-remplissage de la grille officielle depuis le rejouage, les ajustements manuels,
 * la motivation pédagogique obligatoire et l'historique d'audit des révisions.
 */

import {
  type GrilleNotationOfficielle,
  type NoteOfficielleRecord,
  type ReplayExecutionResult,
} from "./types";

export interface AjusterCritereInput {
  note: NoteOfficielleRecord;
  critereId: string;
  pointsAjustes: number;
  commentaireProf?: string;
  modifiePar: string;
  justification: string;
}

export interface AjusterNoteGlobaleInput {
  note: NoteOfficielleRecord;
  nouvelleNoteFinale20: number;
  modifiePar: string;
  justification: string;
}

/**
 * Initialise un brouillon de note officielle à partir du résultat du rejouage de référence
 */
export function initialiserNoteOfficielle(
  snapshotId: string,
  passageId: string | null,
  replayResult: ReplayExecutionResult,
  enseignantId: string,
): NoteOfficielleRecord {
  const now = new Date().toISOString();

  return {
    id: `note-${snapshotId.slice(0, 8)}`,
    passage_id: passageId,
    snapshot_id: snapshotId,
    note_auto: replayResult.grille.noteAuto20,
    note_finale: replayResult.grille.noteFinale20,
    grille: JSON.parse(JSON.stringify(replayResult.grille)),
    justification: "",
    corrige_par: enseignantId,
    historique: [
      {
        modifieLe: now,
        modifiePar: enseignantId,
        ancienneNote: 0,
        nouvelleNote: replayResult.grille.noteAuto20,
        justification: "Initialisation automatique depuis le rejouage de référence",
      },
    ],
    created_at: now,
    updated_at: now,
  };
}

/**
 * Ajuste les points d'un critère individuel dans la grille de notation
 * Recalcule automatiquement la note finale et enregistre une entrée dans l'historique d'audit.
 */
export function ajusterPointsCritere(input: AjusterCritereInput): NoteOfficielleRecord {
  const { note, critereId, pointsAjustes, commentaireProf, modifiePar, justification } = input;

  if (!justification || justification.trim().length === 0) {
    throw new Error(
      "Motivation pédagogique obligatoire : Toute modification de note doit être justifiée.",
    );
  }

  const critere = note.grille.criteres.find((c) => c.critereId === critereId);
  if (!critere) {
    throw new Error(`Critère introuvable : ${critereId}`);
  }

  if (pointsAjustes < 0 || pointsAjustes > critere.pointsMax) {
    throw new Error(
      `Points invalides : Les points doivent être compris entre 0 et ${critere.pointsMax}.`,
    );
  }

  const ancienneNote = note.note_finale;
  critere.pointsAjustes = pointsAjustes;
  if (commentaireProf !== undefined) {
    critere.commentaireProf = commentaireProf;
  }

  // Recalcul de la somme des points ajustés
  const totalAjuste = note.grille.criteres.reduce((acc, c) => acc + c.pointsAjustes, 0);
  note.grille.totalPointsAjustes = totalAjuste;

  const nouvelleNote20 =
    note.grille.totalPointsMax > 0
      ? Math.round((totalAjuste / note.grille.totalPointsMax) * 2000) / 100
      : 0;

  note.note_finale = nouvelleNote20;
  note.grille.noteFinale20 = nouvelleNote20;
  note.updated_at = new Date().toISOString();
  note.justification = justification;

  note.historique.push({
    modifieLe: note.updated_at,
    modifiePar,
    ancienneNote,
    nouvelleNote: nouvelleNote20,
    justification: `Ajustement critère [${critere.code}] : ${pointsAjustes}/${critere.pointsMax} pts. Raison : ${justification}`,
  });

  return note;
}

/**
 * Ajuste directement la note finale sur 20 points avec motivation pédagogique
 */
export function ajusterNoteFinaleGlobale(input: AjusterNoteGlobaleInput): NoteOfficielleRecord {
  const { note, nouvelleNoteFinale20, modifiePar, justification } = input;

  if (!justification || justification.trim().length < 5) {
    throw new Error(
      "Motivation pédagogique obligatoire : Une justification détaillée d'au moins 5 caractères est requise.",
    );
  }

  if (nouvelleNoteFinale20 < 0 || nouvelleNoteFinale20 > 20) {
    throw new Error("La note finale doit être comprise entre 0 et 20.");
  }

  const ancienneNote = note.note_finale;
  note.note_finale = Math.round(nouvelleNoteFinale20 * 100) / 100;
  note.grille.noteFinale20 = note.note_finale;
  note.updated_at = new Date().toISOString();
  note.justification = justification;

  note.historique.push({
    modifieLe: note.updated_at,
    modifiePar,
    ancienneNote,
    nouvelleNote: note.note_finale,
    justification,
  });

  return note;
}
