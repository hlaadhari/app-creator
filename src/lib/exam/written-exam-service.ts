import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { WrittenExamEvaluationResult } from "@/lib/evaluator/written/written-exam-evaluator";
import { setServerOffsetMs } from "./server-clock";

export type WrittenExamStatut = "en_cours" | "remise" | "corrigee";
export type WrittenExamMotifCloture = "remise_volontaire" | "temps_ecoule" | null;

export interface WrittenExamServerEvaluation extends WrittenExamEvaluationResult {
  scoreQcm: number;
  maxQcm: number;
  scoreOuvert: number | null;
  maxOuvert: number;
  attenteCorrectionEnseignant: boolean;
}

export interface WrittenExamCopyState {
  copieId: string | null;
  examId: string;
  statut: WrittenExamStatut;
  motifCloture: WrittenExamMotifCloture;
  startedAt: string;
  echeanceServeur: string;
  submittedAt: string | null;
  serverNow: string;
  reponses: Record<string, unknown>;
  scoreQcm: number | null;
  maxQcm: number;
  scoreOuvert: number | null;
  maxOuvert: number;
  noteFinale: number | null;
  baremeTotal: number;
  evaluationDetail: WrittenExamServerEvaluation | null;
  notesEnseignant: Record<string, number>;
  commentaireEnseignant: string | null;
  hashSha256: string | null;
  isLocked: boolean;
  persistedOnServer: boolean;
  error?: string;
}

export interface TeacherWrittenExamCopyRecord {
  copieId: string;
  eleveId: string;
  eleveNom: string;
  elevePrenom: string;
  examId: string;
  examTitle: string;
  statut: WrittenExamStatut;
  motifCloture: WrittenExamMotifCloture;
  startedAt: string;
  echeanceServeur: string;
  submittedAt: string | null;
  reponses: Record<string, unknown>;
  scoreQcm: number | null;
  maxQcm: number;
  scoreOuvert: number | null;
  maxOuvert: number;
  noteFinale: number | null;
  baremeTotal: number;
  evaluationDetail: WrittenExamServerEvaluation | null;
  notesEnseignant: Record<string, number>;
  commentaireEnseignant: string | null;
  hashSha256: string | null;
  correctedAt: string | null;
}

/**
 * Purge les clés historiques non fiables d'épreuve écrite dans localStorage (#197).
 */
export function purgerStockageLocalExamenEcritObsolète(examId?: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    if (examId) {
      window.localStorage.removeItem(`labo_sti_written_exam_${examId}`);
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("labo_sti_written_exam_")) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
  } catch {
    // Ignorer en environnement restreint
  }
}

function appliquerHorlogeServeurIso(serverNowIso: string): void {
  const parsed = Date.parse(serverNowIso);
  if (!Number.isNaN(parsed)) {
    setServerOffsetMs(parsed - Date.now());
  }
}

function normaliserEtatCopieServeur(
  raw: Record<string, unknown>,
  fallbackExamId: string,
  persistedOnServer: boolean,
): WrittenExamCopyState {
  const rawServerNow = raw["server_now"];
  const serverNow = typeof rawServerNow === "string" ? rawServerNow : new Date().toISOString();
  appliquerHorlogeServeurIso(serverNow);

  const rawEcheance = raw["echeance_serveur"];
  const echeanceServeur =
    typeof rawEcheance === "string"
      ? rawEcheance
      : new Date(Date.now() + 120 * 60_000).toISOString();

  const statutRaw = raw["statut"];
  const statut: WrittenExamStatut =
    statutRaw === "remise" || statutRaw === "corrigee" ? statutRaw : "en_cours";

  const motifRaw = raw["motif_cloture"];
  const motifCloture: WrittenExamMotifCloture =
    motifRaw === "remise_volontaire" || motifRaw === "temps_ecoule" ? motifRaw : null;

  const rawReponses = raw["reponses"];
  const reponses =
    rawReponses && typeof rawReponses === "object" && !Array.isArray(rawReponses)
      ? (rawReponses as Record<string, unknown>)
      : {};

  const rawNotesEns = raw["notes_enseignant"];
  const notesEnseignant =
    rawNotesEns && typeof rawNotesEns === "object" && !Array.isArray(rawNotesEns)
      ? (rawNotesEns as Record<string, number>)
      : {};

  const rawEvalDetail = raw["evaluation_detail"];
  const evaluationDetail =
    rawEvalDetail && typeof rawEvalDetail === "object" && !Array.isArray(rawEvalDetail)
      ? (rawEvalDetail as WrittenExamServerEvaluation)
      : null;

  const isLocked =
    Boolean(raw["is_locked"]) ||
    statut !== "en_cours" ||
    new Date(serverNow).getTime() > new Date(echeanceServeur).getTime();

  const rawCopieId = raw["copie_id"];
  const rawExamId = raw["exam_id"];
  const rawStartedAt = raw["started_at"];
  const rawSubmittedAt = raw["submitted_at"];
  const rawScoreQcm = raw["score_qcm"];
  const rawMaxQcm = raw["max_qcm"];
  const rawScoreOuvert = raw["score_ouvert"];
  const rawMaxOuvert = raw["max_ouvert"];
  const rawNoteFinale = raw["note_finale"];
  const rawBaremeTotal = raw["bareme_total"];
  const rawCommentaire = raw["commentaire_enseignant"];
  const rawHash = raw["hash_sha256"];

  return {
    copieId: typeof rawCopieId === "string" ? rawCopieId : null,
    examId: typeof rawExamId === "string" ? rawExamId : fallbackExamId,
    statut,
    motifCloture,
    startedAt: typeof rawStartedAt === "string" ? rawStartedAt : serverNow,
    echeanceServeur,
    submittedAt: typeof rawSubmittedAt === "string" ? rawSubmittedAt : null,
    serverNow,
    reponses,
    scoreQcm: typeof rawScoreQcm === "number" ? rawScoreQcm : null,
    maxQcm: typeof rawMaxQcm === "number" ? rawMaxQcm : 4,
    scoreOuvert: typeof rawScoreOuvert === "number" ? rawScoreOuvert : null,
    maxOuvert: typeof rawMaxOuvert === "number" ? rawMaxOuvert : 16,
    noteFinale: typeof rawNoteFinale === "number" ? rawNoteFinale : null,
    baremeTotal: typeof rawBaremeTotal === "number" ? rawBaremeTotal : 20,
    evaluationDetail,
    notesEnseignant,
    commentaireEnseignant: typeof rawCommentaire === "string" ? rawCommentaire : null,
    hashSha256: typeof rawHash === "string" ? rawHash : null,
    isLocked,
    persistedOnServer,
  };
}

/**
 * Démarre ou récupère la copie d'examen écrit côté serveur (#197).
 * Aucune donnée d'échéance ni de note finale n'est lue depuis localStorage.
 */
export async function demarrerOuRecupererCopieExamenEcrit(
  examId: string,
  dureeMin = 120,
): Promise<WrittenExamCopyState> {
  purgerStockageLocalExamenEcritObsolète(examId);

  try {
    const { data, error } = await supabase.rpc("demarrer_copie_examen_ecrit", {
      _exam_id: examId,
      _duree_min: dureeMin,
    });

    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      const now = new Date();
      const echeance = new Date(now.getTime() + dureeMin * 60_000);
      return {
        copieId: null,
        examId,
        statut: "en_cours",
        motifCloture: null,
        startedAt: now.toISOString(),
        echeanceServeur: echeance.toISOString(),
        submittedAt: null,
        serverNow: now.toISOString(),
        reponses: {},
        scoreQcm: null,
        maxQcm: 4,
        scoreOuvert: null,
        maxOuvert: 16,
        noteFinale: null,
        baremeTotal: 20,
        evaluationDetail: null,
        notesEnseignant: {},
        commentaireEnseignant: null,
        hashSha256: null,
        isLocked: false,
        persistedOnServer: false,
        error: error?.message ?? "Authentification requise pour sceller la copie sur le serveur.",
      };
    }

    return normaliserEtatCopieServeur(data as Record<string, unknown>, examId, true);
  } catch (err) {
    const now = new Date();
    const echeance = new Date(now.getTime() + dureeMin * 60_000);
    return {
      copieId: null,
      examId,
      statut: "en_cours",
      motifCloture: null,
      startedAt: now.toISOString(),
      echeanceServeur: echeance.toISOString(),
      submittedAt: null,
      serverNow: now.toISOString(),
      reponses: {},
      scoreQcm: null,
      maxQcm: 4,
      scoreOuvert: null,
      maxOuvert: 16,
      noteFinale: null,
      baremeTotal: 20,
      evaluationDetail: null,
      notesEnseignant: {},
      commentaireEnseignant: null,
      hashSha256: null,
      isLocked: false,
      persistedOnServer: false,
      error: err instanceof Error ? err.message : "Erreur de synchronisation serveur.",
    };
  }
}

/**
 * Sauvegarde les réponses en cours de composition sur le serveur tant que l'échéance n'est pas dépassée (#197).
 */
export async function sauvegarderBrouillonExamenEcrit(
  examId: string,
  reponses: Record<string, unknown>,
): Promise<{
  success: boolean;
  isLocked: boolean;
  motifCloture?: WrittenExamMotifCloture;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("sauvegarder_brouillon_examen_ecrit", {
      _exam_id: examId,
      _reponses: reponses as unknown as Json,
    });

    if (error) {
      return { success: false, isLocked: false, error: error.message };
    }

    if (data && typeof data === "object" && !Array.isArray(data)) {
      const payload = data as Record<string, unknown>;
      const rawServerNow = payload["server_now"];
      if (typeof rawServerNow === "string") {
        appliquerHorlogeServeurIso(rawServerNow);
      }
      const isLocked = Boolean(payload["is_locked"]);
      const motifRaw = payload["motif_cloture"];
      const motifCloture: WrittenExamMotifCloture =
        motifRaw === "remise_volontaire" || motifRaw === "temps_ecoule" ? motifRaw : null;
      return {
        success: !isLocked,
        isLocked,
        motifCloture,
      };
    }

    return { success: true, isLocked: false };
  } catch (err) {
    return {
      success: false,
      isLocked: false,
      error: err instanceof Error ? err.message : "Erreur réseau lors de la sauvegarde.",
    };
  }
}

/**
 * Remet et scelle définitivement la copie d'examen écrit sur le serveur (#197).
 * Le calcul du score QCM et l'enregistrement des réponses ouvertes sont exécutés par le serveur.
 */
export async function remettreCopieExamenEcrit(
  examId: string,
  reponses: Record<string, unknown>,
  motif: "remise_volontaire" | "temps_ecoule" = "remise_volontaire",
): Promise<WrittenExamCopyState> {
  purgerStockageLocalExamenEcritObsolète(examId);

  const { data, error } = await supabase.rpc("remettre_copie_examen_ecrit", {
    _exam_id: examId,
    _reponses: reponses as unknown as Json,
    _motif: motif,
  });

  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(
      error?.message ??
        "Impossible de remettre la copie sur le serveur. Vérifiez votre connexion et votre session.",
    );
  }

  return normaliserEtatCopieServeur(data as Record<string, unknown>, examId, true);
}

/**
 * Liste les copies d'épreuves écrites des élèves pour l'interface enseignant (#197).
 */
export async function listerCopiesExamenEcritEnseignant(
  classId?: string | null,
): Promise<TeacherWrittenExamCopyRecord[]> {
  try {
    const args: { _class_id?: string | null } = {};
    if (classId !== undefined) {
      args._class_id = classId;
    }
    const { data, error } = await supabase.rpc("lister_copies_examen_ecrit_enseignant", args);

    if (error || !Array.isArray(data)) {
      return [];
    }

    return data.map((row) => {
      const r = (row && typeof row === "object" && !Array.isArray(row) ? row : {}) as Record<
        string,
        unknown
      >;
      const statutRaw = r["statut"];
      const statut: WrittenExamStatut =
        statutRaw === "remise" || statutRaw === "corrigee" ? statutRaw : "en_cours";
      const motifRaw = r["motif_cloture"];
      const motifCloture: WrittenExamMotifCloture =
        motifRaw === "remise_volontaire" || motifRaw === "temps_ecoule" ? motifRaw : null;

      const rawSubmittedAt = r["submitted_at"];
      const rawReponses = r["reponses"];
      const rawScoreQcm = r["score_qcm"];
      const rawMaxQcm = r["max_qcm"];
      const rawScoreOuvert = r["score_ouvert"];
      const rawMaxOuvert = r["max_ouvert"];
      const rawNoteFinale = r["note_finale"];
      const rawBaremeTotal = r["bareme_total"];
      const rawEvalDetail = r["evaluation_detail"];
      const rawNotesEns = r["notes_enseignant"];
      const rawCommentaire = r["commentaire_enseignant"];
      const rawHash = r["hash_sha256"];
      const rawCorrectedAt = r["corrected_at"];

      return {
        copieId: String(r["copie_id"] ?? ""),
        eleveId: String(r["eleve_id"] ?? ""),
        eleveNom: String(r["eleve_nom"] ?? ""),
        elevePrenom: String(r["eleve_prenom"] ?? ""),
        examId: String(r["exam_id"] ?? ""),
        examTitle: String(r["exam_title"] ?? r["exam_id"] ?? "Épreuve écrite"),
        statut,
        motifCloture,
        startedAt: String(r["started_at"] ?? new Date().toISOString()),
        echeanceServeur: String(r["echeance_serveur"] ?? new Date().toISOString()),
        submittedAt: typeof rawSubmittedAt === "string" ? rawSubmittedAt : null,
        reponses:
          rawReponses && typeof rawReponses === "object" && !Array.isArray(rawReponses)
            ? (rawReponses as Record<string, unknown>)
            : {},
        scoreQcm: typeof rawScoreQcm === "number" ? rawScoreQcm : null,
        maxQcm: typeof rawMaxQcm === "number" ? rawMaxQcm : 4,
        scoreOuvert: typeof rawScoreOuvert === "number" ? rawScoreOuvert : null,
        maxOuvert: typeof rawMaxOuvert === "number" ? rawMaxOuvert : 16,
        noteFinale: typeof rawNoteFinale === "number" ? rawNoteFinale : null,
        baremeTotal: typeof rawBaremeTotal === "number" ? rawBaremeTotal : 20,
        evaluationDetail:
          rawEvalDetail && typeof rawEvalDetail === "object" && !Array.isArray(rawEvalDetail)
            ? (rawEvalDetail as WrittenExamServerEvaluation)
            : null,
        notesEnseignant:
          rawNotesEns && typeof rawNotesEns === "object" && !Array.isArray(rawNotesEns)
            ? (rawNotesEns as Record<string, number>)
            : {},
        commentaireEnseignant: typeof rawCommentaire === "string" ? rawCommentaire : null,
        hashSha256: typeof rawHash === "string" ? rawHash : null,
        correctedAt: typeof rawCorrectedAt === "string" ? rawCorrectedAt : null,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Permet à un enseignant d'attribuer ou ajuster les notes des questions ouvertes d'une copie écrite (#197).
 */
export async function noterCopieExamenEcrit(
  copieId: string,
  notesOuvertes: Record<string, number>,
  commentaire?: string,
): Promise<{
  success: boolean;
  scoreQcm?: number;
  scoreOuvert?: number;
  noteFinale?: number;
  baremeTotal?: number;
  error?: string;
}> {
  try {
    const args: { _copie_id: string; _notes_ouvertes: Json; _commentaire?: string | null } = {
      _copie_id: copieId,
      _notes_ouvertes: notesOuvertes as unknown as Json,
    };
    if (commentaire !== undefined) {
      args._commentaire = commentaire;
    }

    const { data, error } = await supabase.rpc("noter_copie_examen_ecrit", args);

    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      return {
        success: false,
        error: error?.message ?? "Impossible d'enregistrer la correction.",
      };
    }

    const r = data as Record<string, unknown>;
    const out: {
      success: boolean;
      scoreQcm?: number;
      scoreOuvert?: number;
      noteFinale?: number;
      baremeTotal?: number;
    } = { success: true };

    if (typeof r["score_qcm"] === "number") out.scoreQcm = r["score_qcm"];
    if (typeof r["score_ouvert"] === "number") out.scoreOuvert = r["score_ouvert"];
    if (typeof r["note_finale"] === "number") out.noteFinale = r["note_finale"];
    if (typeof r["bareme_total"] === "number") out.baremeTotal = r["bareme_total"];

    return out;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de la notation de la copie.",
    };
  }
}
