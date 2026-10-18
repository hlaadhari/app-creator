import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";
import { evaluateCriteria, type CriterionDefinition } from "@/lib/evaluation/probe-runner";
import {
  debloquerNiveauIndice,
  getNombreIndices,
  isExamSubject,
} from "@/lib/evaluation/hints-service";

interface Manifest {
  id: string;
  titre: string;
  module: string;
  duree_minutes: number;
  niveau: number;
  exam_mode: boolean;
  bareme: number;
  tags: string[];
  description: string;
  fichiers_attendus: string[];
  base_de_donnees?: string;
}

interface Criterion {
  id: string;
  code: string;
  titre: string;
  points: number;
  fail_message: string;
  sonde?: unknown;
  [key: string]: unknown;
}

const MODULE_C_EXAMS = ["exam-bac2023-location-habits", "exam-bac2018-test-drive"];
const CONTENT_DIR = path.resolve(__dirname, "../../content");

describe("Contenu Module C – Examens Blancs & Annales Bac STI (Niveau 3)", () => {
  describe("Conformité de structure des paquets d'examen blanc (DoD)", () => {
    MODULE_C_EXAMS.forEach((examId) => {
      describe(`Examen : ${examId}`, () => {
        const examDir = path.join(CONTENT_DIR, examId);

        it("possède un manifest.json valide avec les métadonnées officielles d'examen", () => {
          const manifestPath = path.join(examDir, "manifest.json");
          expect(fs.existsSync(manifestPath)).toBe(true);

          const raw = fs.readFileSync(manifestPath, "utf-8");
          const manifest: Manifest = JSON.parse(raw);

          expect(manifest.id).toBe(examId);
          expect(manifest.module).toBe("Module C");
          expect(manifest.duree_minutes).toBe(90);
          expect(manifest.niveau).toBe(3);
          expect(manifest.exam_mode).toBe(true);
          expect(manifest.bareme).toBe(20);
          expect(manifest.tags).toEqual(
            expect.arrayContaining([
              "Bac STI",
              "HTML5",
              "CSS3",
              "JavaScript",
              "PHP",
              "MySQLi",
              "Examen Blanc",
            ]),
          );
          expect(manifest.fichiers_attendus.length).toBeGreaterThanOrEqual(4);
          expect(manifest.base_de_donnees).toBe("db/init.sql");
        });

        it("possède un énoncé officiel complet enonce.md", () => {
          const enoncePath = path.join(examDir, "enonce.md");
          expect(fs.existsSync(enoncePath)).toBe(true);

          const content = fs.readFileSync(enoncePath, "utf-8");
          expect(content.length).toBeGreaterThan(300);
          expect(content).toContain("## Contexte");
          expect(content).toContain("## Travail Demandé");
          expect(content).toContain("## Barème Officiel");
          expect(content).toContain("20 points");
        });

        it("possède un barème officiel totalisant exactement 20 points dans criteria.json", () => {
          const criteriaPath = path.join(examDir, "criteria.json");
          expect(fs.existsSync(criteriaPath)).toBe(true);

          const raw = fs.readFileSync(criteriaPath, "utf-8");
          const criteria: Criterion[] = JSON.parse(raw);

          expect(criteria.length).toBeGreaterThanOrEqual(6);

          const totalPoints = criteria.reduce((sum, c) => sum + c.points, 0);
          expect(totalPoints).toBe(20);

          criteria.forEach((c) => {
            expect(c.id).toBeTruthy();
            expect(c.code).toBeTruthy();
            expect(c.points).toBeGreaterThan(0);
            expect(c.fail_message).toBeTruthy();
          });
        });

        it("possède l'arborescence initiale pour l'élève (initial/)", () => {
          const initialDir = path.join(examDir, "initial");
          expect(fs.existsSync(initialDir)).toBe(true);

          const manifestPath = path.join(examDir, "manifest.json");
          const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

          manifest.fichiers_attendus.forEach((fichier) => {
            const filePath = path.join(initialDir, fichier);
            expect(fs.existsSync(filePath)).toBe(true);
          });
        });

        it("possède l'ensemble des corrigés validés (solution/)", () => {
          const solutionDir = path.join(examDir, "solution");
          expect(fs.existsSync(solutionDir)).toBe(true);

          const manifestPath = path.join(examDir, "manifest.json");
          const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

          manifest.fichiers_attendus.forEach((fichier) => {
            const filePath = path.join(solutionDir, fichier);
            expect(fs.existsSync(filePath)).toBe(true);
            const content = fs.readFileSync(filePath, "utf-8");
            expect(content.length).toBeGreaterThan(30);
          });
        });

        it("possède un script d'initialisation de base relationnelle (db/init.sql)", () => {
          const dbPath = path.join(examDir, "db", "init.sql");
          expect(fs.existsSync(dbPath)).toBe(true);

          const sql = fs.readFileSync(dbPath, "utf-8");
          expect(sql.toUpperCase()).toContain("CREATE TABLE");
          expect(sql.toUpperCase()).toContain("PRIMARY KEY");
          expect(sql.toUpperCase()).toContain("FOREIGN KEY");
          expect(sql.toUpperCase()).toContain("INSERT INTO");
        });
      });
    });
  });

  describe("Désactivation stricte des indices en mode examen (DoD)", () => {
    it("détecte correctement un sujet d'examen via isExamSubject", () => {
      expect(isExamSubject("exam-bac2023-location-habits")).toBe(true);
      expect(isExamSubject("exam-bac2018-test-drive")).toBe(true);
      expect(isExamSubject("tp-fs-01")).toBe(false);
      expect(isExamSubject("carte-profil")).toBe(false);
    });

    it("renvoie 0 indice disponible pour les sujets en mode examen", async () => {
      const nb2023 = await getNombreIndices("exam-bac2023-location-habits");
      expect(nb2023).toBe(0);

      const nb2018 = await getNombreIndices("exam-bac2018-test-drive");
      expect(nb2018).toBe(0);

      const nbExamenOption = await getNombreIndices("carte-profil", {
        isExamMode: true,
      });
      expect(nbExamenOption).toBe(0);
    });

    it("refuse tout déblocage d'indice avec une erreur explicite en mode examen", async () => {
      const res2023 = await debloquerNiveauIndice("exam-bac2023-location-habits", 1);
      expect(res2023.success).toBe(false);
      expect(res2023.error).toContain("Le système d'indices est désactivé en mode examen");

      const res2018 = await debloquerNiveauIndice("exam-bac2018-test-drive", 1);
      expect(res2018.success).toBe(false);
      expect(res2018.error).toContain("Le système d'indices est désactivé en mode examen");

      const resExamOption = await debloquerNiveauIndice("carte-profil", 1, {
        isExamMode: true,
      });
      expect(resExamOption.success).toBe(false);
      expect(resExamOption.error).toContain("Le système d'indices est désactivé en mode examen");
    });
  });

  describe("Calcul automatique de la note sur 20 points (DoD)", () => {
    it("calcule automatiquement la note sur 20 points pour Bac 2023", () => {
      const criteriaPath = path.join(CONTENT_DIR, "exam-bac2023-location-habits", "criteria.json");
      const rawCriteria = JSON.parse(fs.readFileSync(criteriaPath, "utf-8"));
      const solutionHtmlPath = path.join(
        CONTENT_DIR,
        "exam-bac2023-location-habits",
        "solution",
        "location.html",
      );
      const htmlContent = fs.readFileSync(solutionHtmlPath, "utf-8");

      const dom = new JSDOM(htmlContent);
      const doc = dom.window.document;
      const win = dom.window as unknown as Window;

      // Transformation en CriterionDefinition pour le probe-runner
      const probeCriteria: CriterionDefinition[] = rawCriteria.map((c: Criterion, idx: number) => ({
        id: c.id,
        code: c.code,
        label: c.titre,
        points: c.points,
        ordre: idx + 1,
        sonde: c.sonde as CriterionDefinition["sonde"],
        message_echec: c.fail_message,
      }));

      const summary = evaluateCriteria(probeCriteria, doc, win);
      expect(summary.totalPoints).toBe(20);
      expect(summary.note20).toBeGreaterThan(0);
    });

    it("calcule automatiquement la note sur 20 points pour Bac 2018", () => {
      const criteriaPath = path.join(CONTENT_DIR, "exam-bac2018-test-drive", "criteria.json");
      const rawCriteria = JSON.parse(fs.readFileSync(criteriaPath, "utf-8"));
      const solutionHtmlPath = path.join(
        CONTENT_DIR,
        "exam-bac2018-test-drive",
        "solution",
        "evaluation.html",
      );
      const htmlContent = fs.readFileSync(solutionHtmlPath, "utf-8");

      const dom = new JSDOM(htmlContent);
      const doc = dom.window.document;
      const win = dom.window as unknown as Window;

      const probeCriteria: CriterionDefinition[] = rawCriteria.map((c: Criterion, idx: number) => ({
        id: c.id,
        code: c.code,
        label: c.titre,
        points: c.points,
        ordre: idx + 1,
        sonde: c.sonde as CriterionDefinition["sonde"],
        message_echec: c.fail_message,
      }));

      const summary = evaluateCriteria(probeCriteria, doc, win);
      expect(summary.totalPoints).toBe(20);
      expect(summary.note20).toBeGreaterThan(0);
    });
  });

  describe("Validation des contrôles JS et scripts PHP", () => {
    it("vérifie que controls.js du Bac 2023 implémente verif2() avec validation du CIN 8 chiffres", () => {
      const jsPath = path.join(
        CONTENT_DIR,
        "exam-bac2023-location-habits",
        "solution",
        "controls.js",
      );
      const jsContent = fs.readFileSync(jsPath, "utf-8");

      expect(jsContent).toContain("function verif2");
      expect(jsContent).toContain("cin");
      expect(jsContent).toContain("length !== 8");
      expect(jsContent).toContain("id_habit");
      expect(jsContent).toContain("date_loc");
      expect(jsContent).toContain("duree");
    });

    it("vérifie que controle.js du Bac 2018 implémente test() avec validation des notes 1 à 5", () => {
      const jsPath = path.join(CONTENT_DIR, "exam-bac2018-test-drive", "solution", "controle.js");
      const jsContent = fs.readFileSync(jsPath, "utf-8");

      expect(jsContent).toContain("function test");
      expect(jsContent).toContain("cin");
      expect(jsContent).toContain("immatriculation");
      expect(jsContent).toContain("note_confort");
      expect(jsContent).toContain("note_conduite");
      expect(jsContent).toContain("note_securite");
      expect(jsContent).toContain("5");
    });

    it("vérifie que location.php du Bac 2023 contient les requêtes INSERT et UPDATE", () => {
      const phpPath = path.join(
        CONTENT_DIR,
        "exam-bac2023-location-habits",
        "solution",
        "location.php",
      );
      const phpContent = fs.readFileSync(phpPath, "utf-8");

      expect(phpContent).toContain("mysqli_connect");
      expect(phpContent).toContain("bd2023");
      expect(phpContent).toContain("INSERT INTO location");
      expect(phpContent).toContain("UPDATE habit SET disponible");
      expect(phpContent).toContain("prix_jour");
    });

    it("vérifie que evaluer.php du Bac 2018 contient la requête d'agrégation AVG", () => {
      const phpPath = path.join(CONTENT_DIR, "exam-bac2018-test-drive", "solution", "evaluer.php");
      const phpContent = fs.readFileSync(phpPath, "utf-8");

      expect(phpContent).toContain("mysqli_connect");
      expect(phpContent).toContain("INSERT INTO evaluation");
      expect(phpContent).toContain("AVG");
      expect(phpContent).toContain("total_essais");
    });
  });
});
