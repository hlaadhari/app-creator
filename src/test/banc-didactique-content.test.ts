import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { contentSubjects } from "@/lib/content/all-subjects";
import { construireDocumentEvaluation } from "@/lib/evaluation/document-evaluation";
import { evaluerParPage } from "@/lib/evaluation/evaluation-par-page";
import { runCriteria, score } from "@/lib/exercises";

/**
 * Banc didactique obligatoire pour content/ (Issue #132 / PED-02 / AGENTS.md §3)
 * Vérifie que chaque sujet du catalogue possède :
 * - solution/ (corrigé de référence validé à 100 %)
 * - solution-alt/ (seconde solution valide distincte validée à 100 %)
 * - solution-invalide/ (solution comportant des erreurs ciblées échouant sur les critères prévus)
 */

const CONTENT_DIR = path.resolve(process.cwd(), "content");
type Fichiers = Record<string, string>;

function lireDossier(dossier: string): Fichiers {
  const fichiers: Fichiers = {};
  if (!fs.existsSync(dossier)) return fichiers;

  function explorer(courant: string) {
    for (const nom of fs.readdirSync(courant)) {
      const chemin = path.join(courant, nom);
      const stat = fs.statSync(chemin);
      if (stat.isDirectory()) {
        explorer(chemin);
      } else if (stat.isFile()) {
        const clef = path.relative(dossier, chemin).replace(/\\/g, "/");
        const contenu = fs.readFileSync(chemin, "utf-8");
        fichiers[clef] = contenu;
        // Alias direct si init.sql dans un sous-dossier ou à la racine
        if (nom === "init.sql") {
          fichiers["init.sql"] = contenu;
          fichiers["db/init.sql"] = contenu;
        }
      }
    }
  }

  explorer(dossier);
  return fichiers;
}

async function evaluerSujet(id: string, fichiers: Fichiers) {
  const sujet = contentSubjects.find((s) => s.id === id);
  if (!sujet) throw new Error(`Sujet introuvable : ${id}`);

  const resultats = await evaluerParPage(sujet.criteria, fichiers, async (page, criteres) => {
    const dom = new JSDOM(construireDocumentEvaluation(fichiers, page), {
      runScripts: "dangerously",
    });
    try {
      return runCriteria(criteres, dom.window.document, dom.window as never);
    } finally {
      dom.window.close();
    }
  });

  const bilan = score(resultats);
  return {
    ...bilan,
    reussis: resultats.filter((r) => r.ok).map((r) => r.id),
    echoues: resultats.filter((r) => !r.ok && r.automatique !== false).map((r) => r.id),
    manuels: resultats.filter((r) => r.automatique === false).map((r) => r.id),
  };
}

describe("PED-02: Banc didactique obligatoire pour content/ (Issue #132)", () => {
  const sujets = contentSubjects;

  it("vérifie que les 10 sujets possèdent physiquement les trois dossiers didactiques", () => {
    expect(sujets.length).toBeGreaterThanOrEqual(10);

    for (const s of sujets) {
      const dirSol = path.join(CONTENT_DIR, s.id, "solution");
      const dirAlt = path.join(CONTENT_DIR, s.id, "solution-alt");
      const dirInv = path.join(CONTENT_DIR, s.id, "solution-invalide");

      expect(fs.existsSync(dirSol), `Dossier solution manquant pour ${s.id}`).toBe(true);
      expect(fs.existsSync(dirAlt), `Dossier solution-alt manquant pour ${s.id}`).toBe(true);
      expect(fs.existsSync(dirInv), `Dossier solution-invalide manquant pour ${s.id}`).toBe(true);

      const fichiersSol = Object.keys(lireDossier(dirSol));
      const fichiersAlt = Object.keys(lireDossier(dirAlt));
      const fichiersInv = Object.keys(lireDossier(dirInv));

      expect(fichiersSol.length).toBeGreaterThan(0);
      expect(fichiersAlt.length).toBeGreaterThan(0);
      expect(fichiersInv.length).toBeGreaterThan(0);
    }
  });

  for (const s of contentSubjects) {
    describe(`Sujet ${s.id} : validation tripartite (solution, solution-alt, solution-invalide)`, () => {
      it("le corrigé officiel (solution/) obtient 100 % des points vérifiables", async () => {
        const fichiers = lireDossier(path.join(CONTENT_DIR, s.id, "solution"));
        const res = await evaluerSujet(s.id, fichiers);
        expect(res.got).toBe(res.verifiable);
        expect(res.echoues).toEqual([]);
      });

      it("la solution alternative (solution-alt/) obtient 100 % des points vérifiables", async () => {
        const fichiers = lireDossier(path.join(CONTENT_DIR, s.id, "solution-alt"));
        const res = await evaluerSujet(s.id, fichiers);
        expect(res.got).toBe(res.verifiable);
        expect(res.echoues).toEqual([]);
      });

      it("la solution invalide (solution-invalide/) échoue sur au moins un critère", async () => {
        const fichiers = lireDossier(path.join(CONTENT_DIR, s.id, "solution-invalide"));
        const res = await evaluerSujet(s.id, fichiers);
        expect(res.echoues.length).toBeGreaterThan(0);
        expect(res.got).toBeLessThan(res.total);
      });
    });
  }
});
