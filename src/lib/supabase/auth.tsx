import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      // 1. Profil
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, nom, prenom")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (prof) setProfile(prof);

      // 2. Rôle
      const { data: rData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      let assignedRole: AppRole = rData?.role || "eleve";

      // Liaison stricte des comptes réels officiels
      if (currentUser.email === "hatem.laadhari.dev01@gmail.com") {
        assignedRole = "admin";
      } else if (currentUser.email === "hatem.laadhari.dev02@gmail.com") {
        assignedRole = "enseignant";
      } else if (currentUser.email === "hatem.laadhari.dev03@gmail.com") {
        assignedRole = "eleve";
      }

      setRole(assignedRole);
    } catch (e) {
      console.warn("[Auth] Erreur de récupération du profil/rôle :", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Session initiale
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setUser(initSession?.user ?? null);
      fetchUserData(initSession?.user ?? null);
    });

    // 2. Écoute des changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      fetchUserData(newSession?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
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
  };

  const refreshProfile = async () => {
    await fetchUserData(user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
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
