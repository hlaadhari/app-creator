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

describe("Garde du code de départ : initial/ ne doit pas gagner de points non documentés (#190)", () => {
  for (const s of contentSubjects) {
    it(`${s.id} : le squelette obtient exactement le minimum documenté`, async () => {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(CONTENT_DIR, s.id, "manifest.json"), "utf-8"),
      ) as { score_initial_attendu?: number; score_initial_justification?: string };
      const attendu = manifest.score_initial_attendu ?? 0;

      const fichiers = lireDossier(path.join(CONTENT_DIR, s.id, "initial"));
      expect(Object.keys(fichiers).length, `${s.id} : dossier initial/ manquant`).toBeGreaterThan(
        0,
      );

      const res = await evaluerSujet(s.id, fichiers);
      expect(
        res.got,
        `${s.id} : le code de départ obtient ${res.got} point(s) (critères : ${res.reussis.join(", ") || "aucun"}), ` +
          `le minimum documenté est ${attendu}. Corrigez les critères ou documentez score_initial_attendu.`,
      ).toBe(attendu);

      if (attendu > 0) {
        expect(
          manifest.score_initial_justification,
          `${s.id} : un score de départ non nul doit être justifié (score_initial_justification)`,
        ).toBeTruthy();
        expect(
          res.got / res.total,
          `${s.id} : le départ ne doit pas dépasser 20 %`,
        ).toBeLessThanOrEqual(0.2);
      }
    });
  }
});
