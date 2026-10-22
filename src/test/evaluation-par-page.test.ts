import { describe, expect, it, vi } from "vitest";

import { construireDocumentEvaluation, pageParDefaut } from "@/lib/evaluation/document-evaluation";
import {
  evaluerParPage,
  grouperCriteresParPage,
  messagePageAbsente,
} from "@/lib/evaluation/evaluation-par-page";
import type { Criterion, Result } from "@/lib/exercises";

const critere = (id: string, fichier?: string, points = 1): Criterion => ({
  id,
  label: `Critère ${id}`,
  points,
  fail: "raté",
  ...(fichier ? { fichier } : {}),
  check: () => true,
});

const resultat = (c: Criterion, ok: boolean): Result => ({
  id: c.id,
  label: c.label,
  points: c.points,
  ok,
  automatique: true,
  message: ok ? "Validé" : "raté",
});

describe("Document d'évaluation par page (issue #86)", () => {
  const fichiers = {
    "index.html": "<h1>Accueil</h1>",
    "form.html": "<form id='f'></form>",
    "style.css": "h1 { color: red }",
    "script.js": "window.x = 1;",
  };

  it("choisit index.html comme page principale, sinon le premier .html", () => {
    expect(pageParDefaut(fichiers)).toBe("index.html");
    expect(pageParDefaut({ "location.html": "x", "autre.html": "y" })).toBe("location.html");
    expect(pageParDefaut({ "style.css": "x" })).toBe("index.html");
  });

  it("assemble la page demandée avec tous les styles et tous les scripts", () => {
    const doc = construireDocumentEvaluation(fichiers, "form.html");
    expect(doc).toContain("<form id='f'></form>");
    expect(doc).not.toContain("<h1>Accueil</h1>");
    expect(doc).toContain("h1 { color: red }");
    expect(doc).toContain("window.x = 1;");
  });

  it("sans page demandée, assemble la page principale", () => {
    expect(construireDocumentEvaluation(fichiers)).toContain("<h1>Accueil</h1>");
  });
});

describe("Évaluation des critères page par page (issue #86)", () => {
  const fichiers = {
    "index.html": "<h1>Accueil</h1>",
    "utilisateur.html": "<form></form>",
    "droit.html": "<form></form>",
  };

  it("regroupe les critères par page, la page principale par défaut", () => {
    const groupes = grouperCriteresParPage(
      [
        critere("a"),
        critere("b", "utilisateur.html"),
        critere("c", "index.html"),
        critere("d", "droit.html"),
      ],
      fichiers,
    );

    expect([...groupes.keys()]).toEqual(["index.html", "utilisateur.html", "droit.html"]);
    expect(groupes.get("index.html")?.map((c) => c.id)).toEqual(["a", "c"]);
  });

  it("évalue chaque page une seule fois et rend les résultats dans l'ordre d'origine", async () => {
    const criteres = [
      critere("a", "utilisateur.html"),
      critere("b"),
      critere("c", "utilisateur.html"),
      critere("d", "droit.html"),
    ];
    const evaluerPage = vi.fn(async (_page: string, groupe: Criterion[]) =>
      groupe.map((c) => resultat(c, c.id !== "c")),
    );

    const resultats = await evaluerParPage(criteres, fichiers, evaluerPage);

    expect(evaluerPage).toHaveBeenCalledTimes(3);
    expect(evaluerPage.mock.calls.map(([page]) => page)).toEqual([
      "utilisateur.html",
      "index.html",
      "droit.html",
    ]);
    expect(resultats.map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
    expect(resultats.map((r) => r.ok)).toEqual([true, true, false, true]);
  });

  it("transmet à chaque page uniquement ses propres critères", async () => {
    const vus: Record<string, string[]> = {};
    await evaluerParPage(
      [critere("a", "utilisateur.html"), critere("b", "droit.html")],
      fichiers,
      async (page, groupe) => {
        vus[page] = groupe.map((c) => c.id);
        return groupe.map((c) => resultat(c, true));
      },
    );
    expect(vus).toEqual({ "utilisateur.html": ["a"], "droit.html": ["b"] });
  });

  it("ne valide jamais un critère dont la page est absente du projet de l'élève", async () => {
    const evaluerPage = vi.fn(async (_p: string, g: Criterion[]) =>
      g.map((c) => resultat(c, true)),
    );

    const resultats = await evaluerParPage(
      [critere("a", "affichage.html", 2), critere("b")],
      fichiers,
      evaluerPage,
    );

    expect(resultats[0]).toMatchObject({
      id: "a",
      ok: false,
      points: 2,
      message: messagePageAbsente("affichage.html"),
    });
    expect(resultats[1]?.ok).toBe(true);
    expect(evaluerPage).toHaveBeenCalledTimes(1);
  });

  it("propage une erreur d'évaluation au lieu de valider silencieusement", async () => {
    await expect(
      evaluerParPage([critere("a")], fichiers, async () => {
        throw new Error("frame inaccessible");
      }),
    ).rejects.toThrow("frame inaccessible");
  });
});
