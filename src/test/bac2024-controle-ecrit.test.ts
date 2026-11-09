import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { RelationalDatabaseEngine } from "@/lib/sql/relational-engine";
import { evaluerCopieEcrite } from "@/lib/evaluator/written/written-exam-evaluator";
import {
  examBac2024Controle,
  getWrittenExam,
  getAllWrittenExams,
} from "@/lib/content/written-subjects";

const EXAM_DIR = path.resolve(process.cwd(), "content/exam-bac2024-controle-ecrit");

describe("Bac STI 2024 Session de Contrôle - Épreuve Écrite STI (Issue #202)", () => {
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
      const exam = getWrittenExam("exam-bac2024-controle-ecrit");
      expect(exam).toBeDefined();
      expect(exam?.id).toBe("exam-bac2024-controle-ecrit");
      expect(exam?.exam_mode).toBe(true);
      expect(exam?.bareme_total).toBe(20);
      expect(exam?.duration).toBe(180);
      expect(exam?.sections).toHaveLength(5);

      const all = getAllWrittenExams();
      expect(all.some((e) => e.id === "exam-bac2024-controle-ecrit")).toBe(true);
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
      const totalPointsSections = examBac2024Controle.sections.reduce(
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
        "poubelle",
        "remplissage",
        "agent",
        "collecte",
        "proprietaire",
        "chaine",
        "video",
        "tag",
        "videostag",
        "utilisateur",
        "visualisation",
      ]) {
        expect(tables).toContain(t);
      }
      expect(engine.getTableRows("video").length).toBeGreaterThanOrEqual(11);
      expect(engine.getTableRows("tag")).toHaveLength(7);
    });
  });

  describe("3. Évaluation Automatisée de la Solution Officielle (20/20)", () => {
    it("obtient 20/20 avec 100% de réussite sur solution/reponses.json", async () => {
      const report = await evaluerCopieEcrite(examBac2024Controle, solutionReponses, initSql);

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

      expect(report.examId).toBe("exam-bac2024-controle-ecrit");
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
      const report = await evaluerCopieEcrite(examBac2024Controle, solutionAltReponses, initSql);

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

      expect(report.examId).toBe("exam-bac2024-controle-ecrit");
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
        examBac2024Controle,
        solutionInvalideReponses,
        initSql,
      );

      expect(report.examId).toBe("exam-bac2024-controle-ecrit");
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
      const report = await evaluerCopieEcrite(examBac2024Controle, initial, initSql);
      expect(report.totalScore).toBe(0);
    });

    it("la solution invalide garde des points partiels mais échoue sur des erreurs ciblées", async () => {
      const report = await evaluerCopieEcrite(
        examBac2024Controle,
        solutionInvalideReponses,
        initSql,
      );
      expect(report.totalScore).toBeGreaterThan(0);
      const faux = new Set(
        report.sections.flatMap((s) =>
          s.items.filter((i) => !i.isCorrect).map((i) => i.questionId),
        ),
      );
      for (const id of ["EX1-Q1", "EX2-VF-A", "EX3-HTML-4", "EX3-SQL-LID-5", "EX3-SQL-LMD-2"]) {
        expect(faux.has(id), id).toBe(true);
      }
    });

    it("la requête R donne, sur les extraits de l'énoncé, le résultat attendu (PgmAlgo, 70)", () => {
      const engine = new RelationalDatabaseEngine();
      const script = [
        "CREATE TABLE Chaine (idChaine INT PRIMARY KEY, nomChaine VARCHAR(40), emailProp VARCHAR(60));",
        "CREATE TABLE Video (idVideo INT PRIMARY KEY, titreVideo VARCHAR(40), duree INT, taille DECIMAL(8,2), idChaine INT);",
        "INSERT INTO Chaine VALUES (1, 'PgmAlgo', 'ppgm@gmail.com'), (2, 'WebX', 'pweb@gmail.com'), (3, 'Crypto4tous', 'adcryp@gmail.com');",
        "INSERT INTO Video VALUES (110, 'Video1', 30, 428, 1), (225, 'Video2', 40, 753, 1), (303, 'Video3', 10, 259, 2), (400, 'Video4', 20, 145, 2);",
      ].join(" ");
      expect(engine.executeScript(script).success).toBe(true);
      const res = engine.query(
        "SELECT nomChaine, SUM(duree) FROM Chaine C, Video V WHERE C.idChaine = V.idChaine GROUP BY nomChaine HAVING SUM(duree) > 60",
      );
      expect(res.error).toBeUndefined();
      expect(res.rows.map((r) => Object.values(r).map(String))).toEqual([["PgmAlgo", "70"]]);
    });

    it("les sous-requêtes du sujet sont réellement évaluées (IN et moyenne)", () => {
      const engine = new RelationalDatabaseEngine();
      expect(engine.executeScript(initSql).success).toBe(true);
      const parTag = engine.query(
        "SELECT idVideo, COUNT(idVis) AS nb FROM Visualisation WHERE idVideo IN (SELECT idVideo FROM VideosTag WHERE idTag = 7) GROUP BY idVideo",
      );
      expect(parTag.rows.map((r) => [String(r["idVideo"]), String(r["nb"])]).sort()).toEqual([
        ["2438", "3"],
        ["510", "4"],
        ["530", "2"],
        ["540", "1"],
      ]);
      const longues = engine.query(
        "SELECT idVideo FROM Video WHERE idChaine = 5 AND duree > (SELECT AVG(duree) FROM Video WHERE idChaine = 5)",
      );
      expect(longues.rows.map((r) => String(r["idVideo"])).sort()).toEqual(["530", "540"]);
    });
  });
});
