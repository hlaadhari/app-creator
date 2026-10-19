/**
 * Typage officiel du Référentiel de Compétences du Bac STI,
 * du Calcul de Maîtrise (v1.0) et des Badges Pédagogiques (PRD Domaine 6, Jalon M7)
 */

export type CompetenceCategory = "HTML" | "CSS" | "JAVASCRIPT" | "PHP" | "SQL" | "ALGO_ARCHI";

export type MasteryLevelClassification =
  | "non_acquis" // < 40%
  | "en_cours" // 40% - 69%
  | "acquis" // 70% - 84%
  | "maitrise"; // >= 85%

export interface Competence {
  id: string;
  code: string;
  libelle: string;
  description: string;
  categorie: CompetenceCategory;
  parentId?: string | null | undefined;
  ordre: number;
}

export interface CritereCompetenceMapping {
  critereIdOrCode: string;
  competenceId: string;
  poids?: number | undefined;
}

export interface MaitriseRecord {
  eleveId: string;
  competenceId: string;
  niveau: number; // 0.000 à 1.000
  nbTentatives: number;
  nbSucces: number;
  premierCoupSucces: boolean;
  dernierSucces?: string | null | undefined;
  versionFormule: string;
  updatedAt: string;
}

export interface CompetenceMasteryView {
  competence: Competence;
  niveau: number; // 0.000 à 1.000
  percentage: number; // 0 à 100
  classification: MasteryLevelClassification;
  nbTentatives: number;
  nbSucces: number;
  premierCoupSucces: boolean;
  dernierSucces?: string | null | undefined;
  estPointFort: boolean; // >= 75%
  estAxePrioritaire: boolean; // < 50% avec au moins 1 tentative ou compétence clé sans succès
}

export interface CategoryMasteryScore {
  categorie: CompetenceCategory;
  label: string;
  score: number; // 0.000 à 1.000
  percentage: number;
  totalCompetences: number;
  competencesAcquises: number;
}

export interface BadgeDefinition {
  id: string;
  titre: string;
  description: string;
  icone: string;
  categorie: string;
  seuilPoints?: number | undefined;
}

export interface BadgeEleve {
  id: string;
  eleveId: string;
  badgeId: string;
  definition: BadgeDefinition;
  obtenuLe: string;
  meta?: Record<string, unknown> | undefined;
}

export interface StudentProgressionReport {
  eleveId: string;
  scoreGlobal: number; // 0.000 à 1.000
  scoreGlobalPercentage: number;
  categories: CategoryMasteryScore[];
  competences: CompetenceMasteryView[];
  pointsForts: CompetenceMasteryView[];
  axesPrioritaires: CompetenceMasteryView[];
  badges: BadgeEleve[];
  badgesDisponiblesCount: number;
  badgesObtenusCount: number;
  totalTentatives: number;
  totalSucces: number;
}
