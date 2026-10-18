import { supabase } from "@/integrations/supabase/client";
import { exercises, type Exercise, type Files } from "@/lib/exercises";

export interface RemoteSujet {
  id: string;
  titre: string;
  niveau: "Facile" | "Moyen" | "Difficile";
  competence: string;
  ordre: number;
}

/**
 * Récupère le catalogue des sujets depuis Supabase avec repli (fallback)
 * transparent sur la liste statique locale si hors-ligne ou erreur réseau.
 */
export async function getSujetsCatalog(): Promise<RemoteSujet[]> {
  try {
    const { data, error } = await supabase
      .from("sujets")
      .select("id, titre, niveau, competence, ordre")
      .order("ordre", { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn("[Supabase] Catalogue distant non disponible, utilisation du catalogue local :", error?.message);
      return exercises.map((e, idx) => ({
        id: e.id,
        titre: e.title,
        niveau: e.level,
        competence: e.competence,
        ordre: idx + 1,
      }));
    }

    return data.map((d) => ({
      id: d.id,
      titre: d.titre,
      niveau: d.niveau as "Facile" | "Moyen" | "Difficile",
      competence: d.competence,
      ordre: d.ordre,
    }));
  } catch (err) {
    console.warn("[Supabase] Exception réseau lors du chargement des sujets, repli local :", err);
    return exercises.map((e, idx) => ({
      id: e.id,
      titre: e.title,
      niveau: e.level,
      competence: e.competence,
      ordre: idx + 1,
    }));
  }
}

/**
 * Récupère les fichiers de départ d'une version de sujet depuis Supabase
 * avec repli sur le starter local.
 */
export async function getStarterFiles(sujetId: string): Promise<Files> {
  const localEx = exercises.find((e) => e.id === sujetId);
  const fallback = localEx ? localEx.starter : { "index.html": "", "style.css": "", "script.js": "" };

  try {
    // 1. Récupérer la version publiée la plus récente
    const { data: versions, error: vErr } = await supabase
      .from("sujet_versions")
      .select("id, numero")
      .eq("sujet_id", sujetId)
      .eq("publiee", true)
      .order("numero", { ascending: false })
      .limit(1);

    if (vErr || !versions || versions.length === 0) {
      return fallback;
    }

    const versionId = versions[0].id;

    // 2. Récupérer les fichiers associés à cette version
    const { data: filesData, error: fErr } = await supabase
      .from("sujet_version_fichiers")
      .select("chemin, contenu")
      .eq("version_id", versionId);

    if (fErr || !filesData || filesData.length === 0) {
      return fallback;
    }

    const remoteFiles: Record<string, string> = {};
    for (const f of filesData) {
      remoteFiles[f.chemin] = f.contenu;
    }

    return {
      "index.html": remoteFiles["index.html"] ?? fallback["index.html"],
      "style.css": remoteFiles["style.css"] ?? fallback["style.css"],
      "script.js": remoteFiles["script.js"] ?? fallback["script.js"],
    };
  } catch {
    return fallback;
  }
}
