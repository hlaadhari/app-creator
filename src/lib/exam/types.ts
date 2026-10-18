/**
 * Labo STI - Types des sessions d'examen, passages et synchronisation temporelle (PRD F-49 à F-53, §12)
 */

export type StatutSessionExamen = "planifie" | "salle_attente" | "en_cours" | "termine";
export type StatutPassageExamen = "en_attente" | "en_cours" | "verrouille" | "rendu" | "corrige";

export interface ExamSession {
  id: string;
  classId: string;
  versionId: string;
  titre: string;
  debutPrevu: string;
  dureeMin: number;
  debutServeur?: string | null;
  echeanceServeur?: string | null;
  statut: StatutSessionExamen;
  createdBy?: string | null;
  createdAt: string;
}

export interface ExamPassage {
  id: string;
  sessionId: string;
  eleveId: string;
  projetId?: string | null;
  statut: StatutPassageExamen;
  debutReel?: string | null;
  echeanceEleve?: string | null;
  tempsSuppMin: number;
  evenements: Array<{ type: string; timestamp: string; details?: unknown }>;
  snapshotFinalId?: string | null;
  createdAt: string;
}

export interface ServerClockSync {
  serverTime: Date;
  clientTime: Date;
  offsetMs: number;
  latencyMs: number;
}

export interface ExamCountdownState {
  remainingMs: number;
  remainingSeconds: number;
  formatted: string;
  isExpired: boolean;
  isCritical: boolean; // <= 5 minutes
  isWarning: boolean; // <= 15 minutes
}

export interface ExamSecurityRestrictions {
  isExamMode: boolean;
  aidesAutorisees: boolean;
  indicesAutorises: boolean;
  corrigesAutorises: boolean;
  editeurVerrouille: boolean;
  motifVerrouillage?: string;
}
