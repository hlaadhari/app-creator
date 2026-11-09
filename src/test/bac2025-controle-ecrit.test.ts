import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { RelationalDatabaseEngine } from "@/lib/sql/relational-engine";
import { evaluerCopieEcrite } from "@/lib/evaluator/written/written-exam-evaluator";
import {
  examBac2025Controle,
  getWrittenExam,
  getAllWrittenExams,
} from "@/lib/content/written-subjects";

const EXAM_DIR = path.resolve(process.cwd(), "content/exam-bac2025-controle-ecrit");

describe("Bac STI 2025 Session de Contrôle - Épreuve Écrite STI (Issue #203)", () => {
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
      const exam = getWrittenExam("exam-bac2025-controle-ecrit");
      expect(exam).toBeDefined();
      expect(exam?.id).toBe("exam-bac2025-controle-ecrit");
      expect(exam?.exam_mode).toBe(true);
      expect(exam?.bareme_total).toBe(20);
      expect(exam?.duration).toBe(180);
      expect(exam?.sections).toHaveLength(9);

      const all = getAllWrittenExams();
      expect(all.some((e) => e.id === "exam-bac2025-controle-ecrit")).toBe(true);
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
      const totalPointsSections = examBac2025Controle.sections.reduce(
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
        "gouvernorat",
        "ville",
        "foret",
        "incendie",
        "typeintervention",
        "intervention",
      ]) {
        expect(tables).toContain(t);
      }
      expect(engine.getTableRows("foret").length).toBeGreaterThanOrEqual(8);
      expect(engine.getTableRows("intervention")).toHaveLength(9);
    });
  });

  describe("3. Évaluation Automatisée de la Solution Officielle (20/20)", () => {
    it("obtient 20/20 avec 100% de réussite sur solution/reponses.json", async () => {
      const report = await evaluerCopieEcrite(examBac2025Controle, solutionReponses, initSql);

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

      expect(report.examId).toBe("exam-bac2025-controle-ecrit");
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
      const report = await evaluerCopieEcrite(examBac2025Controle, solutionAltReponses, initSql);

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

      expect(report.examId).toBe("exam-bac2025-controle-ecrit");
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
        examBac2025Controle,
        solutionInvalideReponses,
        initSql,
      );

      expect(report.examId).toBe("exam-bac2025-controle-ecrit");
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
      const report = await evaluerCopieEcrite(examBac2025Controle, initial, initSql);
      expect(report.totalScore).toBe(0);
    });

    it("la solution invalide garde des points partiels mais échoue sur des erreurs ciblées", async () => {
      const report = await evaluerCopieEcrite(
        examBac2025Controle,
        solutionInvalideReponses,
        initSql,
      );
      expect(report.totalScore).toBeGreaterThan(0);
      const faux = new Set(
        report.sections.flatMap((s) =>
          s.items.filter((i) => !i.isCorrect).map((i) => i.questionId),
        ),
      );
      for (const id of ["A1-ON-2", "A1-Q2-A", "A3-Q2", "A3-Q3-F", "A4-Q2", "B1-L-1", "B4-T-1"]) {
        expect(faux.has(id), id).toBe(true);
      }
    });

    it("les trois violations de l'énoncé sont bien détectées par le moteur (lignes 3, 4 et 7)", () => {
      const engine = new RelationalDatabaseEngine();
      const schema = [
        "CREATE TABLE Gouvernorat (codeGouv CHAR(3) PRIMARY KEY, nomGouv VARCHAR(50) NOT NULL UNIQUE);",
        "CREATE TABLE Ville (codeVille CHAR(5) PRIMARY KEY, nomVille VARCHAR(50) NOT NULL, codeGouv CHAR(3) NOT NULL, FOREIGN KEY (codeGouv) REFERENCES Gouvernorat(codeGouv));",
        "CREATE TABLE Foret (codeForet CHAR(6) PRIMARY KEY, nomForet VARCHAR(50) NOT NULL, superficieForet DECIMAL(10,3) NOT NULL CHECK (superficieForet > 0), codeVille CHAR(5) NOT NULL, FOREIGN KEY (codeVille) REFERENCES Ville(codeVille));",
        "INSERT INTO Gouvernorat VALUES ('G03', 'A'), ('G06', 'B'), ('G09', 'C'), ('G11', 'D'), ('G13', 'E');",
      ].join(" ");
      expect(engine.executeScript(schema).success).toBe(true);
      const villes = [
        "('V0001', 'Hammam Lif', 'G03')",
        "('V0002', 'Bargou', 'G11')",
        "('V0003', 'Zaghouan', 'G06')",
        "('V0004', 'Ain Draham', 'G09')",
        "('V0005', 'Souk Jomaa', 'G09')",
        "('V0006', 'Ghardimaou', 'G09')",
      ];
      for (const v of villes) {
        expect(engine.executeScript(`INSERT INTO Ville VALUES ${v};`).success).toBe(true);
      }
      // Ligne 7 : doublon de clé primaire V0006.
      expect(
        engine.executeScript("INSERT INTO Ville VALUES ('V0006', 'Nasrallah', 'G13');").success,
      ).toBe(false);
      // Ligne 4 : superficie négative (intégrité de domaine).
      expect(
        engine.executeScript("INSERT INTO Foret VALUES ('F00004', 'Reserve', -47.000, 'V0004');")
          .success,
      ).toBe(false);
      // Ligne 3 : codeVille inexistant (intégrité référentielle).
      expect(
        engine.executeScript(
          "INSERT INTO Foret VALUES ('F00003', 'Jbel Zaghouan', 2010.000, 'V00003');",
        ).success,
      ).toBe(false);
      // Lignes valides.
      expect(
        engine.executeScript(
          "INSERT INTO Foret VALUES ('F00001', 'Boukornine', 1939.000, 'V0001');",
        ).success,
      ).toBe(true);
    });

    it("la requête R donne, sur les extraits de l'énoncé, les trois lignes attendues", () => {
      const engine = new RelationalDatabaseEngine();
      const script = [
        "CREATE TABLE TypeIntervention (codeTypeInt CHAR(3) PRIMARY KEY, description VARCHAR(9) NOT NULL);",
        "CREATE TABLE Intervention (codeInt CHAR(10) PRIMARY KEY, superficieInt DECIMAL(10,3), codeTypeInt CHAR(3));",
        "INSERT INTO TypeIntervention VALUES ('TI1', 'Aérienne'), ('TI2', 'Terrestre'), ('TI3', 'Maritime'), ('TI4', 'Mixte');",
        "INSERT INTO Intervention VALUES ('INT0000001', 80, 'TI2'), ('INT0000002', 20, 'TI1'), ('INT0000003', 100, 'TI2'), ('INT0000004', 70, 'TI4'), ('INT0000005', 200, 'TI1'), ('INT0000006', 100, 'TI2');",
      ].join(" ");
      expect(engine.executeScript(script).success).toBe(true);
      const res = engine.query(
        "SELECT description, SUM(superficieInt) AS SuperficieTotale FROM TypeIntervention T, Intervention I WHERE T.codeTypeInt = I.codeTypeInt GROUP BY description",
      );
      expect(res.error).toBeUndefined();
      const lignes = res.rows.map((r) => [String(r["description"]), String(r["SuperficieTotale"])]);
      expect(lignes.sort()).toEqual([
        ["Aérienne", "220"],
        ["Mixte", "70"],
        ["Terrestre", "280"],
      ]);
    });
  });
});
