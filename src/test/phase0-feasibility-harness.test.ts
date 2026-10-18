import { describe, expect, it } from "vitest";
import {
  SCENARIOS_BAC_STI,
  detecterEcartsDialecteSql,
  executerSimulationScenario,
  evaluerMetriquesPosteReference,
  chiffrerPlanB,
  genererRapportPhase0,
} from "@/lib/phase0/comparison-harness";

describe("Banc d'Essai Phase 0 – Validation Technique PHP WASM + SQLite (PRD §6, §7.1 à §7.5, §8.3)", () => {
  describe("Scénarios Représentatifs du Bac STI (S1, S2, S3)", () => {
    it("définit les 3 scénarios essentiels conformes au PRD §7.2", () => {
      expect(SCENARIOS_BAC_STI).toHaveLength(3);

      const s1 = SCENARIOS_BAC_STI.find((s) => s.id === "S1");
      expect(s1).toBeDefined();
      expect(s1?.nom).toContain("Formulaire PHP");
      expect(s1?.codePhp).toContain("$_POST");
      expect(s1?.codePhp).toContain("INSERT INTO candidat");

      const s2 = SCENARIOS_BAC_STI.find((s) => s.id === "S2");
      expect(s2).toBeDefined();
      expect(s2?.nom).toContain("SQL Avancé");
      expect(s2?.codePhp).toContain("GROUP BY");
      expect(s2?.codePhp).toContain("AVG");

      const s3 = SCENARIOS_BAC_STI.find((s) => s.id === "S3");
      expect(s3).toBeDefined();
      expect(s3?.nom).toContain("Sessions");
      expect(s3?.codePhp).toContain("session_start");
      expect(s3?.codePhp).toContain("$_SESSION");
    });

    it("exécute le scénario S1 (Formulaire POST + Insertion) avec équivalence stricte", () => {
      const s1 = SCENARIOS_BAC_STI.find((s) => s.id === "S1")!;
      const res = executerSimulationScenario(s1);

      expect(res.success).toBe(true);
      expect(res.htmlEquivalent).toBe(true);
      expect(res.dbStateEquivalent).toBe(true);
      expect(res.executionTimeMs).toBeLessThan(100);
      expect(res.memoryUsageMb).toBeLessThan(50);
    });

    it("exécute le scénario S2 (SQL Avancé : Jointures & Agrégats) avec équivalence stricte", () => {
      const s2 = SCENARIOS_BAC_STI.find((s) => s.id === "S2")!;
      const res = executerSimulationScenario(s2);

      expect(res.success).toBe(true);
      expect(res.htmlEquivalent).toBe(true);
      expect(res.dbStateEquivalent).toBe(true);
      expect(res.executionTimeMs).toBeLessThan(100);
    });

    it("exécute le scénario S3 (Sessions multi-pages) avec équivalence de persistance", () => {
      const s3 = SCENARIOS_BAC_STI.find((s) => s.id === "S3")!;
      const res = executerSimulationScenario(s3);

      expect(res.success).toBe(true);
      expect(res.htmlEquivalent).toBe(true);
      expect(res.sessionEquivalent).toBe(true);
      expect(res.executionTimeMs).toBeLessThan(100);
    });
  });

  describe("Détection des Écarts de Dialecte SQL (PRD §8.2)", () => {
    it("détecte la syntaxe non portable AUTO_INCREMENT", () => {
      const sql = "CREATE TABLE test (id INT AUTO_INCREMENT PRIMARY KEY, nom VARCHAR(30));";
      const warnings = detecterEcartsDialecteSql(sql);

      expect(warnings.some((w) => w.includes("AUTO_INCREMENT"))).toBe(true);
    });

    it("détecte les fonctions de date MySQL incompatibles (CURDATE / NOW)", () => {
      const sql = "SELECT * FROM examen WHERE date_exam = CURDATE();";
      const warnings = detecterEcartsDialecteSql(sql);

      expect(warnings.some((w) => w.includes("CURDATE"))).toBe(true);
    });

    it("détecte la fonction DATEDIFF non portable", () => {
      const sql = "SELECT DATEDIFF(date_fin, date_debut) AS duree FROM location;";
      const warnings = detecterEcartsDialecteSql(sql);

      expect(warnings.some((w) => w.includes("DATEDIFF"))).toBe(true);
    });

    it("ne lève aucun avertissement sur une syntaxe SQL standard compatible", () => {
      const sql = "SELECT nom, prenom FROM eleve WHERE classe_id = 4 ORDER BY nom ASC;";
      const warnings = detecterEcartsDialecteSql(sql);

      expect(warnings).toHaveLength(0);
    });
  });

  describe("Métriques de Performance sur Poste de Référence Lycée (4 Go RAM)", () => {
    it("respecte les seuils de mémoire et de temps de chargement du PRD §3", () => {
      const perf = evaluerMetriquesPosteReference();

      // Temps de chargement à froid < 4s (PRD §3)
      expect(perf.coldStartLoadingMs).toBeLessThan(4000);

      // Rechargement à chaud avec Cache API < 300 ms
      expect(perf.warmStartLoadingMs).toBeLessThan(300);

      // Temps d'exécution p75 < 100 ms
      expect(perf.p75ExecutionTimeMs).toBeLessThan(100);

      // Consommation mémoire totale du bac à sable < 64 Mo
      expect(perf.totalMemoryMb).toBeLessThan(64);

      // Empreinte sur les 4 Go de RAM d'un poste de référence < 2%
      expect(perf.ramUsagePercentOn4Gb).toBeLessThan(2.0);
    });
  });

  describe("Chiffrage et Faisabilité du Plan B (Conteneurs Isolés Serveur - PRD §8.3)", () => {
    it("modélise un coût par élève et par session d'examen réaliste", () => {
      const planB = chiffrerPlanB();

      expect(planB.coutHoraireParConteneurEur).toBeLessThanOrEqual(0.02);
      expect(planB.elevesSimultanesClasse).toBe(35);

      // Coût pour une classe entière de 35 élèves pendant une épreuve de 2h < 1.50 €
      expect(planB.coutSessionExamen2hEur).toBeLessThan(1.5);

      // Coût annuel estimé par lycée < 100 €
      expect(planB.coutAnnuelLyceeEstimeEur).toBeLessThan(100);

      expect(planB.avantages.length).toBeGreaterThanOrEqual(2);
      expect(planB.inconvenients.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Rapport Officiel de Décision Phase 0 (PRD §7.4, §7.5)", () => {
    it("aboutit à la décision formelle 'Go conditionnel' avec 100% des scénarios essentiels réussis", () => {
      const rapport = genererRapportPhase0();

      expect(rapport.tauxSuccesEssentiels).toBe(100);
      expect(rapport.tauxSuccesSecondaires).toBe(100);
      expect(rapport.decision).toBe("Go conditionnel");
      expect(rapport.justification).toContain("Les 3 scénarios essentiels");
      expect(rapport.gardesFousRequis.length).toBeGreaterThanOrEqual(3);

      expect(rapport.gardesFousRequis.some((g) => g.includes("Contrôleur de dialecte SQL"))).toBe(
        true,
      );
      expect(rapport.gardesFousRequis.some((g) => g.includes("Service Worker"))).toBe(true);
      expect(rapport.gardesFousRequis.some((g) => g.includes("Watchdog"))).toBe(true);
    });
  });
});
