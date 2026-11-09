import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { RelationalDatabaseEngine } from "@/lib/sql/relational-engine";
import { evaluerCopieEcrite } from "@/lib/evaluator/written/written-exam-evaluator";
import {
  examBac2025Principale,
  getWrittenExam,
  getAllWrittenExams,
} from "@/lib/content/written-subjects";

const EXAM_DIR = path.resolve(process.cwd(), "content/exam-bac2025-principale-ecrit");

describe("Bac STI 2025 Session Principale - Épreuve Écrite STI (Issue #204)", () => {
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
      const exam = getWrittenExam("exam-bac2025-principale-ecrit");
      expect(exam).toBeDefined();
      expect(exam?.id).toBe("exam-bac2025-principale-ecrit");
      expect(exam?.exam_mode).toBe(true);
      expect(exam?.bareme_total).toBe(20);
      expect(exam?.duration).toBe(180);
      expect(exam?.sections).toHaveLength(9);

      const all = getAllWrittenExams();
      expect(all.some((e) => e.id === "exam-bac2025-principale-ecrit")).toBe(true);
    });

    it("possède l'ensemble des fichiers obligatoires", () => {
      expect(fs.existsSync(path.join(EXAM_DIR, "manifest.json"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "enonce.md"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "criteria.json"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "COUVERTURE.md"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "db", "init.sql"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "solution", "reponses.json"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "solution", "reponses.sql"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "solution-alt", "reponses.json"))).toBe(true);
      expect(fs.existsSync(path.join(EXAM_DIR, "solution-invalide", "reponses.json"))).toBe(true);
    });

    it("la somme des barèmes des sections et des critères fait exactement 20.0 points", () => {
      const totalPointsSections = examBac2025Principale.sections.reduce(
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
      for (const t of [
        "type_manif",
        "manifestation",
        "halle",
        "stand",
        "client",
        "location",
        "evaluation",
      ]) {
        expect(tables).toContain(t);
      }
      expect(engine.getTableRows("stand")).toHaveLength(7);
      expect(engine.getTableRows("location")).toHaveLength(8);
    });
  });

  describe("3. Évaluation Automatisée de la Solution Officielle (20/20)", () => {
    it("obtient 20/20 avec 100% de réussite sur solution/reponses.json", async () => {
      const report = await evaluerCopieEcrite(examBac2025Principale, solutionReponses, initSql);

      for (const section of report.sections) {
        for (const item of section.items) {
          if (!item.isCorrect) {
            console.log(
              "FAILED ITEM OFFICIAL:",
              item.questionId,
              item.feedback,
              "ANSWER:",
              item.studentAnswer,
            );
          }
        }
      }

      expect(report.examId).toBe("exam-bac2025-principale-ecrit");
      expect(report.totalScore).toBe(20);
      expect(report.baremeTotal).toBe(20);
      expect(report.percentage).toBe(100);
      expect(report.passed).toBe(true);

      for (const section of report.sections) {
        expect(section.pointsEarned).toBe(section.pointsMax);
        for (const item of section.items) {
          if (!item.isCorrect) {
            console.log("FAILED ITEM:", item.questionId, item.feedback, item.studentAnswer);
          }
          expect(item.isCorrect).toBe(true);
          expect(item.pointsEarned).toBe(item.pointsMax);
        }
      }
    });
  });

  describe("4. Évaluation Automatisée de la Solution Alternative (20/20)", () => {
    it("obtient 20/20 avec 100% de réussite sur solution-alt/reponses.json", async () => {
      const report = await evaluerCopieEcrite(examBac2025Principale, solutionAltReponses, initSql);

      for (const section of report.sections) {
        for (const item of section.items) {
          if (!item.isCorrect) {
            console.log(
              "FAILED ITEM ALT:",
              item.questionId,
              item.feedback,
              "ANSWER:",
              item.studentAnswer,
            );
          }
        }
      }

      expect(report.examId).toBe("exam-bac2025-principale-ecrit");
      expect(report.totalScore).toBe(20);
      expect(report.baremeTotal).toBe(20);
      expect(report.percentage).toBe(100);
      expect(report.passed).toBe(true);

      for (const section of report.sections) {
        expect(section.pointsEarned).toBe(section.pointsMax);
        for (const item of section.items) {
          if (!item.isCorrect) {
            console.log("FAILED ITEM ALT:", item.questionId, item.feedback, item.studentAnswer);
          }
          expect(item.isCorrect).toBe(true);
          expect(item.pointsEarned).toBe(item.pointsMax);
        }
      }
    });
  });

  describe("5. Évaluation Automatisée de la Solution Invalide (< 20/20)", () => {
    it("obtient une note strictement inférieure à 20 points avec des erreurs identifiées", async () => {
      const report = await evaluerCopieEcrite(
        examBac2025Principale,
        solutionInvalideReponses,
        initSql,
      );

      expect(report.examId).toBe("exam-bac2025-principale-ecrit");
      expect(report.totalScore).toBeLessThan(20);
      expect(report.passed).toBe(false);

      const hasIncorrectItems = report.sections.some((s) => s.items.some((i) => !i.isCorrect));
      expect(hasIncorrectItems).toBe(true);
    });
  });

  describe("6. Cohérence du banc didactique", () => {
    it("la copie vierge (initial/) ne rapporte aucun point", async () => {
      const initial = JSON.parse(
        fs.readFileSync(path.join(EXAM_DIR, "initial", "reponses.json"), "utf-8"),
      );
      const report = await evaluerCopieEcrite(examBac2025Principale, initial, initSql);
      expect(report.totalScore).toBe(0);
    });

    it("la solution invalide garde des points partiels mais échoue sur des erreurs ciblées", async () => {
      const report = await evaluerCopieEcrite(
        examBac2025Principale,
        solutionInvalideReponses,
        initSql,
      );
      expect(report.totalScore).toBeGreaterThan(0);
      const faux = new Set(
        report.sections.flatMap((s) =>
          s.items.filter((i) => !i.isCorrect).map((i) => i.questionId),
        ),
      );
      for (const id of ["A1-VF-1", "A2-1", "A3-Q2", "A3-Q8", "A4-R-1", "B1-Q2-A", "B4-Q8"]) {
        expect(faux.has(id), id).toBe(true);
      }
    });

    it("les requêtes du sujet donnent les résultats attendus sur le jeu d'essai", () => {
      const engine = new RelationalDatabaseEngine();
      expect(engine.executeScript(initSql).success).toBe(true);
      const colonne = (sql: string): string[] => {
        const res = engine.query(sql);
        expect(res.error, sql).toBeUndefined();
        return res.rows.map((r) => String(Object.values(r)[0])).sort();
      };
      expect(
        colonne("SELECT codeManif FROM Manifestation WHERE DATEDIFF(dateFer, dateOuv) < 5"),
      ).toEqual(["M0002", "M0003"]);
      expect(
        colonne(
          "SELECT designation FROM Stand WHERE codeStand NOT IN (SELECT codeStand FROM Location WHERE YEAR(dateLoc) = 2025)",
        ),
      ).toEqual(["Stand Delta", "Stand Zeta"]);
      expect(
        colonne(
          "SELECT M.codeManif FROM Manifestation M, Location L WHERE M.codeManif = L.codeManif GROUP BY M.codeManif HAVING SUM(prix) > 10000",
        ),
      ).toEqual(["M0001"]);
      expect(
        colonne(
          "SELECT S.codeStand FROM Stand S, Location L WHERE S.codeStand = L.codeStand AND prix = (SELECT MAX(prix) FROM Location)",
        ),
      ).toEqual(["S03"]);
      expect(
        colonne(
          "SELECT codeStand FROM Stand S, Halle H WHERE S.codeHalle = H.codeHalle AND libHalle = 'Halle A' AND etat = 'L'",
        ),
      ).toEqual(["S01", "S02", "S03"]);
    });

    it("la baisse de 15 % de M0001 est calculée correctement", () => {
      const engine = new RelationalDatabaseEngine();
      expect(engine.executeScript(initSql).success).toBe(true);
      expect(
        engine.executeScript("UPDATE Location SET prix = prix * 0.85 WHERE codeManif = 'M0001';")
          .success,
      ).toBe(true);
      const prix = (stand: string): number =>
        Number(
          engine
            .getTableRows("location")
            .find((r) => r["codemanif"] === "M0001" && r["codestand"] === stand)?.["prix"],
        );
      expect([prix("S01"), prix("S02"), prix("S03")]).toEqual([2550, 3400, 4420]);
    });
  });
});
