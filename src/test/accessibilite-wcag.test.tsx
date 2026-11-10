import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    params?: unknown;
    className?: string;
  }) => (
    <a href={to} data-params={JSON.stringify(params)} className={className}>
      {children}
    </a>
  ),
  useParams: () => ({ id: "ex-html-css-01" }),
}));

import { CourseSearch } from "@/components/course/CourseSearch";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import { WorkspaceFileTree } from "@/components/workspace/WorkspaceFileTree";
import { SyncStatusBar } from "@/components/workspace/SyncStatusBar";

describe("Issue #135 (UX-03) — Accessibilité WCAG 2.1 AA : Composants & Champs", () => {
  it("CourseSearch possède un aria-label sur l'input et sur le bouton d'effacement", () => {
    const { rerender } = render(<CourseSearch value="" onChange={() => {}} />);
    const input = screen.getByLabelText("Rechercher une notion dans le cours");
    expect(input).toBeInTheDocument();
    expect(input.getAttribute("placeholder")).toContain("Rechercher");

    // Avec une valeur, le bouton d'effacement apparaît avec aria-label
    rerender(<CourseSearch value="mysqli" onChange={() => {}} />);
    const clearBtn = screen.getByRole("button", { name: "Effacer la recherche" });
    expect(clearBtn).toBeInTheDocument();
  });

  it("CourseSidebar possède un aria-label sur le champ de recherche et le bouton d'effacement", () => {
    const { rerender } = render(
      <CourseSidebar
        activeModuleId="html5"
        onSelectModule={() => {}}
        searchQuery=""
        onSearchChange={() => {}}
      />,
    );
    const input = screen.getByLabelText("Rechercher dans le sommaire du cours");
    expect(input).toBeInTheDocument();

    rerender(
      <CourseSidebar
        activeModuleId="html5"
        onSelectModule={() => {}}
        searchQuery="table"
        onSearchChange={() => {}}
      />,
    );
    const clearBtn = screen.getByRole("button", {
      name: "Effacer la recherche dans le sommaire",
    });
    expect(clearBtn).toBeInTheDocument();
  });

  it("WorkspaceFileTree possède des libellés accessibles sur le bouton d'upload et l'input file", () => {
    render(
      <WorkspaceFileTree
        files={{
          "index.html": {
            name: "index.html",
            content: "<h1>Test</h1>",
            type: "text",
          },
        }}
        activeFile="index.html"
        onSelectFile={() => {}}
        onAddFile={() => {}}
        onDeleteFile={() => {}}
        folderName="Travail_Eleve/SW_01"
      />,
    );
    const uploadBtn = screen.getByRole("button", { name: "Importer des fichiers locaux" });
    expect(uploadBtn).toBeInTheDocument();

    const fileInput = screen.getByLabelText("Sélectionner des fichiers à importer");
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.getAttribute("type")).toBe("file");
  });

  it("SyncStatusBar possède des libellés accessibles sur les boutons d'action (conflit et erreur)", () => {
    const { rerender } = render(
      <SyncStatusBar
        status="conflict"
        rev={2}
        lastSavedAt={Date.now()}
        cursorPos={{ line: 1, col: 1 }}
        activeFileName="index.html"
      />,
    );
    const conflictBtn = screen.getByRole("button", {
      name: "Résoudre le conflit de révision",
    });
    expect(conflictBtn).toBeInTheDocument();

    rerender(
      <SyncStatusBar
        status="error"
        rev={2}
        lastSavedAt={Date.now()}
        cursorPos={{ line: 1, col: 1 }}
        activeFileName="index.html"
      />,
    );
    const errorBtn = screen.getByRole("button", {
      name: "Réessayer la synchronisation",
    });
    expect(errorBtn).toBeInTheDocument();
  });
});

describe("Issue #135 (UX-03) — Conformité sémantique des Routes (h1, main, aria-live)", () => {
  it("la route '/' contient un h1 sémantique et le repère <main>", () => {
    const indexPath = path.resolve(process.cwd(), "src", "routes", "index.tsx");
    const content = fs.readFileSync(indexPath, "utf-8");

    // Repère main et h1 sémantique
    expect(content).toContain("<main");
    expect(content).toContain("</main>");
    expect(content).toContain("<h1");

    // Boutons d'en-tête avec aria-label explicite pour mobile
    expect(content).toContain('aria-label="Guide de démarrage"');

    // Le bouton Mémento vit désormais dans l'en-tête partagé (#241)
    const headerPath = path.resolve(process.cwd(), "src", "components", "layout", "AppHeader.tsx");
    expect(fs.readFileSync(headerPath, "utf-8")).toContain('ariaLabel: "Mémento STI"');
  });

  it("la route '/cours' contient un h1 sémantique, un repère <main> unique et des aria-labels", () => {
    const coursPath = path.resolve(process.cwd(), "src", "routes", "cours.tsx");
    const content = fs.readFileSync(coursPath, "utf-8");

    // h1 sémantique pour le titre du cours
    expect(content).toContain("<h1");
    expect(content).toContain("Carnet STI-BAC INFO");

    // Repère main
    expect(content).toContain("<main");
    expect(content).toContain("</main>");

    // Boutons avec aria-label
    expect(content).toContain('aria-label="Fermer le menu"');
  });

  it("la route '/sujet/$id' contient un h1, un repère <main>, une région aria-live et le bandeau mobile", () => {
    // Le workspace est découpé (#242) : la route délègue à WorkspaceShell et WorkspaceHeader.
    const content = [
      path.resolve(process.cwd(), "src", "routes", "sujet.$id.tsx"),
      path.resolve(process.cwd(), "src", "components", "workspace", "WorkspaceShell.tsx"),
      path.resolve(process.cwd(), "src", "components", "workspace", "WorkspaceHeader.tsx"),
    ]
      .map((chemin) => fs.readFileSync(chemin, "utf-8"))
      .join("\n");

    // h1 sémantique
    expect(content).toContain("<h1");

    // Repère main englobant les 3 panneaux
    expect(content).toContain("<main");
    expect(content).toContain("</main>");

    // Région aria-live="polite" pour annonces d'accessibilité (sauvegarde et note)
    expect(content).toContain('aria-live="polite"');
    expect(content).toContain('role="status"');
    expect(content).toContain("accessibilityMessage");

    // Bandeau consultation / révision pour petits écrans < 1024px
    expect(content).toContain("lg:hidden");
    expect(content).toContain("Mode consultation");
    expect(content).toContain("Écran ≥ 1024 px recommandé");
  });
});
