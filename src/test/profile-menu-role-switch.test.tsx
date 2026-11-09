import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthState = vi.hoisted(() => ({
  roles: [{ role: "admin" as "admin" | "enseignant" | "eleve" }],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: { user: { id: "u-1", email: "u1@labosti.tn" } } },
        }),
      getUser: () => Promise.resolve({ data: { user: { id: "u-1", email: "u1@labosti.tn" } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { id: "u-1", nom: "Laadhari", prenom: "Hatem" },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: mockAuthState.roles, error: null }),
          }),
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    },
  },
}));

import { AuthProvider, ROLE_PREVIEW_STORAGE_KEY } from "@/lib/supabase/auth";
import { UserProfileMenu } from "@/components/UserProfileMenu";

async function ouvrirMenu() {
  const trigger = await screen.findByTestId("user-profile-menu-trigger");
  await waitFor(() => expect(trigger.textContent).not.toContain("…"));
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.keyDown(trigger, { key: "Enter" });
}

describe("Menu profil : switch de vue (#239)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockAuthState.roles = [{ role: "admin" }];
  });

  it("propose les trois vues à l'admin et bascule en vue élève", async () => {
    render(
      <AuthProvider>
        <UserProfileMenu />
      </AuthProvider>,
    );
    await ouvrirMenu();

    expect(await screen.findByTestId("role-preview-option-admin")).toBeDefined();
    expect(screen.getByTestId("role-preview-option-enseignant")).toBeDefined();
    const eleve = screen.getByTestId("role-preview-option-eleve");
    fireEvent.click(eleve);

    await waitFor(() =>
      expect(window.sessionStorage.getItem(ROLE_PREVIEW_STORAGE_KEY)).toBe("eleve"),
    );
  });

  it("ne montre jamais le switch à un enseignant", async () => {
    mockAuthState.roles = [{ role: "enseignant" }];
    render(
      <AuthProvider>
        <UserProfileMenu />
      </AuthProvider>,
    );
    await ouvrirMenu();

    await screen.findByText(/Mon profil/i);
    expect(screen.queryByTestId("role-preview-section")).toBeNull();
  });

  it("ne contient plus les liens de navigation catalogue / cours / planning", async () => {
    render(
      <AuthProvider>
        <UserProfileMenu />
      </AuthProvider>,
    );
    await ouvrirMenu();

    await screen.findByText(/Mon profil/i);
    expect(screen.queryByText(/Catalogue des sujets/i)).toBeNull();
    expect(screen.queryByText(/Mémento & Cours STI/i)).toBeNull();
    expect(screen.queryByText(/Planning & Postes TP/i)).toBeNull();
  });
});
