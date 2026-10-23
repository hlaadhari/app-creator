import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { erreurCriteres } from "@/components/teacher/CriteriaEditor";
import { critereDepuisJson } from "@/lib/evaluation/critere-json";
import { construireDocumentEvaluation } from "@/lib/evaluation/document-evaluation";
import { MESSAGE_CORRECTION_ENSEIGNANT, runCriteria, score, type Criterion } from "@/lib/exercises";
import { validerBancDidactiqueReel, type FabriqueEvaluateur } from "@/lib/subjects/banc-didactique";
import type { ValidationSolution } from "@/lib/subjects/subject-studio";

const evaluateurPour: FabriqueEvaluateur = (fichiers) => async (page, criteres) => {
  const dom = new JSDOM(construireDocumentEvaluation(fichiers, page), {
    runScripts: "dangerously",
  });
  try {
    return runCriteria(criteres, dom.window.document, dom.window as never);
  } finally {
    dom.window.close();
  }
};

const titre = {
  id: "c1",
  titre: "Un titre",
  points: 4,
  sonde: { type: "dom_selector", selector: "h1" },
};
const php = { id: "c2", titre: "Insertion PHP", points: 6, correction: "enseignant" };
const libre = { id: "c3", titre: "Sans vérification", points: 6 };

const sol = (type: ValidationSolution["type"], html: string): ValidationSolution => ({
  id: type,
  nom: type,
  type,
  description: "",
  files: { "index.html": html },
});
const solutions = [
  sol("canonique", "<h1>a</h1>"),
  sol("alternative", "<main><h1>b</h1></main>"),
  sol("invalide", "<p>rien</p>"),
];

describe("Critères « corrigés par l'enseignant » (issue #98)", () => {
  it("un critère déclaré manuel n'est jamais évalué automatiquement, même avec une sonde valide", () => {
    const c = critereDepuisJson({ ...titre, correction: "enseignant" });
    expect(c).toMatchObject({ automatique: false, manuel: true });

    const doc = new JSDOM("<h1>x</h1>").window.document;
    const [r] = runCriteria([c], doc, doc.defaultView as never);
    expect(r).toMatchObject({ ok: false, automatique: false, manuel: true });
    expect(r?.message).toBe(MESSAGE_CORRECTION_ENSEIGNANT);
  });

  it("ses points sont annoncés comme non vérifiables, jamais gagnés", () => {
    const criteres: Criterion[] = [critereDepuisJson(titre), critereDepuisJson(php)];
    const doc = new JSDOM("<h1>x</h1>").window.document;
    const bilan = score(runCriteria(criteres, doc, doc.defaultView as never));
    expect(bilan).toMatchObject({ got: 4, total: 10, verifiable: 4, nonVerifiable: 6 });
  });

  it("le banc accepte un sujet dont une partie est corrigée par l'enseignant", async () => {
    const rapport = await validerBancDidactiqueReel(
      [critereDepuisJson(titre), critereDepuisJson(php)],
      solutions,
      evaluateurPour,
    );
    expect(rapport.errors).toEqual([]);
    expect(rapport.readyToPublish).toBe(true);
  });

  it("le banc refuse toujours un critère sans vérification qui n'est pas déclaré manuel", async () => {
    const rapport = await validerBancDidactiqueReel(
      [critereDepuisJson(titre), critereDepuisJson(libre)],
      solutions,
      evaluateurPour,
    );
    expect(rapport.readyToPublish).toBe(false);
    expect(rapport.errors.join(" ")).toContain("Sans vérification");
  });

  it("le banc refuse un sujet entièrement corrigé à la main (rien à tester)", async () => {
    const rapport = await validerBancDidactiqueReel(
      [critereDepuisJson(php)],
      solutions,
      evaluateurPour,
    );
    expect(rapport.readyToPublish).toBe(false);
    expect(rapport.errors.join(" ")).toMatch(/Au moins un critère/);
  });

  it("la saisie JSON n'accepte que correction = « enseignant »", () => {
    expect(erreurCriteres([php])).toBeNull();
    expect(erreurCriteres([{ ...php, correction: "auto" }])).toMatch(/correction/);
  });
});
