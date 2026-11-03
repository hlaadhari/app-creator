/**
 * Calcul de la répartition du barème (Automatique vs Enseignant)
 * et détection de la reprise rapide du travail élève (Issue #134 / UX-04 / PED-06)
 */

import { getAllBuffers } from "@/lib/storage/indexeddb";
import type { ProjectBuffer } from "@/lib/storage/types";
import { getExercise, type Exercise } from "@/lib/exercises";

export interface BaremeRepartition {
  totalPoints: number;
  pointsAuto: number;
  pointsEnseignant: number;
  pourcentageAuto: number;
  hasManuel: boolean;
}

/**
 * Calcule les points vérifiables automatiquement versus ceux corrigés par l'enseignant.
 */
export function calculerBaremeRepartition(
  criteria: Array<{
    points: number;
    automatique?: boolean;
    manuel?: boolean;
    raw?: Record<string, unknown>;
  }>,
): BaremeRepartition {
  let pointsAuto = 0;
  let pointsEnseignant = 0;

  for (const c of criteria) {
    const isEnseignant =
      c.automatique === false || c.manuel === true || c.raw?.["correction"] === "enseignant";

    if (isEnseignant) {
      pointsEnseignant += c.points;
    } else {
      pointsAuto += c.points;
    }
  }

  const totalPoints = Number((pointsAuto + pointsEnseignant).toFixed(2));
  pointsAuto = Number(pointsAuto.toFixed(2));
  pointsEnseignant = Number(pointsEnseignant.toFixed(2));

  const pourcentageAuto = totalPoints > 0 ? Math.round((pointsAuto / totalPoints) * 100) : 100;

  return {
    totalPoints,
    pointsAuto,
    pointsEnseignant,
    pourcentageAuto,
    hasManuel: pointsEnseignant > 0,
  };
}

export interface DernierTravailEnCours {
  exerciseId: string;
  titre: string;
  module?: string | undefined;
  lastSavedAt: number;
  formattedTime: string;
  formattedDate: string;
  filesCount: number;
  bestScore?: number | undefined;
}

/**
 * Recherche le sujet le plus récemment sauvegardé dans le tampon local IndexedDB.
 */
export async function getDernierTravailEnCours(
  catalogSujets?: Array<{ id: string; titre: string; module?: string | undefined }>,
): Promise<DernierTravailEnCours | null> {
  try {
    const buffers = await getAllBuffers();
    if (!buffers || buffers.length === 0) return null;

    // Filtre les tampons valides contenant des fichiers et une date de sauvegarde
    const activeBuffers = buffers.filter(
      (b: ProjectBuffer) =>
        b.files && Object.keys(b.files).length > 0 && b.lastLocalSaveAt && b.lastLocalSaveAt > 0,
    );

    if (activeBuffers.length === 0) return null;

    // Trie par date de dernière sauvegarde décroissante
    activeBuffers.sort((a, b) => b.lastLocalSaveAt - a.lastLocalSaveAt);
    const mostRecent = activeBuffers[0];
    if (!mostRecent) return null;

    // Trouve le sujet associé
    let titre = mostRecent.exerciseId;
    let moduleName: string | undefined;

    if (catalogSujets) {
      const match = catalogSujets.find((s) => s.id === mostRecent.exerciseId);
      if (match) {
        titre = match.titre;
        moduleName = match.module;
      }
    }

    if (titre === mostRecent.exerciseId) {
      const ex: Exercise | undefined = getExercise(mostRecent.exerciseId);
      if (ex) {
        titre = ex.title;
        moduleName = ex.module;
      }
    }

    const d = new Date(mostRecent.lastLocalSaveAt);
    const formattedTime = d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedDate = d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });

    return {
      exerciseId: mostRecent.exerciseId,
      titre,
      module: moduleName,
      lastSavedAt: mostRecent.lastLocalSaveAt,
      formattedTime,
      formattedDate,
      filesCount: Object.keys(mostRecent.files).length,
      bestScore: mostRecent.bestScore,
    };
  } catch (err) {
    console.warn("[RepriseRapide] Erreur lecture tampon :", err);
    return null;
  }
}
