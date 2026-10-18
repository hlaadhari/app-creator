import { supabase } from "@/integrations/supabase/client";
import { exercises, type Exercise, type Files } from "@/lib/exercises";

export interface RemoteSujet {
  id: string;
  titre: string;
  niveau: "Facile" | "Moyen" | "Difficile";
  competence: string;
  ordre: number;
  module?: string;
  dureeMinutes?: number;
  tags?: string[];
  examMode?: boolean;
}

/**
 * Récupère le catalogue des sujets depuis Supabase avec fusion transparente
 * et repli sur la liste statique locale complète (10 sujets des Modules A, B, C).
 */
export async function getSujetsCatalog(): Promise<RemoteSujet[]> {
  const localList: RemoteSujet[] = exercises.map((e, idx) => ({
    id: e.id,
    titre: e.title,
    niveau: e.level,
    competence: e.competence,
    ordre: idx + 1,
    module: e.module || "Initiation",
    dureeMinutes: e.dureeMinutes || 20,
    tags: e.tags || [],
    examMode: e.examMode || false,
  }));

  try {
    const { data, error } = await supabase
      .from("sujets")
      .select("id, titre, niveau, competence, ordre")
      .order("ordre", { ascending: true });

    if (error || !data || data.length === 0) {
      return localList;
    }

    const remoteIds = new Set(data.map((d) => d.id));
    const merged: RemoteSujet[] = data.map((d) => {
      const local = exercises.find((e) => e.id === d.id);
      return {
        id: d.id,
        titre: d.titre,
        niveau: d.niveau as "Facile" | "Moyen" | "Difficile",
        competence: d.competence,
        ordre: d.ordre,
        module: local?.module || "Initiation",
        dureeMinutes: local?.dureeMinutes || 20,
        tags: local?.tags || [],
        examMode: local?.examMode || false,
      };
    });

    for (const item of localList) {
      if (!remoteIds.has(item.id)) {
        merged.push({
          ...item,
          ordre: merged.length + 1,
        });
      }
    }

    return merged;
  } catch (err) {
    console.warn("[Supabase] Exception réseau lors du chargement des sujets, repli local :", err);
    return localList;
  }
}

/**
 * Récupère les fichiers de départ d'une version de sujet depuis Supabase
 * avec repli sur le starter local.
 */
export async function getStarterFiles(sujetId: string): Promise<Files> {
  const localEx = exercises.find((e) => e.id === sujetId);
  const fallback = localEx
    ? localEx.starter
    : { "index.html": "", "style.css": "", "script.js": "" };

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

    const firstVersion = versions[0];
    if (!firstVersion) {
      return fallback;
    }

    const versionId = firstVersion.id;

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
      ...fallback,
      ...remoteFiles,
    };
  } catch {
    return fallback;
  }
}
