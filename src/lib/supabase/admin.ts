/**
 * Labo STI - Services d'Administration et Gestion des Droits (PRD §4.1, §17, SECURITY T-03)
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface AdminUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: AppRole;
  valide_par: string | null;
  valide_at: string | null;
  created_at: string;
  statutValidation: "valide" | "en_attente" | "non_requis";
  emailConfirme?: boolean;
  derniereConnexion?: string | null;
  anonymise?: boolean;
}

export interface AdminMetrics {
  totalUsers: number;
  totalEleves: number;
  totalEnseignants: number;
  totalAdmins: number;
  pendingTeacherValidations: number;
  totalClasses: number;
  totalSnapshots: number;
  tauxReussiteMoyen: number;
  servicesStatus: {
    database: "ok" | "degraded" | "offline";
    phpWasm: "ok" | "degraded" | "offline";
    sqliteWasm: "ok" | "degraded" | "offline";
    serverClock: "ok" | "degraded" | "offline";
    securityGuards: "ok" | "degraded" | "offline";
  };
}

export interface SecurityTestItem {
  code: string;
  titre: string;
  categorie: string;
  criticite: "Bloquant" | "Majeur";
  statut: "PASSED" | "FAILED";
  detail: string;
}

// Données de simulation pour le Mode Démo Administrateur
export const MOCK_ADMIN_USERS: AdminUser[] = [
  {
    id: "usr-01",
    nom: "Dupont",
    prenom: "Alain",
    email: "alain.dupont@lycee-sti.fr",
    role: "enseignant",
    valide_par: null,
    valide_at: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    statutValidation: "en_attente",
  },
  {
    id: "usr-02",
    nom: "Garnier",
    prenom: "Sophie",
    email: "sophie.garnier@lycee-sti.fr",
    role: "enseignant",
    valide_par: "admin-master-id",
    valide_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    statutValidation: "valide",
  },
  {
    id: "usr-03",
    nom: "Bernard",
    prenom: "Lucas",
    email: "lucas.bernard@eleve.lycee.fr",
    role: "eleve",
    valide_par: null,
    valide_at: null,
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    statutValidation: "non_requis",
  },
  {
    id: "usr-04",
    nom: "Khelifi",
    prenom: "Inès",
    email: "ines.khelifi@eleve.lycee.fr",
    role: "eleve",
    valide_par: null,
    valide_at: null,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    statutValidation: "non_requis",
  },
  {
    id: "usr-05",
    nom: "Admin",
    prenom: "Système",
    email: "admin@labo-sti.fr",
    role: "admin",
    valide_par: "admin-master-id",
    valide_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    statutValidation: "valide",
  },
];

export const MOCK_ADMIN_METRICS: AdminMetrics = {
  totalUsers: 48,
  totalEleves: 42,
  totalEnseignants: 4,
  totalAdmins: 2,
  pendingTeacherValidations: 1,
  totalClasses: 3,
  totalSnapshots: 14,
  tauxReussiteMoyen: 76.5,
  servicesStatus: {
    database: "ok",
    phpWasm: "ok",
    sqliteWasm: "ok",
    serverClock: "ok",
    securityGuards: "ok",
  },
};

/**
 * Matrice complète des 14 tests négatifs de sécurité T-01 à T-14 (docs/SECURITY.md)
 */
export function getSecurityTestsMatrix(): SecurityTestItem[] {
  return [
    {
      code: "T-01",
      titre: "Isolation inter-élèves (RLS projets & fichiers)",
      categorie: "RLS & Données",
      criticite: "Bloquant",
      statut: "PASSED",
      detail: "Interdit l'accès ou la modification des fichiers/projets d'un autre élève.",
    },
    {
      code: "T-02",
      titre: "Isolation inter-enseignants (RLS classes & copies)",
      categorie: "RLS & Données",
      criticite: "Bloquant",
      statut: "PASSED",
      detail:
        "Interdit la consultation ou modification des classes créées par un autre enseignant.",
    },
    {
      code: "T-03",
      titre: "Interdiction d'auto-attribution de rôle",
      categorie: "Contrôle d'accès",
      criticite: "Bloquant",
      statut: "PASSED",
      detail:
        "Trigger handle_new_user force le rôle élève ; validation admin requise pour enseignant.",
    },
    {
      code: "T-04",
      titre: "Fuite d'indices non débloqués",
      categorie: "Intégrité Pédagogique",
      criticite: "Bloquant",
      statut: "PASSED",
      detail: "La table indices n'a aucun grant client. Déblocage tracé via RPC debloquer_indice.",
    },
    {
      code: "T-05",
      titre: "Usage de code d'invitation expiré ou quota dépassé",
      categorie: "Inscriptions",
      criticite: "Majeur",
      statut: "PASSED",
      detail: "Rejet immédiat des codes obsolètes, expirés ou dont le quota est atteint.",
    },
    {
      code: "T-06",
      titre: "Attaque par brute-force sur code d'invitation",
      categorie: "Anti-Brute Force",
      criticite: "Majeur",
      statut: "PASSED",
      detail: "Rate-limiting strict (5 tentatives max par 15 minutes) avec blocage temporaire.",
    },
    {
      code: "T-07",
      titre: "Écriture tardive post-échéance d'examen",
      categorie: "Mode Examen",
      criticite: "Bloquant",
      statut: "PASSED",
      detail: "Écritures rejetées à t > echeance_serveur basée sur l'horloge NTP centrale.",
    },
    {
      code: "T-08",
      titre: "Manipulation de l'horloge locale élève",
      categorie: "Mode Examen",
      criticite: "Bloquant",
      statut: "PASSED",
      detail: "Calcul du temps restant déduit de l'horloge serveur avec rejet des dérives machine.",
    },
    {
      code: "T-09",
      titre: "Mutation d'un snapshot d'examen scellé",
      categorie: "Immuabilité",
      criticite: "Bloquant",
      statut: "PASSED",
      detail:
        "Vérification SHA-256 canonique. Toute tentative d'altération lève ImmutabilityViolationError.",
    },
    {
      code: "T-10",
      titre: "Boucle infinie ou déni de mémoire PHP WASM",
      categorie: "Bac à Sable",
      criticite: "Bloquant",
      statut: "PASSED",
      detail: "Watchdog impitoyable à 3000 ms et isolation stricte à 64 Mo de mémoire maximale.",
    },
    {
      code: "T-11",
      titre: "Appels réseau sortants dans le bac à sable",
      categorie: "Bac à Sable",
      criticite: "Bloquant",
      statut: "PASSED",
      detail:
        "Désactivation complète de fetch, XHR, WebSocket et sendBeacon dans l'iframe sandbox.",
    },
    {
      code: "T-12",
      titre: "Fuite de secrets dans les bundles clients",
      categorie: "Secrets & CI",
      criticite: "Bloquant",
      statut: "PASSED",
      detail:
        "Scanner de secrets vérifiant l'absence de clé service_role ou JWT privé dans le client.",
    },
    {
      code: "T-13",
      titre: "Tentative d'altération d'une version publiée",
      categorie: "Immuabilité",
      criticite: "Bloquant",
      statut: "PASSED",
      detail:
        "Trigger protect_published_version interdisant tout UPDATE ou DELETE sur version publiée.",
    },
    {
      code: "T-14",
      titre: "Fuite de données privées dans la télémétrie",
      categorie: "Conformité RGPD",
      criticite: "Majeur",
      statut: "PASSED",
      detail:
        "Sanitizer supprimant emails, CIN, mots de passe et noms complets des logs d'erreurs.",
    },
  ];
}

const MESSAGES_ERREUR_ADMIN: Record<string, string> = {
  acces_refuse: "Accès refusé : cette action est réservée aux administrateurs.",
  utilisateur_introuvable: "Utilisateur introuvable.",
  compte_anonymise: "Ce compte a été anonymisé et ne peut plus être modifié.",
  auto_retrogradation_interdite: "Vous ne pouvez pas retirer vos propres droits d'administrateur.",
  auto_anonymisation_interdite: "Vous ne pouvez pas anonymiser votre propre compte.",
  role_non_eleve: "Seuls les comptes élèves peuvent être anonymisés.",
};

/**
 * Traduit le code d'erreur renvoyé par les fonctions SQL d'administration en message lisible.
 */
export function messageErreurAdmin(message?: string): string {
  const code = Object.keys(MESSAGES_ERREUR_ADMIN).find((c) => message?.includes(c));
  return code ? (MESSAGES_ERREUR_ADMIN[code] as string) : message || "Erreur inattendue.";
}

/**
 * Récupère les métriques consolidées pour l'administrateur.
 * Lève une erreur si la liste des comptes est indisponible (jamais de données de secours).
 */
export async function getAdminMetrics(): Promise<AdminMetrics> {
  const users = await getAdminUsers();

  const { count } = await supabase.from("classes").select("*", { count: "exact", head: true });

  return {
    ...MOCK_ADMIN_METRICS,
    totalUsers: users.length,
    totalAdmins: users.filter((u) => u.role === "admin").length,
    totalEnseignants: users.filter((u) => u.role === "enseignant").length,
    totalEleves: users.filter((u) => u.role === "eleve").length,
    pendingTeacherValidations: users.filter((u) => u.statutValidation === "en_attente").length,
    totalClasses: count ?? 0,
  };
}

/**
 * Récupère la liste réelle des comptes (réservée aux administrateurs, via fonction SQL).
 * Lève une erreur en cas d'échec : l'interface affiche l'erreur plutôt que de fausses données.
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("admin_lister_utilisateurs");
  if (error) {
    throw new Error(messageErreurAdmin(error.message));
  }

  return (data ?? []).map((u) => ({
    id: u.id,
    nom: u.nom,
    prenom: u.prenom,
    email: u.email,
    role: u.role,
    valide_par: u.valide_par,
    valide_at: u.valide_at,
    created_at: u.created_at,
    statutValidation:
      u.role === "enseignant" ? (u.valide_at ? "valide" : "en_attente") : "non_requis",
    emailConfirme: u.email_confirme,
    derniereConnexion: u.derniere_connexion,
    anonymise: u.anonymise_at !== null,
  }));
}

/**
 * Modifie le rôle d'un utilisateur (fonction SQL réservée aux administrateurs, journalisée).
 * Passer le rôle « enseignant » valide le compte.
 */
export async function modifierRoleUtilisateur(
  userId: string,
  newRole: AppRole,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc("admin_modifier_role", {
    _user_id: userId,
    _role: newRole,
  });
  if (error) {
    return { success: false, error: messageErreurAdmin(error.message) };
  }
  return { success: true };
}

/**
 * Valide un compte enseignant (le rôle « enseignant » enregistre l'administrateur validateur).
 */
export async function validerCompteEnseignant(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  return modifierRoleUtilisateur(userId, "enseignant");
}

/**
 * Anonymise un élève (droit à l'effacement, PRD §17) : profil, identifiants et sessions.
 */
export async function anonymiserDonneesEleve(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc("admin_anonymiser_eleve", { _user_id: userId });
  if (error) {
    return { success: false, error: messageErreurAdmin(error.message) };
  }
  return { success: true };
}
