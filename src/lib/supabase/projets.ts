import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Files } from "@/lib/exercises";

export interface SyncResult {
  ok: boolean;
  conflict?: boolean;
  newRev?: number;
  error?: string;
}

/**
 * Enregistre une tentative d'évaluation dans Supabase si l'élève est connecté.
 */
export async function enregistrerTentative(params: {
  sujetId: string;
  pointsObtenus: number;
  pointsTotal: number;
  note20: number;
  details: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Mode invité : persistance locale uniquement

    // Récupérer la version active du sujet
    const { data: v } = await supabase
      .from("sujet_versions")
      .select("id")
      .eq("sujet_id", params.sujetId)
      .eq("publiee", true)
      .limit(1)
      .maybeSingle();

    if (!v) return;

    await supabase.from("tentatives").insert({
      eleve_id: user.id,
      sujet_version_id: v.id,
      points_obtenus: params.pointsObtenus,
      points_total: params.pointsTotal,
      note20: params.note20,
      details: params.details as unknown as Json,
    });
  } catch (err) {
    console.warn("[Tentatives] Erreur lors de l'enregistrement distant :", err);
  }
}

/**
 * Initialise un projet pour l'élève si non existant.
 */
export async function getOrCreateProjet(sujetId: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: v } = await supabase
      .from("sujet_versions")
      .select("id")
      .eq("sujet_id", sujetId)
      .eq("publiee", true)
      .limit(1)
      .maybeSingle();

    if (!v) return null;

    // Vérifier si un projet existe déjà
    const { data: proj } = await supabase
      .from("projets")
      .select("id")
      .eq("eleve_id", user.id)
      .eq("version_id", v.id)
      .maybeSingle();

    if (proj) return proj.id;

    // Initialiser le projet via RPC sécurisée
    const { data: newId, error } = await supabase.rpc("initialiser_projet", {
      _version_id: v.id,
      _titre: `Travail ${sujetId}`,
    });

    if (error) {
      console.warn("[Projets] Erreur lors de l'initialisation du projet :", error.message);
      return null;
    }

    return newId;
  } catch (e) {
    console.warn("[Projets] Exception lors de getOrCreateProjet :", e);
    return null;
  }
}

/**
 * Sauvegarde synchrone d'un fichier avec vérification de révision (rev)
 * pour éviter les écrasements concurrents.
 */
export async function sauvegarderFichierDistant(
  projetId: string,
  chemin: string,
  contenu: string,
  expectedRev: number
): Promise<SyncResult> {
  try {
    const { data, error } = await supabase.rpc("sauvegarder_fichier", {
      _projet_id: projetId,
      _chemin: chemin,
      _contenu: contenu,
      _expected_rev: expectedRev,
    });

    if (error) {
      if (error.message.includes("CONFLIT_REVISION")) {
        return { ok: false, conflict: true, error: "Conflit de révision : une version plus récente existe sur le serveur." };
      }
      return { ok: false, error: error.message };
    }

    return { ok: true, newRev: data };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
