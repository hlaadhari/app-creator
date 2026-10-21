import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Reponse = { data: unknown; error: { message: string } | null };

const etat = vi.hoisted(() => ({
  email: "hatem.laadhari.dev01@gmail.com",
  profil: { data: { id: "u1", nom: "Laadhari", prenom: "Hatem" }, error: null } as Reponse,
  roles: { data: [{ role: "eleve" }], error: null } as Reponse,
  appelsProfil: 0,
  appelsRoles: 0,
  rappelAuth: null as null | ((event: string, session: unknown) => void),
  erreurMembres: null as null | { message: string },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: { user: { id: "u1", email: etat.email } } },
        }),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        etat.rappelAuth = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signOut: vi.fn(),
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => {
                etat.appelsProfil += 1;
                return Promise.resolve(etat.profil);
              },
            }),
          }),
        };
      }
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: () => {
              etat.appelsRoles += 1;
              return Promise.resolve(etat.roles);
            },
          }),
        };
      }
      // class_members : lecture des élèves d'une classe
      return {
        select: () => ({
          eq: () => ({
            is: () => Promise.resolve({ data: null, error: etat.erreurMembres }),
          }),
        }),
      };
    },
  },
}));

import { AuthProvider, useAuth } from "@/lib/supabase/auth";
import { roleEffectif } from "@/lib/supabase/roles";
import { estModeDemo } from "@/lib/demo-mode";
import { ErreurChargementEnseignant, getClassStudentsProgress } from "@/lib/supabase/teacher";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("Zéro confiance côté client (issue #53)", () => {
  beforeEach(() => {
    etat.email = "hatem.laadhari.dev01@gmail.com";
    etat.profil = { data: { id: "u1", nom: "Laadhari", prenom: "Hatem" }, error: null };
    etat.roles = { data: [{ role: "eleve" }], error: null };
    etat.appelsProfil = 0;
    etat.appelsRoles = 0;
    etat.rappelAuth = null;
    etat.erreurMembres = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.history.pushState({}, "", "/");
  });

  describe("rôle issu uniquement de la base", () => {
    it("n'attribue plus aucun rôle d'après l'adresse e-mail", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Même adresse que l'ancien compte « admin » codé en dur : le rôle reste celui de la base.
      expect(result.current.user?.email).toBe("hatem.laadhari.dev01@gmail.com");
      expect(result.current.role).toBe("eleve");
    });

    it("retient le rôle le plus élevé de la base", async () => {
      etat.roles = { data: [{ role: "eleve" }, { role: "admin" }], error: null };
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.role).toBe("admin"));
    });

    it("roleEffectif applique l'ordre admin > enseignant > élève", () => {
      expect(roleEffectif([])).toBe("eleve");
      expect(roleEffectif(["eleve", "enseignant"])).toBe("enseignant");
      expect(roleEffectif(["enseignant", "admin", "eleve"])).toBe("admin");
    });

    it("n'attribue aucun rôle si la lecture des droits échoue", async () => {
      etat.roles = { data: null, error: { message: "boom" } };
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.role).toBeNull();
      expect(result.current.authError).toBe("boom");
    });
  });

  describe("un seul chargement du profil et du rôle", () => {
    it("ne recharge pas quand la session initiale et l'événement d'authentification coïncident", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        etat.rappelAuth?.("INITIAL_SESSION", { user: { id: "u1", email: etat.email } });
      });
      await new Promise((r) => setTimeout(r, 20));

      expect(etat.appelsProfil).toBe(1);
      expect(etat.appelsRoles).toBe(1);
    });

    it("ignore le renouvellement de jeton du même utilisateur", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        etat.rappelAuth?.("TOKEN_REFRESHED", { user: { id: "u1", email: etat.email } });
      });
      await new Promise((r) => setTimeout(r, 20));

      expect(etat.appelsProfil).toBe(1);
    });
  });

  describe("mode démo réservé au développement", () => {
    it("ignore ?demo=true en production", () => {
      window.history.pushState({}, "", "/enseignant?demo=true");
      vi.stubEnv("DEV", false);
      expect(estModeDemo()).toBe(false);
    });

    it("reste disponible en développement", () => {
      window.history.pushState({}, "", "/enseignant?demo=true");
      vi.stubEnv("DEV", true);
      expect(estModeDemo()).toBe(true);
    });

    it("n'active pas la démo sans le paramètre", () => {
      vi.stubEnv("DEV", true);
      expect(estModeDemo()).toBe(false);
    });
  });

  describe("erreurs de lecture visibles au lieu de listes vides", () => {
    it("getClassStudentsProgress lève une erreur au lieu de renvoyer « 0 élève »", async () => {
      etat.erreurMembres = { message: "infinite recursion detected in policy" };
      const appel = getClassStudentsProgress("c1");

      await expect(appel).rejects.toBeInstanceOf(ErreurChargementEnseignant);
      await expect(getClassStudentsProgress("c1")).rejects.toThrow(
        "Chargement des élèves impossible",
      );
    });
  });
});
