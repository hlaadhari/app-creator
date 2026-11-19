import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { RelationalDatabaseEngine } from "@/lib/sql/relational-engine";
import { evaluerCopieEcrite } from "@/lib/evaluator/written/written-exam-evaluator";
import { getAllWrittenExams, getWrittenExam } from "@/lib/content/written-subjects";

interface BacBlancCase {
  id: string;
  year: number;
  expectedTables: string[];
}

const BAC_BLANC_CASES: BacBlancCase[] = [
  {
    id: "exam-bac2022-blanc-ecrit",
    year: 2022,
    expectedTables: ["constructeur", "modele", "vehicule", "vendeur", "annonce"],
  },
  {
    id: "exam-bac2023-blanc-ecrit",
    year: 2023,
    expectedTables: ["constructeur", "modele", "vehicule", "vendeur", "annonce"],
  },
  {
    id: "exam-bac2024-blanc-ecrit",
    year: 2024,
    expectedTables: ["pays", "streamer", "chaine", "typecontenu", "contenu"],
  },
];

describe("Bac Blanc STI 2022, 2023 & 2024 - Épreuves Écrites", () => {
  for (const examCase of BAC_BLANC_CASES) {
    const examDir = path.resolve(process.cwd(), "content", examCase.id);
    const initSql = fs.readFileSync(path.join(examDir, "db", "init.sql"), "utf-8");
    const initialReponses = JSON.parse(
      fs.readFileSync(path.join(examDir, "initial", "reponses.json"), "utf-8"),
    ) as Record<string, string | string[]>;
    const solutionReponses = JSON.parse(
      fs.readFileSync(path.join(examDir, "solution", "reponses.json"), "utf-8"),
    ) as Record<string, string | string[]>;
    const solutionAltReponses = JSON.parse(
      fs.readFileSync(path.join(examDir, "solution-alt", "reponses.json"), "utf-8"),
    ) as Record<string, string | string[]>;
    const solutionInvalideReponses = JSON.parse(
      fs.readFileSync(path.join(examDir, "solution-invalide", "reponses.json"), "utf-8"),
    ) as Record<string, string | string[]>;

    describe(`${examCase.id} (${examCase.year})`, () => {
      it("est enregistré dans written-subjects avec exam_mode: true, session_type: blanc et 20 points", () => {
        const exam = getWrittenExam(examCase.id);
        expect(exam).toBeDefined();
        expect(exam?.id).toBe(examCase.id);
        expect(exam?.year).toBe(examCase.year);
        expect(exam?.session_type).toBe("blanc");
        expect(exam?.exam_mode).toBe(true);
        expect(exam?.bareme_total).toBe(20);
        expect(exam?.duration).toBe(180);
        expect(exam?.initialSql).toBeTruthy();

        const all = getAllWrittenExams();
        expect(all.some((e) => e.id === examCase.id)).toBe(true);
      });

      it("possède tous les fichiers obligatoires et un barème de 20.0 points", () => {
        expect(fs.existsSync(path.join(examDir, "manifest.json"))).toBe(true);
        expect(fs.existsSync(path.join(examDir, "enonce.md"))).toBe(true);
        expect(fs.existsSync(path.join(examDir, "criteria.json"))).toBe(true);
        expect(fs.existsSync(path.join(examDir, "COUVERTURE.md"))).toBe(true);
        expect(fs.existsSync(path.join(examDir, "db", "init.sql"))).toBe(true);
        expect(fs.existsSync(path.join(examDir, "initial", "reponses.json"))).toBe(true);
        expect(fs.existsSync(path.join(examDir, "solution", "reponses.json"))).toBe(true);
        expect(fs.existsSync(path.join(examDir, "solution", "reponses.sql"))).toBe(true);
        expect(fs.existsSync(path.join(examDir, "solution-alt", "reponses.json"))).toBe(true);
        expect(fs.existsSync(path.join(examDir, "solution-invalide", "reponses.json"))).toBe(true);

        const exam = getWrittenExam(examCase.id)!;
        const totalSections = exam.sections.reduce((sum, s) => sum + (s.points ?? 0), 0);
        expect(totalSections).toBeCloseTo(20, 5);

        const criteria = JSON.parse(
          fs.readFileSync(path.join(examDir, "criteria.json"), "utf-8"),
        ) as Array<{ points: number }>;
        const totalCriteria = criteria.reduce((sum, c) => sum + c.points, 0);
        expect(totalCriteria).toBeCloseTo(20, 5);
      });

      it("initialise la base de données sans erreur avec RelationalDatabaseEngine", () => {
        const engine = new RelationalDatabaseEngine();
        const res = engine.executeScript(initSql);
        expect(res.success).toBe(true);
        expect(res.errors).toHaveLength(0);

        const tables = engine.getTableNames();
        for (const t of examCase.expectedTables) {
          expect(tables).toContain(t);
        }
      });

      it("obtient 0/20 sur initial/reponses.json", async () => {
        const exam = getWrittenExam(examCase.id)!;
        const report = await evaluerCopieEcrite(exam, initialReponses, initSql);
        expect(report.totalScore).toBe(0);
      });

      it("obtient 20/20 sur solution/reponses.json (en utilisant manifest.initialSql comme le navigateur)", async () => {
        const exam = getWrittenExam(examCase.id)!;
        const report = await evaluerCopieEcrite(exam, solutionReponses);
        expect(report.totalScore).toBeCloseTo(20, 2);
      });

      it("obtient 20/20 sur solution-alt/reponses.json", async () => {
        const exam = getWrittenExam(examCase.id)!;
        const report = await evaluerCopieEcrite(exam, solutionAltReponses, initSql);
        expect(report.totalScore).toBeCloseTo(20, 2);
      });

      it("obtient strictement moins de 20/20 sur solution-invalide/reponses.json", async () => {
        const exam = getWrittenExam(examCase.id)!;
        const report = await evaluerCopieEcrite(exam, solutionInvalideReponses, initSql);
        expect(report.totalScore).toBeLessThan(20);
        expect(report.totalScore).toBeLessThanOrEqual(5);
      });
    });
  }

  it("la migration serveur 0039 contient le barème détaillé (questions + correctAnswers QCM) pour les 3 Bac Blanc", () => {
    const migPath = path.resolve(
      process.cwd(),
      "supabase/migrations/20261119183000_0039_bareme_serveur_bac_blanc_questions.sql",
    );
    expect(fs.existsSync(migPath)).toBe(true);
    const sql = fs.readFileSync(migPath, "utf-8");
    const jsonBlocks = [...sql.matchAll(/\$json\$([\s\S]*?)\$json\$/g)].map((m) =>
      JSON.parse(m[1]!),
    ) as Array<
      Array<{
        id: string;
        type: string;
        pointsMax: number;
        questions: Array<{ id: string; points: number; correctAnswers?: string[] }>;
      }>
    >;
    expect(jsonBlocks).toHaveLength(3);
    for (const sections of jsonBlocks) {
      const total = sections.reduce((sum, s) => sum + s.pointsMax, 0);
      expect(total).toBeCloseTo(20, 5);
      const qcmSections = sections.filter((s) => s.type === "qcm");
      expect(qcmSections.length).toBeGreaterThanOrEqual(1);
      for (const qcm of qcmSections) {
        expect(qcm.questions.length).toBeGreaterThanOrEqual(5);
        for (const q of qcm.questions) {
          expect(Array.isArray(q.correctAnswers)).toBe(true);
          expect(q.correctAnswers!.length).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});
