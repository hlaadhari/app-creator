/**
 * Synchronisation de l'épreuve écrite avec le serveur, pensée pour une classe entière qui écrit
 * et remet au même moment (#263).
 *
 * - Brouillon : envoi différé, une seule requête en vol, toujours les dernières réponses.
 *   Avant, chaque frappe envoyait toutes les réponses, sans garantie d'ordre d'arrivée.
 * - Remise : décalage aléatoire à l'échéance et reprise automatique sur erreur réseau.
 *
 * Côté serveur, une remise qui arrive plus de 15 s après l'échéance conserve le dernier brouillon
 * enregistré au lieu des réponses du client : le brouillon doit donc rester récent, et les reprises
 * de la remise ne servent qu'à ne pas perdre la copie quand le réseau flanche.
 */

import { createCoalescingQueue, delaiReprise } from "@/lib/storage/sync-utils";
import type { WrittenExamCopyState } from "./written-exam-service";

/** Silence nécessaire avant d'envoyer le brouillon. */
export const DELAI_BROUILLON_MS = 1500;
/** Décalage aléatoire ajouté à chaque envoi : toute la classe ne tape pas à la même milliseconde. */
export const GIGUE_BROUILLON_MS = 500;
/** Décalage aléatoire de la remise automatique à l'échéance. */
export const GIGUE_REMISE_ECHEANCE_MS = 2000;
export const TENTATIVES_REMISE_MAX = 6;

/** Le serveur dit que la copie est déjà scellée (remise, expirée ou corrigée). */
const COPIE_SCELLEE = /déjà scellée|déjà remise/i;
/** Le serveur refuse les brouillons après l'échéance ; la remise, elle, reste acceptée. */
const ECHEANCE_DEPASSEE = /Échéance serveur dépassée/i;
/** Refus définitif sans rapport avec le réseau. */
const REFUS_DEFINITIF = /Authentification requise|Accès refusé/i;

export interface ResultatBrouillon {
  success: boolean;
  isLocked: boolean;
  error?: string | undefined;
}

export interface OptionsSauvegardeBrouillon {
  enregistrer: (reponses: Record<string, unknown>) => Promise<ResultatBrouillon>;
  /** Appelé quand le serveur indique que la copie est déjà scellée. */
  onVerrou?: () => void;
  delaiMs?: number;
  gigueMs?: number;
  hasard?: () => number;
}

export interface SauvegardeBrouillon {
  /** Mémorise les dernières réponses et programme leur envoi. */
  planifier: (reponses: Record<string, unknown>) => void;
  /** Envoie tout de suite ce qui est en attente (onglet masqué, fermeture). */
  vider: () => Promise<void>;
  /** Arrête tout envoi (copie remise ou composant démonté). */
  arreter: () => void;
}

export function creerSauvegardeBrouillon({
  enregistrer,
  onVerrou,
  delaiMs = DELAI_BROUILLON_MS,
  gigueMs = GIGUE_BROUILLON_MS,
  hasard = Math.random,
}: OptionsSauvegardeBrouillon): SauvegardeBrouillon {
  let dernieres: Record<string, unknown> | null = null;
  let aEnvoyer = false;
  let arrete = false;
  let tentatives = 0;
  let minuteur: ReturnType<typeof setTimeout> | null = null;

  const effacerMinuteur = () => {
    if (minuteur !== null) {
      clearTimeout(minuteur);
      minuteur = null;
    }
  };

  const programmer = (ms: number) => {
    effacerMinuteur();
    minuteur = setTimeout(() => {
      minuteur = null;
      void envoyer();
    }, ms);
  };

  // Une seule requête à la fois : les modifications faites pendant l'envoi partent ensemble ensuite.
  const envoyer = createCoalescingQueue(async () => {
    if (arrete || !aEnvoyer || dernieres === null) return;
    const reponses = dernieres;
    aEnvoyer = false;

    let resultat: ResultatBrouillon;
    try {
      resultat = await enregistrer(reponses);
    } catch (err) {
      resultat = {
        success: false,
        isLocked: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    if (resultat.success && !resultat.isLocked) {
      tentatives = 0;
      return;
    }
    if (resultat.isLocked || (resultat.error && COPIE_SCELLEE.test(resultat.error))) {
      arrete = true;
      onVerrou?.();
      return;
    }
    // Échéance dépassée ou refus définitif : on cesse d'envoyer. L'interface n'est pas verrouillée
    // pour autant, la remise automatique de la copie reste à faire.
    if (
      resultat.error &&
      (ECHEANCE_DEPASSEE.test(resultat.error) || REFUS_DEFINITIF.test(resultat.error))
    ) {
      arrete = true;
      return;
    }

    // Erreur passagère : on renverra les dernières réponses après un délai croissant.
    tentatives += 1;
    aEnvoyer = true;
    programmer(delaiReprise(tentatives, hasard));
  });

  return {
    planifier(reponses) {
      if (arrete) return;
      dernieres = reponses;
      aEnvoyer = true;
      programmer(delaiMs + hasard() * gigueMs);
    },
    vider() {
      if (arrete || !aEnvoyer) return Promise.resolve();
      effacerMinuteur();
      return envoyer().catch(() => undefined);
    },
    arreter() {
      arrete = true;
      effacerMinuteur();
    },
  };
}

export interface OptionsRemise {
  examId: string;
  reponses: Record<string, unknown>;
  motif: "remise_volontaire" | "temps_ecoule";
  remettre: (
    examId: string,
    reponses: Record<string, unknown>,
    motif: "remise_volontaire" | "temps_ecoule",
  ) => Promise<WrittenExamCopyState>;
  /** Relit l'état de la copie sur le serveur (utile quand la remise a abouti mais que la réponse s'est perdue). */
  recuperer: (examId: string) => Promise<WrittenExamCopyState>;
  attendre?: (ms: number) => Promise<void>;
  hasard?: () => number;
  tentativesMax?: number;
  /** Appelé avant chaque nouvel essai (numéro de l'essai qui vient d'échouer). */
  onNouvelEssai?: (essai: number) => void;
}

const attendreParDefaut = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Remet la copie, avec reprise automatique sur erreur réseau. À l'échéance, un décalage aléatoire
 * étale les remises de toute la classe. Si le serveur répond que la copie est déjà scellée (la
 * réponse d'un essai précédent s'est perdue), on récupère son état au lieu d'afficher une erreur.
 */
export async function remettreAvecReprise({
  examId,
  reponses,
  motif,
  remettre,
  recuperer,
  attendre = attendreParDefaut,
  hasard = Math.random,
  tentativesMax = TENTATIVES_REMISE_MAX,
  onNouvelEssai,
}: OptionsRemise): Promise<WrittenExamCopyState> {
  if (motif === "temps_ecoule") {
    await attendre(Math.round(hasard() * GIGUE_REMISE_ECHEANCE_MS));
  }

  for (let essai = 1; ; essai += 1) {
    try {
      return await remettre(examId, reponses, motif);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (COPIE_SCELLEE.test(message)) {
        const etat = await recuperer(examId);
        if (etat.isLocked) return etat;
        throw err;
      }
      if (REFUS_DEFINITIF.test(message) || essai >= tentativesMax) throw err;

      onNouvelEssai?.(essai);
      await attendre(delaiReprise(essai, hasard));
    }
  }
}
