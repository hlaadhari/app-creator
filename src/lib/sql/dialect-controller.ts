/**
 * Labo STI - Contrôleur de dialecte SQL (PRD §8.2, F-25 à F-31)
 *
 * Analyse les requêtes et commandes SQL pour détecter les écarts de dialecte entre
 * SQLite (moteur WASM du navigateur) et MySQL / MariaDB (standard officiel du Bac STI).
 * Émet des alertes didactiques bienveillantes pour prévenir les élèves avant l'examen.
 */

import type { SqlDialectWarning } from "./types";

/**
 * Analyse une requête SQL et détecte les incompatibilités avec MySQL/MariaDB
 */
export function verifierDialecteSql(sql: string): SqlDialectWarning[] {
  const warnings: SqlDialectWarning[] = [];
  const trimmed = sql.trim();
  if (!trimmed) return warnings;

  const upper = trimmed.toUpperCase();

  // 1. Concaténation SQLite "||" vs standard MySQL CONCAT()
  if (trimmed.includes("||")) {
    warnings.push({
      code: "ERR_CONCAT_OPERATOR",
      titre: "Opérateur de concaténation non portable",
      message:
        "Vous utilisez l'opérateur '||'. Bien que valide sous SQLite, il représente un 'OU' logique sous MySQL standard.",
      suggestion: "Utilisez la fonction standard du Bac STI : CONCAT(champ1, ' ', champ2).",
      severite: "avertissement",
    });
  }

  // 2. Fonctions de date SQLite (date('now'), datetime('now'), strftime) vs MySQL
  if (
    /date\s*\(\s*['"]now['"]\s*\)/i.test(trimmed) ||
    /datetime\s*\(\s*['"]now['"]\s*\)/i.test(trimmed) ||
    /strftime\s*\(/i.test(trimmed)
  ) {
    warnings.push({
      code: "ERR_DATE_FUNCTION_SQLITE",
      titre: "Fonction de date spécifique à SQLite",
      message:
        "Les fonctions date('now') et strftime() sont propres à SQLite et n'existent pas sous MySQL/MariaDB.",
      suggestion:
        "Sous MySQL (Bac STI), utilisez les fonctions standards CURDATE(), NOW() ou DATE_FORMAT().",
      severite: "avertissement",
    });
  }

  // 3. AUTOINCREMENT (SQLite) vs AUTO_INCREMENT (MySQL)
  if (upper.includes("AUTOINCREMENT") && !upper.includes("AUTO_INCREMENT")) {
    warnings.push({
      code: "ERR_AUTOINCREMENT_SYNTAX",
      titre: "Syntaxe d'auto-incrémentation SQLite",
      message: "Le mot-clé 'AUTOINCREMENT' sans tiret bas est spécifique à SQLite.",
      suggestion:
        "En MySQL/MariaDB (programme officiel), écrivez obligatoirement AUTO_INCREMENT (avec un tiret bas).",
      severite: "avertissement",
    });
  }

  // 4. GROUP BY non strict (absence d'agrégation ou de colonne dans GROUP BY)
  if (upper.includes("GROUP BY")) {
    const selectMatch = trimmed.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
    const groupByMatch = trimmed.match(/GROUP\s+BY\s+([\s\S]+?)(?:HAVING|ORDER|LIMIT|;|$)/i);

    if (selectMatch && selectMatch[1] && groupByMatch && groupByMatch[1]) {
      const selectFields = selectMatch[1].split(",").map(
        (f) =>
          f
            .trim()
            .split(/\s+AS\s+/i)[0]
            ?.trim() || "",
      );
      const groupFields = groupByMatch[1].split(",").map((f) => f.trim().toLowerCase());

      const nonAggregatedCols = selectFields.filter((col) => {
        if (!col || col === "*") return false;
        const isAggregated = /^(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(col);
        return !isAggregated && !groupFields.includes(col.toLowerCase());
      });

      if (nonAggregatedCols.length > 0) {
        warnings.push({
          code: "ERR_GROUP_BY_NOT_STRICT",
          titre: "Violation potentielle ONLY_FULL_GROUP_BY",
          message: `Les colonnes [${nonAggregatedCols.join(", ")}] sont sélectionnées sans fonction d'agrégation et ne figurent pas dans le GROUP BY.`,
          suggestion:
            "MySQL applique par défaut la règle stricte ONLY_FULL_GROUP_BY. Ajoutez ces colonnes au GROUP BY ou appliquez-leur une fonction d'agrégation (MIN, MAX, SUM, AVG).",
          severite: "avertissement",
        });
      }
    }
  }

  // 5. Syntaxe LIMIT offset, count
  if (/LIMIT\s+\d+\s*,\s*\d+/i.test(trimmed)) {
    warnings.push({
      code: "ERR_LIMIT_COMMA_SYNTAX",
      titre: "Syntaxe LIMIT avec virgule",
      message:
        "La syntaxe 'LIMIT offset, count' est une extension MySQL parfois ambiguë par rapport au standard SQL.",
      suggestion: "Privilégiez la syntaxe explicite standard : LIMIT count OFFSET offset.",
      severite: "info",
    });
  }

  // 6. Types booléens / entiers MySQL
  if (/\bBOOLEAN\b/i.test(trimmed)) {
    warnings.push({
      code: "INFO_BOOLEAN_TYPE",
      titre: "Type BOOLEAN en MySQL",
      message:
        "En MySQL, le type BOOLEAN est un alias pour TINYINT(1) où 1 représente TRUE et 0 représente FALSE.",
      suggestion: "Gardez à l'esprit que les conditions peuvent comparer avec 1 ou 0.",
      severite: "info",
    });
  }

  return warnings;
}

/**
 * Normalise une requête MySQL standard pour qu'elle s'exécute sans erreur sur SQLite WASM
 */
export function adapterRequetePourSqlite(sql: string): string {
  let adapted = sql;

  // 1. Adapter AUTO_INCREMENT en AUTOINCREMENT
  adapted = adapted.replace(/\bAUTO_INCREMENT\b/gi, "AUTOINCREMENT");

  // 2. Adapter CURDATE() en date('now')
  adapted = adapted.replace(/\bCURDATE\s*\(\s*\)/gi, "date('now')");

  // 3. Adapter NOW() en datetime('now')
  adapted = adapted.replace(/\bNOW\s*\(\s*\)/gi, "datetime('now')");

  // 4. Adapter CONCAT(a, b, c) en (a || b || c) pour SQLite
  adapted = adapted.replace(/CONCAT\s*\(([^)]+)\)/gi, (_, argsStr: string) => {
    const args = argsStr.split(",").map((a) => a.trim());
    return `(${args.join(" || ")})`;
  });

  return adapted;
}
