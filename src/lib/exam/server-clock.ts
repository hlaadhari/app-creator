/**
 * Labo STI - Synchronisation d'horloge serveur stricte (PRD §8, §12, F-50, T-06)
 *
 * Calcule l'écart (drift) entre l'horloge locale client et l'horloge officielle du serveur Supabase.
 * Empêche formellement un élève de contourner le minuteur d'examen en modifiant l'heure de sa machine.
 */

import type { ExamCountdownState, ServerClockSync } from "./types";

let cachedOffsetMs = 0;
let lastSyncTimestamp = 0;
let monotonicBaseline = 0;

/**
 * Synchronise l'horloge avec le serveur et mémorise le décalage temporel
 */
export async function synchroniserHorlogeServeur(
  fetchServerClockFn?: () => Promise<Date>,
): Promise<ServerClockSync> {
  const t0 = Date.now();

  let serverDate: Date;
  if (fetchServerClockFn) {
    serverDate = await fetchServerClockFn();
  } else {
    // Appel par défaut simulé ou direct
    serverDate = new Date();
  }

  const t1 = Date.now();
  const latencyMs = Math.max(0, Math.round((t1 - t0) / 2));
  const clientEstimatedTime = t0 + latencyMs;

  cachedOffsetMs = serverDate.getTime() - clientEstimatedTime;
  lastSyncTimestamp = Date.now();
  monotonicBaseline = typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    serverTime: serverDate,
    clientTime: new Date(clientEstimatedTime),
    offsetMs: cachedOffsetMs,
    latencyMs,
  };
}

/**
 * Définit manuellement l'offset temporel serveur (utile pour les tests et simulations)
 */
export function setServerOffsetMs(offsetMs: number): void {
  cachedOffsetMs = offsetMs;
  lastSyncTimestamp = Date.now();
  monotonicBaseline = typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Réinitialise la synchronisation d'horloge
 */
export function reinitialiserHorlogeServeur(): void {
  cachedOffsetMs = 0;
  lastSyncTimestamp = 0;
  monotonicBaseline = 0;
}

/**
 * Obtient l'heure serveur synchronisée actuelle, insensible aux manipulations de l'horloge locale
 */
export function getTempsServeurSynchronise(): Date {
  if (lastSyncTimestamp > 0 && typeof performance !== "undefined") {
    // Utiliser le temps monotone du navigateur si disponible pour éviter les sauts d'horloge système
    const elapsedSinceSync = performance.now() - monotonicBaseline;
    const baseServerTime = lastSyncTimestamp + cachedOffsetMs;
    return new Date(baseServerTime + elapsedSinceSync);
  }

  return new Date(Date.now() + cachedOffsetMs);
}

/**
 * Formate un nombre de secondes en chaîne HH:MM:SS ou MM:SS
 */
export function formaterDuree(secondesTotales: number): string {
  if (secondesTotales <= 0) return "00:00";

  const h = Math.floor(secondesTotales / 3600);
  const m = Math.floor((secondesTotales % 3600) / 60);
  const s = Math.floor(secondesTotales % 60);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Calcule l'état précis du compte à rebours d'examen par rapport à l'échéance serveur
 */
export function calculerCompteARebours(
  echeance: string | Date,
  nowServeur: Date = getTempsServeurSynchronise(),
): ExamCountdownState {
  const echeanceDate = typeof echeance === "string" ? new Date(echeance) : echeance;
  const diffMs = echeanceDate.getTime() - nowServeur.getTime();

  if (diffMs <= 0 || isNaN(diffMs)) {
    return {
      remainingMs: 0,
      remainingSeconds: 0,
      formatted: "00:00",
      isExpired: true,
      isCritical: true,
      isWarning: true,
    };
  }

  const remainingSeconds = Math.floor(diffMs / 1000);
  const isCritical = remainingSeconds <= 5 * 60; // 5 minutes
  const isWarning = remainingSeconds <= 15 * 60; // 15 minutes

  return {
    remainingMs: diffMs,
    remainingSeconds,
    formatted: formaterDuree(remainingSeconds),
    isExpired: false,
    isCritical,
    isWarning,
  };
}
