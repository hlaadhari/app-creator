/**
 * Service client pour la soumission et le suivi des contestations de critères élèves (PRD F-44, F-45)
 */

import { supabase } from "@/integrations/supabase/client";
import type { ContestationRecord } from "@/lib/subjects/contestations-service";

export interface ContestationSubmission {
  /** Identifiant du sujet (slug du catalogue), nécessaire pour résoudre le critère côté serveur. */
  sujetId?: string | undefined;
  critereId: string;
  eleveId: string;
  texte: string;
  projetId?: string | null | undefined;
  sujetVersionId?: string | null | undefined;
  critereCode?: string | undefined;
  critereLabel?: string | undefined;
  eleveNom?: string | undefined;
  classeId?: string | undefined;
  classeNom?: string | undefined;
}

export interface ContestationResponse {
  success: boolean;
  contestation?: ContestationRecord;
  error?: string;
  /** Renseigné quand la contestation est gardée en local mais n'a pas atteint le serveur (#185). */
  syncError?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Vrai si la valeur est un UUID : un identifiant local (invité) n'est jamais envoyé au serveur. */
export function estUuid(valeur: string | null | undefined): boolean {
  return typeof valeur === "string" && UUID_RE.test(valeur);
}

const STORAGE_KEY = "labo_sti_contestations";

// Cache local résilient pour le mode hors-ligne / invités
function getLocalContestations(): ContestationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ContestationRecord[]) : [];
  } catch {
    return [];
  }
}

function saveLocalContestations(records: ContestationRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Silencieux si localStorage plein ou désactivé
  }
}

/**
 * Valide et dépose une contestation élève sur un critère non validé.
 * Règle stricte : texte.trim().length >= 10 caractères.
 */
export async function soumettreContestation(
  submission: ContestationSubmission,
): Promise<ContestationResponse> {
  const trimmed = submission.texte ? submission.texte.trim() : "";

  if (trimmed.length < 10) {
    return {
      success: false,
      error: "Le motif de contestation doit contenir au moins 10 caractères argumentés.",
    };
  }

  const now = new Date().toISOString();
  const id = `cont-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const newRecord: ContestationRecord = {
    id,
    critere_id: submission.critereId,
    critere_code: submission.critereCode ?? "CRIT",
    critere_label: submission.critereLabel ?? "Critère évalué",
    eleve_id: submission.eleveId,
    eleve_nom: submission.eleveNom ?? "Élève STI",
    classe_id: submission.classeId ?? "classe-defaut",
    classe_nom: submission.classeNom ?? "Classe STI",
    texte: trimmed,
    statut: "en_attente",
    created_at: now,
  };

  // 1. Sauvegarde dans le cache local (priorité offline first)
  const localList = getLocalContestations();
  const filtered = localList.filter(
    (c) => !(c.critere_id === submission.critereId && c.eleve_id === submission.eleveId),
  );
  filtered.push(newRecord);
  saveLocalContestations(filtered);

  // 2. Persistance Supabase : le critère et la version sont résolus côté serveur par la RPC.
  let syncError: string | undefined;
  if (!estUuid(submission.eleveId)) {
    syncError = "Connectez-vous pour transmettre la contestation à votre enseignant.";
  } else if (!submission.sujetId) {
    syncError = "Sujet inconnu : contestation non transmise.";
  } else {
    try {
      const { data, error } = await supabase.rpc("deposer_contestation", {
        p_sujet_id: submission.sujetId,
        p_critere_code: submission.critereId,
        p_texte: trimmed,
        ...(estUuid(submission.projetId) ? { p_projet_id: submission.projetId as string } : {}),
      });
      if (error) {
        syncError = error.message;
      } else if (typeof data === "string") {
        newRecord.id = data;
        saveLocalContestations(
          getLocalContestations().map((c) => (c.id === id ? { ...c, id: data } : c)),
        );
      }
    } catch (err) {
      syncError = err instanceof Error ? err.message : "Serveur injoignable";
    }
  }

  return {
    success: true,
    contestation: newRecord,
    ...(syncError ? { syncError } : {}),
  };
}

/**
 * Récupère l'ensemble des contestations déposées par un élève, avec leur statut d'arbitrage.
 */
export async function listerContestationsEleve(
  eleveId: string,
  sujetVersionId?: string,
): Promise<ContestationRecord[]> {
  const local = getLocalContestations().filter((c) => c.eleve_id === eleveId);

  if (!estUuid(eleveId)) return local;

  try {
    let query = supabase.from("contestations").select("*").eq("eleve_id", eleveId);

    if (sujetVersionId) {
      query = query.eq("sujet_version_id", sujetVersionId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      // Fusionner les données distantes
      return data.map((d) => ({
        id: d.id,
        critere_id: d.critere_id,
        critere_code: "CRIT",
        critere_label: "Critère d'évaluation",
        eleve_id: d.eleve_id,
        eleve_nom: "Élève STI",
        classe_id: "classe-defaut",
        classe_nom: "Classe STI",
        texte: d.texte,
        statut: (d.statut as "en_attente" | "acceptee" | "rejetee") || "en_attente",
        created_at: d.created_at,
        traitee_le: d.traitee_le,
        motif_rejet: d.motif_rejet,
      }));
    }
  } catch (err) {
    console.warn("[Contestations] Erreur chargement distant :", err);
  }

  return local;
}

/**
 * Retrouve une contestation existante pour un critère donné.
 */
export function getContestationPourCritere(
  critereId: string,
  contestations: ContestationRecord[],
): ContestationRecord | undefined {
  return contestations.find((c) => c.critere_id === critereId);
}

/**
 * Réinitialise le cache des contestations (principalement pour les tests de non-régression)
 */
export function resetContestationsCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignorer
  }
}
