import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  email: "eleve.sti@lycee.tn",
  profile: { id: "u-eleve-1", nom: "Ben Ali", prenom: "Yasmine" },
  roles: [{ role: "eleve" }],
  updateProfileError: null as { message: string } | null,
  updateUserError: null as { message: string } | null,
  leaveClassError: null as { message: string } | null,
  lastUpdatedProfile: null as { nom: string; prenom: string } | null,
  lastUpdatedUser: null as unknown,
  lastLeftClassId: null as string | null,
  classesList: [
    {
      class_id: "cls-1",
      joined_at: "2026-09-15T08:00:00Z",
      classes: {
        id: "cls-1",
        nom: "4ème SI - Groupe A",
        annee: "2026-2027",
        enseignant_id: "prof-1",
      },
    },
  ],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: {
            session: {
              user: { id: "u-eleve-1", email: mockState.email },
            },
          },
        }),
      getUser: () =>
        Promise.resolve({
          data: {
            user: { id: "u-eleve-1", email: mockState.email },
          },
        }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      updateUser: (payload: unknown) => {
        mockState.lastUpdatedUser = payload;
        return Promise.resolve({
          data: { user: { id: "u-eleve-1", email: mockState.email } },
          error: mockState.updateUserError,
        });
      },
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: mockState.profile, error: null }),
            }),
          }),
          update: (vals: { nom: string; prenom: string }) => ({
            eq: () => {
              if (!mockState.updateProfileError) {
                mockState.lastUpdatedProfile = vals;
                mockState.profile = { ...mockState.profile, ...vals };
              }
              return Promise.resolve({ error: mockState.updateProfileError });
            },
          }),
        };
      }
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: mockState.roles, error: null }),
          }),
        };
      }
      if (table === "class_members") {
        return {
          select: () => ({
            eq: () => ({
              is: () => Promise.resolve({ data: mockState.classesList, error: null }),
            }),
          }),
          update: () => ({
            eq: (_col: string, val: string) => ({
              eq: () => {
                mockState.lastLeftClassId = val;
                return Promise.resolve({ error: mockState.leaveClassError });
              },
            }),
          }),
        };
      }
      if (table === "demandes_enseignant") {
        return {
          select: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    },
  },
}));

import {
  AuthProvider,
  useAuth,
  getUserDisplayName,
  getUserInitials,
  getRoleBadgeInfo,
} from "@/lib/supabase/auth";
import { quitterClasse } from "@/lib/supabase/classes";
import { AuthModal } from "@/components/AuthModal";
import { UserProfileDialog } from "@/components/UserProfileDialog";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("Menu Profil & Gestion du Compte (Issue #180)", () => {
  beforeEach(() => {
    mockState.email = "eleve.sti@lycee.tn";
    mockState.profile = { id: "u-eleve-1", nom: "Ben Ali", prenom: "Yasmine" };
    mockState.roles = [{ role: "eleve" }];
    mockState.updateProfileError = null;
    mockState.updateUserError = null;
    mockState.leaveClassError = null;
    mockState.lastUpdatedProfile = null;
    mockState.lastUpdatedUser = null;
    mockState.lastLeftClassId = null;
  });

  describe("1. Fonctions utilitaires d'affichage du profil et des rôles", () => {
    it("formate correctement le nom complet ou utilise l'e-mail en repli", () => {
      expect(
        getUserDisplayName(
          { id: "1", prenom: "Yasmine", nom: "Ben Ali" },
          { email: "yasmine@lycee.tn" },
        ),
      ).toBe("Yasmine Ben Ali");
      expect(
        getUserDisplayName({ id: "1", prenom: "", nom: "" }, { email: "yasmine@lycee.tn" }),
      ).toBe("yasmine@lycee.tn");
      expect(getUserDisplayName(null, null)).toBe("Utilisateur connecté");
    });

    it("calcule les initiales à partir du prénom/nom ou de l'e-mail", () => {
      expect(
        getUserInitials(
          { id: "1", prenom: "Yasmine", nom: "Ben Ali" },
          { email: "yasmine@lycee.tn" },
        ),
      ).toBe("YB");
      expect(
        getUserInitials({ id: "1", prenom: "Yasmine", nom: "" }, { email: "yasmine@lycee.tn" }),
      ).toBe("YA");
      expect(getUserInitials(null, { email: "prof@lycee.tn" })).toBe("PR");
      expect(getUserInitials(null, null)).toBe("STI");
    });

    it("retourne les métadonnées visuelles exactes pour chaque rôle", () => {
      expect(getRoleBadgeInfo("admin").label).toBe("Admin");
      expect(getRoleBadgeInfo("enseignant").label).toBe("Enseignant");
      expect(getRoleBadgeInfo("eleve").label).toBe("Élève");
      expect(getRoleBadgeInfo(null).label).toBe("Élève");
    });
  });

  describe("2. Mise à jour du profil et du mot de passe via useAuth", () => {
    it("met à jour le nom et le prénom dans la table profiles et dans l'état local", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: { error: Error | null } = { error: null };
      await act(async () => {
        res = await result.current.updateProfile("Mansouri", "Sami");
      });

      expect(res.error).toBeNull();
      expect(mockState.lastUpdatedProfile).toEqual({ nom: "Mansouri", prenom: "Sami" });
      expect(result.current.profile).toEqual({
        id: "u-eleve-1",
        nom: "Mansouri",
        prenom: "Sami",
      });
    });

    it("refuse une mise à jour de profil avec un prénom ou nom vide", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.updateProfile("  ", "Sami");
      expect(res.error).not.toBeNull();
      expect(res.error?.message).toContain("obligatoires");
    });

    it("valide la longueur minimale du mot de passe et appelle supabase.auth.updateUser", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      const shortRes = await result.current.updatePassword("123");
      expect(shortRes.error).not.toBeNull();
      expect(shortRes.error?.message).toContain("6 caractères");

      const validRes = await result.current.updatePassword("NouveauSecret2026!");
      expect(validRes.error).toBeNull();
      expect(mockState.lastUpdatedUser).toEqual({ password: "NouveauSecret2026!" });
    });
  });

  describe("3. Action quitterClasse dans le service classes", () => {
    it("permet à un élève connecté de quitter une classe active", async () => {
      const res = await quitterClasse("cls-1");
      expect(res.success).toBe(true);
      expect(mockState.lastLeftClassId).toBe("cls-1");
    });

    it("rejette un identifiant de classe vide", async () => {
      const res = await quitterClasse("   ");
      expect(res.success).toBe(false);
      expect(res.error).toContain("invalide");
    });
  });

  describe("4. Composants UI : UserProfileMenu et UserProfileDialog", () => {
    it("affiche le bouton déclencheur du menu profil avec initiales, nom et badge de rôle", async () => {
      render(
        <AuthProvider>
          <AuthModal />
        </AuthProvider>,
      );

      const trigger = await screen.findByTestId("user-profile-menu-trigger");
      expect(trigger).toBeDefined();
      expect(trigger.textContent).toContain("YB");
      expect(trigger.textContent).toContain("Yasmine Ben Ali");
      expect(trigger.textContent).toContain("Élève");
    });

    it("permet de modifier son profil et de consulter ses classes dans UserProfileDialog", async () => {
      render(
        <AuthProvider>
          <UserProfileDialog open={true} onOpenChange={vi.fn()} defaultTab="profil" />
        </AuthProvider>,
      );

      const prenomInput = (await screen.findByLabelText("Prénom")) as HTMLInputElement;
      const nomInput = screen.getByLabelText("Nom") as HTMLInputElement;

      expect(prenomInput.value).toBe("Yasmine");
      expect(nomInput.value).toBe("Ben Ali");

      fireEvent.change(prenomInput, { target: { value: "Inès" } });
      fireEvent.change(nomInput, { target: { value: "Khelifi" } });

      const saveBtn = screen.getByRole("button", { name: /Enregistrer les modifications/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Votre profil a été mis à jour avec succès/i)).toBeDefined();
      });
      expect(mockState.lastUpdatedProfile).toEqual({ nom: "Khelifi", prenom: "Inès" });
    });
  });
});
