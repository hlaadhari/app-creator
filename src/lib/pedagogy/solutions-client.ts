/**
 * Service de déblocage et consultation tracée des corrigés de référence (PRD Jalon M5, T-04, T-06)
 * Respecte strictement l'interdiction d'accès en mode examen actif.
 *
 * Les corrigés ne sont jamais embarqués dans le code envoyé au navigateur : ils ne sont lus que
 * par la fonction serveur debloquer_solution, qui vérifie l'examen en cours et journalise l'accès.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SolutionFile {
  path: string;
  content: string;
}

export interface SolutionConsultationResponse {
  success: boolean;
  files?: SolutionFile[];
  error?: string;
  dateDeblocage?: string;
  mode?: "distant";
}

const MESSAGE_EXAMEN =
  "Accès au corrigé strictement interdit : une session d'examen est active sur votre poste (T-04 / T-06).";
const MESSAGE_NON_PUBLIE = "Le corrigé de ce sujet n'est pas encore publié.";
const MESSAGE_INDISPONIBLE = "Le corrigé est momentanément indisponible. Réessayez plus tard.";

/**
 * Journalise une tentative suspecte d'accès au corrigé en plein examen.
 * Passe par la fonction SQL journaliser_incident : l'acteur et la date sont imposés par le serveur.
 */
async function journaliserTentativeFraude(sujetId: string, motif?: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("journaliser_incident", {
      _type: "TENTATIVE_ACCES_CORRIGE_EN_EXAMEN",
      _meta: {
        sujet_id: sujetId,
        motif: motif ?? "Tentative d'ouverture de corrigé en examen",
      },
    });
    if (error) {
      console.warn("[Sécurité] Incident non consigné :", error.message);
    }
  } catch (err) {
    console.warn("[Sécurité] Échec consignation incident :", err);
  }
}

/**
 * Dernière version publiée d'un sujet (métadonnées uniquement, aucun corrigé).
 */
async function resoudreVersionPubliee(sujetId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("sujet_versions")
    .select("id")
    .eq("sujet_id", sujetId)
    .eq("publiee", true)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.id ?? null;
}

/**
 * Consulte le corrigé officiel de référence d'un sujet (PRD F-44, T-04, T-06).
 * Refus par défaut : sans version publiée ou sans réponse du serveur, aucun corrigé n'est affiché.
 */
export async function consulterSolutionReference(params: {
  sujetId: string;
  versionId?: string | null | undefined;
  estEnExamen?: boolean | undefined;
  motif?: string | undefined;
}): Promise<SolutionConsultationResponse> {
  // 1. Blocage immédiat si le poste sait qu'un examen est en cours (le serveur revérifie ensuite).
  if (params.estEnExamen) {
    await journaliserTentativeFraude(params.sujetId, params.motif);
    return { success: false, error: MESSAGE_EXAMEN };
  }

  // 2. Seule source : la fonction serveur debloquer_solution (examen, journal d'accès).
  try {
    // Sans version transmise, on retrouve la dernière version publiée du sujet.
    const versionId = params.versionId ?? (await resoudreVersionPubliee(params.sujetId));

    // Sans version publiée en base, il n'existe aucun corrigé à servir.
    if (!versionId) {
      return { success: false, error: MESSAGE_NON_PUBLIE };
    }

    const { data, error } = await supabase.rpc("debloquer_solution", {
      p_version_id: versionId,
      p_motif: params.motif ?? "consultation_eleve",
    });

    if (error) {
      if (error.message.includes("examen active")) {
        // Le serveur a refusé : la trace écrite par la fonction est annulée avec l'exception,
        // le navigateur signale donc l'incident par la fonction contrôlée.
        await journaliserTentativeFraude(params.sujetId, params.motif);
        return { success: false, error: MESSAGE_EXAMEN };
      }
      if (error.message.includes("interdit") || error.message.includes("Authentification")) {
        return { success: false, error: error.message };
      }
      return { success: false, error: MESSAGE_INDISPONIBLE };
    }

    if (!data || data.length === 0) {
      return { success: false, error: MESSAGE_NON_PUBLIE };
    }

    return {
      success: true,
      files: data.map((d) => ({ path: d.chemin, content: d.contenu })),
      dateDeblocage: new Date().toISOString(),
      mode: "distant",
    };
  } catch (err) {
    console.warn("[Solutions] Corrigé indisponible :", err);
    return { success: false, error: MESSAGE_INDISPONIBLE };
  }
}
