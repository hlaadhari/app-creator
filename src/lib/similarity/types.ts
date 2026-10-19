/**
 * Typage officiel du Moteur d'Analyse de Similarité et Détection Anti-Plagiat (PRD Section 16, F-65, Jalon M8)
 */

export interface StudentCodeFile {
  chemin: string;
  contenu: string;
}

export interface StudentCopyData {
  eleveId: string;
  nom: string;
  prenom: string;
  fichiers: StudentCodeFile[];
  statut?: "rendu" | "en_cours" | "non_commence" | undefined;
  derniereActivite?: string | undefined;
}

export interface FileSimilarityDetail {
  chemin: string;
  similarity: number; // 0 à 100
  matchingTokensCount: number;
  totalTokensA: number;
  totalTokensB: number;
  suspectSegmentsCount: number;
}

export type SimilaritySeverity = "plagiat_probable" | "suspect" | "normal";

export type TeacherArbitrationVerdict = "confirme" | "faux_positif" | "en_attente";

export interface SimilarityPairResult {
  id: string; // Ex: "s1_s2"
  studentA: {
    id: string;
    nom: string;
    prenom: string;
  };
  studentB: {
    id: string;
    nom: string;
    prenom: string;
  };
  overallSimilarity: number; // 0 à 100
  severity: SimilaritySeverity;
  fileDetails: FileSimilarityDetail[];
  verdictProf: TeacherArbitrationVerdict;
  notesProf?: string | undefined;
  arbitreLe?: string | undefined;
}

export interface SimilarityMatrixResult {
  classId?: string | undefined;
  sujetId?: string | undefined;
  totalCopies: number;
  totalPaires: number;
  pairs: SimilarityPairResult[];
  analyzedAt: string;
  seuilAlerte: number; // Ex: 80%
}
