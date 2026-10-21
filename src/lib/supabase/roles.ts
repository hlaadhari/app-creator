import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const PRIORITE_ROLES: AppRole[] = ["admin", "enseignant", "eleve"];

/**
 * Rôle effectif d'un compte : le plus élevé de ses rôles en base, « eleve » si aucun.
 * Les droits viennent uniquement de user_roles (jamais d'une adresse e-mail connue du client).
 */
export function roleEffectif(roles: AppRole[]): AppRole {
  return PRIORITE_ROLES.find((r) => roles.includes(r)) ?? "eleve";
}
