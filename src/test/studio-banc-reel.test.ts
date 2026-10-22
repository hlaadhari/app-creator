import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import criteresJs from "../../content/ex-js-01/criteria.json";
import { critereDepuisJson, type RawCriterion } from "@/lib/evaluation/critere-json";
import { construireDocumentEvaluation } from "@/lib/evaluation/document-evaluation";
import { runCriteria } from "@/lib/exercises";
import { validerBancDidactiqueReel, type FabriqueEvaluateur } from "@/lib/subjects/banc-didactique";
import type { ValidationSolution } from "@/lib/subjects/subject-studio";

const lire = (variante: "initial" | "solution") => {
  const dossier = path.resolve(process.cwd(), "content", "ex-js-01", variante);
  return Object.fromEntries(
    fs.readdirSync(dossier).map((nom) => [nom, fs.readFileSync(path.join(dossier, nom), "utf-8")]),
  );
};

// Évaluation d'une page avec exécution des scripts, comme la frame de l'application.
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

const criteres = (criteresJs as unknown as RawCriterion[]).map(critereDepuisJson);

const solution = (
  id: string,
  type: ValidationSolution["type"],
  files: Record<string, string>,
): ValidationSolution => ({ id, nom: id, type, description: "", files });

const canonique = solution("A", "canonique", lire("solution"));
const alternative = solution("B", "alternative", {
  ...lire("solution"),
  "controle.js": `function verif() {
  var c = document.getElementById("cin");
  return !!c && /^[0-9]{8}$/.test(c.value.trim());
}`,
});
const invalide = solution("C", "invalide", lire("initial"));

describe("Banc didactique du Studio : même moteur que les élèves (issue #90)", () => {
  it("accepte 2 solutions valides et 1 invalide, scripts de la solution exécutés", async () => {
    const rapport = await validerBancDidactiqueReel(
      criteres,
      [canonique, alternative, invalide],
      evaluateurPour,
    );
    expect(rapport.errors).toEqual([]);
    expect(rapport.readyToPublish).toBe(true);
    expect(rapport.results.find((r) => r.type === "canonique")?.scorePct).toBe(100);
    expect(rapport.results.find((r) => r.type === "invalide")?.scorePct).toBeLessThan(100);
  });

  it("refuse une solution « alternative » dont le JavaScript est faux", async () => {
    const cassee = solution("B", "alternative", {
      ...lire("solution"),
      "controle.js": "function verif() { return true; }",
    });
    const rapport = await validerBancDidactiqueReel(
      criteres,
      [canonique, cassee, invalide],
      evaluateurPour,
    );
    expect(rapport.alternativePassed).toBe(false);
    expect(rapport.readyToPublish).toBe(false);
  });

  it("refuse une solution invalide qui obtient tous les points", async () => {
    const rapport = await validerBancDidactiqueReel(
      criteres,
      [canonique, alternative, solution("C", "invalide", lire("solution"))],
      evaluateurPour,
    );
    expect(rapport.invalideFailedAsExpected).toBe(false);
    expect(rapport.readyToPublish).toBe(false);
  });

  it("signale les solutions manquantes", async () => {
    const rapport = await validerBancDidactiqueReel(criteres, [canonique], evaluateurPour);
    expect(rapport.readyToPublish).toBe(false);
    expect(rapport.errors.join(" ")).toMatch(/Solution B.*manquante/);
    expect(rapport.errors.join(" ")).toMatch(/Solution C.*manquante/);
  });

  it("bloque la publication d'un critère sans vérification automatique réelle", async () => {
    const sansSonde = critereDepuisJson({ id: "x", titre: "Critère libre", points: 2 });
    const rapport = await validerBancDidactiqueReel(
      [...criteres, sansSonde],
      [canonique, alternative, invalide],
      evaluateurPour,
    );
    expect(rapport.readyToPublish).toBe(false);
    expect(rapport.errors.join(" ")).toContain("Critère libre");
  });
});
