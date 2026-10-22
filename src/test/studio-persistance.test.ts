import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: rpcMock },
}));

import {
  chargerVersionStudio,
  contenuPourServeur,
  enregistrerBrouillon,
  listerSujetsStudio,
  messageErreurStudio,
  versionDepuisServeur,
  type ContenuServeur,
  type VersionStudio,
} from "@/lib/supabase/studio";

const version: VersionStudio = {
  id: "v1",
  sujet_id: "tp-menu-01",
  numero: 1,
  titre: "Menu",
  niveau: "Moyen",
  duree_min: 40,
  competence: "HTML",
  enonce_md: "# Menu",
  publiee: false,
  criteres: [
    { id: "c1", titre: "Nav", points: 4, sonde: { type: "dom_selector", selector: "nav" } },
  ],
  indices: ["Utilisez <nav>"],
  fichiers_depart: { "index.html": "<body></body>" },
  solutions_test: [
    { id: "sol-canonique", nom: "A", type: "canonique", description: "", files: { "index.html": "<nav></nav>" } },
    { id: "sol-alternative", nom: "B", type: "alternative", description: "", files: { "index.html": "<nav/>" } },
    { id: "sol-invalide", nom: "C", type: "invalide", description: "", files: { "index.html": "" } },
  ],
};

beforeEach(() => rpcMock.mockReset());

describe("Studio : enregistrement des brouillons (issue #92)", () => {
  it("l'aller-retour serveur conserve toute la version", () => {
    const contenu = contenuPourServeur(version) as Record<string, unknown>;
    const retour = versionDepuisServeur({
      ...(contenu as unknown as ContenuServeur),
      version_id: "v1",
      numero: 1,
      publiee: false,
    });
    expect(retour).toEqual(version);
  });

  it("crée un sujet : _version_id nul et contenu complet", async () => {
    rpcMock.mockResolvedValue({ data: { version_id: "v9", numero: 1 }, error: null });
    await enregistrerBrouillon(version, true);
    expect(rpcMock).toHaveBeenCalledWith("studio_enregistrer_brouillon", {
      _version_id: null,
      _contenu: expect.objectContaining({ sujet_id: "tp-menu-01", titre: "Menu" }),
    });
  });

  it("met à jour un brouillon existant avec son identifiant de version", async () => {
    rpcMock.mockResolvedValue({ data: { version_id: "v1", numero: 1 }, error: null });
    await enregistrerBrouillon(version, false);
    expect(rpcMock.mock.calls[0]?.[1]).toMatchObject({ _version_id: "v1" });
  });

  it("traduit les erreurs serveur en messages clairs", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "identifiant_deja_utilise" } });
    await expect(enregistrerBrouillon(version, true)).rejects.toThrow("déjà utilisé");
    rpcMock.mockResolvedValue({ data: null, error: { message: "Version publiee immuable" } });
    await expect(chargerVersionStudio("v1")).rejects.toThrow("immuable");
    expect(messageErreurStudio("boom")).toContain("boom");
  });

  it("liste les sujets via la fonction serveur", async () => {
    rpcMock.mockResolvedValue({ data: [{ sujet_id: "x" }], error: null });
    await expect(listerSujetsStudio()).resolves.toEqual([{ sujet_id: "x" }]);
    expect(rpcMock).toHaveBeenCalledWith("studio_lister_sujets", undefined);
  });
});
