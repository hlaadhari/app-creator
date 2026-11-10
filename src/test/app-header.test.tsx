import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({ role: null as null | "admin" | "enseignant" | "eleve" }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    "aria-current": ariaCurrent,
  }: {
    children: React.ReactNode;
    to: string;
    "aria-current"?: "page" | undefined;
  }) => (
    <a href={to} aria-current={ariaCurrent}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/AuthModal", () => ({
  AuthModal: () => <div data-testid="auth-modal" />,
}));
vi.mock("@/lib/supabase/auth", () => ({
  useAuth: () => ({ role: authState.role }),
}));

import { AppHeader } from "@/components/layout/AppHeader";

describe("AppHeader partagé (#241)", () => {
  beforeEach(() => {
    authState.role = null;
  });

  it("expose le repère banner, le lien d'évitement et la navigation élève", () => {
    render(<AppHeader current="cours" />);

    expect(screen.getByRole("banner")).toBeDefined();
    expect(screen.getByText("Aller au contenu").getAttribute("href")).toBe("#contenu-principal");
    expect(screen.getByLabelText("Catalogue des sujets")).toBeDefined();
    expect(screen.getByLabelText("Mémento STI")).toBeDefined();
    expect(screen.getByLabelText("Planning et Postes TP")).toBeDefined();
    expect(screen.queryByLabelText("Espace Enseignant")).toBeNull();
    expect(screen.queryByLabelText("Administration")).toBeNull();
    expect(screen.getByTestId("auth-modal")).toBeDefined();
  });

  it("marque la page courante avec aria-current", () => {
    render(<AppHeader current="calendrier" />);
    const lien = screen.getByLabelText("Planning et Postes TP").closest("a");
    expect(lien?.getAttribute("aria-current")).toBe("page");
    expect(screen.getByLabelText("Mémento STI").closest("a")?.getAttribute("aria-current")).toBe(
      null,
    );
  });

  it("affiche l'espace enseignant puis l'administration selon le rôle", () => {
    authState.role = "enseignant";
    const { unmount } = render(<AppHeader />);
    expect(screen.getByLabelText("Espace Enseignant")).toBeDefined();
    expect(screen.queryByLabelText("Administration")).toBeNull();
    unmount();

    authState.role = "admin";
    render(<AppHeader />);
    expect(screen.getByLabelText("Espace Enseignant")).toBeDefined();
    expect(screen.getByLabelText("Administration")).toBeDefined();
  });

  it("en démonstration, montre enseignant/admin et masque le menu profil", () => {
    render(<AppHeader demo />);
    expect(screen.getByLabelText("Espace Enseignant")).toBeDefined();
    expect(screen.getByLabelText("Administration")).toBeDefined();
    expect(screen.queryByTestId("auth-modal")).toBeNull();
  });

  it("rend les slots breadcrumb, center et actions", () => {
    render(
      <AppHeader
        breadcrumb={<span>Fil</span>}
        center={<span>Chrono</span>}
        actions={<span>Action</span>}
      />,
    );
    expect(screen.getByText("Fil")).toBeDefined();
    expect(screen.getByText("Chrono")).toBeDefined();
    expect(screen.getByText("Action")).toBeDefined();
  });

  it("aucune route n'écrit plus son propre <header> (hors workspace d'examen)", () => {
    const dir = path.resolve(process.cwd(), "src", "routes");
    const restants = readdirSync(dir)
      .filter((f) => f.endsWith(".tsx") && f !== "sujet.$id.tsx")
      .filter((f) => /<header[\s>]/.test(readFileSync(path.join(dir, f), "utf-8")));
    expect(restants).toEqual([]);
  });
});
