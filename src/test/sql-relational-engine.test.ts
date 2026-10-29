import { describe, expect, it } from "vitest";
import { decouperRequetesSql, RelationalDatabaseEngine } from "@/lib/sql/relational-engine";
import { SqliteEngine } from "@/lib/sql/sqlite-engine";

describe("Moteur SQL Relationnel Complet (Issue #126 - TEC-02)", () => {
  describe("1. Découpeur lexical SQL (decouperRequetesSql)", () => {
    it("découpe correctement les requêtes simples terminées par un point-virgule", () => {
      const sql = "SELECT * FROM eleve; SELECT * FROM note;";
      const stmts = decouperRequetesSql(sql);
      expect(stmts).toEqual(["SELECT * FROM eleve", "SELECT * FROM note"]);
    });

    it("préserve les points-virgules situés à l'intérieur de chaînes de caractères", () => {
      const sql = `
        INSERT INTO message (id, texte) VALUES (1, 'Bonjour; comment allez-vous ?');
        INSERT INTO message (id, texte) VALUES (2, "Texte; avec point-virgule; double");
      `;
      const stmts = decouperRequetesSql(sql);
      expect(stmts).toHaveLength(2);
      expect(stmts[0]).toContain("'Bonjour; comment allez-vous ?'");
      expect(stmts[1]).toContain('"Texte; avec point-virgule; double"');
    });

    it("gère les commentaires en ligne (--) contenant des points-virgules", () => {
      const sql = `
        -- Initialisation de la table utilisateur; commentaire avec ;
        CREATE TABLE utilisateur (id INT PRIMARY KEY);
        -- Fin de la table;
      `;
      const stmts = decouperRequetesSql(sql);
      expect(stmts).toHaveLength(1);
      expect(stmts[0]).toBe("CREATE TABLE utilisateur (id INT PRIMARY KEY)");
    });

    it("gère les commentaires multi-lignes (/* ... */) contenant des points-virgules", () => {
      const sql = `
        /*
          Script de configuration;
          DROP TABLE test;
        */
        SELECT 1;
      `;
      const stmts = decouperRequetesSql(sql);
      expect(stmts).toHaveLength(1);
      expect(stmts[0]).toBe("SELECT 1");
    });
  });

  describe("2. DDL et Contraintes d'intégrité (CREATE TABLE, ALTER TABLE, DROP TABLE)", () => {
    it("crée une table avec clé primaire simple, NOT NULL et DEFAULT", () => {
      const db = new RelationalDatabaseEngine();
      const res = db.query(`
        CREATE TABLE eleve (
          id INT PRIMARY KEY,
          nom VARCHAR(50) NOT NULL,
          actif INT DEFAULT 1
        )
      `);
      expect(res.error).toBeUndefined();
      const table = db.getTable("eleve");
      expect(table).toBeDefined();
      expect(table?.primaryKey).toEqual(["id"]);
      expect(table?.columns.find((c) => c.name === "nom")?.notNull).toBe(true);
    });

    it("crée une table avec clé primaire composée et contrainte CHECK", () => {
      const db = new RelationalDatabaseEngine();
      const res = db.query(`
        CREATE TABLE inscription (
          eleve_id INT,
          cours_id INT,
          note DECIMAL(4,2) CHECK (note >= 0 AND note <= 20),
          PRIMARY KEY (eleve_id, cours_id)
        )
      `);
      expect(res.error).toBeUndefined();
      const table = db.getTable("inscription");
      expect(table?.primaryKey).toEqual(["eleve_id", "cours_id"]);
      expect(table?.columns.find((c) => c.name === "note")?.checkExpr).toBe(
        "note >= 0 AND note <= 20",
      );
    });

    it("prend en charge ALTER TABLE (ADD COLUMN, ADD CONSTRAINT, DROP COLUMN)", () => {
      const db = new RelationalDatabaseEngine();
      db.query("CREATE TABLE produit (id INT PRIMARY KEY, libelle VARCHAR(50));");
      db.query("INSERT INTO produit VALUES (1, 'Stylo');");

      // ADD COLUMN
      const addRes = db.query("ALTER TABLE produit ADD COLUMN prix DECIMAL(6,2) DEFAULT 0;");
      expect(addRes.error).toBeUndefined();
      let rows = db.getTableRows("produit");
      expect(rows[0]?.["prix"]).toBe(0);

      // DROP COLUMN
      const dropRes = db.query("ALTER TABLE produit DROP COLUMN libelle;");
      expect(dropRes.error).toBeUndefined();
      rows = db.getTableRows("produit");
      expect(rows[0]?.["libelle"]).toBeUndefined();
      expect(rows[0]?.["prix"]).toBe(0);
    });

    it("prend en charge DROP TABLE", () => {
      const db = new RelationalDatabaseEngine();
      db.query("CREATE TABLE temp (id INT);");
      expect(db.getTable("temp")).toBeDefined();
      const dropRes = db.query("DROP TABLE temp;");
      expect(dropRes.error).toBeUndefined();
      expect(db.getTable("temp")).toBeUndefined();
    });
  });

  describe("3. Contrôle strict des violations de contraintes (PRIMARY KEY, NOT NULL, CHECK, FOREIGN KEY)", () => {
    it("rejette les doublons de clé primaire avec l'erreur 1062", () => {
      const db = new RelationalDatabaseEngine();
      db.query("CREATE TABLE classe (id INT PRIMARY KEY, nom VARCHAR(30));");
      db.query("INSERT INTO classe VALUES (1, 'Terminale STI');");
      const dupRes = db.query("INSERT INTO classe VALUES (1, 'Autre classe');");
      expect(dupRes.errno).toBe(1062);
      expect(dupRes.error).toContain("Duplicate entry '1' for key 'classe.PRIMARY'");
    });

    it("rejette les valeurs NULL dans une colonne NOT NULL avec l'erreur 1048", () => {
      const db = new RelationalDatabaseEngine();
      db.query("CREATE TABLE enseignant (id INT PRIMARY KEY, matricule VARCHAR(20) NOT NULL);");
      const nullRes = db.query("INSERT INTO enseignant (id, matricule) VALUES (1, NULL);");
      expect(nullRes.errno).toBe(1048);
      expect(nullRes.error).toContain("Column 'matricule' cannot be null");
    });

    it("rejette les insertions violant une contrainte CHECK avec l'erreur 3819", () => {
      const db = new RelationalDatabaseEngine();
      db.query(
        "CREATE TABLE evaluation (id INT PRIMARY KEY, note DECIMAL(4,2) CHECK (note >= 0 AND note <= 20));",
      );
      const invalidRes = db.query("INSERT INTO evaluation VALUES (1, 25.5);");
      expect(invalidRes.errno).toBe(3819);
      expect(invalidRes.error).toContain("Check constraint");
    });

    it("applique l'intégrité référentielle FOREIGN KEY à l'insertion (erreur 1452)", () => {
      const db = new RelationalDatabaseEngine();
      db.query("CREATE TABLE categorie (id INT PRIMARY KEY, libelle VARCHAR(30));");
      db.query(`
        CREATE TABLE article (
          id INT PRIMARY KEY,
          cat_id INT,
          FOREIGN KEY (cat_id) REFERENCES categorie(id)
        );
      `);
      db.query("INSERT INTO categorie VALUES (1, 'Informatique');");

      // Clé étrangère orpheline
      const badFkRes = db.query("INSERT INTO article VALUES (10, 999);");
      expect(badFkRes.errno).toBe(1452);
      expect(badFkRes.error).toContain("foreign key constraint fails");

      // Clé étrangère valide
      const okRes = db.query("INSERT INTO article VALUES (10, 1);");
      expect(okRes.error).toBeUndefined();
    });

    it("bloque la suppression parente avec RESTRICT (erreur 1451)", () => {
      const db = new RelationalDatabaseEngine();
      db.query("CREATE TABLE parent (id INT PRIMARY KEY);");
      db.query(
        "CREATE TABLE enfant (id INT PRIMARY KEY, parent_id INT, FOREIGN KEY (parent_id) REFERENCES parent(id));",
      );
      db.query("INSERT INTO parent VALUES (1);");
      db.query("INSERT INTO enfant VALUES (101, 1);");

      const delRes = db.query("DELETE FROM parent WHERE id = 1;");
      expect(delRes.errno).toBe(1451);
      expect(delRes.error).toContain("Cannot delete or update a parent row");
    });

    it("propage la suppression parente avec ON DELETE CASCADE", () => {
      const db = new RelationalDatabaseEngine();
      db.query("CREATE TABLE parent (id INT PRIMARY KEY);");
      db.query(
        "CREATE TABLE enfant (id INT PRIMARY KEY, parent_id INT, FOREIGN KEY (parent_id) REFERENCES parent(id) ON DELETE CASCADE);",
      );
      db.query("INSERT INTO parent VALUES (1);");
      db.query("INSERT INTO enfant VALUES (101, 1);");

      const delRes = db.query("DELETE FROM parent WHERE id = 1;");
      expect(delRes.error).toBeUndefined();
      expect(db.getTableRows("enfant")).toHaveLength(0);
    });
  });

  describe("4. Moteur SELECT complet (JOIN, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT)", () => {
    let db: RelationalDatabaseEngine;

    beforeEach(() => {
      db = new RelationalDatabaseEngine();
      db.executeScript(`
        CREATE TABLE client (
          id_cli INT PRIMARY KEY,
          nom VARCHAR(50),
          ville VARCHAR(50)
        );
        CREATE TABLE commande (
          id_com INT PRIMARY KEY,
          client_id INT,
          montant DECIMAL(8,2),
          statut VARCHAR(20)
        );

        INSERT INTO client VALUES (1, 'Ben Ali', 'Tunis');
        INSERT INTO client VALUES (2, 'Trabelsi', 'Sousse');
        INSERT INTO client VALUES (3, 'Gharbi', 'Sfax');
        INSERT INTO client VALUES (4, 'Jlassi', 'Tunis');

        INSERT INTO commande VALUES (101, 1, 150.00, 'PAYEE');
        INSERT INTO commande VALUES (102, 1, 250.00, 'PAYEE');
        INSERT INTO commande VALUES (103, 2, 80.00, 'EN_ATTENTE');
        INSERT INTO commande VALUES (104, 3, 300.00, 'PAYEE');
        INSERT INTO commande VALUES (105, 3, 120.00, 'ANNULEE');
      `);
    });

    it("exécute un INNER JOIN explicite avec alias et projection ciblée", () => {
      const res = db.query(`
        SELECT c.nom, cmd.montant
        FROM client c
        INNER JOIN commande cmd ON c.id_cli = cmd.client_id
        WHERE cmd.statut = 'PAYEE'
      `);
      expect(res.error).toBeUndefined();
      expect(res.rows).toHaveLength(3);
      expect(res.rows[0]).toHaveProperty("nom");
      expect(res.rows[0]).toHaveProperty("montant");
    });

    it("exécute un LEFT JOIN préservant les lignes sans correspondance (NULL padding)", () => {
      const res = db.query(`
        SELECT c.nom, cmd.id_com
        FROM client c
        LEFT JOIN commande cmd ON c.id_cli = cmd.client_id
        WHERE c.ville = 'Tunis'
      `);
      expect(res.error).toBeUndefined();
      // Client 1 (Ben Ali) a 2 commandes, Client 4 (Jlassi) en a 0 => 3 lignes au total
      expect(res.rows).toHaveLength(3);
      const jlassiRow = res.rows.find((r) => r["nom"] === "Jlassi");
      expect(jlassiRow).toBeDefined();
      expect(jlassiRow?.["id_com"]).toBeNull();
    });

    it("exécute une jointure implicite par virgule (FROM t1, t2 WHERE t1.k = t2.k)", () => {
      const res = db.query(`
        SELECT u.nom, c.montant
        FROM client u, commande c
        WHERE u.id_cli = c.client_id AND c.montant > 100
      `);
      expect(res.error).toBeUndefined();
      // Commandes > 100 : 101 (150), 102 (250), 104 (300), 105 (120) => 4 lignes
      expect(res.rows).toHaveLength(4);
    });

    it("calcule les fonctions d'agrégation (COUNT, SUM, AVG, MIN, MAX)", () => {
      const res = db.query(`
        SELECT
          COUNT(*) AS total_cmd,
          SUM(montant) AS total_montant,
          AVG(montant) AS moyenne_montant,
          MIN(montant) AS min_montant,
          MAX(montant) AS max_montant
        FROM commande
      `);
      expect(res.error).toBeUndefined();
      expect(res.rows).toHaveLength(1);
      const agg = res.rows[0];
      expect(agg?.["total_cmd"]).toBe(5);
      expect(Number(agg?.["total_montant"])).toBe(900);
      expect(Number(agg?.["moyenne_montant"])).toBe(180);
      expect(Number(agg?.["min_montant"])).toBe(80);
      expect(Number(agg?.["max_montant"])).toBe(300);
    });

    it("gère COUNT(DISTINCT col)", () => {
      const res = db.query("SELECT COUNT(DISTINCT client_id) AS nb_clients FROM commande;");
      expect(res.error).toBeUndefined();
      // Clients distincts ayant commandé : 1, 2, 3 => 3
      expect(res.rows[0]?.["nb_clients"]).toBe(3);
    });

    it("exécute GROUP BY avec filtrage HAVING", () => {
      const res = db.query(`
        SELECT client_id, SUM(montant) AS cumul
        FROM commande
        GROUP BY client_id
        HAVING cumul >= 200
      `);
      expect(res.error).toBeUndefined();
      // Client 1: 150+250=400 >= 200 (OK)
      // Client 2: 80 < 200 (rejeté)
      // Client 3: 300+120=420 >= 200 (OK)
      expect(res.rows).toHaveLength(2);
      const clientIds = res.rows.map((r) => r["client_id"]);
      expect(clientIds).toContain(1);
      expect(clientIds).toContain(3);
    });

    it("exécute ORDER BY (multi-colonnes ASC / DESC) et LIMIT avec décalage", () => {
      const res = db.query(`
        SELECT nom, ville
        FROM client
        ORDER BY ville ASC, nom DESC
        LIMIT 1, 2
      `);
      expect(res.error).toBeUndefined();
      expect(res.rows).toHaveLength(2);
    });

    it("évalue les prédicats WHERE avec BETWEEN, IN, LIKE, IS NOT NULL", () => {
      // LIKE avec wildcard %
      const likeRes = db.query("SELECT * FROM client WHERE nom LIKE '%ar%'");
      expect(likeRes.rows).toHaveLength(1);
      expect(likeRes.rows[0]?.["nom"]).toBe("Gharbi");

      // BETWEEN
      const betweenRes = db.query(
        "SELECT * FROM commande WHERE montant BETWEEN 100 AND 260 ORDER BY montant ASC",
      );
      expect(betweenRes.rows).toHaveLength(3); // 120, 150, 250

      // IN
      const inRes = db.query("SELECT * FROM client WHERE ville IN ('Sousse', 'Sfax')");
      expect(inRes.rows).toHaveLength(2);
    });
  });

  describe("5. Intégration unifiée avec SqliteEngine", () => {
    it("exécute des requêtes relationnelles et renvoie les avertissements de dialecte", async () => {
      const engine = new SqliteEngine();
      await engine.init(`
        CREATE TABLE utilisateur (id INT PRIMARY KEY, nom VARCHAR(50));
        INSERT INTO utilisateur VALUES (1, 'Foulen');
      `);

      const res = await engine.executeQuery("SELECT * FROM utilisateur WHERE nom = 'Foulen';");
      expect(res.error).toBeUndefined();
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]?.["nom"]).toBe("Foulen");

      // Détecte une syntaxe hors programme Bac STI (opérateur de concaténation ||)
      const warningRes = await engine.executeQuery("SELECT nom || ' ' || prenom FROM utilisateur;");
      expect(warningRes.dialectWarnings.length).toBeGreaterThan(0);
      expect(warningRes.dialectWarnings[0]?.code).toBe("ERR_CONCAT_OPERATOR");
    });

    it("réinitialise la base à son état initial exact (reset)", async () => {
      const initSql = `
        CREATE TABLE score (id INT PRIMARY KEY, val INT);
        INSERT INTO score VALUES (1, 10);
      `;
      const engine = new SqliteEngine({ initialSql: initSql });
      await engine.init();

      await engine.executeQuery("INSERT INTO score VALUES (2, 20);");
      let data = await engine.getTableData("score");
      expect(data.rows).toHaveLength(2);

      await engine.reset();
      data = await engine.getTableData("score");
      expect(data.rows).toHaveLength(1);
      expect(data.rows[0]?.["val"]).toBe(10);
    });
  });
});
