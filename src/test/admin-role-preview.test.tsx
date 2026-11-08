import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthState = vi.hoisted(() => ({
  userId: "u-admin-1",
  email: "admin@labosti.tn",
  profile: { id: "u-admin-1", nom: "Laadhari", prenom: "Hatem" },
  roles: [{ role: "admin" as "admin" | "enseignant" | "eleve" }],
  delayRolesMs: 0,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: {
            session: {
              user: { id: mockAuthState.userId, email: mockAuthState.email },
            },
          },
        }),
      getUser: () =>
        Promise.resolve({
          data: {
            user: { id: mockAuthState.userId, email: mockAuthState.email },
          },
        }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: mockAuthState.profile, error: null }),
            }),
          }),
        };
      }
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: () =>
              mockAuthState.delayRolesMs > 0
                ? new Promise((resolve) =>
                    setTimeout(
                      () => resolve({ data: mockAuthState.roles, error: null }),
                      mockAuthState.delayRolesMs,
                    ),
                  )
                : Promise.resolve({ data: mockAuthState.roles, error: null }),
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
  ROLE_PREVIEW_STORAGE_KEY,
  ROLE_PREVIEW_ALLOW_WRITES_KEY,
  isSimulationWriteBlocked,
} from "@/lib/supabase/auth";
import { RolePreviewBanner } from "@/components/RolePreviewBanner";
import { UserProfileMenu } from "@/components/UserProfileMenu";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("Sélecteur de rôle Admin « Prévisualiser en tant que » (Issue #189)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockAuthState.userId = "u-admin-1";
    mockAuthState.email = "admin@labosti.tn";
    mockAuthState.profile = { id: "u-admin-1", nom: "Laadhari", prenom: "Hatem" };
    mockAuthState.roles = [{ role: "admin" }];
    mockAuthState.delayRolesMs = 0;
  });

  it("permet à l'admin de prévisualiser le rôle élève ou enseignant en sessionStorage et de revenir en un clic", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.realRole).toBe("admin");
    expect(result.current.role).toBe("admin");
    expect(result.current.isRoleSimulated).toBe(false);
    expect(isSimulationWriteBlocked()).toBe(false);

    // Basculer en vue élève
    act(() => {
      result.current.setPreviewRole("eleve");
    });

    expect(result.current.realRole).toBe("admin");
    expect(result.current.role).toBe("eleve");
    expect(result.current.previewRole).toBe("eleve");
    expect(result.current.isRoleSimulated).toBe(true);
    expect(window.sessionStorage.getItem(ROLE_PREVIEW_STORAGE_KEY)).toBe("eleve");
    // Les écritures sont bloquées par défaut pendant la simulation
    expect(isSimulationWriteBlocked()).toBe(true);

    // Autoriser explicitement les écritures
    act(() => {
      result.current.setAllowSimulationWrites(true);
    });
    expect(result.current.allowSimulationWrites).toBe(true);
    expect(window.sessionStorage.getItem(ROLE_PREVIEW_ALLOW_WRITES_KEY)).toBe("true");
    expect(isSimulationWriteBlocked()).toBe(false);

    // Basculer en vue enseignant
    act(() => {
      result.current.setPreviewRole("enseignant");
    });
    expect(result.current.role).toBe("enseignant");
    expect(result.current.realRole).toBe("admin");
    expect(window.sessionStorage.getItem(ROLE_PREVIEW_STORAGE_KEY)).toBe("enseignant");

    // Retour au rôle réel Admin
    act(() => {
      result.current.setPreviewRole(null);
    });
    expect(result.current.role).toBe("admin");
    expect(result.current.isRoleSimulated).toBe(false);
    expect(window.sessionStorage.getItem(ROLE_PREVIEW_STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(ROLE_PREVIEW_ALLOW_WRITES_KEY)).toBeNull();
  });

  it("affiche le bandeau permanent « Vue élève simulée — quitter » et permet de quitter en un clic", async () => {
    window.sessionStorage.setItem(ROLE_PREVIEW_STORAGE_KEY, "eleve");

    render(
      <AuthProvider>
        <RolePreviewBanner />
        <UserProfileMenu />
      </AuthProvider>,
    );

    const banner = await screen.findByTestId("role-preview-banner");
    expect(banner).toHaveTextContent(/Vue élève simulée — quitter/i);

    const trigger = screen.getByTestId("user-profile-menu-trigger");
    expect(trigger).toHaveTextContent("Élève");

    // Clic sur le bouton Quitter la simulation
    const exitBtn = screen.getByTestId("role-preview-exit");
    fireEvent.click(exitBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("role-preview-banner")).toBeNull();
    });
    expect(trigger).toHaveTextContent("Admin");
  });

  it("ignore toute tentative de simulation pour un compte dont le rôle réel n'est pas admin", async () => {
    mockAuthState.userId = "u-eleve-99";
    mockAuthState.roles = [{ role: "eleve" }];
    window.sessionStorage.setItem(ROLE_PREVIEW_STORAGE_KEY, "enseignant");

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.realRole).toBe("eleve");
    expect(result.current.role).toBe("eleve");
    expect(result.current.isRoleSimulated).toBe(false);
    expect(window.sessionStorage.getItem(ROLE_PREVIEW_STORAGE_KEY)).toBeNull();

    act(() => {
      result.current.setPreviewRole("enseignant");
    });
    expect(result.current.role).toBe("eleve");
    expect(result.current.isRoleSimulated).toBe(false);
  });

  it("n'affiche jamais un badge « Élève » par défaut à l'admin pendant le chargement initial des droits (#189)", async () => {
    mockAuthState.delayRolesMs = 60;

    render(
      <AuthProvider>
        <UserProfileMenu />
      </AuthProvider>,
    );

    const trigger = await screen.findByTestId("user-profile-menu-trigger");
    // Pendant que user_roles est en cours de chargement, le badge ne doit pas afficher "Élève"
    expect(trigger.textContent).not.toContain("Élève");

    // Une fois résolu, il affiche directement "Admin"
    await waitFor(() => {
      expect(trigger.textContent).toContain("Admin");
    });
  });
});
