import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Files } from "@/lib/exercises";

// La fonction sauvegarder_fichier n'est pas dans les types générés (repli direct si elle est absente).
type RpcNonTypee = (
  fonction: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpcNonTypee = supabase.rpc.bind(supabase) as unknown as RpcNonTypee;

export interface SyncResult {
  ok: boolean;
  conflict?: boolean;
  newRev?: number;
  remoteContent?: string;
  remoteRev?: number;
  error?: string;
}

export interface RemoteFileInfo {
  chemin: string;
  contenu: string;
  rev: number;
  updated_at: string;
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
      detail: params.details as unknown as Json,
      max: params.pointsTotal,
      score: params.pointsObtenus,
      source: "client",
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    });

    if (error) {
      // Si la table projets existe en direct, tentative d'insertion de secours
      const { data: directInsert, error: directErr } = await supabase
        .from("projets")
        .insert({
          eleve_id: user.id,
          version_id: v.id,
          statut: "en_cours",
        })
        .select("id")
        .maybeSingle();

      if (!directErr && directInsert) {
        return directInsert.id;
      }

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
 * Récupère tous les fichiers distants enregistrés pour un projet.
 */
export async function chargerFichiersDistants(projetId: string): Promise<RemoteFileInfo[] | null> {
  try {
    const { data, error } = await supabase
      .from("projet_fichiers")
      .select("chemin, contenu, rev, updated_at")
      .eq("projet_id", projetId);

    if (error || !data) return null;
    return data as RemoteFileInfo[];
  } catch {
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
  expectedRev: number,
): Promise<SyncResult> {
  try {
    // 1. Tenter via la RPC sécurisée
    const { data, error } = await rpcNonTypee("sauvegarder_fichier", {
      _projet_id: projetId,
      _chemin: chemin,
      _contenu: contenu,
      _expected_rev: expectedRev,
    });

    if (!error && typeof data === "number") {
      return { ok: true, newRev: data };
    }

    // Détection de conflit de révision
    if (error?.message?.includes("CONFLIT_REVISION")) {
      // Lire la révision serveur concurrente
      const { data: remote } = await supabase
        .from("projet_fichiers")
        .select("rev, contenu")
        .eq("projet_id", projetId)
        .eq("chemin", chemin)
        .maybeSingle();

      return {
        ok: false,
        conflict: true,
        remoteRev: remote?.rev ?? expectedRev + 1,
        remoteContent: remote?.contenu ?? "",
        error: "Conflit de révision : une version plus récente existe sur le serveur.",
      };
    }

    // 2. Repli direct avec vérification manuelle optimiste si RPC absente
    const { data: existing } = await supabase
      .from("projet_fichiers")
      .select("rev, contenu")
      .eq("projet_id", projetId)
      .eq("chemin", chemin)
      .maybeSingle();

    if (existing) {
      if (existing.rev > expectedRev) {
        return {
          ok: false,
          conflict: true,
          remoteRev: existing.rev,
          remoteContent: existing.contenu,
          error: "Conflit de révision détecté.",
        };
      }

      const nextRev = existing.rev + 1;
      const { error: updErr } = await supabase
        .from("projet_fichiers")
        .update({
          contenu,
          rev: nextRev,
          updated_at: new Date().toISOString(),
        })
        .eq("projet_id", projetId)
        .eq("chemin", chemin);

      if (updErr) return { ok: false, error: updErr.message };
      return { ok: true, newRev: nextRev };
    } else {
      const { error: insErr } = await supabase.from("projet_fichiers").insert({
        projet_id: projetId,
        chemin,
        contenu,
        rev: 1,
        updated_at: new Date().toISOString(),
      });

      if (insErr) return { ok: false, error: insErr.message };
      return { ok: true, newRev: 1 };
    }
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
