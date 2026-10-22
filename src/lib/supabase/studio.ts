/**
 * Enregistrement des sujets du Studio (brouillons). Tout passe par des fonctions serveur réservées
 * aux enseignants et administrateurs : les tables de correction n'ont aucun GRANT côté client.
 */

import { supabase } from "@/integrations/supabase/client";
import type { RawCriterion } from "@/lib/evaluation/critere-json";
import type { SubjectVersionRecord, ValidationSolution } from "@/lib/subjects/subject-studio";

type RpcNonTypee = (
  fonction: string,
  args?: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as RpcNonTypee;

export type VersionStudio = SubjectVersionRecord<RawCriterion>;

export interface SujetStudioResume {
  sujet_id: string;
  titre: string;
  niveau: "Facile" | "Moyen" | "Difficile";
  version_id: string;
  numero: number;
  publiee: boolean;
  updated_at: string;
}

const MESSAGES: Record<string, string> = {
  acces_refuse: "Accès refusé : ce sujet appartient à un autre enseignant.",
  identifiant_deja_utilise: "Cet identifiant de sujet est déjà utilisé.",
  identifiant_invalide:
    "Identifiant invalide : 3 à 61 caractères, minuscules, chiffres et tirets (ex. tp-menu-01).",
  titre_obligatoire: "Le titre du sujet est obligatoire.",
  version_introuvable: "Version de sujet introuvable.",
  "Version publiee immuable":
    "Cette version est publiée : elle est immuable. Créez une nouvelle version pour la modifier.",
};

export function messageErreurStudio(brut: string): string {
  const cle = Object.keys(MESSAGES).find((k) => brut.includes(k));
  return cle ? (MESSAGES[cle] as string) : `Opération impossible : ${brut}`;
}

async function appeler<T>(fonction: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(fonction, args);
  if (error) throw new Error(messageErreurStudio(error.message));
  return data as T;
}

export const listerSujetsStudio = () => appeler<SujetStudioResume[]>("studio_lister_sujets");

const TYPES: ValidationSolution["type"][] = ["canonique", "alternative", "invalide"];

interface SolutionServeur {
  variante: ValidationSolution["type"];
  nom: string;
  description: string;
  fichiers: Record<string, string>;
}

export interface ContenuServeur {
  sujet_id: string;
  version_id: string;
  numero: number;
  publiee: boolean;
  titre: string;
  niveau: VersionStudio["niveau"];
  competence: string;
  duree_min: number;
  enonce_md: string;
  fichiers: Record<string, string>;
  criteres: RawCriterion[];
  indices: string[];
  solutions: SolutionServeur[];
}

export function versionDepuisServeur(c: ContenuServeur): VersionStudio {
  const solutions = TYPES.map((type) => c.solutions.find((s) => s.variante === type)).filter(
    (s): s is SolutionServeur => !!s,
  );
  return {
    id: c.version_id,
    sujet_id: c.sujet_id,
    numero: c.numero,
    titre: c.titre,
    enonce_md: c.enonce_md,
    niveau: c.niveau,
    duree_min: c.duree_min,
    competence: c.competence,
    publiee: c.publiee,
    criteres: c.criteres,
    indices: c.indices,
    fichiers_depart: c.fichiers,
    solutions_test: solutions.map((s) => ({
      id: `sol-${s.variante}`,
      nom: s.nom,
      type: s.variante,
      description: s.description,
      files: s.fichiers,
    })),
  };
}

export function contenuPourServeur(v: VersionStudio): Record<string, unknown> {
  return {
    sujet_id: v.sujet_id,
    titre: v.titre,
    niveau: v.niveau,
    competence: v.competence ?? "",
    duree_min: v.duree_min,
    enonce_md: v.enonce_md,
    fichiers: v.fichiers_depart,
    criteres: v.criteres,
    indices: v.indices ?? [],
    solutions: v.solutions_test.map((s) => ({
      variante: s.type,
      nom: s.nom,
      description: s.description,
      fichiers: s.files,
    })),
  };
}

export async function chargerVersionStudio(versionId: string): Promise<VersionStudio> {
  return versionDepuisServeur(
    await appeler<ContenuServeur>("studio_charger_version", { _version_id: versionId }),
  );
}

/** Crée le sujet (version 1) ou remplace le contenu du brouillon. */
export async function enregistrerBrouillon(
  version: VersionStudio,
  estNouveau: boolean,
): Promise<{ version_id: string; numero: number }> {
  return appeler("studio_enregistrer_brouillon", {
    _version_id: estNouveau ? null : version.id,
    _contenu: contenuPourServeur(version),
  });
}

export const supprimerBrouillon = (versionId: string) =>
  appeler<void>("studio_supprimer_brouillon", { _version_id: versionId });
