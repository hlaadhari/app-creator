/**
 * Typage officiel du Tuteur Pédagogique d'Aide Contextuelle (PRD §15, F-56, T-06, Jalon M7)
 */

export type TutorRole = "user" | "assistant" | "system";

export interface TutorMessage {
  id: string;
  role: TutorRole;
  content: string;
  timestamp: string;
  suggestedFollowUps?: string[] | undefined;
  relatedCriterionCode?: string | undefined;
  isWarning?: boolean | undefined;
}

export interface TutorContext {
  sujetId: string;
  sujetTitre?: string | undefined;
  competence?: string | undefined;
  activeFile?: string | undefined;
  fileContent?: string | undefined;
  activeCriteria?:
    | Array<{
        id: string;
        code?: string | undefined;
        label: string;
        ok?: boolean | undefined;
        message?: string | undefined;
      }>
    | undefined;
  selectedCriterionCode?: string | undefined;
  isExamMode: boolean;
}

export interface TutorResponse {
  message: TutorMessage;
  blocked: boolean;
  reason?: "MODE_EXAMEN_ACTIF" | "TENTATIVE_TRICHE" | "FUITE_CODE" | undefined;
}

export interface GuardrailCheckResult {
  autorise: boolean;
  motif?: "MODE_EXAMEN" | "DEMANDE_SOLUTION_BRUTE" | "CONTOURNEMENT_EVALUATION" | undefined;
  messageRefus?: string | undefined;
}
