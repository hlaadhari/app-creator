/**
 * Studio de création de sujets, validation didactique pré-publication
 * et gestion de l'immuabilité pédagogique (PRD F-32, F-33, F-35, F-36, T-09, §10)
 */

import type { CriterionDefinition } from "@/lib/evaluation/probe-runner";
import type { Files } from "@/lib/exercises";

export interface ValidationSolution {
  id: string;
  nom: string;
  type: "canonique" | "alternative" | "invalide";
  description: string;
  files: Files;
}

export interface DidacticValidationResult {
  solutionId: string;
  solutionNom: string;
  type: "canonique" | "alternative" | "invalide";
  success: boolean;
  scorePct: number;
  note20: number;
  criteresPasses: number;
  totalCriteres: number;
  message: string;
}

export interface PreValidationReport {
  readyToPublish: boolean;
  canoniquePassed: boolean;
  alternativePassed: boolean;
  invalideFailedAsExpected: boolean;
  results: DidacticValidationResult[];
  errors: string[];
  validatedAt: number;
}

export interface SubjectVersionRecord<C = CriterionDefinition> {
  id: string;
  sujet_id: string;
  numero: number;
  titre: string;
  enonce_md: string;
  niveau: "Facile" | "Moyen" | "Difficile";
  duree_min: number;
  publiee: boolean;
  published_at?: string | null;
  competence?: string;
  indices?: string[];
  criteres: C[];
  fichiers_depart: Record<string, string>;
  solutions_test: ValidationSolution[];
}

// Le banc didactique est évalué par le moteur unique des élèves : voir
// `validerBancDidactiqueReel` (src/lib/subjects/banc-didactique.ts, issue #127).

/**
 * Tente de publier une version de sujet
 * Condition sine qua non : le banc didactique doit être validé !
 */
export function publierVersionSujet<C = CriterionDefinition>(
  version: SubjectVersionRecord<C>,
  preValidationReport: PreValidationReport,
): { success: boolean; version?: SubjectVersionRecord<C>; error?: string } {
  if (version.publiee) {
    return {
      success: false,
      error: "Cette version est déjà publiée et est strictement immuable (T-09).",
    };
  }

  if (!preValidationReport.readyToPublish) {
    return {
      success: false,
      error: `Publication refusée : la validation didactique (2 solutions valides et 1 invalide) est obligatoire. Détails : ${preValidationReport.errors.join("; ")}`,
    };
  }

  const updatedVersion: SubjectVersionRecord<C> = {
    ...version,
    publiee: true,
    published_at: new Date().toISOString(),
  };

  return {
    success: true,
    version: updatedVersion,
  };
}

/**
 * Crée une nouvelle version incrémentale à partir d'une version publiée (PRD F-36, T-09)
 * Garantit que la version publiée reste inchangée et que les projets en cours ne sont pas corrompus.
 */
export function creerNouvelleVersion<C = CriterionDefinition>(
  currentVersion: SubjectVersionRecord<C>,
  modifications: Partial<
    Omit<SubjectVersionRecord<C>, "id" | "sujet_id" | "numero" | "publiee" | "published_at">
  >,
): SubjectVersionRecord<C> {
  if (!currentVersion.publiee) {
    throw new Error("Impossible d'incrémenter une version qui n'est pas encore publiée.");
  }

  return {
    ...currentVersion,
    ...modifications,
    id: `v-${currentVersion.sujet_id}-${currentVersion.numero + 1}`,
    numero: currentVersion.numero + 1,
    publiee: false,
    published_at: null,
  };
}
