/**
 * La cloche de notifications n'est affichée que si `VITE_NOTIFICATIONS_ENABLED=true` au build.
 * Elle interroge la table `notifications` (migration 0037) : tant que cette migration n'est pas
 * appliquée sur le projet Supabase visé, activer la cloche provoquerait des erreurs 404 pour
 * chaque utilisateur connecté. Le drapeau est lu à l'appel pour pouvoir être simulé en test.
 */
export function notificationsActivees(): boolean {
  return import.meta.env["VITE_NOTIFICATIONS_ENABLED"] === "true";
}
