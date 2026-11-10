/**
 * Briques pures de la synchronisation des fichiers élève (#201).
 * Elles évitent les faux conflits de révision sans jamais écraser un travail en silence.
 */

/**
 * File d'attente à une seule exécution à la fois, avec coalescence : pendant qu'une
 * synchronisation tourne, tous les appels supplémentaires partagent UNE seule exécution
 * suivante. Deux écritures ne partent donc jamais en parallèle avec la même révision.
 */
export function createCoalescingQueue(task: () => Promise<void>): () => Promise<void> {
  let running: Promise<void> | null = null;
  let queued: Promise<void> | null = null;

  const run = (): Promise<void> => {
    if (!running) {
      const current: Promise<void> = task().finally(() => {
        if (running === current) running = null;
      });
      running = current;
      return current;
    }
    if (!queued) {
      const previous = running;
      queued = previous
        .catch(() => undefined)
        .then(() => {
          queued = null;
          return run();
        });
    }
    return queued;
  };

  return run;
}

export type ArbitrageRevision = "identique" | "depart_intact" | "conflit";

/**
 * Décide quoi faire quand la révision distante d'un fichier dépasse la révision locale.
 * - identique : même contenu, on adopte seulement le numéro de révision distant ;
 * - depart_intact : l'élève n'a pas modifié le fichier de départ, on peut adopter le distant
 *   sans rien perdre ;
 * - conflit : les deux côtés diffèrent, l'élève doit arbitrer (aucun écrasement silencieux).
 */
export function arbitrerRevisionDistante(p: {
  localContent: string;
  remoteContent: string;
  starterContent?: string | undefined;
}): ArbitrageRevision {
  if (p.localContent === p.remoteContent) return "identique";
  if (p.starterContent !== undefined && p.localContent === p.starterContent) return "depart_intact";
  return "conflit";
}

const REPRISE_BASE_MS = 2000;
const REPRISE_MAX_MS = 60000;

/** Délai de reprise après une erreur : exponentiel plafonné, avec gigue (« full jitter »). */
export function delaiReprise(tentative: number, hasard: () => number = Math.random): number {
  const plafond = Math.min(REPRISE_MAX_MS, REPRISE_BASE_MS * 2 ** Math.max(0, tentative - 1));
  return Math.round(plafond / 2 + (hasard() * plafond) / 2);
}
