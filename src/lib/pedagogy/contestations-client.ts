/**
 * Service client pour la soumission et le suivi des contestations de critères élèves (PRD F-44, F-45)
 */

import { supabase } from "@/integrations/supabase/client";
import type { ContestationRecord } from "@/lib/subjects/contestations-service";

export interface ContestationSubmission {
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

  // 2. Persistance asynchrone Supabase si session disponible
  try {
    const { data, error } = await supabase
      .from("contestations")
      .insert({
        critere_id: submission.critereId,
        eleve_id: submission.eleveId,
        projet_id: submission.projetId ?? null,
        sujet_version_id: submission.sujetVersionId ?? null,
        texte: trimmed,
        statut: "en_attente",
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      newRecord.id = data.id;
    }
  } catch (err) {
    console.warn("[Contestations] Persistance distante indisponible, conservé en local :", err);
  }

  return {
    success: true,
    contestation: newRecord,
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
