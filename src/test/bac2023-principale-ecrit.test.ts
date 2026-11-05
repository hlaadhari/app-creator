import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { RelationalDatabaseEngine } from "@/lib/sql/relational-engine";
import { evaluerCopieEcrite } from "@/lib/evaluator/written/written-exam-evaluator";
import {
  examBac2023Principale,
  getWrittenExam,
  getAllWrittenExams,
} from "@/lib/content/written-subjects";

const EXAM_DIR = path.resolve(process.cwd(), "content/exam-bac2023-principale-ecrit");

describe("Bac STI 2023 Session Principale - Épreuve Écrite STI (Issue #175)", () => {
  const initSql = fs.readFileSync(path.join(EXAM_DIR, "db", "init.sql"), "utf-8");
  const solutionReponses = JSON.parse(
    fs.readFileSync(path.join(EXAM_DIR, "solution", "reponses.json"), "utf-8"),
  );
  const solutionAltReponses = JSON.parse(
    fs.readFileSync(path.join(EXAM_DIR, "solution-alt", "reponses.json"), "utf-8"),
  );
  const solutionInvalideReponses = JSON.parse(
    fs.readFileSync(path.join(EXAM_DIR, "solution-invalide", "reponses.json"), "utf-8"),
  );

  describe("1. Structure & Métadonnées de l'Épreuve Écrite", () => {
    it("l'épreuve est enregistrée dans written-subjects avec exam_mode: true et 20 points", () => {
      const exam = getWrittenExam("exam-bac2023-principale-ecrit");
      expect(exam).toBeDefined();
      expect(exam?.id).toBe("exam-bac2023-principale-ecrit");
      expect(exam?.exam_mode).toBe(true);
      expect(exam?.bareme_total).toBe(20);
      expect(exam?.duration).toBe(180);
      expect(exam?.sections).toHaveLength(5);

      const all = getAllWrittenExams();
      expect(all.some((e) => e.id === "exam-bac2023-principale-ecrit")).toBe(true);
    });

    it("possède l'ensemble des fichiers obligatoires", () => {
      expect(fs.existsSync(path.join(EXAM_DIR, "manifest.json"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "enonce.md"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "criteria.json"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "COUVERTURE.md"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "db", "init.sql"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "solution", "reponses.json"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "solution-alt", "reponses.json"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "solution-invalide", "reponses.json"))).toBe(true);
    });

    it("la somme des barèmes des sections et des critères fait exactement 20.0 points", () => {
      const totalPointsSections = examBac2023Principale.sections.reduce(
        (sum, s) => sum + (s.points ?? 0),
        0,
      );
      expect(totalPointsSections).toBe(20);

      const criteria = JSON.parse(fs.readFileSync(path.join(EXAM_DIR, "criteria.json"), "utf-8"));
      const totalPointsCriteria = criteria.reduce(
        (sum: number, c: { points: number }) => sum + c.points,
        0,
      );
      expect(totalPointsCriteria).toBe(20);
    });
  });

  describe("2. Base de Données Initiale & Schéma Relationnel", () => {
    it("initialise sans erreur toutes les tables avec RelationalDatabaseEngine", () => {
      const engine = new RelationalDatabaseEngine();
      const res = engine.executeScript(initSql);
      expect(res.success).toBe(true);
      expect(res.errors).toHaveLength(0);

      const tables = engine.getTableNames();
      expect(tables).toContain("plante");
      expect(tables).toContain("forme");
      expect(tables).toContain("medicament");
      expect(tables).toContain("composition");
      expect(tables).toContain("maladie");
      expect(tables).toContain("traitement");

      const meds = engine.getTableRows("medicament");
      expect(meds.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("3. Évaluation Automatisée de la Solution Officielle (20/20)", () => {
    it("obtient 20/20 avec 100% de réussite sur solution/reponses.json", async () => {
      const report = await evaluerCopieEcrite(examBac2023Principale, solutionReponses, initSql);

      expect(report.examId).toBe("exam-bac2023-principale-ecrit");
      expect(report.totalScore).toBe(20);
      expect(report.baremeTotal).toBe(20);
      expect(report.percentage).toBe(100);
      expect(report.passed).toBe(true);

      // Vérifie que chaque item a obtenu ses points complets
      for (const section of report.sections) {
        expect(section.pointsEarned).toBe(section.pointsMax);
        for (const item of section.items) {
          expect(item.isCorrect).toBe(true);
          expect(item.pointsEarned).toBe(item.pointsMax);
        }
      }
    });
  });

  describe("4. Évaluation Automatisée de la Solution Alternative (20/20)", () => {
    it("obtient également 20/20 avec les variantes de syntaxe SQL et minuscules", async () => {
      const report = await evaluerCopieEcrite(examBac2023Principale, solutionAltReponses, initSql);

      expect(report.totalScore).toBe(20);
      expect(report.percentage).toBe(100);
      expect(report.passed).toBe(true);
    });
  });

  describe("5. Évaluation Automatisée de la Solution Invalide (< 20)", () => {
    it("pénalise les réponses incorrectes et renvoie une note strictement inférieure à 20", async () => {
      const report = await evaluerCopieEcrite(
        examBac2023Principale,
        solutionInvalideReponses,
        initSql,
      );

      expect(report.totalScore).toBeLessThan(20);
      expect(report.percentage).toBeLessThan(100);

      const itemsInvalides = report.sections.flatMap((s) => s.items).filter((i) => !i.isCorrect);
      expect(itemsInvalides.length).toBeGreaterThanOrEqual(5);
    });
  });
});
