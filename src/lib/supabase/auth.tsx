import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { roleEffectif } from "@/lib/supabase/roles";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface Profile {
  id: string;
  nom: string;
  prenom: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

      setProfile(profRes.data ?? null);
      setRole(roleEffectif((rolesRes.data ?? []).map((r) => r.role)));
      setAuthError(null);
      utilisateurCharge.current = userId;
    } catch (e) {
      // Moindre privilège : sans lecture fiable des droits, aucun rôle n'est attribué.
      console.warn("[Auth] Erreur de récupération du profil/rôle :", e);
      setRole(null);
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
      setRole(null);
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
    setRole(null);
    setAuthError(null);
    utilisateurCharge.current = null;
    enCours.current = null;
  };

  const refreshProfile = async () => {
    enCours.current = null;
    await fetchUserData(user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        authError,
        loading,
        signInWithEmail,
        signUp,
        signOut,
        refreshProfile,
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
