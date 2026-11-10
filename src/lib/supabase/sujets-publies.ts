/**
 * Sujets publiés depuis le Studio : l'élève (connecté ou invité) les reçoit par une fonction
 * serveur qui fournit l'énoncé, les fichiers de départ et les critères — jamais les solutions
 * ni les indices. Les sujets du catalogue embarqué restent prioritaires.
 */

import { supabase } from "@/integrations/supabase/client";
import { critereDepuisJson, type RawCriterion } from "@/lib/evaluation/critere-json";
import type { Exercise } from "@/lib/exercises";

type Rpc = (
  fonction: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

export interface SujetPublieServeur {
  sujet_id: string;
  version_id: string;
  numero: number;
  titre: string;
  niveau: Exercise["level"];
  competence: string;
  duree_min: number;
  enonce_md: string;
  fichiers: Record<string, string>;
  criteres: RawCriterion[];
}

export function exerciceDepuisSujetPublie(s: SujetPublieServeur): Exercise {
  const criteria = s.criteres.map(critereDepuisJson);
  return {
    id: s.sujet_id,
    title: s.titre,
    level: s.niveau,
    competence: s.competence,
    module: "Sujets de l'enseignant",
    dureeMinutes: s.duree_min,
    tags: [],
    examMode: false,
    bareme: criteria.reduce((somme, c) => somme + c.points, 0),
    statement: s.enonce_md.split("\n").filter((ligne) => ligne.trim() !== ""),
    enonceMarkdown: s.enonce_md,
    starter: s.fichiers,
    criteria,
    hints: [],
  };
}

/**
 * Mémoire à court terme (#261) : le chargeur de la route et le composant demandent tous deux le
 * même sujet, et chaque rechargement relançait l'appel. On partage l'appel en cours et on garde le
 * résultat 60 s. Seuls les sujets trouvés sont conservés : un échec ou un sujet absent est
 * redemandé la fois suivante. Une version publiée est immuable, une nouvelle version apparaît donc
 * au plus 60 s plus tard.
 */
const DUREE_MEMOIRE_MS = 60_000;
const memoire = new Map<string, { expireA: number; promesse: Promise<Exercise | null> }>();

export function viderMemoireSujetsPublies(): void {
  memoire.clear();
}

async function chargerDepuisServeur(sujetId: string): Promise<Exercise | null> {
  const { data, error } = await rpc("sujet_publie_pour_eleve", { _sujet_id: sujetId });
  if (error) throw new Error(`Chargement du sujet impossible : ${error.message}`);
  const sujet = data as SujetPublieServeur | null;
  if (!sujet || sujet.criteres.length === 0) return null;
  return exerciceDepuisSujetPublie(sujet);
}

/** Renvoie null si le sujet n'existe pas, n'est pas publié, ou n'a aucun critère livrable. */
export function chargerSujetPublie(sujetId: string): Promise<Exercise | null> {
  const present = memoire.get(sujetId);
  if (present && present.expireA > Date.now()) return present.promesse;

  const promesse = chargerDepuisServeur(sujetId);
  memoire.set(sujetId, { expireA: Date.now() + DUREE_MEMOIRE_MS, promesse });
  promesse.then(
    (exercice) => {
      if (exercice === null && memoire.get(sujetId)?.promesse === promesse) memoire.delete(sujetId);
    },
    () => {
      if (memoire.get(sujetId)?.promesse === promesse) memoire.delete(sujetId);
    },
  );
  return promesse;
}
