/**
 * Labo STI - Test d'Unification du Moteur d'Évaluation (TEC-05 / Issue #127)
 *
 * Vérifie que pour l'ensemble des 10 sujets du catalogue :
 * - L'évaluation formative élève (evaluerCopie)
 * - Le banc didactique (testerSolutionReelle)
 * - Le rejouage officiel de snapshot (rejouerCorrectionReference)
 * produisent exactement le même score (note20, points obtenus, total points)
 * et le même verdict par critère.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentSubjects } from "@/lib/content/all-subjects";
import { evaluerCopie } from "@/lib/evaluation/evaluation-par-page";
import { testerSolutionReelle } from "@/lib/subjects/banc-didactique";
import { rejouerCorrectionReference } from "@/lib/snapshot/replay-engine";
import { scellerSnapshot } from "@/lib/snapshot/snapshot-engine";
import { evaluateurJsdom } from "./helpers/evaluateur-jsdom";

const CONTENT_DIR = path.resolve(process.cwd(), "content");

function lireSolution(sujetId: string): Record<string, string> {
  const dossier = path.join(CONTENT_DIR, sujetId, "solution");
  const fichiers: Record<string, string> = {};
  if (!fs.existsSync(dossier)) return fichiers;

  for (const nom of fs.readdirSync(dossier)) {
    const chemin = path.join(dossier, nom);
    if (fs.statSync(chemin).isFile()) {
      fichiers[nom] = fs.readFileSync(chemin, "utf-8");
    }
  }
  return fichiers;
}

describe("Unification du Moteur d'Évaluation (TEC-05 / Issue #127)", () => {
  it("les 10 sujets du catalogue sont tous référencés", () => {
    expect(contentSubjects.length).toBe(10);
  });

  it.each(contentSubjects.map((s) => s.id))(
    "sujet %s : concordance stricte formative vs banc didactique vs rejouage snapshot",
    async (sujetId) => {
      const sujet = contentSubjects.find((s) => s.id === sujetId);
      expect(sujet).toBeDefined();
      if (!sujet) return;

      const solutionFiles = lireSolution(sujetId);
      expect(Object.keys(solutionFiles).length).toBeGreaterThan(0);

      // 1. Évaluation formative (moteur élève)
      const formative = await evaluerCopie(
        sujet.criteria,
        solutionFiles,
        evaluateurJsdom(solutionFiles),
      );

      // 2. Banc didactique (testerSolutionReelle)
      const banc = await testerSolutionReelle(
        sujet.criteria,
        {
          id: `sol-${sujetId}`,
          nom: `Solution ${sujetId}`,
          type: "canonique",
          description: "",
          files: solutionFiles,
        },
        evaluateurJsdom,
      );

      // 3. Rejouage officiel d'un snapshot certifié
      const snapshot = await scellerSnapshot({
        sujetId,
        versionId: "v-test",
        eleveId: "eleve-unif-test",
        projetId: `proj-${sujetId}`,
        fichiers: solutionFiles,
      });

      const replay = await rejouerCorrectionReference({
        snapshot,
        fichiers: solutionFiles,
        criteres: sujet.criteria,
        evaluateurPour: evaluateurJsdom,
        baremeTotal: 20,
      });

      // Assertions de concordance stricte :
      // Note sur 20
      expect(banc.note20).toBe(formative.bilan.note20);
      expect(replay.grille.noteAuto20).toBe(formative.bilan.note20);

      // Points obtenus & total points
      expect(replay.grille.totalPointsAuto).toBe(formative.bilan.got);
      expect(replay.grille.totalPointsMax).toBe(formative.bilan.total);

      // Détail critère par critère
      expect(replay.grille.criteres.length).toBe(formative.resultats.length);
      for (let i = 0; i < formative.resultats.length; i++) {
        const resFormative = formative.resultats[i]!;
        const resReplay = replay.grille.criteres[i]!;

        expect(resReplay.critereId).toBe(resFormative.id);
        expect(resReplay.valide).toBe(resFormative.ok);
        expect(resReplay.pointsAuto).toBe(resFormative.ok ? resFormative.points : 0);
        expect(resReplay.pointsMax).toBe(resFormative.points);
      }
    },
  );
});
