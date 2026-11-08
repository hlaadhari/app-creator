// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CriteriaEditor } from "@/components/teacher/CriteriaEditor";
import type { RawCriterion } from "@/lib/evaluation/critere-json";

describe("éditeur de critères par formulaire (#194)", () => {
  it("ajoute un critère vérifiable sans écrire de JSON", () => {
    const onChange = vi.fn();
    render(<CriteriaEditor criteres={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Ajouter un critère/ }));
    const [nouveaux] = onChange.mock.calls[0] as [RawCriterion[]];
    expect(nouveaux).toHaveLength(1);
    expect(nouveaux[0]).toMatchObject({ id: "c1", points: 1, sonde: { type: "dom_selector" } });
  });

  it("déclare un critère « corrigé par l'enseignant » et le retire de la vérification auto", () => {
    const onChange = vi.fn();
    const critere: RawCriterion = {
      id: "c1",
      titre: "Menu",
      points: 2,
      sonde: { type: "dom_selector", selector: "nav" },
    };
    render(<CriteriaEditor criteres={[critere]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Type de vérification du critère 1"), {
      target: { value: "aucune" },
    });
    const [nouveaux] = onChange.mock.calls[0] as [RawCriterion[]];
    expect(nouveaux[0]).toMatchObject({ correction: "enseignant" });
    expect(nouveaux[0]?.sonde).toBeUndefined();
  });
});
