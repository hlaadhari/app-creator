/**
 * Validation côté client du Studio avant tout appel serveur (#194) : un message lisible vaut mieux
 * qu'un « Failed to fetch » quand l'identifiant ou le titre manquent.
 */

import type { VersionStudio } from "@/lib/supabase/studio";

export const MOTIF_IDENTIFIANT_SUJET = /^[a-z0-9-]{3,61}$/;

export function erreursAvantEnregistrement(
  version: Pick<VersionStudio, "sujet_id" | "titre">,
  estNouveau: boolean,
): string[] {
  const erreurs: string[] = [];
  if (estNouveau) {
    if (version.sujet_id.trim() === "") {
      erreurs.push("L'identifiant du sujet est obligatoire (ex. tp-menu-01).");
    } else if (!MOTIF_IDENTIFIANT_SUJET.test(version.sujet_id)) {
      erreurs.push(
        "Identifiant invalide : 3 à 61 caractères, minuscules, chiffres et tirets (ex. tp-menu-01).",
      );
    }
  }
  if (version.titre.trim() === "") erreurs.push("Le titre du sujet est obligatoire.");
  return erreurs;
}
