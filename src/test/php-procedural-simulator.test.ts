/**
 * Tests du simulateur procédural PHP / MySQLi certifié Bac STI (Issue #125, TEC-01)
 *
 * Vérifie :
 * 1. Exécution des scripts PHP procéduraux des sujets Bac 2018, 2023, 2025 et 2026
 *    contre les tables SQL réelles du sujet avec modification d'état vérifiable.
 * 2. Prise en charge des requêtes préparées (mysqli_prepare, bind_param, execute, store_result, num_rows).
 * 3. Prise en charge des inclusions de fichiers virtuels (include "connexion.php").
 * 4. Transparence absolue du moteur (engine: "Simulateur procédural PHP/MySQLi Bac STI", isSimulator: true).
 */

import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { MySqliSimulator } from "@/lib/evaluator/sql-checker";
import { ENGINE_NAME, executerScriptPhpProcedural } from "@/lib/php/procedural-simulator";
import { PhpRunner } from "@/lib/php/php-runner";

const CONTENT_DIR = path.resolve(__dirname, "../../content");
const read = (...parts: string[]) => fs.readFileSync(path.join(CONTENT_DIR, ...parts), "utf-8");

describe("TEC-01 : Simulateur Procédural PHP / MySQLi certifié Bac STI (Issue #125)", () => {
  // =========================================================================
  // 1. Bac STI 2018 : Évaluation Automobile (Test Drive)
  // =========================================================================
  describe("1. Bac 2018 - evaluer.php (bd_testdrive)", () => {
    const initSql = read("exam-bac2018-test-drive", "db", "init.sql");
    const scriptPhp = read("exam-bac2018-test-drive", "solution", "evaluer.php");

    it("insère une nouvelle évaluation pour un client et un véhicule existants", () => {
      const sim = new MySqliSimulator();
      sim.executeScript(initSql);

      const res = executerScriptPhpProcedural(
        {
          id: "test-bac2018-ok",
          script: scriptPhp,
          post: {
            cin: "09876543",
            immatriculation: "198-TN-1234",
            date_test: "2023-05-15",
            note_confort: "4",
            note_conduite: "5",
            note_securite: "4",
            commentaire: "Essai parfait et tenue de route irréprochable",
          },
          method: "POST",
        },
        { simulator: sim },
      );

      expect(res.success).toBe(true);
      expect(res.isSimulator).toBe(true);
      expect(res.engine).toBe(ENGINE_NAME);
      expect(res.stdout).toContain("Bilan de l'Évaluation Test Drive");
      expect(res.executedQueries?.length).toBeGreaterThan(0);

      // Vérification de l'état de la base
      const evals = sim.getTableRows("evaluation");
      expect(evals).toHaveLength(3); // 2 amorces + 1 nouvelle
      const last = evals[evals.length - 1];
      expect(last?.["cin"]).toBe("09876543");
      expect(last?.["immatriculation"]).toBe("198-TN-1234");
    });

    it("rejette l'évaluation lorsque le client est inexistant dans la base", () => {
      const sim = new MySqliSimulator();
      sim.executeScript(initSql);

      const res = executerScriptPhpProcedural(
        {
          id: "test-bac2018-unknown-client",
          script: scriptPhp,
          post: {
            cin: "00000000",
            immatriculation: "198-TN-1234",
            date_test: "2023-05-15",
            note_confort: "4",
            note_conduite: "5",
            note_securite: "4",
            commentaire: "Client non inscrit",
          },
          method: "POST",
        },
        { simulator: sim },
      );

      expect(res.stdout).toContain("n'est pas enregistré");
      // Aucune insertion supplémentaire
      expect(sim.getTableRows("evaluation")).toHaveLength(2);
    });
  });

  // =========================================================================
  // 2. Bac STI 2023 : Location d'Habits Traditionnels (bd2023)
  // =========================================================================
  describe("2. Bac 2023 - location.php (bd2023)", () => {
    const initSql = read("exam-bac2023-location-habits", "db", "init.sql");
    const scriptPhp = read("exam-bac2023-location-habits", "solution", "location.php");

    it("enregistre la location et met à jour l'habit en disponible='N'", () => {
      const sim = new MySqliSimulator();
      sim.executeScript(initSql);

      const res = executerScriptPhpProcedural(
        {
          id: "test-bac2023-ok",
          script: scriptPhp,
          post: {
            cin: "08765432",
            id_habit: "1",
            date_loc: "2023-05-25",
            duree: "4",
          },
          method: "POST",
        },
        { simulator: sim },
      );

      expect(res.success).toBe(true);
      expect(res.stdout).toContain("Location Enregistrée avec Succès");

      const locations = sim.getTableRows("location");
      expect(locations).toHaveLength(1);
      expect(locations[0]?.["cin"]).toBe("08765432");

      const habit1 = sim.getTableRows("habit").find((h) => h["id_habit"] === 1);
      expect(habit1?.["disponible"]).toBe("N");
    });
  });

  // =========================================================================
  // 3. Bac STI 2025 : Droits d'Accès Documents Partagés (bd2025)
  // =========================================================================
  describe("3. Bac 2025 - ajout.php et droit.php (bd2025)", () => {
    const initSql = read("exam-bac2025-droits-acces", "db", "init.sql");
    const ajoutPhp = read("exam-bac2025-droits-acces", "solution", "ajout.php");
    const droitPhp = read("exam-bac2025-droits-acces", "solution", "droit.php");

    it("ajout.php insère un nouvel utilisateur avec succès", () => {
      const sim = new MySqliSimulator();
      sim.executeScript(initSql);

      const res = executerScriptPhpProcedural(
        {
          id: "test-bac2025-ajout",
          script: ajoutPhp,
          post: {
            idUtil: "U007",
            nomPrenom: "Mouna BEN SALEM",
          },
          method: "POST",
        },
        { simulator: sim },
      );

      expect(res.success).toBe(true);
      expect(res.stdout).toContain("Utilisateur ajouté avec succès");

      const users = sim.getTableRows("utilisateur");
      expect(users).toHaveLength(7);
      expect(users.some((u) => (u["idUtil"] || u["idutil"]) === "U007")).toBe(true);
    });

    it("droit.php insère un nouveau droit d'accès pour un document existant", () => {
      const sim = new MySqliSimulator();
      sim.executeScript(initSql);

      const res = executerScriptPhpProcedural(
        {
          id: "test-bac2025-droit-insert",
          script: droitPhp,
          post: {
            idUtil: "U001",
            doc: "D0002",
            ecriture: "O",
            lecture: "O",
            impression: "N",
          },
          method: "POST",
        },
        { simulator: sim },
      );

      expect(res.success).toBe(true);
      expect(res.stdout).toContain("Insertion des droits d'accès réussie");

      const droits = sim.getTableRows("droit");
      expect(
        droits.some(
          (d) => (d["idUtil"] || d["idutil"]) === "U001" && (d["idDoc"] || d["iddoc"]) === "D0002",
        ),
      ).toBe(true);
    });

    it("droit.php signale l'erreur si l'utilisateur est inexistant", () => {
      const sim = new MySqliSimulator();
      sim.executeScript(initSql);

      const res = executerScriptPhpProcedural(
        {
          id: "test-bac2025-droit-notfound",
          script: droitPhp,
          post: {
            idUtil: "U999",
            doc: "D0001",
            lecture: "O",
          },
          method: "POST",
        },
        { simulator: sim },
      );

      expect(res.stdout).toContain("Erreur : Utilisateur inexistant");
    });
  });

  // =========================================================================
  // 4. Bac STI 2026 : Bijoux Aurythia (bd2026_bijoux)
  // =========================================================================
  describe("4. Bac 2026 - ajout.php et evaluation.php (bd2026_bijoux)", () => {
    const initSql = read("exam-bac2026-bijoux-aurythia", "db", "init.sql");
    const ajoutPhp = read("exam-bac2026-bijoux-aurythia", "solution", "ajout.php");
    const evalPhp = read("exam-bac2026-bijoux-aurythia", "solution", "evaluation.php");

    it("ajout.php insère un bijou et sa composition avec transaction", () => {
      const sim = new MySqliSimulator();
      sim.executeScript(initSql);

      const res = executerScriptPhpProcedural(
        {
          id: "test-bac2026-bijou-ajout",
          script: ajoutPhp,
          post: {
            idBij: "BJ001",
            desc: "Collier Diamant et Argent",
            prix: "350",
            poids: "25",
            c1: "A",
          },
          method: "POST",
        },
        { simulator: sim },
      );

      expect(res.success).toBe(true);
      expect(res.stdout).toContain("Ajout effectué avec succès");

      const bijoux = sim.getTableRows("bijou");
      expect(bijoux.some((b) => (b["idBij"] || b["idbij"]) === "BJ001")).toBe(true);
    });

    it("evaluation.php enregistre l'évaluation par un expert", () => {
      const sim = new MySqliSimulator();
      sim.executeScript(initSql);

      // Insérer d'abord le bijou BJ001
      sim.query(
        "INSERT INTO bijou (idBij, description, prixVente, poids) VALUES ('BJ001', 'Bague', 150, 10)",
      );

      const res = executerScriptPhpProcedural(
        {
          id: "test-bac2026-bijou-eval",
          script: evalPhp,
          post: {
            idBij: "BJ001",
            expert: "A22",
            finition: "4",
            originalite: "O",
            commentaire: "Création très soignée",
          },
          method: "POST",
        },
        { simulator: sim },
      );

      expect(res.success).toBe(true);
      expect(res.stdout).toContain("Evaluation enregistrée avec succès");

      const evals = sim.getTableRows("evaluation");
      expect(
        evals.some(
          (e) => (e["idBij"] || e["idbij"]) === "BJ001" && (e["idExp"] || e["idexp"]) === "A22",
        ),
      ).toBe(true);
    });
  });

  // =========================================================================
  // 5. Bac STI 2026 : Croisières Marivana (bd2026_croisieres) avec include
  // =========================================================================
  describe("5. Bac 2026 - reservation.php avec include 'connexion.php' (bd2026_croisieres)", () => {
    const initSql = read("exam-bac2026-croisieres-marivana", "db", "init.sql");
    const connexionPhp = read("exam-bac2026-croisieres-marivana", "solution", "connexion.php");
    const reservationPhp = read("exam-bac2026-croisieres-marivana", "solution", "reservation.php");

    it("détecte une réservation déjà existante pour le client et la croisière", () => {
      const sim = new MySqliSimulator();
      sim.executeScript(initSql);

      const res = executerScriptPhpProcedural(
        {
          id: "test-bac2026-croisiere-already-booked",
          script: reservationPhp,
          files: {
            "connexion.php": connexionPhp,
            "reservation.php": reservationPhp,
          },
          entrypoint: "reservation.php",
          post: {
            idCl: "01234567",
            nomCl: "Najla Soussi",
            telCl: "98765432",
            idCro: "101",
            nbPlace: "2",
          },
          method: "POST",
        },
        { simulator: sim },
      );

      expect(res.success).toBe(true);
      expect(res.stdout).toContain("Réservation déjà faite");
      // Toujours 1 seule réservation amorcée
      expect(sim.getTableRows("reservation")).toHaveLength(1);
    });

    it("exécute reservation.php en résolvant include 'connexion.php' et enregistre une nouvelle réservation", () => {
      const sim = new MySqliSimulator();
      sim.executeScript(initSql);

      const res = executerScriptPhpProcedural(
        {
          id: "test-bac2026-croisiere-res",
          script: reservationPhp,
          files: {
            "connexion.php": connexionPhp,
            "reservation.php": reservationPhp,
          },
          entrypoint: "reservation.php",
          post: {
            idCl: "08888888",
            nomCl: "Sami Ben Amor",
            telCl: "55443322",
            idCro: "102",
            nbPlace: "3",
          },
          method: "POST",
        },
        { simulator: sim },
      );

      expect(res.success).toBe(true);
      expect(res.stdout).toContain("Réservation enregistrée dans l'attente de confirmation");

      const clients = sim.getTableRows("client");
      expect(clients.some((c) => (c["idCl"] || c["idcl"]) === "08888888")).toBe(true);

      const reservations = sim.getTableRows("reservation");
      expect(reservations).toHaveLength(2); // 1 amorcée + 1 nouvelle
      const newRes = reservations.find((r) => (r["idCl"] || r["idcl"]) === "08888888");
      expect(newRes).toBeDefined();
      expect(newRes?.["idCro"] || newRes?.["idcro"]).toBe("102");
    });
  });

  // =========================================================================
  // 6. Intégration globale via PhpRunner & Transparence de l'interface
  // =========================================================================
  describe("6. Intégration via PhpRunner et Transparence du Moteur", () => {
    it("déclare explicitement le nom du moteur et l'indicateur isSimulator", async () => {
      const runner = new PhpRunner();
      const res = await runner.execute("<?php echo 'Hello STI'; ?>");

      expect(res.isSimulator).toBe(true);
      expect(res.engine).toBe("Simulateur procédural PHP/MySQLi Bac STI");
      expect(res.stdout).toBe("Hello STI");
    });
  });
});
