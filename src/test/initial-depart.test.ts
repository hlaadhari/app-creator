import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { contentSubjects } from "@/lib/content/all-subjects";
import { construireDocumentEvaluation } from "@/lib/evaluation/document-evaluation";
import { evaluerParPage } from "@/lib/evaluation/evaluation-par-page";
import { runCriteria, score } from "@/lib/exercises";

/**
 * Garde « code de départ » (Issue #190) : le dossier initial/ ne doit pas gagner de points
 * au-delà du minimum documenté dans manifest.json (score_initial_attendu, 0 par défaut).
 *
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

describe("Garde du code de départ : initial/ obtient 0 et les corrigés valident le barème (#190)", () => {
  for (const s of contentSubjects) {
    it(`${s.id} : initial = 0, solutions valides = max, solution invalide < max`, async () => {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(CONTENT_DIR, s.id, "manifest.json"), "utf-8"),
      ) as { score_initial_attendu?: number; score_initial_justification?: string };
      const attendu = manifest.score_initial_attendu ?? 0;
      expect(attendu, `${s.id} : score_initial_attendu doit être 0 (#190)`).toBe(0);

      const fichiersInit = lireDossier(path.join(CONTENT_DIR, s.id, "initial"));
      expect(
        Object.keys(fichiersInit).length,
        `${s.id} : dossier initial/ manquant`,
      ).toBeGreaterThan(0);

      const resInit = await evaluerSujet(s.id, fichiersInit);
      expect(
        resInit.got,
        `${s.id} : le code de départ obtient ${resInit.got} point(s) (critères : ${resInit.reussis.join(", ") || "aucun"}), attendu 0 (#190).`,
      ).toBe(0);

      // Solution officielle = max vérifiable
      const fichiersSol = lireDossier(path.join(CONTENT_DIR, s.id, "solution"));
      const resSol = await evaluerSujet(s.id, fichiersSol);
      expect(resSol.verifiable, `${s.id} : aucun point vérifiable`).toBeGreaterThan(0);
      expect(resSol.got, `${s.id} : solution/ doit obtenir le max vérifiable`).toBe(
        resSol.verifiable,
      );

      // Solution alternative = max vérifiable
      const fichiersAlt = lireDossier(path.join(CONTENT_DIR, s.id, "solution-alt"));
      if (Object.keys(fichiersAlt).length > 0) {
        const resAlt = await evaluerSujet(s.id, fichiersAlt);
        expect(resAlt.got, `${s.id} : solution-alt/ doit obtenir le max vérifiable`).toBe(
          resAlt.verifiable,
        );
      }

      // Solution invalide < max vérifiable
      const fichiersInv = lireDossier(path.join(CONTENT_DIR, s.id, "solution-invalide"));
      if (Object.keys(fichiersInv).length > 0) {
        const resInv = await evaluerSujet(s.id, fichiersInv);
        expect(
          resInv.got,
          `${s.id} : solution-invalide/ doit obtenir strictement moins que le max`,
        ).toBeLessThan(resInv.verifiable);
      }
    });
  }
});
