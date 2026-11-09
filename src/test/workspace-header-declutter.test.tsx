import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SidebarTabButton } from "@/components/workspace/SidebarTabButton";
import { SubjectInfoPopover } from "@/components/workspace/SubjectInfoPopover";

describe("Workspace : en-tête désencombré (#240)", () => {
  it("le popover d'infos affiche référence, type et session après clic", async () => {
    render(
      <SubjectInfoPopover
        sujetId="exam-bac2025-droits-acces"
        typeSujet="annale_officielle"
        sessionAnnee={2025}
        baremeRepartition={null}
      />,
    );

    expect(screen.queryByTestId("subject-info-id")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Informations sur le sujet/i }));

    expect((await screen.findByTestId("subject-info-id")).textContent).toBe(
      "SW_exam-bac2025-droits-acces",
    );
    expect(screen.getByText("Annale officielle")).toBeDefined();
    expect(screen.getByText("2025")).toBeDefined();
  });

  it("le popover retombe sur l'identifiant brut pour un type inconnu", async () => {
    render(<SubjectInfoPopover sujetId="x" typeSujet="autre" baremeRepartition={null} />);
    fireEvent.click(screen.getByRole("button", { name: /Informations sur le sujet/i }));
    expect(await screen.findByText("autre")).toBeDefined();
  });

  it("l'onglet latéral expose son état actif et déclenche onClick", () => {
    const onClick = vi.fn();
    render(
      <SidebarTabButton
        active
        onClick={onClick}
        label="Sujet"
        ariaLabel="Afficher l'énoncé du sujet"
        icon={<span />}
        badge={<span>12/20</span>}
      />,
    );

    const bouton = screen.getByRole("button", { name: "Afficher l'énoncé du sujet" });
    expect(bouton.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("12/20")).toBeDefined();
    fireEvent.click(bouton);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
