import { describe, expect, it } from "vitest";
import { RelationalDatabaseEngine } from "@/lib/sql/relational-engine";
import { comparerLignesResultats } from "@/lib/evaluator/written/written-exam-evaluator";

const SCHEMA = [
  "CREATE TABLE chaine (idChaine INT PRIMARY KEY, nomChaine VARCHAR(30));",
  "CREATE TABLE video (idVideo INT PRIMARY KEY, duree INT, idChaine INT);",
  "CREATE TABLE tag (idTag INT AUTO_INCREMENT PRIMARY KEY, libelle VARCHAR(20));",
  "INSERT INTO chaine VALUES (1, 'PgmAlgo'), (2, 'WebX'), (3, 'Crypto');",
  "INSERT INTO video VALUES (10, 30, 1), (11, 40, 1), (12, 10, 2), (13, 20, 2);",
  "INSERT INTO tag VALUES (1, 'sql'), (2, 'web');",
].join(" ");

function moteur(): RelationalDatabaseEngine {
  const engine = new RelationalDatabaseEngine();
  const res = engine.executeScript(SCHEMA);
  expect(res.success).toBe(true);
  return engine;
}

describe("Moteur SQL : HAVING avec agrégat, sous-requêtes et auto-incrément (#202)", () => {
  describe("HAVING avec une expression d'agrégat", () => {
    it("filtre les groupes sur SUM(col) sans alias", () => {
      const res = moteur().query(
        "SELECT nomChaine, SUM(duree) FROM chaine C, video V WHERE C.idChaine = V.idChaine GROUP BY nomChaine HAVING SUM(duree) > 60",
      );
      expect(res.error).toBeUndefined();
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]?.["nomChaine"]).toBe("PgmAlgo");
    });

    it("filtre les groupes sur COUNT(*) et accepte aussi un alias", () => {
      const e = moteur();
      const sansAlias = e.query(
        "SELECT idChaine, COUNT(*) FROM video GROUP BY idChaine HAVING COUNT(*) >= 2",
      );
      expect(sansAlias.rows).toHaveLength(2);
      const avecAlias = e.query(
        "SELECT idChaine, SUM(duree) AS total FROM video GROUP BY idChaine HAVING total > 60",
      );
      expect(avecAlias.rows).toHaveLength(1);
    });

    it("évalue MAX et AVG par groupe", () => {
      const e = moteur();
      expect(
        e.query("SELECT idChaine FROM video GROUP BY idChaine HAVING MAX(duree) > 35").rows,
      ).toHaveLength(1);
      expect(
        e.query("SELECT idChaine FROM video GROUP BY idChaine HAVING AVG(duree) < 20").rows,
      ).toHaveLength(1);
    });
  });

  describe("Sous-requêtes non corrélées", () => {
    it("évalue IN (SELECT ...) et NOT IN (SELECT ...)", () => {
      const e = moteur();
      const dans = e.query(
        "SELECT idVideo FROM video WHERE idChaine IN (SELECT idChaine FROM chaine WHERE nomChaine LIKE 'P%')",
      );
      expect(dans.rows.map((r) => r["idVideo"]).sort()).toEqual([10, 11]);
      const horsDe = e.query(
        "SELECT idVideo FROM video WHERE idChaine NOT IN (SELECT idChaine FROM chaine WHERE nomChaine LIKE 'P%')",
      );
      expect(horsDe.rows.map((r) => r["idVideo"]).sort()).toEqual([12, 13]);
    });

    it("évalue une sous-requête scalaire (moyenne) dans une comparaison", () => {
      const res = moteur().query(
        "SELECT idVideo FROM video WHERE duree > (SELECT AVG(duree) FROM video)",
      );
      expect(res.rows.map((r) => r["idVideo"]).sort()).toEqual([10, 11]);
    });

    it("une sous-requête vide donne un ensemble vide", () => {
      const res = moteur().query(
        "SELECT idVideo FROM video WHERE idChaine IN (SELECT idChaine FROM chaine WHERE nomChaine = 'Inconnue')",
      );
      expect(res.error).toBeUndefined();
      expect(res.rows).toHaveLength(0);
    });

    it("fonctionne aussi dans DELETE et UPDATE", () => {
      const e = moteur();
      expect(
        e.executeScript(
          "DELETE FROM video WHERE idChaine IN (SELECT idChaine FROM chaine WHERE nomChaine = 'WebX');",
        ).success,
      ).toBe(true);
      expect(e.getTableRows("video")).toHaveLength(2);
      expect(
        e.executeScript("UPDATE video SET duree = 99 WHERE duree = (SELECT MAX(duree) FROM video);")
          .success,
      ).toBe(true);
      expect(e.getTableRows("video").some((r) => r["duree"] === 99)).toBe(true);
    });

    it("ne touche pas aux parenthèses d'une chaîne de caractères", () => {
      const e = moteur();
      e.executeScript("INSERT INTO chaine VALUES (4, '(SELECT 1)');");
      const res = e.query("SELECT idChaine FROM chaine WHERE nomChaine = '(SELECT 1)'");
      expect(res.rows).toHaveLength(1);
    });
  });

  describe("Fonctions de date en partie gauche d'une condition", () => {
    function moteurDates(): RelationalDatabaseEngine {
      const e = new RelationalDatabaseEngine();
      const res = e.executeScript(
        "CREATE TABLE inc (id INT PRIMARY KEY, d DATETIME); INSERT INTO inc VALUES (1, '2023-05-30 12:00:00'), (2, '2023-06-15 13:00:00'), (3, '2023-08-05 14:00:00'), (4, '2024-07-01 10:00:00');",
      );
      expect(res.success).toBe(true);
      return e;
    }

    it("YEAR(col) = valeur filtre réellement les lignes", () => {
      const res = moteurDates().query("SELECT id FROM inc WHERE YEAR(d) = 2024");
      expect(res.rows.map((r) => r["id"])).toEqual([4]);
    });

    it("MONTH(col) avec comparaison, BETWEEN et IN", () => {
      const e = moteurDates();
      expect(
        e.query("SELECT id FROM inc WHERE YEAR(d) = 2023 AND MONTH(d) >= 6 AND MONTH(d) <= 8").rows,
      ).toHaveLength(2);
      expect(e.query("SELECT id FROM inc WHERE MONTH(d) BETWEEN 6 AND 8").rows).toHaveLength(3);
      expect(e.query("SELECT id FROM inc WHERE MONTH(d) IN (5, 7)").rows).toHaveLength(2);
    });
  });

  describe("Clé auto-incrémentée", () => {
    it("génère la valeur quand l'INSERT fournit NULL, comme MySQL", () => {
      const e = moteur();
      const res = e.executeScript("INSERT INTO tag VALUES (NULL, 'html');");
      expect(res.errors).toEqual([]);
      expect(e.getTableRows("tag").at(-1)).toMatchObject({ idtag: 3, libelle: "html" });
    });

    it("génère la valeur quand la colonne est omise", () => {
      const e = moteur();
      e.executeScript("INSERT INTO tag (libelle) VALUES ('css');");
      expect(e.getTableRows("tag").at(-1)).toMatchObject({ idtag: 3, libelle: "css" });
    });
  });

  describe("Comparaison des résultats indépendante des alias", () => {
    it("accepte un alias différent pour la même colonne calculée", () => {
      const reference = [{ idVideo: 510, nbVisualisations: 4 }];
      const eleve = [{ idVideo: 510, nb: 4 }];
      expect(comparerLignesResultats(eleve, reference)).toBe(true);
    });

    it("refuse toujours des valeurs différentes ou un nombre de colonnes différent", () => {
      const reference = [{ idVideo: 510, nbVisualisations: 4 }];
      expect(comparerLignesResultats([{ idVideo: 510, nb: 3 }], reference)).toBe(false);
      expect(comparerLignesResultats([{ idVideo: 510 }], reference)).toBe(false);
      expect(comparerLignesResultats([], reference)).toBe(false);
    });
  });
});
