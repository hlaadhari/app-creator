import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { MySqliSimulator } from "@/lib/evaluator/sql-checker";
import {
  verifierStructureHtmlFormulaire,
  verifierValidationJavaScript,
} from "@/lib/evaluator/web-checker";
import { executerScriptPhpMysqli, verifierCodePhpProcedurale } from "@/lib/evaluator/php-checker";
import { contentSubjects } from "@/lib/content/all-subjects";
import { evaluerCopie } from "@/lib/evaluation/evaluation-par-page";
import { evaluateurJsdom } from "./helpers/evaluateur-jsdom";

const BAC2022_DIR = path.resolve(process.cwd(), "content/exam-bac2022-principale");

describe("Bac STI 2022 Session Principale - AgVoy & Gestion Élèves (Issue #162)", () => {
  const initSql = fs.readFileSync(path.join(BAC2022_DIR, "db", "init.sql"), "utf-8");
  const solutionHtml = fs.readFileSync(
    path.join(BAC2022_DIR, "solution", "modifier.html"),
    "utf-8",
  );
  const solutionJs = fs.readFileSync(path.join(BAC2022_DIR, "solution", "controles.js"), "utf-8");
  const solutionPhp = fs.readFileSync(path.join(BAC2022_DIR, "solution", "modifier.php"), "utf-8");

  describe("1. Structure du Sujet & Métadonnées", () => {
    it("le sujet est correctement enregistré dans contentSubjects avec examMode: true et 20 points", () => {
      const subject = contentSubjects.find((s) => s.id === "exam-bac2022-principale");
      expect(subject).toBeDefined();
      expect(subject?.module).toBe("Module C");
      expect(subject?.examMode).toBe(true);
      expect(subject?.bareme).toBe(20);
      expect(subject?.dureeMinutes).toBe(90);
      expect(subject?.criteria.length).toBe(8);

      const totalPoints = subject?.criteria.reduce((sum, c) => sum + c.points, 0);
      expect(totalPoints).toBe(20);
    });

    it("possède les fichiers obligatoires et la matrice de couverture COUVERTURE.md", () => {
      expect(fs.existsSync(path.join(BAC2022_DIR, "manifest.json"))).toBe(true);
      expect(fs.existsSync(path.join(BAC2022_DIR, "enonce.md"))).toBe(true);
      expect(fs.existsSync(path.join(BAC2022_DIR, "criteria.json"))).toBe(true);
      expect(fs.existsSync(path.join(BAC2022_DIR, "COUVERTURE.md"))).toBe(true);
      expect(fs.existsSync(path.join(BAC2022_DIR, "db", "init.sql"))).toBe(true);
    });
  });

  describe("2. Base de Données bd_agvoy2022", () => {
    it("initialise correctement les tables Ville, Site, Participant, Excursion, Participer et Eleve", () => {
      const sim = new MySqliSimulator();
      const seedRes = sim.executeScript(initSql);
      expect(seedRes.success).toBe(true);

      expect(sim.getTableSchema("ville")).toBeDefined();
      expect(sim.getTableSchema("site")).toBeDefined();
      expect(sim.getTableSchema("participant")).toBeDefined();
      expect(sim.getTableSchema("excursion")).toBeDefined();
      expect(sim.getTableSchema("participer")).toBeDefined();
      expect(sim.getTableSchema("eleve")).toBeDefined();

      const eleveRows = sim.getTableRows("eleve");
      expect(eleveRows.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("3. Validation Client Web (HTML & JavaScript)", () => {
    it("valide la structure du formulaire modifier.html", () => {
      const report = verifierStructureHtmlFormulaire(solutionHtml, "modifier.php", "verif");
      expect(report.conforme).toBe(true);
      expect(report.hasForm).toBe(true);
      expect(report.methodPost).toBe(true);
    });

    it("valide la fonction verif() sur des entrées conformes et non conformes", () => {
      const jsReport = verifierValidationJavaScript(solutionHtml, solutionJs, "verif", [
        {
          description: "Saisie valide (CIN 8 chiffres, nom, prenom, tel 8 chiffres)",
          fieldValues: {
            cin: "01234567",
            nom: "Ben Ali",
            prenom: "Sami",
            tel: "98765432",
          },
          expectedReturn: true,
        },
        {
          description: "CIN à 7 chiffres -> échec (return false)",
          fieldValues: {
            cin: "0123456",
            nom: "Ben Ali",
            prenom: "Sami",
            tel: "98765432",
          },
          expectedReturn: false,
        },
        {
          description: "Nom vide -> échec (return false)",
          fieldValues: {
            cin: "01234567",
            nom: "",
            prenom: "Sami",
            tel: "98765432",
          },
          expectedReturn: false,
        },
        {
          description: "Téléphone court (< 8 chiffres) -> échec (return false)",
          fieldValues: {
            cin: "01234567",
            nom: "Ben Ali",
            prenom: "Sami",
            tel: "12345",
          },
          expectedReturn: false,
        },
      ]);

      expect(jsReport.conforme).toBe(true);
      expect(jsReport.testCasesResults.every((tc) => tc.passed)).toBe(true);
    });
  });

  describe("4. Traitement Serveur PHP & MySQLi (modifier.php)", () => {
    it("respecte la programmation procédurale sans constructions interdites", () => {
      const phpAudit = verifierCodePhpProcedurale(solutionPhp, ["cin", "nom", "prenom", "tel"]);
      expect(phpAudit.conformeProgramme).toBe(true);
      expect(phpAudit.forbiddenConstructs).toHaveLength(0);
    });

    it("détecte un élève introuvable et met à jour un élève existant avec succès", () => {
      const sim = new MySqliSimulator();
      sim.executeScript(initSql);

      // Cas 1 : Élève inexistant
      const execNotFound = executerScriptPhpMysqli(
        solutionPhp,
        { cin: "99999999", nom: "Inconnu", prenom: "X", tel: "12345678" },
        sim,
      );
      expect(execNotFound.outputHtml).toContain("introuvable");

      // Cas 2 : Élève existant (01234567)
      const execUpdate = executerScriptPhpMysqli(
        solutionPhp,
        { cin: "01234567", nom: "Ben Ali Modifie", prenom: "Sami", tel: "98765432" },
        sim,
      );
      expect(execUpdate.outputHtml).toContain("succès");

      // Vérification en base de données
      const rows = sim.getTableRows("eleve");
      const updatedEleve = rows.find((r) => r["cin"] === "01234567" || r["Cin"] === "01234567");
      expect(updatedEleve?.["nom"] || updatedEleve?.["Nom"]).toBe("Ben Ali Modifie");
    });
  });

  describe("5. Banc Didactique & Concordance des Évaluations (20/20 pts)", () => {
    it("la solution officielle obtient 20/20 (100% des points vérifiables)", async () => {
      const subject = contentSubjects.find((s) => s.id === "exam-bac2022-principale")!;
      const solDir = path.join(BAC2022_DIR, "solution");
      const fichiers: Record<string, string> = {};
      for (const nom of fs.readdirSync(solDir)) {
        const p = path.join(solDir, nom);
        if (fs.statSync(p).isFile()) {
          fichiers[nom] = fs.readFileSync(p, "utf-8");
        }
      }

      const { bilan } = await evaluerCopie(subject.criteria, fichiers, evaluateurJsdom(fichiers));
      expect(bilan.got).toBe(20);
      expect(bilan.got).toBe(bilan.verifiable);
    });

    it("la solution alternative (solution-alt/) obtient également 20/20", async () => {
      const subject = contentSubjects.find((s) => s.id === "exam-bac2022-principale")!;
      const altDir = path.join(BAC2022_DIR, "solution-alt");
      const fichiers: Record<string, string> = {};
      for (const nom of fs.readdirSync(altDir)) {
        const p = path.join(altDir, nom);
        if (fs.statSync(p).isFile()) {
          fichiers[nom] = fs.readFileSync(p, "utf-8");
        }
      }

      const { bilan } = await evaluerCopie(subject.criteria, fichiers, evaluateurJsdom(fichiers));
      expect(bilan.got).toBe(20);
    });

    it("la solution invalide (solution-invalide/) échoue sur au moins un critère (< 20 pts)", async () => {
      const subject = contentSubjects.find((s) => s.id === "exam-bac2022-principale")!;
      const invDir = path.join(BAC2022_DIR, "solution-invalide");
      const fichiers: Record<string, string> = {};
      for (const nom of fs.readdirSync(invDir)) {
        const p = path.join(invDir, nom);
        if (fs.statSync(p).isFile()) {
          fichiers[nom] = fs.readFileSync(p, "utf-8");
        }
      }

      const { bilan } = await evaluerCopie(subject.criteria, fichiers, evaluateurJsdom(fichiers));
      expect(bilan.got).toBeLessThan(20);
    });
  });
});
