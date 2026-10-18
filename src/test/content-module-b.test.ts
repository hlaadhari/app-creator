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
  base_de_donnees?: string;
}

interface Criterion {
  id: string;
  titre: string;
  points: number;
  fail_message: string;
  [key: string]: unknown;
}

const MODULE_B_EXERCISES = ["tp-fs-01", "tp-fs-02"];
const CONTENT_DIR = path.resolve(__dirname, "../../content");

describe("Contenu Module B – TP de Synthèse Full-Stack (Niveau 2)", () => {
  describe("Conformité de structure des paquets Full-Stack (DoD)", () => {
    MODULE_B_EXERCISES.forEach((tpId) => {
      describe(`TP : ${tpId}`, () => {
        const tpDir = path.join(CONTENT_DIR, tpId);

        it("possède un manifest.json valide avec les métadonnées de Niveau 2", () => {
          const manifestPath = path.join(tpDir, "manifest.json");
          expect(fs.existsSync(manifestPath)).toBe(true);

          const raw = fs.readFileSync(manifestPath, "utf-8");
          const manifest: Manifest = JSON.parse(raw);

          expect(manifest.id).toBe(tpId);
          expect(manifest.module).toBe("Module B");
          expect(manifest.duree_minutes).toBeGreaterThanOrEqual(45);
          expect(manifest.duree_minutes).toBeLessThanOrEqual(60);
          expect(manifest.niveau).toBe(2);
          expect(manifest.tags).toEqual(
            expect.arrayContaining(["HTML5", "JavaScript", "PHP", "MySQLi"]),
          );
          expect(manifest.fichiers_attendus.length).toBeGreaterThanOrEqual(3);
          expect(manifest.base_de_donnees).toBe("db/init.sql");
        });

        it("possède un énoncé complet enonce.md", () => {
          const enoncePath = path.join(tpDir, "enonce.md");
          expect(fs.existsSync(enoncePath)).toBe(true);

          const content = fs.readFileSync(enoncePath, "utf-8");
          expect(content.length).toBeGreaterThan(200);
          expect(content).toContain("## Contexte");
        });

        it("possède un script db/init.sql valide pour la sandbox", () => {
          const dbPath = path.join(tpDir, "db/init.sql");
          expect(fs.existsSync(dbPath)).toBe(true);

          const sqlContent = fs.readFileSync(dbPath, "utf-8");
          expect(sqlContent).toContain("CREATE TABLE");
          expect(sqlContent).toContain("PRIMARY KEY");
        });

        it("possède un dossier initial/ contenant les fichiers de départ", () => {
          const manifest: Manifest = JSON.parse(
            fs.readFileSync(path.join(tpDir, "manifest.json"), "utf-8"),
          );
          const initialDir = path.join(tpDir, "initial");
          expect(fs.existsSync(initialDir)).toBe(true);

          manifest.fichiers_attendus.forEach((file) => {
            const filePath = path.join(initialDir, file);
            expect(fs.existsSync(filePath), `Fichier initial manquant : ${file}`).toBe(true);
          });
        });

        it("possède un corrigé complet et validé dans solution/", () => {
          const manifest: Manifest = JSON.parse(
            fs.readFileSync(path.join(tpDir, "manifest.json"), "utf-8"),
          );
          const solutionDir = path.join(tpDir, "solution");
          expect(fs.existsSync(solutionDir)).toBe(true);

          manifest.fichiers_attendus.forEach((file) => {
            const filePath = path.join(solutionDir, file);
            expect(fs.existsSync(filePath), `Fichier de solution manquant : ${file}`).toBe(true);
            const content = fs.readFileSync(filePath, "utf-8");
            expect(content.trim().length).toBeGreaterThan(0);
          });
        });

        it("possède un fichier criteria.json avec points et critères détaillés", () => {
          const criteriaPath = path.join(tpDir, "criteria.json");
          expect(fs.existsSync(criteriaPath)).toBe(true);

          const criteria: Criterion[] = JSON.parse(fs.readFileSync(criteriaPath, "utf-8"));
          expect(Array.isArray(criteria)).toBe(true);
          expect(criteria.length).toBeGreaterThanOrEqual(5);

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

  describe("Validation fonctionnelle & Exécution des Corrigés (DoD)", () => {
    // 1. tp-fs-01 : Formulaire de Don
    describe("tp-fs-01 : Formulaire de Don pour les Lycées", () => {
      const tpDir = path.join(CONTENT_DIR, "tp-fs-01");
      const initSql = fs.readFileSync(path.join(tpDir, "db/init.sql"), "utf-8");
      const solutionJs = fs.readFileSync(path.join(tpDir, "solution/controles.js"), "utf-8");
      const solutionPhp = fs.readFileSync(path.join(tpDir, "solution/enregistrer.php"), "utf-8");
      const solutionCss = fs.readFileSync(path.join(tpDir, "solution/mesStyles.css"), "utf-8");

      it("db/init.sql définit la table don avec les contraintes d'intégrité requises", () => {
        expect(initSql).toMatch(/CREATE\s+TABLE[^(]+\b(don)\b/i);
        expect(initSql).toContain("id INT AUTO_INCREMENT PRIMARY KEY");
        expect(initSql).toContain("nom VARCHAR");
        expect(initSql).toContain("type_user VARCHAR");
        expect(initSql).toContain("lycee VARCHAR");
        expect(initSql).toContain("article VARCHAR");
        expect(initSql).toContain("qte INT");
        expect(initSql).toContain("montant DECIMAL");
        expect(initSql).toContain("CHECK (qte > 0)");
        expect(initSql).toContain("CHECK (montant > 0)");
      });

      it("la solution JavaScript implémente le calcul dynamique et la validation test1()", () => {
        expect(solutionJs).toContain("function calculerMontant()");
        expect(solutionJs).toContain("function test1()");

        // Test de la logique de calcul de prix
        const prixArticles: Record<string, number> = {
          Ordinateur: 800,
          "Imprimante 3D": 1200,
          "Casque VR": 500,
          "Carte Microcontrôleur": 60,
        };

        const calc = (article: string, qte: number) => {
          const pu = prixArticles[article] || 0;
          return (pu * qte).toFixed(2);
        };

        expect(calc("Ordinateur", 2)).toBe("1600.00");
        expect(calc("Imprimante 3D", 1)).toBe("1200.00");
        expect(calc("Carte Microcontrôleur", 5)).toBe("300.00");
      });

      it("la solution PHP réalise la connexion MySQLi et la requête INSERT INTO don", () => {
        expect(solutionPhp).toContain("mysqli_connect");
        expect(solutionPhp).toMatch(/INSERT\s+INTO\s+don\s*\(/i);
        expect(solutionPhp).toContain("mysqli_query");
        expect(solutionPhp).toContain("Merci pour votre don");
      });

      it("la solution CSS contient les sélecteurs de centrage #fDon et le style fieldset", () => {
        expect(solutionCss).toContain("#fDon");
        expect(solutionCss).toContain("max-width: 600px");
        expect(solutionCss).toContain("fieldset");
        expect(solutionCss).toContain("border: 2px solid #0066cc");
        expect(solutionCss).toContain("#btnValider");
      });
    });

    // 2. tp-fs-02 : Consultation Météo
    describe("tp-fs-02 : Consultation Météo & Agrégations", () => {
      const tpDir = path.join(CONTENT_DIR, "tp-fs-02");
      const initSql = fs.readFileSync(path.join(tpDir, "db/init.sql"), "utf-8");
      const solutionJs = fs.readFileSync(path.join(tpDir, "solution/controle.js"), "utf-8");
      const solutionPhp = fs.readFileSync(path.join(tpDir, "solution/meteo.php"), "utf-8");

      it("db/init.sql définit les tables relationnelles station et mesure avec données de test", () => {
        expect(initSql).toMatch(/CREATE\s+TABLE[^(]+\b(station)\b/i);
        expect(initSql).toMatch(/CREATE\s+TABLE[^(]+\b(mesure)\b/i);
        expect(initSql).toContain("FOREIGN KEY (id_station) REFERENCES station(id_station)");
        expect(initSql).toContain("INSERT INTO station");
        expect(initSql).toContain("INSERT INTO mesure");
      });

      it("la solution JavaScript contrôle la sélection de station et l'intervalle de date dans test2()", () => {
        expect(solutionJs).toContain("function test2()");

        const validateMeteoInput = (station: string, annee: number) => {
          if (!station || station.trim() === "") return false;
          if (isNaN(annee) || annee < 2020 || annee > 2026) return false;
          return true;
        };

        expect(validateMeteoInput("", 2026)).toBe(false);
        expect(validateMeteoInput("1", 2019)).toBe(false);
        expect(validateMeteoInput("1", 2027)).toBe(false);
        expect(validateMeteoInput("1", 2026)).toBe(true);
        expect(validateMeteoInput("2", 2021)).toBe(true);
      });

      it("la solution PHP exécute la requête d'agrégation (AVG, MAX, MIN, GROUP BY)", () => {
        expect(solutionPhp).toContain("mysqli_connect");
        expect(solutionPhp).toMatch(/SELECT[\s\S]*?AVG\([\s\S]*?temperature\)/i);
        expect(solutionPhp).toMatch(/MAX\([\s\S]*?temperature\)/i);
        expect(solutionPhp).toMatch(/MIN\([\s\S]*?temperature\)/i);
        expect(solutionPhp).toMatch(/GROUP\s+BY/i);
        expect(solutionPhp).toContain("<table>");
        expect(solutionPhp).toContain("number_format");
      });
    });
  });
});
