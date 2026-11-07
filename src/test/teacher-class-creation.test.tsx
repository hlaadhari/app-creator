import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClassesDb = vi.hoisted(() => ({
  rows: [] as Array<{
    id: string;
    nom: string;
    annee: string;
    archivee: boolean;
    created_at: string;
  }>,
  invitations: [] as Array<{
    id: string;
    class_id: string;
    code: string;
    expire_le: string;
    utilisations_max: number;
    nb_utilisations: number;
    revoque: boolean;
    created_at: string;
  }>,
  delayGetTeacherClasses: false,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/demo-mode", () => ({
  estModeDemo: () => false,
}));

vi.mock("@/lib/supabase/auth", () => ({
  useAuth: () => ({
    user: { id: "prof-1", email: "prof@lycee.tn" },
    profile: { id: "prof-1", nom: "Kallel", prenom: "Nadia" },
    role: "enseignant",
    authError: null,
    loading: false,
  }),
  useOptionalAuth: () => ({
    user: { id: "prof-1", email: "prof@lycee.tn" },
    profile: { id: "prof-1", nom: "Kallel", prenom: "Nadia" },
    role: "enseignant",
    authError: null,
    loading: false,
  }),
}));

vi.mock("@/components/AuthModal", () => ({
  AuthModal: () => <div data-testid="auth-modal-mock" />,
}));

vi.mock("@/components/tp/TpSessionManager", () => ({
  TpSessionManager: () => <div data-testid="tp-session-manager-mock" />,
}));

vi.mock("@/components/teacher/SubjectStudioTab", () => ({
  SubjectStudioTab: () => <div data-testid="subject-studio-mock" />,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "classes") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: mockClassesDb.delayGetTeacherClasses ? [] : [...mockClassesDb.rows],
                    error: null,
                  }),
              }),
            }),
          }),
          insert: (payload: { nom: string; annee: string; enseignant_id: string }) => ({
            select: () => ({
              single: () => {
                const created = {
                  id: "cls-new-1",
                  nom: payload.nom,
                  annee: payload.annee,
                  archivee: false,
                  created_at: "2026-11-07T18:00:00.000Z",
                };
                mockClassesDb.rows.unshift(created);
                return Promise.resolve({ data: created, error: null });
              },
            }),
          }),
        };
      }
      if (table === "class_invitations") {
        return {
          select: () => ({
            eq: (_col: string, classId: string) => ({
              order: () =>
                Promise.resolve({
                  data: mockClassesDb.invitations.filter((i) => i.class_id === classId),
                  error: null,
                }),
            }),
          }),
          insert: (payload: {
            class_id: string;
            code: string;
            expire_le: string;
            utilisations_max: number;
            nb_utilisations: number;
            revoque: boolean;
          }) => ({
            select: () => ({
              single: () => {
                const inv = {
                  id: "inv-new-1",
                  ...payload,
                  created_at: "2026-11-07T18:00:01.000Z",
                };
                mockClassesDb.invitations.unshift(inv);
                return Promise.resolve({ data: inv, error: null });
              },
            }),
          }),
        };
      }
      if (table === "class_members" || table === "class_sujets") {
        return {
          select: () => ({
            eq: () => ({
              is: () => Promise.resolve({ data: [], count: 0, error: null }),
              eq: () => Promise.resolve({ data: [], count: 0, error: null }),
            }),
          }),
        };
      }
      if (table === "contestations") {
        return {
          select: () => ({
            in: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
          in: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    },
  },
}));

import { TeacherDashboardPage } from "@/routes/enseignant";

describe("Création immédiate de classe sur /enseignant (Issue #193)", () => {
  beforeEach(() => {
    mockClassesDb.rows = [];
    mockClassesDb.invitations = [];
    mockClassesDb.delayGetTeacherClasses = false;
  });

  it("sélectionne la nouvelle classe, affiche son code d'invitation et ouvre les onglets sans rechargement (#193)", async () => {
    // Même si la relecture GET /classes accuse un retard, l'état local issu du POST 201 prend le relais
    mockClassesDb.delayGetTeacherClasses = true;

    render(<TeacherDashboardPage />);

    expect(await screen.findByText("Aucune classe pour l'instant")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Créer ma première classe/i }));

    const input = await screen.findByPlaceholderText(/Nom de la classe/i);
    fireEvent.change(input, { target: { value: "4ème SI - Pilote" } });
    fireEvent.click(screen.getByRole("button", { name: /^Créer la classe$/i }));

    // L'écran « Aucune classe pour l'instant » disparaît immédiatement
    await waitFor(() => {
      expect(screen.queryByText("Aucune classe pour l'instant")).toBeNull();
    });

    // La nouvelle classe est sélectionnée et les onglets s'affichent
    expect(screen.getByText("4ème SI - Pilote")).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Progression/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Invitations/i })).toBeTruthy();

    // Le code d'invitation généré automatiquement (STI-XXXX) est affiché immédiatement
    const codeBadge = await screen.findByTestId("active-class-invitation-code");
    expect(codeBadge.textContent).toMatch(/STI-[A-Z0-9]{4}/);
  });
});
