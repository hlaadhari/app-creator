import { supabase } from "@/integrations/supabase/client";
import type { Files } from "@/lib/exercises";

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

    if (proj) {
      // Issue #212 : si le projet existe mais a été créé vide (ancien repli #186),
      // on ne le renvoie directement que s'il possède au moins un fichier.
      const { data: existingFile } = await supabase
        .from("projet_fichiers")
        .select("chemin")
        .eq("projet_id", proj.id)
        .limit(1)
        .maybeSingle();

      if (existingFile) return proj.id;
    }

    // Initialiser le projet (ou réparer un projet existant vide) via RPC sécurisée
    const { data: newId, error } = await supabase.rpc("initialiser_projet", {
      _version_id: v.id,
    });

    if (error) {
      // Pas d'insertion de secours (#186) : elle créait un projet vide, sans fichiers de départ,
      // et masquait l'erreur. L'élève garde son tampon local et la synchronisation reprendra.
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
 * Sauvegarde synchrone et atomique d'un fichier avec vérification de révision (rev)
 * via la RPC serveur `sauvegarder_fichier` pour éviter tout écrasement concurrent (T-18).
 */
export async function sauvegarderFichierDistant(
  projetId: string,
  chemin: string,
  contenu: string,
  expectedRev: number,
): Promise<SyncResult> {
  try {
    const { data, error } = await supabase.rpc("sauvegarder_fichier", {
      _projet_id: projetId,
      _chemin: chemin,
      _contenu: contenu,
      _expected_rev: expectedRev,
    });

    if (!error && typeof data === "number") {
      return { ok: true, newRev: data };
    }

    // Détection atomique de conflit de révision (T-18)
    if (error?.message?.includes("CONFLIT_REVISION")) {
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

    return {
      ok: false,
      error: error?.message || "Erreur lors de la sauvegarde distante du fichier.",
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export interface FichierASauvegarder {
  chemin: string;
  contenu: string;
  expectedRev: number;
}

export interface LotSyncResult {
  ok: boolean;
  /** Nouvelle révision par chemin de fichier. */
  revs?: Record<string, number>;
  conflict?: {
    fileName: string;
    remoteRev: number;
    remoteContent: string;
  };
  error?: string;
}

/**
 * Sauvegarde en un seul appel tous les fichiers modifiés (RPC `sauvegarder_fichiers`).
 * Les conflits de révision sont détectés avant toute écriture : en cas de conflit, rien n'est
 * enregistré et le premier fichier concerné est renvoyé avec son contenu serveur (T-18).
 */
export async function sauvegarderFichiersDistants(
  projetId: string,
  fichiers: FichierASauvegarder[],
): Promise<LotSyncResult> {
  try {
    const { data, error } = await supabase.rpc("sauvegarder_fichiers", {
      _projet_id: projetId,
      _fichiers: fichiers.map((f) => ({
        chemin: f.chemin,
        contenu: f.contenu,
        expected_rev: f.expectedRev,
      })),
    });

    if (error) {
      return { ok: false, error: error.message || "Erreur lors de la sauvegarde distante." };
    }

    const res = data as {
      ok?: boolean;
      revs?: Record<string, number>;
      conflit?: { chemin: string; rev: number | null; contenu: string | null };
    } | null;

    if (res?.ok && res.revs) return { ok: true, revs: res.revs };

    if (res?.conflit) {
      return {
        ok: false,
        conflict: {
          fileName: res.conflit.chemin,
          remoteRev: res.conflit.rev ?? 1,
          remoteContent: res.conflit.contenu ?? "",
        },
        error: "Conflit de révision : une version plus récente existe sur le serveur.",
      };
    }

    return { ok: false, error: "Réponse inattendue du serveur." };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
