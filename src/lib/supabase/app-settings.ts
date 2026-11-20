/**
 * Labo STI — Réglages d'application persistés dans `public.parametres_application` (Issue #294).
 */
import { supabase } from "@/integrations/supabase/client";
import { NOTEBOOK_LM_PUBLIC_URL } from "@/lib/tutor/course-gemini";

export type CleParametreApplication = "tuteur_gemini_notebook";

export interface ParametreTuteurGeminiNotebook {
  actif: boolean;
  url: string;
}

export interface ParametresApplicationMap {
  tuteur_gemini_notebook: ParametreTuteurGeminiNotebook;
}

export interface ParametreApplicationRecord<K extends CleParametreApplication> {
  cle: K;
  valeur: ParametresApplicationMap[K];
  modifie_par: string | null;
  modifie_par_nom?: string | null | undefined;
  updated_at: string | null;
}

export const PARAMETRES_DEFAUT: ParametresApplicationMap = {
  tuteur_gemini_notebook: {
    actif: false,
    url: NOTEBOOK_LM_PUBLIC_URL,
  },
};

const NOTEBOOK_URL_PATTERN = /^https:\/\/(notebook|notebooklm)\.google\.com(\/.*)?$/;

/**
 * Valide qu'une URL de notebook appartient strictement aux domaines Google autorisés en HTTPS.
 */
export function validerUrlNotebook(url: string): { valide: boolean; erreur?: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valide: false, erreur: "L'URL du notebook est obligatoire." };
  }
  if (!NOTEBOOK_URL_PATTERN.test(trimmed)) {
    return {
      valide: false,
      erreur:
        "URL non autorisée : seuls https://notebook.google.com et https://notebooklm.google.com sont acceptés.",
    };
  }
  return { valide: true };
}

function normaliserParametreNotebook(raw: unknown): ParametreTuteurGeminiNotebook {
  if (!raw || typeof raw !== "object") {
    return { ...PARAMETRES_DEFAUT.tuteur_gemini_notebook };
  }
  const obj = raw as Record<string, unknown>;
  const actif = typeof obj["actif"] === "boolean" ? obj["actif"] : false;
  const rawUrl = typeof obj["url"] === "string" ? obj["url"].trim() : "";
  const url = validerUrlNotebook(rawUrl).valide ? rawUrl : NOTEBOOK_LM_PUBLIC_URL;
  return { actif, url };
}

/**
 * Lit un paramètre d'application depuis Supabase, avec repli silencieux sur la valeur par défaut.
 */
export async function lireParametreApplication<K extends CleParametreApplication>(
  cle: K,
): Promise<ParametreApplicationRecord<K>> {
  const fallback: ParametreApplicationRecord<K> = {
    cle,
    valeur: { ...PARAMETRES_DEFAUT[cle] },
    modifie_par: null,
    modifie_par_nom: null,
    updated_at: null,
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const { data, error } = await client
      .from("parametres_application")
      .select("cle, valeur, modifie_par, updated_at")
      .eq("cle", cle)
      .maybeSingle();

    if (error || !data) {
      return fallback;
    }

    let modifieParNom: string | null = null;
    if (typeof data.modifie_par === "string" && data.modifie_par) {
      try {
        const { data: prof } = await client
          .from("profiles")
          .select("prenom, nom")
          .eq("id", data.modifie_par)
          .maybeSingle();
        if (prof) {
          const full = [prof.prenom, prof.nom].filter(Boolean).join(" ").trim();
          if (full) modifieParNom = full;
        }
      } catch {
        // Repli silencieux si le profil de l'auteur n'est pas lisible
      }
    }

    return {
      cle,
      valeur: normaliserParametreNotebook(data.valeur) as ParametresApplicationMap[K],
      modifie_par: typeof data.modifie_par === "string" ? data.modifie_par : null,
      modifie_par_nom: modifieParNom,
      updated_at: typeof data.updated_at === "string" ? data.updated_at : null,
    };
  } catch {
    return fallback;
  }
}

/**
 * Met à jour un paramètre d'application via la RPC SECURITY DEFINER `admin_definir_parametre`.
 */
export async function definirParametreApplication<K extends CleParametreApplication>(
  cle: K,
  valeur: ParametresApplicationMap[K],
): Promise<{ data?: ParametreApplicationRecord<K>; error?: string }> {
  if (cle === "tuteur_gemini_notebook") {
    const check = validerUrlNotebook(valeur.url);
    if (!check.valide) {
      return { error: check.erreur ?? "URL invalide." };
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const { data, error } = await client.rpc("admin_definir_parametre", {
      p_cle: cle,
      p_valeur: {
        actif: valeur.actif,
        url: valeur.url.trim(),
      },
    });

    if (error) {
      return { error: error.message || "Impossible d'enregistrer le paramètre." };
    }

    return {
      data: {
        cle,
        valeur: normaliserParametreNotebook(data?.valeur ?? valeur) as ParametresApplicationMap[K],
        modifie_par: typeof data?.modifie_par === "string" ? data.modifie_par : null,
        updated_at:
          typeof data?.updated_at === "string" ? data.updated_at : new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erreur réseau lors de l'enregistrement.",
    };
  }
}
