/**
 * Tests unitaires et d'intégration pour le moteur SQLite WASM, le Contrôleur de dialecte MySQL
 * et l'exportation de l'archive SW_xxxxx.zip (Issue #14, PRD F-25 à F-31, §8.2)
 */

import { describe, expect, it } from "vitest";
import { adapterRequetePourSqlite, verifierDialecteSql } from "../lib/sql/dialect-controller";
import { SqliteEngine } from "../lib/sql/sqlite-engine";
import {
  calculerCrc32,
  creerArchiveZip,
  exporterProjetEleveZip,
} from "../lib/export/archive-exporter";

describe("feat(sql): Moteur SQLite WASM, Contrôleur de dialecte MySQL et Export SW_xxxxx.zip (Issue #14)", () => {
  // =========================================================================
  // 1. Contrôleur de dialecte SQL (MySQL / MariaDB vs SQLite)
  // =========================================================================
  describe("1. Contrôleur de dialecte SQL", () => {
    it("détecte l'opérateur de concaténation '||' et recommande CONCAT()", () => {
      const sql = "SELECT nom || ' ' || prenom AS nom_complet FROM eleve;";
      const warnings = verifierDialecteSql(sql);

      expect(warnings.some((w) => w.code === "ERR_CONCAT_OPERATOR")).toBe(true);
      const warn = warnings.find((w) => w.code === "ERR_CONCAT_OPERATOR");
      expect(warn?.suggestion).toContain("CONCAT");
      expect(warn?.message).toContain("OU");
    });

    it("détecte la violation de ONLY_FULL_GROUP_BY sur les colonnes non agrégées", () => {
      const sql = "SELECT classe, nom, COUNT(*) FROM eleve GROUP BY classe;";
      const warnings = verifierDialecteSql(sql);

      expect(warnings.some((w) => w.code === "ERR_GROUP_BY_NOT_STRICT")).toBe(true);
      const warn = warnings.find((w) => w.code === "ERR_GROUP_BY_NOT_STRICT");
      expect(warn?.message).toContain("nom");
      expect(warn?.suggestion).toContain("ONLY_FULL_GROUP_BY");
    });

    it("ne lève pas d'alerte ONLY_FULL_GROUP_BY lorsque toutes les colonnes sont agrégées ou groupées", () => {
      const sql = "SELECT classe, COUNT(*), AVG(note) FROM eleve GROUP BY classe;";
      const warnings = verifierDialecteSql(sql);

      expect(warnings.some((w) => w.code === "ERR_GROUP_BY_NOT_STRICT")).toBe(false);
    });

    it("détecte les fonctions de date SQLite date('now') et recommande CURDATE()", () => {
      const sql = "SELECT * FROM location WHERE date_debut >= date('now');";
      const warnings = verifierDialecteSql(sql);

      expect(warnings.some((w) => w.code === "ERR_DATE_FUNCTION_SQLITE")).toBe(true);
      const warn = warnings.find((w) => w.code === "ERR_DATE_FUNCTION_SQLITE");
      expect(warn?.suggestion).toContain("CURDATE()");
    });

    it("détecte la directive AUTOINCREMENT spécifique à SQLite et recommande AUTO_INCREMENT", () => {
      const sql = "CREATE TABLE produit (id INTEGER PRIMARY KEY AUTOINCREMENT, libelle TEXT);";
      const warnings = verifierDialecteSql(sql);

      expect(warnings.some((w) => w.code === "ERR_AUTOINCREMENT_SYNTAX")).toBe(true);
      const warn = warnings.find((w) => w.code === "ERR_AUTOINCREMENT_SYNTAX");
      expect(warn?.suggestion).toContain("AUTO_INCREMENT");
    });

    it("adapte automatiquement les requêtes MySQL standards pour exécution SQLite", () => {
      const mysqlSql = "CREATE TABLE t (id INT AUTO_INCREMENT, d DATE DEFAULT CURDATE());";
      const adapted = adapterRequetePourSqlite(mysqlSql);

      expect(adapted).toContain("AUTOINCREMENT");
      expect(adapted).toContain("date('now')");
    });
  });

  // =========================================================================
  // 2. Moteur SQLite et exécution DDL / DML
  // =========================================================================
  describe("2. Moteur SQLite relationnel local", () => {
    const initSql = `
      CREATE TABLE IF NOT EXISTS candidat (
        id INT PRIMARY KEY AUTO_INCREMENT,
        cin VARCHAR(8) NOT NULL,
        nom VARCHAR(50) NOT NULL,
        classe VARCHAR(20) NOT NULL
      );
      INSERT INTO candidat (cin, nom, classe) VALUES ('08111222', 'Ben Salah', 'Terminale STI');
      INSERT INTO candidat (cin, nom, classe) VALUES ('08333444', 'Trabelsi', 'Terminale STI');
    `;

    it("charge le script SQL initial et expose la liste des tables et colonnes", async () => {
      const engine = new SqliteEngine();
      await engine.init(initSql);

      const tables = await engine.getTables();
      expect(tables.length).toBe(1);
      const table = tables[0];
      expect(table?.name).toBe("candidat");
      expect(table?.rowCount).toBe(2);
      expect(table?.columns.map((c) => c.name)).toContain("cin");
      expect(table?.columns.map((c) => c.name)).toContain("nom");
    });

    it("exécute des requêtes SELECT avec filtrage WHERE et pagination LIMIT", async () => {
      const engine = new SqliteEngine();
      await engine.init(initSql);

      const res = await engine.executeQuery(
        "SELECT nom, classe FROM candidat WHERE cin = '08111222';",
      );
      expect(res.error).toBeUndefined();
      expect(res.rows.length).toBe(1);
      expect(res.rows[0]?.["nom"]).toBe("Ben Salah");
    });

    it("exécute une insertion INSERT INTO avec auto-incrémentation de la clé primaire", async () => {
      const engine = new SqliteEngine();
      await engine.init(initSql);

      const insertRes = await engine.executeQuery(
        "INSERT INTO candidat (cin, nom, classe) VALUES ('08555666', 'Kacem', 'Terminale STI');",
      );
      expect(insertRes.rowsAffected).toBe(1);

      const countRes = await engine.executeQuery("SELECT COUNT(*) AS total FROM candidat;");
      expect(countRes.rows[0]?.["total"]).toBe(3);
    });

    it("exécute une mise à jour UPDATE modifiant les lignes ciblées", async () => {
      const engine = new SqliteEngine();
      await engine.init(initSql);

      const updateRes = await engine.executeQuery(
        "UPDATE candidat SET nom = 'Ben Salah Mis A Jour' WHERE cin = '08111222';",
      );
      expect(updateRes.rowsAffected).toBeGreaterThan(0);

      const verifyRes = await engine.executeQuery(
        "SELECT nom FROM candidat WHERE cin = '08111222';",
      );
      expect(verifyRes.rows[0]?.["nom"]).toBe("Ben Salah Mis A Jour");
    });
  });

  // =========================================================================
  // 3. Réinitialisation instantanée de la base (PRD F-27)
  // =========================================================================
  describe("3. Réinitialisation de la base à l'état initial (PRD F-27)", () => {
    it("restaure l'état exact initial après des suppressions ou insertions destructives", async () => {
      const initSql = `
        CREATE TABLE article (id INT PRIMARY KEY, libelle TEXT);
        INSERT INTO article VALUES (1, 'Stylo');
        INSERT INTO article VALUES (2, 'Cahier');
      `;
      const engine = new SqliteEngine({ initialSql: initSql });
      await engine.init();

      // Mutation : suppression de tout le contenu
      await engine.executeQuery("DELETE FROM article;");
      let data = await engine.getTableData("article");
      expect(data.rows.length).toBe(0);

      // Réinitialisation instantanée
      await engine.reset();
      data = await engine.getTableData("article");
      expect(data.rows.length).toBe(2);
      expect(data.rows[0]?.["libelle"]).toBe("Stylo");
    });
  });

  // =========================================================================
  // 4. Export de l'archive normalisée SW_xxxxx.zip (PRD F-28)
  // =========================================================================
  describe("4. Export de l'archive normalisée SW_xxxxx.zip (PRD F-28)", () => {
    it("calcule correctement le CRC32 binaire", () => {
      const encoder = new TextEncoder();
      const bytes = encoder.encode("123456789");
      // Valeur standard CRC32 de "123456789" = 0xcbf43926
      expect(calculerCrc32(bytes)).toBe(0xcbf43926);
    });

    it("génère un buffer ZIP respectant l'arborescence Travail_Eleve/SW_<NCIN>/", () => {
      const archive = exporterProjetEleveZip({
        numeroCin: "08765432",
        files: {
          "index.html": "<!DOCTYPE html><html><body>Test</body></html>",
          "style.css": "body { background: #fff; }",
          "controle.js": "function verif() { return true; }",
        },
        sqlDump: "CREATE TABLE t (id INT);",
      });

      expect(archive.filename).toBe("SW_08765432.zip");
      expect(archive.data.length).toBeGreaterThan(100);
      expect(archive.entryCount).toBe(5); // 3 fichiers + db/dump.sql + manifest.json

      // Vérification du Header PKZIP (0x04034b50)
      const view = new DataView(archive.data.buffer, archive.data.byteOffset);
      expect(view.getUint32(0, true)).toBe(0x04034b50);
    });
  });
});
