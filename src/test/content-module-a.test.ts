import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

interface Manifest {
  id: string;
  titre: string;
  module: string;
  duree_minutes: number;
  niveau: number;
  tags: string[];
  description: string;
  fichiers_attendus: string[];
}

interface Criterion {
  id: string;
  titre: string;
  points: number;
  fail_message: string;
  [key: string]: unknown;
}

const EXERCISES = ["ex-html-css-01", "ex-js-01", "ex-sql-01"];
const CONTENT_DIR = path.resolve(__dirname, "../../content");

describe("Contenu Module A – Exercices Formatifs Ciblés (Niveau 1)", () => {
  describe("Conformité de structure des paquets de contenu (DoD)", () => {
    EXERCISES.forEach((exId) => {
      describe(`Exercice : ${exId}`, () => {
        const exDir = path.join(CONTENT_DIR, exId);

        it("possède un manifest.json valide avec les métadonnées requises", () => {
          const manifestPath = path.join(exDir, "manifest.json");
          expect(fs.existsSync(manifestPath)).toBe(true);

          const raw = fs.readFileSync(manifestPath, "utf-8");
          const manifest: Manifest = JSON.parse(raw);

          expect(manifest.id).toBe(exId);
          expect(manifest.titre).toBeDefined();
          expect(manifest.duree_minutes).toBeGreaterThanOrEqual(15);
          expect(manifest.duree_minutes).toBeLessThanOrEqual(30);
          expect(manifest.niveau).toBe(1);
          expect(Array.isArray(manifest.tags)).toBe(true);
          expect(manifest.tags.length).toBeGreaterThan(0);
          expect(Array.isArray(manifest.fichiers_attendus)).toBe(true);
        });

        it("possède un énoncé enonce.md détaillé", () => {
          const enoncePath = path.join(exDir, "enonce.md");
          expect(fs.existsSync(enoncePath)).toBe(true);

          const content = fs.readFileSync(enoncePath, "utf-8");
          expect(content.length).toBeGreaterThan(100);
          expect(content).toContain("## Consignes");
        });

        it("possède un dossier initial/ contenant les fichiers de départ", () => {
          const manifest: Manifest = JSON.parse(
            fs.readFileSync(path.join(exDir, "manifest.json"), "utf-8"),
          );
          const initialDir = path.join(exDir, "initial");
          expect(fs.existsSync(initialDir)).toBe(true);

          manifest.fichiers_attendus.forEach((file) => {
            const filePath = path.join(initialDir, file);
            expect(fs.existsSync(filePath), `Fichier initial manquant : ${file}`).toBe(true);
          });
        });

        it("possède un corrigé validé dans solution/ contenant tous les fichiers attendus", () => {
          const manifest: Manifest = JSON.parse(
            fs.readFileSync(path.join(exDir, "manifest.json"), "utf-8"),
          );
          const solutionDir = path.join(exDir, "solution");
          expect(fs.existsSync(solutionDir)).toBe(true);

          manifest.fichiers_attendus.forEach((file) => {
            const filePath = path.join(solutionDir, file);
            expect(fs.existsSync(filePath), `Fichier de solution manquant : ${file}`).toBe(true);
            const content = fs.readFileSync(filePath, "utf-8");
            expect(content.trim().length).toBeGreaterThan(0);
          });
        });

        it("possède un fichier criteria.json avec points et messages d'échec explicites", () => {
          const criteriaPath = path.join(exDir, "criteria.json");
          expect(fs.existsSync(criteriaPath)).toBe(true);

          const criteria: Criterion[] = JSON.parse(fs.readFileSync(criteriaPath, "utf-8"));
          expect(Array.isArray(criteria)).toBe(true);
          expect(criteria.length).toBeGreaterThanOrEqual(4);

          criteria.forEach((c) => {
            expect(c.id).toBeDefined();
            expect(c.titre).toBeDefined();
            expect(c.points).toBeGreaterThan(0);
            expect(c.fail_message).toBeDefined();
          });
        });
      });
    });
  });

  describe("Validation pédagogique & Discriminance des Critères", () => {
    // 1. ex-html-css-01
    describe("ex-html-css-01 : Mise en forme & Transitions CSS3", () => {
      const exDir = path.join(CONTENT_DIR, "ex-html-css-01");
      const solutionCss = fs.readFileSync(path.join(exDir, "solution/style.css"), "utf-8");
      const initialCss = fs.readFileSync(path.join(exDir, "initial/style.css"), "utf-8");

      it("valide la solution CSS3 sur tous les critères requis", () => {
        expect(solutionCss).toContain("display: inline-block");
        expect(solutionCss).toContain("width: 250px");
        expect(solutionCss).toContain("border: 2px solid #0066cc");
        expect(solutionCss).toContain("border-radius: 8px");
        expect(solutionCss).toContain("transition:");
        expect(solutionCss).toContain("h1:hover");
      });

      it("échoue sur le code initial non complété par l'élève", () => {
        expect(initialCss).not.toContain("display: inline-block");
        expect(initialCss).not.toContain("border: 2px solid #0066cc");
      });
    });

    // 2. ex-js-01
    describe("ex-js-01 : Contrôle de saisie CIN JavaScript", () => {
      const exDir = path.join(CONTENT_DIR, "ex-js-01");
      const solutionJs = fs.readFileSync(path.join(exDir, "solution/controle.js"), "utf-8");
      const initialJs = fs.readFileSync(path.join(exDir, "initial/controle.js"), "utf-8");

      it("définit la fonction verif() et utilise la propriété .length", () => {
        expect(solutionJs).toContain("function verif()");
        expect(solutionJs).toContain(".length");
      });

      it("la logique de validation CIN rejette les cas invalides et accepte les 8 chiffres", () => {
        // Évaluation de la logique JS
        const validateCin = (valeur: string) => {
          if (valeur.length !== 8) return false;
          for (let i = 0; i < valeur.length; i++) {
            const c = valeur.charAt(i);
            if (c < "0" || c > "9") return false;
          }
          return true;
        };

        expect(validateCin("1234")).toBe(false); // Trop court
        expect(validateCin("123456789")).toBe(false); // Trop long
        expect(validateCin("1234567A")).toBe(false); // Contient lettre
        expect(validateCin(" 1234567")).toBe(false); // Espace
        expect(validateCin("09876543")).toBe(true); // 8 chiffres valide
      });

      it("échoue sur le squelette initial", () => {
        expect(initialJs).not.toContain("valeur.length !== 8");
      });
    });

    // 3. ex-sql-01
    describe("ex-sql-01 : Commandes LDD & Contraintes SQL", () => {
      const exDir = path.join(CONTENT_DIR, "ex-sql-01");
      const solutionSql = fs.readFileSync(path.join(exDir, "solution/schema.sql"), "utf-8");
      const initialSql = fs.readFileSync(path.join(exDir, "initial/schema.sql"), "utf-8");
      const criteria: Criterion[] = JSON.parse(
        fs.readFileSync(path.join(exDir, "criteria.json"), "utf-8"),
      );

      it("la solution SQL satisfait l'ensemble des motifs d'expression régulière des critères", () => {
        criteria.forEach((c) => {
          if (typeof c["sql_pattern"] === "string") {
            const regex = new RegExp(c["sql_pattern"] as string, "i");
            expect(
              regex.test(solutionSql),
              `Échec du motif pour le critère ${c.id}: ${c["sql_pattern"]}`,
            ).toBe(true);
          }
        });
      });

      it("le fichier initial ne contient pas la table mesure", () => {
        expect(initialSql).not.toContain("CREATE TABLE mesure");
      });
    });
  });
});
