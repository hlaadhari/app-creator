import { supabase } from "@/integrations/supabase/client";
import { getExercise } from "@/lib/exercises";

export interface UnlockedHint {
  level: number;
  levelName: "Conceptuel" | "Syntaxique" | "Extrait de code";
  texte: string;
  unlockedAt: number;
}

export interface HintOptions {
  isExamMode?: boolean;
}

export function isExamSubject(sujetId: string): boolean {
  return (
    sujetId.startsWith("exam-") ||
    sujetId.includes("bac20") ||
    sujetId.toLowerCase().includes("examen")
  );
}

/**
 * Récupère le nombre total d'indices disponibles pour une version de sujet
 * Respecte T-04 : ne renvoie QUE le compteur, aucun texte d'indice masqué.
 * En mode examen, le système d'indices est totalement désactivé (renvoie 0).
 */
export async function getNombreIndices(sujetId: string, options?: HintOptions): Promise<number> {
  if (options?.isExamMode || isExamSubject(sujetId)) {
    return 0;
  }

  try {
    const { data: v } = await supabase
      .from("sujet_versions")
      .select("id")
      .eq("sujet_id", sujetId)
      .eq("publiee", true)
      .maybeSingle();

    if (v) {
      const { data, error } = await supabase.rpc("nb_indices", {
        _version_id: v.id,
      });
      if (!error && typeof data === "number") {
        return data;
      }
    }
  } catch {
    // Repli local
  }

  const ex = getExercise(sujetId);
  return ex?.hints.length || 3;
}

/**
 * Débloque le niveau suivant d'indice de manière progressive et contrôlée (PRD F-46 à F-48, T-04)
 * En mode examen, le déblocage est strictement interdit et renvoie une erreur explicite.
 */
export async function debloquerNiveauIndice(
  sujetId: string,
  targetLevel: number,
  options?: HintOptions,
): Promise<{ success: boolean; hint?: UnlockedHint; error?: string }> {
  if (options?.isExamMode || isExamSubject(sujetId)) {
    return {
      success: false,
      error: "Le système d'indices est désactivé en mode examen.",
    };
  }
  const levelNames: Record<number, "Conceptuel" | "Syntaxique" | "Extrait de code"> = {
    1: "Conceptuel",
    2: "Syntaxique",
    3: "Extrait de code",
  };
  const levelName = levelNames[targetLevel] || "Conceptuel";

  // 1. Tenter le déblocage sécurisé via Supabase RPC (T-04)
  try {
    const { data: v } = await supabase
      .from("sujet_versions")
      .select("id")
      .eq("sujet_id", sujetId)
      .eq("publiee", true)
      .maybeSingle();

    if (v) {
      const { data, error } = await supabase.rpc("debloquer_indice", {
        _version_id: v.id,
      });

      if (!error && data) {
        return {
          success: true,
          hint: {
            level: targetLevel,
            levelName,
            texte: data,
            unlockedAt: Date.now(),
          },
        };
      }
    }
  } catch {
    // Repli local
  }

  // 2. Repli local sur le sujet d'entraînement
  const ex = getExercise(sujetId);
  if (!ex || !ex.hints || targetLevel > ex.hints.length) {
    return {
      success: false,
      error: "Tous les indices disponibles pour ce sujet ont déjà été débloqués.",
    };
  }

  const hintText = ex.hints[targetLevel - 1] ?? "Consultez la documentation MDN pour ce sélecteur.";

  return {
    success: true,
    hint: {
      level: targetLevel,
      levelName,
      texte: hintText,
      unlockedAt: Date.now(),
    },
  };
}
