import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MobileBottomNav } from "@/components/workspace/MobileBottomNav";

describe("Workspace mobile : navigation du bas (#243)", () => {
  it("expose les quatre panneaux et marque le panneau actif", () => {
    render(<MobileBottomNav active="code" onSelect={vi.fn()} />);

    const nav = screen.getByRole("navigation", { name: "Navigation du workspace" });
    expect(nav.querySelectorAll("button")).toHaveLength(4);
    expect(
      screen
        .getByRole("button", { name: "Afficher l'éditeur de code" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByRole("button", { name: "Afficher l'énoncé du sujet" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("transmet le panneau choisi et affiche la note sur Résultats", () => {
    const onSelect = vi.fn();
    render(<MobileBottomNav active="sujet" onSelect={onSelect} resultBadge="14/20" />);

    expect(screen.getByText("14/20")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Afficher l'aperçu" }));
    expect(onSelect).toHaveBeenCalledWith("apercu");
  });

  it("le shell utilise h-dvh et plus h-screen", () => {
    const shell = readFileSync(
      path.resolve(process.cwd(), "src", "components", "workspace", "WorkspaceShell.tsx"),
      "utf-8",
    );
    expect(shell).toContain("h-dvh");
    expect(shell).not.toContain("h-screen");
  });
});
