/**
 * Mode démo des espaces /enseignant et /admin (données fictives, sans connexion).
 * Réservé au développement : en production, `?demo=true` est ignoré et la garde d'accès
 * ne peut jamais être contournée depuis l'URL (zéro confiance côté client).
 */
export function estModeDemo(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return false;
  }
  return new URLSearchParams(window.location.search).get("demo") === "true";
}
