import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const studio = vi.hoisted(() => ({
  listerSujetsStudio: vi.fn(),
  chargerVersionStudio: vi.fn(),
  enregistrerBrouillon: vi.fn(),
  supprimerBrouillon: vi.fn(),
  publierVersionStudio: vi.fn(),
  creerNouvelleVersionStudio: vi.fn(),
}));
vi.mock("@/lib/supabase/studio", () => studio);

const banc = vi.hoisted(() => ({ validerBancDidactiqueReel: vi.fn() }));
vi.mock("@/lib/subjects/banc-didactique", () => banc);

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

import { SubjectStudioTab } from "@/components/teacher/SubjectStudioTab";
import { chargerSujetPublie, exerciceDepuisSujetPublie } from "@/lib/supabase/sujets-publies";

const resume = (publiee: boolean) => ({
  sujet_id: "tp-menu-01",
  titre: "Menu",
  niveau: "Facile",
  version_id: "v1",
  numero: 1,
  publiee,
  updated_at: "",
});

const version = (publiee: boolean, numero = 1) => ({
  id: `v${numero}`,
  sujet_id: "tp-menu-01",
  numero,
  titre: "Menu",
  niveau: "Facile" as const,
  duree_min: 30,
  enonce_md: "# Menu",
  publiee,
  criteres: [],
  indices: [],
  fichiers_depart: { "index.html": "<body></body>" },
  solutions_test: [],
});

const rapportPret = {
  readyToPublish: true,
  canoniquePassed: true,
  alternativePassed: true,
  invalideFailedAsExpected: true,
  results: [{ type: "canonique", success: true, criteresPasses: 1, totalCriteres: 1 }],
  errors: [],
  validatedAt: 1_700_000_000_000,
};

beforeEach(() => {
  Object.values(studio).forEach((m) => m.mockReset());
  banc.validerBancDidactiqueReel.mockReset();
  rpc.mockReset();
});

describe("Studio : publication et nouvelle version (issue #94)", () => {
  it("bloque la publication tant que le banc n'est pas validé", async () => {
    studio.listerSujetsStudio.mockResolvedValue([resume(false)]);
    studio.chargerVersionStudio.mockResolvedValue(version(false));
    render(<SubjectStudioTab />);
    fireEvent.click(await screen.findByRole("button", { name: "Modifier" }));

    const publier = await screen.findByRole("button", { name: /Publier la version 1/ });
    expect((publier as HTMLButtonElement).disabled).toBe(true);
  });

  it("publie après banc validé et confirmation, puis relit la version publiée", async () => {
    studio.listerSujetsStudio.mockResolvedValue([resume(false)]);
    studio.chargerVersionStudio
      .mockResolvedValueOnce(version(false))
      .mockResolvedValueOnce(version(true));
    banc.validerBancDidactiqueReel.mockResolvedValue(rapportPret);
    studio.publierVersionStudio.mockResolvedValue({ version_id: "v1", numero: 1, sujet_id: "x" });

    render(<SubjectStudioTab />);
    fireEvent.click(await screen.findByRole("button", { name: "Modifier" }));
    fireEvent.click(await screen.findByRole("button", { name: /Lancer le banc didactique/ }));

    const publier = await screen.findByRole("button", { name: /Publier la version 1/ });
    await waitFor(() => expect((publier as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(publier);
    fireEvent.click(await screen.findByRole("button", { name: "Publier définitivement" }));

    await waitFor(() => expect(studio.publierVersionStudio).toHaveBeenCalledTimes(1));
    expect(studio.publierVersionStudio.mock.calls[0]).toEqual([
      "v1",
      expect.objectContaining({ ready: true }),
    ]);
    expect(await screen.findByText(/désormais immuable/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Créer la version 2/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Enregistrer le brouillon/ })).toBeNull();
  });

  it("n'affiche pas la version comme publiée quand le serveur refuse", async () => {
    studio.listerSujetsStudio.mockResolvedValue([resume(false)]);
    studio.chargerVersionStudio.mockResolvedValue(version(false));
    banc.validerBancDidactiqueReel.mockResolvedValue(rapportPret);
    studio.publierVersionStudio.mockRejectedValue(
      new Error("Publication refusée : il faut les 3 solutions de contrôle."),
    );

    render(<SubjectStudioTab />);
    fireEvent.click(await screen.findByRole("button", { name: "Modifier" }));
    fireEvent.click(await screen.findByRole("button", { name: /Lancer le banc didactique/ }));
    const publier = await screen.findByRole("button", { name: /Publier la version 1/ });
    await waitFor(() => expect((publier as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(publier);
    fireEvent.click(await screen.findByRole("button", { name: "Publier définitivement" }));

    expect(await screen.findByText(/3 solutions de contrôle/)).toBeTruthy();
    expect(screen.queryByText(/désormais immuable/)).toBeNull();
    expect(screen.getByRole("button", { name: /Enregistrer le brouillon/ })).toBeTruthy();
  });

  it("crée la version suivante à partir d'une version publiée", async () => {
    studio.listerSujetsStudio.mockResolvedValue([resume(true)]);
    studio.chargerVersionStudio
      .mockResolvedValueOnce(version(true))
      .mockResolvedValueOnce(version(false, 2));
    studio.creerNouvelleVersionStudio.mockResolvedValue({ version_id: "v2", numero: 2 });

    render(<SubjectStudioTab />);
    fireEvent.click(await screen.findByRole("button", { name: "Consulter" }));
    fireEvent.click(await screen.findByRole("button", { name: /Créer la version 2/ }));

    await waitFor(() =>
      expect(studio.creerNouvelleVersionStudio).toHaveBeenCalledWith("tp-menu-01"),
    );
    expect(await screen.findByText(/Brouillon v2/)).toBeTruthy();
  });
});

describe("Sujets publiés livrés aux élèves (issue #94)", () => {
  const serveur = {
    sujet_id: "tp-menu-01",
    version_id: "v1",
    numero: 1,
    titre: "Menu",
    niveau: "Moyen" as const,
    competence: "HTML",
    duree_min: 40,
    enonce_md: "# Menu\n\nCréez une navigation.",
    fichiers: { "index.html": "<body></body>", "menu.css": "" },
    criteres: [
      { id: "c1", titre: "Une nav", points: 4, sonde: { type: "dom_selector", selector: "nav" } },
      { id: "c2", titre: "Sans sonde", points: 2 },
    ],
  };

  it("construit un exercice complet avec critères exécutables", () => {
    const ex = exerciceDepuisSujetPublie(serveur);
    expect(ex).toMatchObject({
      id: "tp-menu-01",
      title: "Menu",
      level: "Moyen",
      bareme: 6,
      starter: serveur.fichiers,
      enonceMarkdown: serveur.enonce_md,
      hints: [],
    });
    expect(ex.criteria.map((c) => c.automatique)).toEqual([true, false]);

    const doc = new DOMParser().parseFromString("<nav></nav>", "text/html");
    expect(ex.criteria[0]?.check(doc, window)).toBe(true);
    // Un critère sans vérification réelle n'est jamais validé, même sur une page quelconque.
    expect(ex.criteria[1]?.check(doc, window)).toBe(false);
  });

  it("ne livre aucune solution ni indice : l'exercice n'en contient pas", () => {
    const ex = exerciceDepuisSujetPublie({
      ...serveur,
      solutions: [{ variante: "canonique" }],
      indices: ["secret"],
    } as never);
    expect(JSON.stringify(ex)).not.toContain("secret");
    expect(JSON.stringify(ex)).not.toContain("canonique");
  });

  it("renvoie null pour un sujet inconnu ou sans critère livrable", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await chargerSujetPublie("inconnu")).toBeNull();
    rpc.mockResolvedValueOnce({ data: { ...serveur, criteres: [] }, error: null });
    expect(await chargerSujetPublie("tp-menu-01")).toBeNull();
  });

  it("signale une erreur réseau au lieu de répondre « introuvable »", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "timeout" } });
    await expect(chargerSujetPublie("tp-menu-01")).rejects.toThrow("timeout");
  });
});
