import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const studio = vi.hoisted(() => ({
  listerSujetsStudio: vi.fn(),
  chargerVersionStudio: vi.fn(),
  enregistrerBrouillon: vi.fn(),
  supprimerBrouillon: vi.fn(),
}));
vi.mock("@/lib/supabase/studio", () => studio);

import { SubjectStudioTab } from "@/components/teacher/SubjectStudioTab";
import { erreurCriteres } from "@/components/teacher/CriteriaEditor";

beforeEach(() => {
  Object.values(studio).forEach((m) => m.mockReset());
  studio.listerSujetsStudio.mockResolvedValue([]);
});

describe("Écran du Studio (issue #92)", () => {
  it("affiche un message quand l'enseignant n'a encore aucun sujet", async () => {
    render(<SubjectStudioTab />);
    expect(await screen.findByText(/Aucun sujet pour le moment/)).toBeTruthy();
  });

  it("signale l'échec du chargement avec un bouton Réessayer", async () => {
    studio.listerSujetsStudio.mockRejectedValueOnce(new Error("Accès refusé"));
    render(<SubjectStudioTab />);
    expect(await screen.findByText(/Accès refusé/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();
  });

  it("crée un sujet puis l'enregistre comme brouillon via le serveur", async () => {
    studio.enregistrerBrouillon.mockResolvedValue({ version_id: "v1", numero: 1 });
    render(<SubjectStudioTab />);
    fireEvent.click(await screen.findByRole("button", { name: /Nouveau sujet/ }));

    fireEvent.change(screen.getByLabelText("Identifiant"), { target: { value: "tp-menu-01" } });
    fireEvent.change(screen.getByLabelText("Titre du sujet"), { target: { value: "Menu" } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer le brouillon/ }));

    await waitFor(() => expect(studio.enregistrerBrouillon).toHaveBeenCalledTimes(1));
    const [version, estNouveau] = studio.enregistrerBrouillon.mock.calls[0] as [
      { sujet_id: string; titre: string },
      boolean,
    ];
    expect(estNouveau).toBe(true);
    expect(version).toMatchObject({ sujet_id: "tp-menu-01", titre: "Menu" });
    expect(await screen.findByText("Brouillon enregistré.")).toBeTruthy();
  });

  it("affiche l'erreur du serveur sans perdre la saisie", async () => {
    studio.enregistrerBrouillon.mockRejectedValue(
      new Error("Cet identifiant de sujet est déjà utilisé."),
    );
    render(<SubjectStudioTab />);
    fireEvent.click(await screen.findByRole("button", { name: /Nouveau sujet/ }));
    fireEvent.change(screen.getByLabelText("Titre du sujet"), { target: { value: "Menu" } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer le brouillon/ }));

    expect(await screen.findByText(/déjà utilisé/)).toBeTruthy();
    expect((screen.getByLabelText("Titre du sujet") as HTMLInputElement).value).toBe("Menu");
  });

  it("verrouille une version publiée : aucun bouton d'enregistrement", async () => {
    studio.listerSujetsStudio.mockResolvedValue([
      {
        sujet_id: "s",
        titre: "Publié",
        niveau: "Facile",
        version_id: "v",
        numero: 2,
        publiee: true,
        updated_at: "",
      },
    ]);
    studio.chargerVersionStudio.mockResolvedValue({
      id: "v",
      sujet_id: "s",
      numero: 2,
      titre: "Publié",
      niveau: "Facile",
      duree_min: 30,
      enonce_md: "",
      publiee: true,
      criteres: [],
      indices: [],
      fichiers_depart: {},
      solutions_test: [],
    });
    render(<SubjectStudioTab />);
    fireEvent.click(await screen.findByRole("button", { name: "Consulter" }));
    expect(await screen.findByText(/publiée \(immuable\)/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Enregistrer le brouillon/ })).toBeNull();
  });
});

describe("Validation des critères saisis en JSON", () => {
  it("accepte une liste valide", () => {
    expect(erreurCriteres([{ id: "a", titre: "A", points: 2 }])).toBeNull();
  });
  it("refuse ce qui n'est pas une liste, un id/titre manquant, des points invalides et les doublons", () => {
    expect(erreurCriteres({})).toMatch(/liste/);
    expect(erreurCriteres([{ titre: "A", points: 1 }])).toMatch(/id/);
    expect(erreurCriteres([{ id: "a", points: 1 }])).toMatch(/titre/);
    expect(erreurCriteres([{ id: "a", titre: "A", points: -1 }])).toMatch(/points/);
    expect(
      erreurCriteres([
        { id: "a", titre: "A", points: 1 },
        { id: "a", titre: "B", points: 1 },
      ]),
    ).toMatch(/deux fois/);
  });
});
