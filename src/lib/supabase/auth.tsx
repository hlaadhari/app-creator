import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { roleEffectif } from "@/lib/supabase/roles";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLE_PREVIEW_STORAGE_KEY = "labo_sti_admin_preview_role";
export const ROLE_PREVIEW_ALLOW_WRITES_KEY = "labo_sti_admin_preview_allow_writes";

/**
 * Normalise une valeur brute de prévisualisation de rôle.
 * Seuls 'eleve' et 'enseignant' constituent une surcharge de simulation pour un admin ;
 * 'admin' ou toute autre valeur ramène au rôle réel (null).
 */
export function normalizePreviewRole(raw: unknown): Exclude<AppRole, "admin"> | null {
  if (raw === "eleve" || raw === "enseignant") {
    return raw;
  }
  return null;
}

export function getStoredPreviewRole(): Exclude<AppRole, "admin"> | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizePreviewRole(window.sessionStorage.getItem(ROLE_PREVIEW_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function getStoredPreviewAllowWrites(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(ROLE_PREVIEW_ALLOW_WRITES_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Indique si les écritures en base doivent être bloquées car l'administrateur
 * simule actuellement un autre rôle sans avoir explicitement autorisé les écritures (#189).
 */
export function isSimulationWriteBlocked(): boolean {
  const preview = getStoredPreviewRole();
  if (!preview) return false;
  return !getStoredPreviewAllowWrites();
}

export interface Profile {
  id: string;
  nom: string;
  prenom: string;
}

export interface RoleBadgeInfo {
  label: string;
  badgeClass: string;
  description: string;
}

/**
 * Retourne le nom d'affichage formaté de l'utilisateur (Prénom Nom ou e-mail de repli).
 */
export function getUserDisplayName(
  profile: Profile | null,
  user: { email?: string | null } | null,
): string {
  const prenom = profile?.prenom?.trim() ?? "";
  const nom = profile?.nom?.trim() ?? "";
  const full = `${prenom} ${nom}`.trim();
  if (full.length > 0) return full;
  if (user?.email && user.email.trim().length > 0) return user.email.trim();
  return "Utilisateur connecté";
}

/**
 * Calcule les initiales (1 à 2 lettres majuscules) à partir du profil ou de l'e-mail.
 */
export function getUserInitials(
  profile: Profile | null,
  user: { email?: string | null } | null,
): string {
  const prenom = profile?.prenom?.trim() ?? "";
  const nom = profile?.nom?.trim() ?? "";
  if (prenom && nom) {
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  }
  if (prenom) {
    return prenom.slice(0, 2).toUpperCase();
  }
  if (nom) {
    return nom.slice(0, 2).toUpperCase();
  }
  const email = user?.email?.trim() ?? "";
  if (email.length >= 2) {
    return email.slice(0, 2).toUpperCase();
  }
  return "STI";
}

/**
 * Métadonnées visuelles et descriptives du rôle effectif (issu exclusivement de la base).
 */
export function getRoleBadgeInfo(role: AppRole | null): RoleBadgeInfo {
  switch (role) {
    case "admin":
      return {
        label: "Admin",
        badgeClass: "bg-rose-500/10 text-rose-500 border-rose-500/30",
        description:
          "Super-administrateur : gestion des comptes, habilitations enseignants et audit de sécurité.",
      };
    case "enseignant":
      return {
        label: "Enseignant",
        badgeClass: "bg-primary/10 text-primary border-primary/30",
        description:
          "Enseignant certifié : création et gestion de classes, studio de sujets, suivi des copies et séances TP.",
      };
    case "eleve":
    default:
      return {
        label: "Élève",
        badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        description:
          "Compte élève : entraînement sur le catalogue Bac STI, sauvegarde automatique et adhésion aux classes.",
      };
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** Rôle effectif côté interface (suit `previewRole` si l'admin simule un rôle, sinon `realRole`). */
  role: AppRole | null;
  /** Rôle réel issu exclusivement de `public.user_roles` en base. */
  realRole: AppRole | null;
  /** Rôle simulé par l'administrateur ('eleve' | 'enseignant' | null), mémorisé en sessionStorage. */
  previewRole: Exclude<AppRole, "admin"> | null;
  /** Vrai lorsque l'administrateur prévisualise l'interface sous un autre rôle. */
  isRoleSimulated: boolean;
  /** Indique si les écritures en base sont autorisées pendant la simulation de rôle. */
  allowSimulationWrites: boolean;
  /** Définit ou quitte le rôle de prévisualisation (réservé au rôle réel 'admin'). */
  setPreviewRole: (targetRole: AppRole | null) => void;
  /** Active ou désactive l'accord explicite d'écriture en base pendant une simulation. */
  setAllowSimulationWrites: (allow: boolean) => void;
  /** Message d'erreur si le profil ou le rôle n'ont pas pu être lus (le rôle reste alors null). */
  authError: string | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    pass: string,
    nom: string,
    prenom: string,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (nom: string, prenom: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [realRole, setRealRole] = useState<AppRole | null>(null);
  const [previewRoleState, setPreviewRoleState] = useState<Exclude<AppRole, "admin"> | null>(() =>
    getStoredPreviewRole(),
  );
  const [allowSimulationWrites, setAllowSimulationWritesState] = useState<boolean>(() =>
    getStoredPreviewAllowWrites(),
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setPreviewRole = (targetRole: AppRole | null) => {
    if (realRole !== "admin") {
      return;
    }
    const normalized = normalizePreviewRole(targetRole);
    setPreviewRoleState(normalized);
    if (typeof window !== "undefined") {
      try {
        if (normalized) {
          window.sessionStorage.setItem(ROLE_PREVIEW_STORAGE_KEY, normalized);
        } else {
          window.sessionStorage.removeItem(ROLE_PREVIEW_STORAGE_KEY);
          window.sessionStorage.removeItem(ROLE_PREVIEW_ALLOW_WRITES_KEY);
          setAllowSimulationWritesState(false);
        }
      } catch {
        // Ignorer
      }
    }
  };

  const setAllowSimulationWrites = (allow: boolean) => {
    if (realRole !== "admin") return;
    setAllowSimulationWritesState(allow);
    if (typeof window !== "undefined") {
      try {
        if (allow) {
          window.sessionStorage.setItem(ROLE_PREVIEW_ALLOW_WRITES_KEY, "true");
        } else {
          window.sessionStorage.removeItem(ROLE_PREVIEW_ALLOW_WRITES_KEY);
        }
      } catch {
        // Ignorer
      }
    }
  };

  const activePreviewRole: Exclude<AppRole, "admin"> | null =
    realRole === "admin" ? previewRoleState : null;
  const isRoleSimulated = realRole === "admin" && activePreviewRole !== null;
  const role: AppRole | null = isRoleSimulated ? activePreviewRole : realRole;

  // Un seul chargement par utilisateur : pas de doublon entre la session initiale et les
  // événements d'authentification (SIGNED_IN au retour sur l'onglet, renouvellement de jeton…).
  const enCours = useRef<{ id: string; promesse: Promise<void> } | null>(null);
  const utilisateurCharge = useRef<string | null>(null);

  const chargerProfilEtRole = async (userId: string) => {
    try {
      const [profRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, nom, prenom").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

      if (profRes.error) throw new Error(profRes.error.message);
      if (rolesRes.error) throw new Error(rolesRes.error.message);

      const resolvedRole = roleEffectif((rolesRes.data ?? []).map((r) => r.role));
      const resolvedProfile = profRes.data ?? null;

      setProfile(resolvedProfile);
      setRealRole(resolvedRole);
      setAuthError(null);
      utilisateurCharge.current = userId;

      if (resolvedRole !== "admin") {
        setPreviewRoleState(null);
        setAllowSimulationWritesState(false);
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.removeItem(ROLE_PREVIEW_STORAGE_KEY);
            window.sessionStorage.removeItem(ROLE_PREVIEW_ALLOW_WRITES_KEY);
          } catch {
            // Ignorer
          }
        }
      }
    } catch (e) {
      // Moindre privilège : sans lecture fiable des droits, aucun rôle n'est attribué.
      console.warn("[Auth] Erreur de récupération du profil/rôle :", e);
      setRealRole(null);
      utilisateurCharge.current = null;
      setAuthError(e instanceof Error ? e.message : "Impossible de vérifier vos droits.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = (currentUser: User | null): Promise<void> => {
    if (!currentUser) {
      utilisateurCharge.current = null;
      enCours.current = null;
      setProfile(null);
      setRealRole(null);
      setAuthError(null);
      setLoading(false);
      return Promise.resolve();
    }

    if (enCours.current?.id === currentUser.id) {
      return enCours.current.promesse;
    }

    const promesse = chargerProfilEtRole(currentUser.id).finally(() => {
      if (enCours.current?.promesse === promesse) enCours.current = null;
    });
    enCours.current = { id: currentUser.id, promesse };
    return promesse;
  };

  useEffect(() => {
    // 1. Session initiale
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setUser(initSession?.user ?? null);
      void fetchUserData(initSession?.user ?? null);
    });

    // 2. Écoute des changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // Même utilisateur déjà chargé : ces événements ne changent ni le profil ni le rôle.
      const dejaCharge = newSession?.user.id === utilisateurCharge.current;
      if (
        dejaCharge &&
        (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION" || event === "SIGNED_IN")
      ) {
        return;
      }
      // Pas d'appel Supabase directement dans le callback (risque de blocage).
      setTimeout(() => void fetchUserData(newSession?.user ?? null), 0);
    });

    return () => {
      subscription.unsubscribe();
    };
    // Abonnement unique : fetchUserData n'utilise que des refs et des setters stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    return { error };
  };

  const signUp = async (email: string, pass: string, nom: string, prenom: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          nom,
          prenom,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRealRole(null);
    setPreviewRoleState(null);
    setAllowSimulationWritesState(false);
    setAuthError(null);
    utilisateurCharge.current = null;
    enCours.current = null;
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(ROLE_PREVIEW_STORAGE_KEY);
        window.sessionStorage.removeItem(ROLE_PREVIEW_ALLOW_WRITES_KEY);
      } catch {
        // Ignorer
      }
    }
  };

  const refreshProfile = async () => {
    utilisateurCharge.current = null;
    enCours.current = null;
    await fetchUserData(user);
  };

  const updateProfile = async (nom: string, prenom: string): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error("Vous devez être connecté pour modifier votre profil.") };
    }
    const cleanNom = nom.trim();
    const cleanPrenom = prenom.trim();
    if (!cleanPrenom || !cleanNom) {
      return { error: new Error("Le prénom et le nom sont obligatoires.") };
    }
    if (cleanPrenom.length > 100 || cleanNom.length > 100) {
      return { error: new Error("Le prénom et le nom ne peuvent pas dépasser 100 caractères.") };
    }

    try {
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ nom: cleanNom, prenom: cleanPrenom })
        .eq("id", user.id);

      if (dbError) {
        return { error: new Error(dbError.message) };
      }

      if (typeof supabase.auth.updateUser === "function") {
        await supabase.auth.updateUser({
          data: { nom: cleanNom, prenom: cleanPrenom },
        });
      }

      setProfile({ id: user.id, nom: cleanNom, prenom: cleanPrenom });
      return { error: null };
    } catch (e) {
      return {
        error: e instanceof Error ? e : new Error("Impossible de mettre à jour le profil."),
      };
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error("Vous devez être connecté pour modifier votre mot de passe.") };
    }
    if (!newPassword || newPassword.length < 6) {
      return {
        error: new Error("Le nouveau mot de passe doit contenir au moins 6 caractères."),
      };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (e) {
      return {
        error: e instanceof Error ? e : new Error("Impossible de modifier le mot de passe."),
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        realRole,
        previewRole: activePreviewRole,
        isRoleSimulated,
        allowSimulationWrites,
        setPreviewRole,
        setAllowSimulationWrites,
        authError,
        loading,
        signInWithEmail,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
}

export function useOptionalAuth(): AuthContextType | undefined {
  return useContext(AuthContext);
}
