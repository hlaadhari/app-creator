/**
 * Labo STI - Évaluateur d'État Réel SQL & PHP (PRD §8, TEC-01, TEC-02, PED-03 / Issue #129)
 *
 * Évalue les critères portant sur les bases relationnelles SQL et les scripts PHP procéduraux
 * sur l'état réel du schéma et des données après exécution du code de l'élève.
 *
 * Sondes prises en charge :
 * - sql_table_check : existence de table, clé primaire simple/composée, clés étrangères,
 *   contraintes CHECK, colonnes (types, NOT NULL, DEFAULT, UNIQUE), nombre minimum de lignes.
 * - sql_query_result : résultat de requête SQL (SELECT, agrégations, lignes renvoyées, valeurs).
 * - php_mysqli_check : exécution d'un script PHP procédural avec variables superglobales ($_POST, $_GET),
 *   vérification du stdout (contains, regex) et des effets de bord sur la base (lignes insérées/mises à jour).
 */

import type { Criterion, CriterionFailureCause, Result } from "@/lib/exercises";
import type { FichiersEvaluation } from "./document-evaluation";
import { RelationalDatabaseEngine } from "@/lib/sql/relational-engine";
import { executerScriptPhpProcedural, resoudreSqlInitial } from "@/lib/php/procedural-simulator";
import type { PhpExecutionRequest } from "@/lib/php/types";

export interface SqlTableCheckProbe {
  type: "sql_table_check";
  table: string;
  primaryKey?: string[];
  foreignKeys?: Array<{
    column: string;
    refTable: string;
    refColumn?: string;
  }>;
  columns?: Array<{
    name: string;
    baseType?: string;
    notNull?: boolean;
    hasCheck?: boolean;
    hasDefault?: boolean;
    unique?: boolean;
  }>;
  hasCheck?: boolean;
  checkMinRows?: number;
}

export interface SqlQueryResultProbe {
  type: "sql_query_result";
  query: string;
  expectedRowCount?: number;
  minRowCount?: number;
  expectedValues?: Record<string, unknown>;
}

export interface PhpMySqliCheckProbe {
  type: "php_mysqli_check";
  entrypoint?: string;
  postData?: Record<string, unknown>;
  expectedStdoutContains?: string;
  expectedStdoutPattern?: string;
  expectedTableRows?: {
    table: string;
    minCount?: number;
    where?: Record<string, unknown>;
  };
}

export function estCritereSqlOuPhp(critere: Criterion): boolean {
  const raw = critere.raw as Record<string, unknown> | undefined;
  if (!raw) return false;
  const probe = raw["sonde"] as Record<string, unknown> | undefined;
  if (!probe) return false;
  const type = probe["type"];
  return type === "sql_table_check" || type === "sql_query_result" || type === "php_mysqli_check";
}

function echec(
  critere: Criterion,
  message?: string,
  cause: CriterionFailureCause = "valeur",
): Result {
  return {
    id: critere.id,
    label: critere.label,
    points: critere.points,
    ok: false,
    automatique: true,
    message: message ?? critere.fail ?? "Critère non validé",
    cause,
  };
}

function succes(critere: Criterion): Result {
  return {
    id: critere.id,
    label: critere.label,
    points: critere.points,
    ok: true,
    automatique: true,
    message: "Validé",
  };
}

function resoudreScriptSql(critere: Criterion, fichiers: FichiersEvaluation): string {
  const fileKey = critere.fichier;
  if (fileKey && fichiers[fileKey]) {
    return fichiers[fileKey] ?? "";
  }
  // Alternatives courantes
  const candidates = [
    "schema.sql",
    "init.sql",
    "db/init.sql",
    "tables.sql",
    "croisiere.sql",
    "bijoux.sql",
  ];
  for (const c of candidates) {
    if (fichiers[c]) return fichiers[c];
  }
  for (const [name, content] of Object.entries(fichiers)) {
    if (name.endsWith(".sql")) return content;
  }
  return "";
}

export function evaluerSqlTableCheck(
  critere: Criterion,
  probe: SqlTableCheckProbe,
  fichiers: FichiersEvaluation,
): Result {
  const sqlScript = resoudreScriptSql(critere, fichiers);
  if (!sqlScript.trim()) {
    return echec(critere, "Aucun script SQL trouvé pour vérifier ce critère.", "absent");
  }

  const engine = new RelationalDatabaseEngine();
  // Exécuter d'abord la base parente si disponible (ex: db/init.sql quand le critère vise un autre fichier)
  const baseSql = resoudreSqlInitial(fichiers);
  if (baseSql && baseSql !== sqlScript) {
    engine.executeScript(baseSql);
  }
  engine.executeScript(sqlScript);

  const tableName = (probe.table || "").trim().toLowerCase();
  const table = engine.getTable(tableName);
  if (!table) {
    return echec(
      critere,
      `La table '${probe.table}' n'a pas été trouvée dans la base de données.`,
      "absent",
    );
  }

  // 1. Clé primaire
  if (probe.primaryKey && probe.primaryKey.length > 0) {
    const actualPk = table.primaryKey.map((c) => c.toLowerCase());
    const expectedPk = probe.primaryKey.map((c) => c.toLowerCase());
    const pkOk =
      actualPk.length === expectedPk.length && expectedPk.every((col) => actualPk.includes(col));
    if (!pkOk) {
      return echec(
        critere,
        `La clé primaire de la table '${probe.table}' (${actualPk.join(", ") || "aucune"}) ne correspond pas à (${expectedPk.join(", ")}).`,
      );
    }
  }

  // 2. Clés étrangères
  if (probe.foreignKeys && probe.foreignKeys.length > 0) {
    const fks = table.foreignKeys;
    const allFksOk = probe.foreignKeys.every((exp) => {
      const colNorm = exp.column.toLowerCase();
      const refTableNorm = exp.refTable.toLowerCase();
      return fks.some(
        (actual) =>
          actual.columns.map((c) => c.toLowerCase()).includes(colNorm) &&
          actual.refTable.toLowerCase() === refTableNorm &&
          (!exp.refColumn ||
            actual.refColumns.map((c) => c.toLowerCase()).includes(exp.refColumn.toLowerCase())),
      );
    });
    if (!allFksOk) {
      return echec(
        critere,
        `Contrainte de clé étrangère manquante ou incorrecte sur la table '${probe.table}'.`,
      );
    }
  }

  // 3. Contrainte CHECK
  if (probe.hasCheck) {
    const checkOk =
      table.checkConstraints.length > 0 || table.columns.some((c) => Boolean(c.checkExpr));
    if (!checkOk) {
      return echec(critere, `Aucune contrainte CHECK détectée sur la table '${probe.table}'.`);
    }
  }

  // 4. Colonnes et attributs
  if (probe.columns && probe.columns.length > 0) {
    for (const exp of probe.columns) {
      const col = table.columns.find((c) => c.name.toLowerCase() === exp.name.toLowerCase());
      if (!col) {
        return echec(
          critere,
          `Colonne '${exp.name}' manquante dans la table '${probe.table}'.`,
          "absent",
        );
      }
      if (exp.baseType && col.baseType.toLowerCase() !== exp.baseType.toLowerCase()) {
        return echec(
          critere,
          `Le type de la colonne '${exp.name}' est ${col.rawType}, attendu : ${exp.baseType}.`,
        );
      }
      if (exp.notNull && !col.notNull) {
        return echec(critere, `La colonne '${exp.name}' doit comporter la contrainte NOT NULL.`);
      }
      if (exp.hasCheck && !col.checkExpr && table.checkConstraints.length === 0) {
        return echec(critere, `La colonne '${exp.name}' doit comporter une contrainte CHECK.`);
      }
      if (exp.hasDefault && col.defaultValue === undefined) {
        return echec(critere, `La colonne '${exp.name}' doit comporter une clause DEFAULT.`);
      }
      if (
        exp.unique &&
        !col.unique &&
        !table.uniqueSets.some((u) =>
          u.map((x) => x.toLowerCase()).includes(exp.name.toLowerCase()),
        )
      ) {
        return echec(critere, `La colonne '${exp.name}' doit comporter la contrainte UNIQUE.`);
      }
    }
  }

  // 5. Nombre minimum de lignes
  if (probe.checkMinRows !== undefined) {
    if (table.rows.length < probe.checkMinRows) {
      return echec(
        critere,
        `La table '${probe.table}' contient ${table.rows.length} ligne(s), attendu au moins ${probe.checkMinRows}.`,
      );
    }
  }

  return succes(critere);
}

export function evaluerSqlQueryResult(
  critere: Criterion,
  probe: SqlQueryResultProbe,
  fichiers: FichiersEvaluation,
): Result {
  const engine = new RelationalDatabaseEngine();
  const initSql = resoudreSqlInitial(fichiers);
  if (initSql) {
    engine.executeScript(initSql);
  }

  const query = (probe.query || "").trim();
  const res = engine.query(query);

  if (res.error) {
    const isSyntax = /syntax|near/i.test(res.error);
    return echec(
      critere,
      `Erreur lors de l'exécution de la requête SQL : ${res.error}`,
      isSyntax ? "syntaxe" : "execution",
    );
  }

  if (probe.expectedRowCount !== undefined && res.numRows !== probe.expectedRowCount) {
    return echec(
      critere,
      `La requête SQL a renvoyé ${res.numRows} ligne(s), attendu : ${probe.expectedRowCount}.`,
    );
  }

  if (probe.minRowCount !== undefined && res.numRows < probe.minRowCount) {
    return echec(
      critere,
      `La requête SQL a renvoyé ${res.numRows} ligne(s), attendu au moins ${probe.minRowCount}.`,
    );
  }

  if (probe.expectedValues && typeof probe.expectedValues === "object") {
    const firstRow = res.rows[0];
    if (!firstRow) {
      return echec(critere, "La requête SQL n'a renvoyé aucune ligne.");
    }
    for (const [k, expectedVal] of Object.entries(probe.expectedValues)) {
      const actualVal = firstRow[k.toLowerCase()] ?? firstRow[k];
      if (String(actualVal) !== String(expectedVal)) {
        return echec(
          critere,
          `Valeur attendue pour '${k}' : ${String(expectedVal)}, obtenu : ${String(actualVal)}.`,
        );
      }
    }
  }

  return succes(critere);
}

export function evaluerPhpMySqliCheck(
  critere: Criterion,
  probe: PhpMySqliCheckProbe,
  fichiers: FichiersEvaluation,
): Result {
  const entrypoint = probe.entrypoint || critere.fichier || "index.php";
  const scriptContent = fichiers[entrypoint];
  if (!scriptContent) {
    return echec(critere, `Le fichier '${entrypoint}' est absent du projet.`, "absent");
  }

  const postData = (probe.postData || {}) as Record<string, unknown>;
  const postStrings: Record<string, string> = {};
  for (const [k, v] of Object.entries(postData)) {
    postStrings[k] = String(v);
  }

  const simulator = new RelationalDatabaseEngine();
  const initSql = resoudreSqlInitial(fichiers);
  if (initSql) {
    simulator.executeScript(initSql);
  }

  const req: PhpExecutionRequest = {
    id: `eval-${critere.id}-${Date.now()}`,
    script: scriptContent,
    entrypoint,
    files: fichiers,
    post: postStrings,
    get: {},
    server: {
      REQUEST_METHOD: Object.keys(postStrings).length > 0 ? "POST" : "GET",
    },
    session: {},
  };

  const execRes = executerScriptPhpProcedural(req, {
    simulator,
    initialSql: initSql,
    files: fichiers,
  });

  if (execRes.error) {
    const isSyntax = /syntax|parse error/i.test(execRes.error);
    return echec(
      critere,
      `Erreur lors de l'exécution PHP : ${execRes.error}`,
      isSyntax ? "syntaxe" : "execution",
    );
  }

  if (probe.expectedStdoutContains) {
    if (!execRes.stdout.includes(probe.expectedStdoutContains)) {
      return echec(
        critere,
        `La sortie générée par '${entrypoint}' ne contient pas : '${probe.expectedStdoutContains}'.`,
      );
    }
  }

  if (probe.expectedStdoutPattern) {
    const re = new RegExp(probe.expectedStdoutPattern, "i");
    if (!re.test(execRes.stdout)) {
      return echec(critere, `La sortie HTML de '${entrypoint}' ne respecte pas le format attendu.`);
    }
  }

  if (probe.expectedTableRows) {
    const expTable = probe.expectedTableRows;
    const rows = simulator.getTableRows(expTable.table);
    if (expTable.minCount !== undefined && rows.length < expTable.minCount) {
      return echec(
        critere,
        `La table '${expTable.table}' ne contient pas le nombre de lignes attendu après exécution (${rows.length} ligne(s) trouvée(s)).`,
      );
    }
    if (expTable.where) {
      const match = rows.some((r) =>
        Object.entries(expTable.where!).every(([k, v]) => String(r[k]) === String(v)),
      );
      if (!match) {
        return echec(
          critere,
          `Aucune ligne correspondante n'a été insérée ou mise à jour dans la table '${expTable.table}'.`,
        );
      }
    }
  }

  return succes(critere);
}

export async function evaluerCritereSqlPhp(
  critere: Criterion,
  fichiers: FichiersEvaluation,
): Promise<Result> {
  const raw = (critere.raw || {}) as Record<string, unknown>;
  const probe = (raw["sonde"] || {}) as Record<string, unknown>;
  const probeType = (probe["type"] as string | undefined) || "";

  if (probeType === "sql_table_check") {
    return evaluerSqlTableCheck(critere, probe as unknown as SqlTableCheckProbe, fichiers);
  }
  if (probeType === "sql_query_result") {
    return evaluerSqlQueryResult(critere, probe as unknown as SqlQueryResultProbe, fichiers);
  }
  if (probeType === "php_mysqli_check") {
    return evaluerPhpMySqliCheck(critere, probe as unknown as PhpMySqliCheckProbe, fichiers);
  }

  return echec(critere);
}
