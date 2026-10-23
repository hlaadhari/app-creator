/**
 * Suite de tests de conformité scientifique et pédagogique Bac STI 2023 : Location d'Habits
 *
 * Vérifie :
 * 1. Moteur SQL & SGBD MySQLi (types VARCHAR/CHAR/INT/DECIMAL/DATE, contraintes PRIMARY KEY simple et composée,
 *    FOREIGN KEY ... REFERENCES, NOT NULL, UNIQUE, DEFAULT, CHECK, format mysqli_error($cnx) et syntaxes hors-programme).
 * 2. Validation Client Web (HTML5 <form action method="post" onsubmit="return ...">, attributs name et id,
 *    CSS3 modèle de boîte margin/padding/border, .L1, #titre, display: inline-block, et JS verif2() sur entrées valides/invalides).
 * 3. Validation Serveur PHP & MySQLi procédural ($_POST / extract($_POST), mysqli_connect/query/num_rows/affected_rows/fetch_array/error,
 *    blocage strict de PDO, $mysqli->query, ORM).
 * 4. Scénario complet Examen Bac Pratique 2023 (Table Location, JS verif2(), script location.php INSERT + UPDATE disponible='N').
 */

import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import {
  MySqliSimulator,
  detecterSyntaxesSqlHorsProgramme,
  evaluerConformiteSqlBacSti,
} from "@/lib/evaluator/sql-checker";
import {
  verifierFeuilleCss3,
  verifierStructureHtmlFormulaire,
  verifierValidationJavaScript,
} from "@/lib/evaluator/web-checker";
import {
  detecterConstructionsPhpHorsProgramme,
  executerScriptPhpMysqli,
  verifierCodePhpProcedurale,
} from "@/lib/evaluator/php-checker";

const BAC2023_DIR = path.resolve(__dirname, "../../content/exam-bac2023-location-habits");

describe("Conformité Scientifique & Programme Officiel Bac STI (SQL, Web, PHP/MySQLi & Bac 2023)", () => {
  // =========================================================================
  // 1. Tests d'Assertion SQL & Conformité SGBD (`lib/evaluator/sql-checker.ts`)
  // =========================================================================
  describe("1. Moteur MySQLi & Conformité SGBD (sql-checker)", () => {
    it("valide la gestion stricte des types (VARCHAR, CHAR, INT, DECIMAL, DATE) et remonte les erreurs au format mysqli_error($cnx)", () => {
      const sim = new MySqliSimulator();
      sim.executeScript(`
        CREATE TABLE article_test (
          code CHAR(4) PRIMARY KEY,
          libelle VARCHAR(10) NOT NULL,
          quantite INT NOT NULL,
          prix DECIMAL(5,2) NOT NULL,
          date_ajout DATE NOT NULL
        );
      `);

      // Insertion valide
      const okRes = sim.query(
        "INSERT INTO article_test (code, libelle, quantite, prix, date_ajout) VALUES ('A001', 'Caftan', 3, 125.50, '2023-05-15')",
      );
      expect(okRes.success).toBe(true);
      expect(sim.mysqli_error()).toBe("");

      // Dépassement VARCHAR(10) -> #1406 Data too long
      const tooLongRes = sim.query(
        "INSERT INTO article_test (code, libelle, quantite, prix, date_ajout) VALUES ('A002', 'LibelleTropLongPourColonne', 1, 50.00, '2023-05-15')",
      );
      expect(tooLongRes.success).toBe(false);
      expect(sim.mysqli_error()).toContain("#1406");
      expect(sim.mysqli_error()).toContain("Data too long for column 'libelle'");

      // Type INT invalide -> #1366 Incorrect integer value
      const badIntRes = sim.query(
        "INSERT INTO article_test (code, libelle, quantite, prix, date_ajout) VALUES ('A003', 'Jebba', 'abc', 50.00, '2023-05-15')",
      );
      expect(badIntRes.success).toBe(false);
      expect(sim.mysqli_error()).toContain("#1366");

      // Type DATE invalide -> #1292 Incorrect date value
      const badDateRes = sim.query(
        "INSERT INTO article_test (code, libelle, quantite, prix, date_ajout) VALUES ('A004', 'Jebba', 2, 50.00, '15/05/2023')",
      );
      expect(badDateRes.success).toBe(false);
      expect(sim.mysqli_error()).toContain("#1292");
    });

    it("intercepte la violation des contraintes PRIMARY KEY, FOREIGN KEY, NOT NULL, UNIQUE, DEFAULT et CHECK", () => {
      const sim = new MySqliSimulator();
      sim.executeScript(`
        CREATE TABLE categorie (
          codecat INT PRIMARY KEY,
          libelle VARCHAR(30) NOT NULL UNIQUE
        );
        CREATE TABLE habit_test (
          codehab INT PRIMARY KEY,
          codecat INT NOT NULL,
          disponible CHAR(1) DEFAULT 'O' CHECK (disponible IN ('O', 'N')),
          FOREIGN KEY (codecat) REFERENCES categorie(codecat)
        );
        INSERT INTO categorie VALUES (1, 'Traditionnel');
      `);

      // 1. Violation UNIQUE sur categorie.libelle -> #1062 Duplicate entry
      const dupUnique = sim.query("INSERT INTO categorie VALUES (2, 'Traditionnel')");
      expect(dupUnique.success).toBe(false);
      expect(sim.mysqli_error()).toContain("#1062");

      // 2. Violation FOREIGN KEY (codecat 99 inexistant) -> #1452 foreign key constraint fails
      const badFk = sim.query(
        "INSERT INTO habit_test (codehab, codecat, disponible) VALUES (10, 99, 'O')",
      );
      expect(badFk.success).toBe(false);
      expect(sim.mysqli_error()).toContain("#1452");
      expect(sim.mysqli_error()).toContain("foreign key constraint fails");

      // 3. Violation CHECK (disponible = 'X' hors ('O', 'N')) -> #3819 Check constraint is violated
      const badCheck = sim.query(
        "INSERT INTO habit_test (codehab, codecat, disponible) VALUES (10, 1, 'X')",
      );
      expect(badCheck.success).toBe(false);
      expect(sim.mysqli_error()).toContain("#3819");

      // 4. Application de DEFAULT 'O' lorsque 'disponible' est omis
      const defaultOk = sim.query("INSERT INTO habit_test (codehab, codecat) VALUES (10, 1)");
      expect(defaultOk.success).toBe(true);
      expect(sim.getTableRows("habit_test")[0]?.["disponible"]).toBe("O");

      // 5. Violation PRIMARY KEY dupliquée -> #1062 Duplicate entry
      const dupPk = sim.query("INSERT INTO habit_test (codehab, codecat) VALUES (10, 1)");
      expect(dupPk.success).toBe(false);
      expect(sim.mysqli_error()).toContain("#1062");
    });

    it("signale un avertissement pédagogique pour les syntaxes SQL hors-programme (PostgreSQL / SQLite)", () => {
      const pgAndSqliteQuery = `
        PRAGMA foreign_keys = ON;
        CREATE TABLE t (id SERIAL PRIMARY KEY, nom TEXT AUTOINCREMENT);
        SELECT nom || ' ' || prenom FROM t WHERE nom ILIKE 'sami%' RETURNING id;
      `;
      const warnings = detecterSyntaxesSqlHorsProgramme(pgAndSqliteQuery);
      const codes = warnings.map((w) => w.code);

      expect(codes).toContain("SQL_HP_SERIAL");
      expect(codes).toContain("SQL_HP_RETURNING");
      expect(codes).toContain("SQL_HP_PG_SYNTAX");
      expect(codes).toContain("SQL_HP_SQLITE_AUTOINCREMENT");
      expect(codes).toContain("SQL_HP_SQLITE_PRAGMA");
      expect(codes).toContain("SQL_HP_CONCAT_PIPE");
    });
  });

  // =========================================================================
  // 2. Validation Client : DOM, HTML5, CSS3 & JavaScript (`lib/evaluator/web-checker.ts`)
  // =========================================================================
  describe("2. Validation Client : HTML5, CSS3 & JavaScript (web-checker)", () => {
    it("vérifie <form action='...php' method='post' onsubmit='return verif();'> et les attributs name/id", () => {
      const validHtml = `
        <form action="location.php" method="post" onsubmit="return verif();">
          <input type="text" id="cin" name="cin" />
          <select id="habit" name="habit"><option value="1">Jebba</option></select>
          <input type="submit" value="Envoyer" />
        </form>
      `;
      const resOk = verifierStructureHtmlFormulaire(validHtml, "location.php", "verif");
      expect(resOk.conforme).toBe(true);
      expect(resOk.fieldsMissingName).toHaveLength(0);
      expect(resOk.fieldsMissingId).toHaveLength(0);

      // Cas piège Bac : oubli de l'attribut name sur le champ cin
      const htmlMissingName = `
        <form action="location.php" method="post" onsubmit="return verif();">
          <input type="text" id="cin" />
        </form>
      `;
      const resKo = verifierStructureHtmlFormulaire(htmlMissingName, "location.php", "verif");
      expect(resKo.conforme).toBe(false);
      expect(resKo.fieldsMissingName).toContain("cin");
    });

    it("valide le modèle de boîte CSS3, les classes (.L1), identifiants (#titre) et display: inline-block sur <label>", () => {
      const css = `
        #titre { color: #1a365d; margin-bottom: 20px; }
        .L1 { padding: 12px; border: 1px solid #ccc; }
        label { display: inline-block; width: 150px; }
      `;
      const res = verifierFeuilleCss3(css, {
        requireLabelInlineBlock: true,
        expectedClassSelectors: [".L1"],
        expectedIdSelectors: ["#titre"],
      });

      expect(res.conforme).toBe(true);
      expect(res.hasMargin).toBe(true);
      expect(res.hasPadding).toBe(true);
      expect(res.hasBorder).toBe(true);
      expect(res.hasLabelInlineBlock).toBe(true);
    });

    it("valide en isolation JS le CIN (8 chiffres avec .length et isNaN), les listes (.selectedIndex !== 0), les radios (.checked) et return false;", () => {
      const html = `
        <form>
          <input type="text" id="cin" name="cin" />
          <select id="lycee" name="lycee">
            <option value="">-- Choisir --</option>
            <option value="L1">Lycée Pilote</option>
          </select>
          <input type="radio" id="r1" name="genre" value="M" />
          <input type="radio" id="r2" name="genre" value="F" />
        </form>
      `;
      const js = `
        function verif() {
          var cin = document.getElementById("cin").value;
          var lycee = document.getElementById("lycee").selectedIndex;
          var r1 = document.getElementById("r1").checked;
          var r2 = document.getElementById("r2").checked;
          if (cin.length !== 8 || isNaN(cin)) {
            alert("CIN invalide");
            return false;
          }
          if (lycee === 0) {
            alert("Choisir un lycée");
            return false;
          }
          if (!r1 && !r2) {
            alert("Choisir un genre");
            return false;
          }
          return true;
        }
      `;

      const audit = verifierValidationJavaScript(html, js, "verif", [
        {
          description: "Formulaire valide complet",
          fieldValues: { cin: "08765432", lycee: 1, r1: true, r2: false },
          expectedReturn: true,
        },
        {
          description: "CIN à 7 chiffres -> échec",
          fieldValues: { cin: "0876543", lycee: 1, r1: true, r2: false },
          expectedReturn: false,
        },
        {
          description: "Liste déroulante non choisie (selectedIndex 0) -> échec",
          fieldValues: { cin: "08765432", lycee: 0, r1: true, r2: false },
          expectedReturn: false,
        },
        {
          description: "Aucun bouton radio coché -> échec",
          fieldValues: { cin: "08765432", lycee: 1, r1: false, r2: false },
          expectedReturn: false,
        },
      ]);

      expect(audit.conforme).toBe(true);
      expect(audit.usesLengthCheck).toBe(true);
      expect(audit.usesIsNaNCheck).toBe(true);
      expect(audit.usesSelectedIndexOrValue).toBe(true);
      expect(audit.usesCheckedProperty).toBe(true);
      expect(audit.hasReturnFalse).toBe(true);
    });
  });

  // =========================================================================
  // 3. Validation Serveur PHP & MySQLi Procédural (`lib/evaluator/php-checker.ts`)
  // =========================================================================
  describe("3. Validation Serveur PHP & MySQLi Procédural (php-checker)", () => {
    it("accepte sans avertissement un script utilisant exclusivement l'API procédurale MySQLi et $_POST / extract($_POST)", () => {
      const proceduralPhp = `<?php
        extract($_POST);
        $cnx = mysqli_connect("localhost", "root", "", "bd_bac") or die(mysqli_error($cnx));
        $req = "SELECT * FROM client WHERE cin = '$cin'";
        $res = mysqli_query($cnx, $req);
        if (mysqli_num_rows($res) > 0) {
          $ligne = mysqli_fetch_array($res);
          echo $ligne['nom'];
        }
        mysqli_close($cnx);
      ?>`;

      const report = verifierCodePhpProcedurale(proceduralPhp, ["cin"]);
      expect(report.conformeProgramme).toBe(true);
      expect(report.strictlyProceduralMysqli).toBe(true);
      expect(report.forbiddenConstructs).toHaveLength(0);
    });

    it("bloque et signale PDO, PDOStatement, les méthodes orientées objet ($mysqli->query) et les ORM modernes", () => {
      const nonCompliantPhp = `<?php
        $pdo = new PDO("mysql:host=localhost;dbname=bd", "root", "");
        $stmt = $pdo->prepare("SELECT * FROM client");
        $mysqli = new mysqli("localhost", "root", "", "bd");
        $res = $mysqli->query("SELECT * FROM habit");
        $ prisma = new PrismaClient();
      ?>`;

      const forbidden = detecterConstructionsPhpHorsProgramme(nonCompliantPhp);
      const codes = forbidden.map((f) => f.code);

      expect(codes).toContain("PHP_HP_PDO");
      expect(codes).toContain("PHP_HP_MYSQLI_OO_NEW");
      expect(codes).toContain("PHP_HP_MYSQLI_OO_METHOD");
      expect(codes).toContain("PHP_HP_ORM");

      const audit = verifierCodePhpProcedurale(nonCompliantPhp);
      expect(audit.conformeProgramme).toBe(false);
      expect(audit.strictlyProceduralMysqli).toBe(false);
    });
  });

  // =========================================================================
  // 4. Valideur de Sujet Exemple : Examen Bac Pratique 2023 (Location d'Habits)
  // =========================================================================
  describe("4. Examen Bac Pratique 2023 – Location d'Habits", () => {
    const initSql = fs.readFileSync(path.join(BAC2023_DIR, "db", "init.sql"), "utf-8");
    const solutionHtml = fs.readFileSync(
      path.join(BAC2023_DIR, "solution", "location.html"),
      "utf-8",
    );
    const solutionJs = fs.readFileSync(path.join(BAC2023_DIR, "solution", "controls.js"), "utf-8");
    const solutionPhp = fs.readFileSync(
      path.join(BAC2023_DIR, "solution", "location.php"),
      "utf-8",
    );

    it("Test 1 : valide la création de la table Location avec clé primaire composée (codehab#, cin#, date_loc) et clés étrangères", () => {
      const baseTablesSql = `
        CREATE TABLE client (
          cin VARCHAR(8) PRIMARY KEY,
          nom VARCHAR(30) NOT NULL,
          prenom VARCHAR(30) NOT NULL,
          tel VARCHAR(8) NOT NULL
        );
        CREATE TABLE habit (
          codehab INT PRIMARY KEY AUTO_INCREMENT,
          description VARCHAR(100) NOT NULL,
          taille VARCHAR(5) NOT NULL,
          prix_jour DECIMAL(6,2) NOT NULL,
          disponible CHAR(1) DEFAULT 'O' CHECK (disponible IN ('O', 'N'))
        );
      `;

      const studentLocationDdl = `
        CREATE TABLE Location (
          codehab INT NOT NULL,
          cin VARCHAR(8) NOT NULL,
          date_loc DATE NOT NULL,
          duree INT NOT NULL CHECK (duree > 0),
          PRIMARY KEY (codehab, cin, date_loc),
          FOREIGN KEY (codehab) REFERENCES habit(codehab),
          FOREIGN KEY (cin) REFERENCES client(cin)
        );
      `;

      const report = evaluerConformiteSqlBacSti(
        studentLocationDdl,
        {
          tableName: "Location",
          expectedPrimaryKey: ["codehab#", "cin#", "date_loc"],
          expectedForeignKeys: [
            { column: "codehab#", refTable: "habit", refColumn: "codehab" },
            { column: "cin#", refTable: "client", refColumn: "cin" },
          ],
          expectedColumns: [
            { name: "codehab", baseType: "INT", notNull: true },
            { name: "cin", baseType: "VARCHAR", notNull: true },
            { name: "date_loc", baseType: "DATE", notNull: true },
            { name: "duree", baseType: "INT", notNull: true, hasCheck: true },
          ],
        },
        baseTablesSql,
      );

      expect(report.conformeProgramme).toBe(true);
      expect(report.score).toBe(report.scoreMax);
      expect(report.avertissementsHorsProgramme).toHaveLength(0);
    });

    it("Test 2 : valide la fonction JS verif2() sur des entrées valides et invalides (ex: CIN à 7 chiffres ➔ échec)", () => {
      const jsReport = verifierValidationJavaScript(solutionHtml, solutionJs, "verif2", [
        {
          description: "Saisie valide (CIN 8 chiffres, habit sélectionné, date et durée > 0)",
          fieldValues: {
            cin: "08765432",
            id_habit: "1",
            date_loc: "2023-06-01",
            duree: "3",
          },
          expectedReturn: true,
        },
        {
          description: "CIN à 7 chiffres -> échec (return false)",
          fieldValues: {
            cin: "0876543",
            id_habit: "1",
            date_loc: "2023-06-01",
            duree: "3",
          },
          expectedReturn: false,
        },
        {
          description: "CIN non numérique (lettres) -> échec (return false)",
          fieldValues: {
            cin: "0876543A",
            id_habit: "1",
            date_loc: "2023-06-01",
            duree: "3",
          },
          expectedReturn: false,
        },
        {
          description: "Aucun habit sélectionné -> échec (return false)",
          fieldValues: {
            cin: "08765432",
            id_habit: "",
            date_loc: "2023-06-01",
            duree: "3",
          },
          expectedReturn: false,
        },
        {
          description: "Durée nulle ou négative -> échec (return false)",
          fieldValues: {
            cin: "08765432",
            id_habit: "1",
            date_loc: "2023-06-01",
            duree: "0",
          },
          expectedReturn: false,
        },
      ]);

      expect(jsReport.conforme).toBe(true);
      expect(jsReport.testCasesResults.every((tc) => tc.passed)).toBe(true);
    });

    it("Test 3 : exécute location.php (contrôle de disponibilité de l'habit, INSERT INTO location et UPDATE habit SET disponible='N')", () => {
      // Vérification statique de la conformité procédurale MySQLi de location.php
      const phpAudit = verifierCodePhpProcedurale(solutionPhp, [
        "cin",
        "id_habit",
        "date_loc",
        "duree",
      ]);
      expect(phpAudit.conformeProgramme).toBe(true);
      expect(phpAudit.forbiddenConstructs).toHaveLength(0);

      // Initialisation du simulateur SGBD avec la base officielle bd2023
      const sim = new MySqliSimulator();
      const seedRes = sim.executeScript(initSql);
      expect(seedRes.success).toBe(true);

      // Cas A : Location d'un habit disponible (id_habit = 1, disponible = 'O') par un client existant (08765432)
      const execOk = executerScriptPhpMysqli(
        solutionPhp,
        {
          cin: "08765432",
          id_habit: "1",
          date_loc: "2023-05-25",
          duree: "4",
        },
        sim,
      );

      expect(execOk.success).toBe(true);
      expect(execOk.executedQueries.some((q) => /INSERT\s+INTO\s+location/i.test(q))).toBe(true);
      expect(
        execOk.executedQueries.some((q) => /UPDATE\s+habit\s+SET\s+disponible\s*=\s*'N'/i.test(q)),
      ).toBe(true);

      // Vérifier l'état de la base après l'exécution de location.php
      const locations = sim.getTableRows("location");
      expect(locations).toHaveLength(1);
      expect(locations[0]?.["cin"]).toBe("08765432");
      expect(locations[0]?.["id_habit"]).toBe(1);

      const habits = sim.getTableRows("habit");
      const habit1 = habits.find((h) => h["id_habit"] === 1);
      expect(habit1?.["disponible"]).toBe("N");

      // Cas B : Tentative de relouer le même habit (id_habit = 1 désormais indisponible 'N') -> refus sans nouvel INSERT
      const execAlreadyRented = executerScriptPhpMysqli(
        solutionPhp,
        {
          cin: "12345678",
          id_habit: "1",
          date_loc: "2023-05-26",
          duree: "2",
        },
        sim,
      );
      expect(execAlreadyRented.outputHtml).toContain("indisponible");
      expect(sim.getTableRows("location")).toHaveLength(1);
    });
  });
});
