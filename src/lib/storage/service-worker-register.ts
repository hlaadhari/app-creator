/**
 * Enregistrement du Service Worker hors-ligne Labo STI (Issue #124 / TEC-08).
 */
export const OFFLINE_SW_PATH = "/sw.js";

export async function registerOfflineServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(OFFLINE_SW_PATH, {
      scope: "/",
    });
    return registration;
  } catch (err) {
    console.warn("[ServiceWorker] Enregistrement hors-ligne ignoré :", err);
    return null;
  }
}
