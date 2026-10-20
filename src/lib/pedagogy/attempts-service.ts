/**
 * Service de gestion de l'historique chronologique des tentatives d'évaluation
 * et calcul des deltas de progression / régression (PRD Jalon M5)
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface CriterionAttemptResult {
  id: string;
  code?: string | undefined;
  label: string;
  ok: boolean;
  points: number;
  maxPoints: number;
  message?: string | undefined;
}

export interface AttemptRecord {
  id: string;
  sujetId: string;
  sujetVersionId?: string | null | undefined;
  eleveId?: string | null | undefined;
  numeroTentative: number;
  date: string;
  note20: number;
  pointsObtenus: number;
  pointsTotal: number;
  dureeMs?: number | undefined;
  criteres: CriterionAttemptResult[];
}

export interface AttemptDelta {
  noteDelta: number;
  formattedNoteDelta: string;
  progression: "amelioration" | "regression" | "constant";
  nouveauxValides: string[];
  nouveauxEchecs: string[];
}

export interface AttemptWithDelta {
  attempt: AttemptRecord;
  delta: AttemptDelta | null;
}

const STORAGE_PREFIX = "labo_sti_tentatives_";

function getStorageKey(sujetId: string): string {
  return `${STORAGE_PREFIX}${sujetId}`;
}

export function getLocalAttempts(sujetId: string): AttemptRecord[] {
  try {
    const raw = localStorage.getItem(getStorageKey(sujetId));
    return raw ? (JSON.parse(raw) as AttemptRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalAttempts(sujetId: string, attempts: AttemptRecord[]): void {
  try {
    localStorage.setItem(getStorageKey(sujetId), JSON.stringify(attempts));
  } catch {
    // Silencieux si indisponible
  }
}

/**
 * Calcule la différence didactique entre la tentative courante et la précédente.
 */
export function calculerDeltaTentative(
  courante: AttemptRecord,
  precedente?: AttemptRecord | null,
): AttemptDelta {
  if (!precedente) {
    return {
      noteDelta: 0,
      formattedNoteDelta: "1re tentative",
      progression: "constant",
      nouveauxValides: courante.criteres.filter((c) => c.ok).map((c) => c.id),
      nouveauxEchecs: courante.criteres.filter((c) => !c.ok).map((c) => c.id),
    };
  }

  const noteDelta = Math.round((courante.note20 - precedente.note20) * 10) / 10;
  let formattedNoteDelta = "= 0 pt";
  let progression: "amelioration" | "regression" | "constant" = "constant";

  if (noteDelta > 0) {
    formattedNoteDelta = `+${noteDelta} pt${noteDelta >= 2 ? "s" : ""}`;
    progression = "amelioration";
  } else if (noteDelta < 0) {
    formattedNoteDelta = `${noteDelta} pt${Math.abs(noteDelta) >= 2 ? "s" : ""}`;
    progression = "regression";
  }

  const prevStatusMap = new Map<string, boolean>();
  for (const c of precedente.criteres) {
    prevStatusMap.set(c.id, c.ok);
  }

  const nouveauxValides: string[] = [];
  const nouveauxEchecs: string[] = [];

  for (const c of courante.criteres) {
    const prevOk = prevStatusMap.get(c.id);
    if (prevOk === false && c.ok === true) {
      nouveauxValides.push(c.id);
    } else if (prevOk === true && c.ok === false) {
      nouveauxEchecs.push(c.id);
    }
  }

  return {
    noteDelta,
    formattedNoteDelta,
    progression,
    nouveauxValides,
    nouveauxEchecs,
  };
}

/**
 * Enregistre une nouvelle tentative en local et tente la synchronisation Supabase.
 */
export async function enregistrerNouvelleTentative(params: {
  sujetId: string;
  sujetVersionId?: string | null | undefined;
  eleveId?: string | null | undefined;
  projetId?: string | null | undefined;
  note20: number;
  pointsObtenus: number;
  pointsTotal: number;
  dureeMs?: number | undefined;
  criteres: CriterionAttemptResult[];
}): Promise<AttemptRecord> {
  const existing = getLocalAttempts(params.sujetId);
  const numeroTentative = existing.length + 1;
  const now = new Date().toISOString();
  const id = `att-${Date.now()}-${numeroTentative}`;

  const record: AttemptRecord = {
    id,
    sujetId: params.sujetId,
    sujetVersionId: params.sujetVersionId ?? null,
    eleveId: params.eleveId ?? null,
    numeroTentative,
    date: now,
    note20: params.note20,
    pointsObtenus: params.pointsObtenus,
    pointsTotal: params.pointsTotal,
    dureeMs: params.dureeMs,
    criteres: params.criteres,
  };

  existing.push(record);
  saveLocalAttempts(params.sujetId, existing);

  // Sync Supabase asynchrone sans bloquer l'UI
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      record.eleveId = user.id;

      await supabase.from("tentatives").insert({
        eleve_id: user.id,
        sujet_version_id: params.sujetVersionId ?? "00000000-0000-0000-0000-000000000000",
        projet_id: params.projetId ?? null,
        note20: params.note20,
        points_obtenus: params.pointsObtenus,
        points_total: params.pointsTotal,
        details: params.criteres as unknown as Json,
        detail: params.criteres as unknown as Json,
        max: params.pointsTotal,
        score: params.pointsObtenus,
      });
    }
  } catch (err) {
    console.warn("[Tentatives] Synchronisation distante ignorée en local :", err);
  }

  // Mise à jour automatique de la maîtrise de compétences Bac STI (PRD F-57, F-58, Jalon M7)
  try {
    const { updateMasteryFromAttempt } = await import("@/lib/competences/competences-service");
    await updateMasteryFromAttempt({
      sujetId: params.sujetId,
      criteres: params.criteres.map((c) => ({
        id: c.id,
        label: c.label,
        ok: c.ok,
        points: c.points,
      })),
      eleveId: record.eleveId,
      noteExamen: params.note20,
    });
  } catch (err) {
    console.warn("[Maitrise] Mise à jour asynchrone locale :", err);
  }

  return record;
}

/**
 * Construit la liste chronologique avec les deltas calculés pour chaque tentative.
 */
export function listerHistoriqueAvecDeltas(sujetId: string): AttemptWithDelta[] {
  const attempts = getLocalAttempts(sujetId);
  if (attempts.length === 0) return [];

  // Trie du plus ancien au plus récent pour calculer les deltas pas à pas
  const sortedAsc = [...attempts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const result: AttemptWithDelta[] = [];
  for (let i = 0; i < sortedAsc.length; i++) {
    const current = sortedAsc[i]!;
    const previous = i > 0 ? sortedAsc[i - 1] : null;
    const delta = calculerDeltaTentative(current, previous);
    result.push({
      attempt: current,
      delta,
    });
  }

  // Renvoie du plus récent au plus ancien pour l'affichage chronologique inverse
  return result.reverse();
}

/**
 * Réinitialise le cache des tentatives (pour les tests)
 */
export function resetAttemptsCache(sujetId?: string): void {
  try {
    if (sujetId) {
      localStorage.removeItem(getStorageKey(sujetId));
    } else {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {
    // Ignorer
  }
}
