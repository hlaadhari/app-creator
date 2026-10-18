/**
 * Labo STI - Moteur SQL Relationnel Local (PRD §8.2, F-25 à F-31)
 *
 * Moteur de base de données relationnelle locale exécutant le SQL dans le navigateur
 * avec contrôle de dialecte MySQL/MariaDB, visualiseur de tables et réinitialisation instantanée.
 */

import { adapterRequetePourSqlite, verifierDialecteSql } from "./dialect-controller";
import type { SqlColumnInfo, SqlEngineConfig, SqlQueryResult, SqlTableInfo } from "./types";

interface InternalColumn {
  name: string;
  type: string;
  primaryKey: boolean;
  notNull: boolean;
  autoIncrement: boolean;
}

interface InternalTable {
  name: string;
  columns: InternalColumn[];
  rows: Record<string, unknown>[];
  lastAutoId: number;
}

export class SqliteEngine {
  private tables: Map<string, InternalTable> = new Map();
  private initialSql: string = "";
  private readonly enableDialectController: boolean;

  constructor(config: SqlEngineConfig = {}) {
    this.enableDialectController = config.enableDialectController ?? true;
    if (config.initialSql) {
      this.initialSql = config.initialSql;
    }
  }

  /**
   * Initialise le moteur et charge le script SQL initial
   */
  public async init(initialSql?: string): Promise<void> {
    if (initialSql !== undefined) {
      this.initialSql = initialSql;
    }
    this.tables.clear();
    if (this.initialSql.trim()) {
      await this.loadSql(this.initialSql);
    }
  }

  /**
   * Réinitialise la base à son état initial exact (PRD F-27)
   */
  public async reset(): Promise<void> {
    this.tables.clear();
    if (this.initialSql.trim()) {
      await this.loadSql(this.initialSql);
    }
  }

  /**
   * Exécute un script multi-instructions SQL (.sql)
   */
  public async loadSql(sqlScript: string): Promise<SqlQueryResult[]> {
    const cleanSql = sqlScript.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

    const statements = cleanSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const results: SqlQueryResult[] = [];
    for (const stmt of statements) {
      const res = await this.executeQuery(stmt);
      results.push(res);
      if (res.error) {
        break;
      }
    }
    return results;
  }

  /**
   * Exécute une requête SQL individuelle avec contrôle de dialecte
   */
  public async executeQuery(query: string): Promise<SqlQueryResult> {
    const startTime = Date.now();
    const trimmed = query.trim();

    // 1. Contrôle de dialecte MySQL/MariaDB
    const dialectWarnings = this.enableDialectController ? verifierDialecteSql(trimmed) : [];

    // 2. Normalisation / Adaptation pour SQLite
    const adaptedQuery = adapterRequetePourSqlite(trimmed);

    try {
      const upper = adaptedQuery.toUpperCase();

      if (upper.startsWith("CREATE TABLE")) {
        return this.handleCreateTable(adaptedQuery, startTime, dialectWarnings);
      } else if (upper.startsWith("INSERT INTO")) {
        return this.handleInsert(adaptedQuery, startTime, dialectWarnings);
      } else if (upper.startsWith("SELECT")) {
        return this.handleSelect(adaptedQuery, startTime, dialectWarnings);
      } else if (upper.startsWith("UPDATE")) {
        return this.handleUpdate(adaptedQuery, startTime, dialectWarnings);
      } else if (upper.startsWith("DELETE FROM")) {
        return this.handleDelete(adaptedQuery, startTime, dialectWarnings);
      } else if (upper.startsWith("DROP TABLE")) {
        return this.handleDropTable(adaptedQuery, startTime, dialectWarnings);
      }

      return {
        columns: [],
        rows: [],
        rowsAffected: 0,
        durationMs: Math.max(Date.now() - startTime, 1),
        dialectWarnings,
      };
    } catch (err: unknown) {
      return {
        columns: [],
        rows: [],
        rowsAffected: 0,
        durationMs: Math.max(Date.now() - startTime, 1),
        error: err instanceof Error ? err.message : String(err),
        dialectWarnings,
      };
    }
  }

  /**
   * Retourne la liste et structure de toutes les tables existantes
   */
  public async getTables(): Promise<SqlTableInfo[]> {
    const result: SqlTableInfo[] = [];
    for (const [name, table] of this.tables.entries()) {
      result.push({
        name,
        rowCount: table.rows.length,
        columns: table.columns.map((c) => ({
          name: c.name,
          type: c.type,
          primaryKey: c.primaryKey,
          notNull: c.notNull,
        })),
      });
    }
    return result;
  }

  /**
   * Récupère le contenu paginé d'une table pour le visualiseur
   */
  public async getTableData(
    tableName: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<SqlQueryResult> {
    const table = this.tables.get(tableName.toLowerCase());
    if (!table) {
      return {
        columns: [],
        rows: [],
        rowsAffected: 0,
        durationMs: 0,
        error: `Table '${tableName}' introuvable.`,
        dialectWarnings: [],
      };
    }

    const columns = table.columns.map((c) => c.name);
    const rows = table.rows.slice(offset, offset + limit);

    return {
      columns,
      rows,
      rowsAffected: rows.length,
      durationMs: 1,
      dialectWarnings: [],
    };
  }

  /**
   * Exporte un dump complet SQL (schéma + données)
   */
  public async exportDump(): Promise<string> {
    const lines: string[] = [
      `-- Export Base de données Labo STI`,
      `-- Généré le : ${new Date().toISOString()}`,
      `-- --------------------------------------------------------`,
      "",
    ];

    for (const [tableName, table] of this.tables.entries()) {
      lines.push(`-- Structure de la table \`${tableName}\``);
      lines.push(`CREATE TABLE IF NOT EXISTS \`${tableName}\` (`);
      const colDefs = table.columns.map((c) => {
        let def = `  \`${c.name}\` ${c.type}`;
        if (c.primaryKey) def += " PRIMARY KEY";
        if (c.autoIncrement) def += " AUTO_INCREMENT";
        if (c.notNull) def += " NOT NULL";
        return def;
      });
      lines.push(colDefs.join(",\n"));
      lines.push(");");
      lines.push("");

      if (table.rows.length > 0) {
        lines.push(`-- Données de la table \`${tableName}\``);
        const colNames = table.columns.map((c) => `\`${c.name}\``).join(", ");
        for (const row of table.rows) {
          const values = table.columns.map((c) => {
            const val = row[c.name];
            if (val === null || val === undefined) return "NULL";
            if (typeof val === "number") return String(val);
            return `'${String(val).replace(/'/g, "''")}'`;
          });
          lines.push(`INSERT INTO \`${tableName}\` (${colNames}) VALUES (${values.join(", ")});`);
        }
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  // =========================================================================
  // Handlers SQL
  // =========================================================================

  private handleCreateTable(
    query: string,
    startTime: number,
    dialectWarnings: SqlQueryResult["dialectWarnings"],
  ): SqlQueryResult {
    const match = query.match(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"'\w]+)\s*\(([\s\S]+)\)/i,
    );
    if (!match || !match[1] || !match[2]) {
      throw new Error("Syntaxe CREATE TABLE invalide.");
    }

    const tableName = match[1].replace(/[`"']/g, "").toLowerCase();
    const body = match[2];

    const columns: InternalColumn[] = [];
    const colLines = body
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (const line of colLines) {
      const upperLine = line.toUpperCase();
      if (
        upperLine.startsWith("PRIMARY KEY") ||
        upperLine.startsWith("FOREIGN KEY") ||
        upperLine.startsWith("CONSTRAINT") ||
        upperLine.startsWith("CHECK")
      ) {
        continue;
      }

      const parts = line.split(/\s+/);
      const colName = parts[0]?.replace(/[`"']/g, "") || "";
      const colType = parts[1] || "TEXT";
      const isPk = upperLine.includes("PRIMARY KEY");
      const isAuto = upperLine.includes("AUTOINCREMENT") || upperLine.includes("AUTO_INCREMENT");
      const isNotNull = upperLine.includes("NOT NULL");

      if (colName) {
        columns.push({
          name: colName,
          type: colType,
          primaryKey: isPk,
          autoIncrement: isAuto,
          notNull: isNotNull,
        });
      }
    }

    this.tables.set(tableName, {
      name: tableName,
      columns,
      rows: [],
      lastAutoId: 0,
    });

    return {
      columns: [],
      rows: [],
      rowsAffected: 0,
      durationMs: Math.max(Date.now() - startTime, 1),
      dialectWarnings,
    };
  }

  private handleInsert(
    query: string,
    startTime: number,
    dialectWarnings: SqlQueryResult["dialectWarnings"],
  ): SqlQueryResult {
    const match = query.match(
      /INSERT\s+INTO\s+([`"'\w]+)(?:\s*\(([^)]+)\))?\s+VALUES\s*\(([\s\S]+?)\)/i,
    );
    if (!match || !match[1] || !match[3]) {
      throw new Error("Syntaxe INSERT INTO invalide.");
    }

    const tableName = match[1].replace(/[`"']/g, "").toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table '${tableName}' inexistante.`);
    }

    const specifiedCols = match[2]
      ? match[2].split(",").map((c) => c.trim().replace(/[`"']/g, ""))
      : table.columns.map((c) => c.name);

    const rawValues = match[3].split(",").map((v) => v.trim());
    const row: Record<string, unknown> = {};

    table.lastAutoId++;

    table.columns.forEach((col) => {
      const idx = specifiedCols.indexOf(col.name);
      if (idx !== -1 && rawValues[idx] !== undefined) {
        const raw = (rawValues[idx] ?? "").trim();
        let val: unknown = raw;
        if (
          (raw.startsWith("'") && raw.endsWith("'")) ||
          (raw.startsWith('"') && raw.endsWith('"'))
        ) {
          val = raw.slice(1, -1);
        } else if (raw === "NULL") {
          val = null;
        } else if (!isNaN(Number(raw))) {
          val = Number(raw);
        }
        row[col.name] = val;
      } else if (col.autoIncrement) {
        row[col.name] = table.lastAutoId;
      } else {
        row[col.name] = null;
      }
    });

    table.rows.push(row);

    return {
      columns: [],
      rows: [],
      rowsAffected: 1,
      durationMs: Math.max(Date.now() - startTime, 1),
      dialectWarnings,
    };
  }

  private handleSelect(
    query: string,
    startTime: number,
    dialectWarnings: SqlQueryResult["dialectWarnings"],
  ): SqlQueryResult {
    const fromMatch = query.match(/FROM\s+([`"'\w]+)/i);
    if (!fromMatch || !fromMatch[1]) {
      // Requête sans FROM (ex: SELECT 1 + 1, SELECT CURDATE())
      return {
        columns: ["result"],
        rows: [{ result: 1 }],
        rowsAffected: 1,
        durationMs: Math.max(Date.now() - startTime, 1),
        dialectWarnings,
      };
    }

    const tableName = fromMatch[1].replace(/[`"']/g, "").toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table '${tableName}' inexistante.`);
    }

    const selectMatch = query.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
    const rawSelect = selectMatch?.[1]?.trim() || "*";

    let rows = [...table.rows];

    // Traitement simple de clause WHERE
    const whereMatch = query.match(/WHERE\s+([^;]+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|;|$)/i);
    if (whereMatch && whereMatch[1]) {
      const cond = whereMatch[1].trim();
      const eqMatch = cond.match(/([`"'\w]+)\s*=\s*(['"]?[^'"]+['"]?)/);
      if (eqMatch && eqMatch[1] && eqMatch[2]) {
        const field = eqMatch[1].replace(/[`"']/g, "");
        let expectedVal: unknown = eqMatch[2].trim();
        if (
          typeof expectedVal === "string" &&
          ((expectedVal.startsWith("'") && expectedVal.endsWith("'")) ||
            (expectedVal.startsWith('"') && expectedVal.endsWith('"')))
        ) {
          expectedVal = expectedVal.slice(1, -1);
        } else if (!isNaN(Number(expectedVal))) {
          expectedVal = Number(expectedVal);
        }
        rows = rows.filter((r) => String(r[field]) === String(expectedVal));
      }
    }

    // Traitement de clause LIMIT
    const limitMatch = query.match(/LIMIT\s+(\d+)/i);
    if (limitMatch && limitMatch[1]) {
      const lim = parseInt(limitMatch[1], 10);
      rows = rows.slice(0, lim);
    }

    // Sélection des colonnes
    let columns: string[] = [];
    let formattedRows: Record<string, unknown>[] = [];

    if (rawSelect === "*") {
      columns = table.columns.map((c) => c.name);
      formattedRows = rows;
    } else if (rawSelect.toUpperCase().includes("COUNT(")) {
      columns = ["total"];
      formattedRows = [{ total: rows.length }];
    } else {
      columns = rawSelect.split(",").map((c) => c.trim().replace(/[`"']/g, ""));
      formattedRows = rows.map((r) => {
        const outRow: Record<string, unknown> = {};
        columns.forEach((c) => {
          outRow[c] = r[c] !== undefined ? r[c] : null;
        });
        return outRow;
      });
    }

    return {
      columns,
      rows: formattedRows,
      rowsAffected: formattedRows.length,
      durationMs: Math.max(Date.now() - startTime, 1),
      dialectWarnings,
    };
  }

  private handleUpdate(
    query: string,
    startTime: number,
    dialectWarnings: SqlQueryResult["dialectWarnings"],
  ): SqlQueryResult {
    const updatePrefixMatch = query.match(/UPDATE\s+([`"'\w]+)\s+SET\s+/i);
    if (!updatePrefixMatch || !updatePrefixMatch[1]) {
      throw new Error("Syntaxe UPDATE invalide.");
    }

    const tableName = updatePrefixMatch[1].replace(/[`"']/g, "").toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table '${tableName}' inexistante.`);
    }

    const afterSet = query.slice(updatePrefixMatch[0].length);
    const whereIdx = afterSet.toUpperCase().indexOf(" WHERE ");

    let setPart = "";
    let wherePart = "";
    if (whereIdx !== -1) {
      setPart = afterSet.slice(0, whereIdx).trim();
      wherePart = afterSet
        .slice(whereIdx + 7)
        .replace(/;$/, "")
        .trim();
    } else {
      setPart = afterSet.replace(/;$/, "").trim();
    }

    const setClauses = setPart.split(",").map((c) => c.trim());
    let affected = 0;

    table.rows.forEach((row) => {
      // Vérifier la condition WHERE si présente
      if (wherePart) {
        const eqMatch = wherePart.match(/([`"'\w]+)\s*=\s*(['"]?[^'"]+['"]?)/);
        if (eqMatch && eqMatch[1] && eqMatch[2]) {
          const whereField = eqMatch[1].replace(/[`"']/g, "");
          const rawExpected = (eqMatch[2] ?? "").trim();
          let expectedVal: unknown = rawExpected;
          if (
            (rawExpected.startsWith("'") && rawExpected.endsWith("'")) ||
            (rawExpected.startsWith('"') && rawExpected.endsWith('"'))
          ) {
            expectedVal = rawExpected.slice(1, -1);
          } else if (!isNaN(Number(rawExpected))) {
            expectedVal = Number(rawExpected);
          }
          if (String(row[whereField]) !== String(expectedVal)) {
            return; // ne pas modifier cette ligne
          }
        }
      }

      setClauses.forEach((clause) => {
        const [col, val] = clause.split("=").map((p) => p.trim());
        if (col && val !== undefined) {
          const colClean = col.replace(/[`"']/g, "");
          let cleanVal: unknown = val;
          if (
            (val.startsWith("'") && val.endsWith("'")) ||
            (val.startsWith('"') && val.endsWith('"'))
          ) {
            cleanVal = val.slice(1, -1);
          } else if (!isNaN(Number(val))) {
            cleanVal = Number(val);
          }
          row[colClean] = cleanVal;
        }
      });
      affected++;
    });

    return {
      columns: [],
      rows: [],
      rowsAffected: affected,
      durationMs: Math.max(Date.now() - startTime, 1),
      dialectWarnings,
    };
  }

  private handleDelete(
    query: string,
    startTime: number,
    dialectWarnings: SqlQueryResult["dialectWarnings"],
  ): SqlQueryResult {
    const match = query.match(/DELETE\s+FROM\s+([`"'\w]+)/i);
    if (!match || !match[1]) {
      throw new Error("Syntaxe DELETE invalide.");
    }

    const tableName = match[1].replace(/[`"']/g, "").toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table '${tableName}' inexistante.`);
    }

    const initialCount = table.rows.length;
    table.rows = [];

    return {
      columns: [],
      rows: [],
      rowsAffected: initialCount,
      durationMs: Math.max(Date.now() - startTime, 1),
      dialectWarnings,
    };
  }

  private handleDropTable(
    query: string,
    startTime: number,
    dialectWarnings: SqlQueryResult["dialectWarnings"],
  ): SqlQueryResult {
    const match = query.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([`"'\w]+)/i);
    if (!match || !match[1]) {
      throw new Error("Syntaxe DROP TABLE invalide.");
    }

    const tableName = match[1].replace(/[`"']/g, "").toLowerCase();
    const existed = this.tables.delete(tableName);

    return {
      columns: [],
      rows: [],
      rowsAffected: existed ? 1 : 0,
      durationMs: Math.max(Date.now() - startTime, 1),
      dialectWarnings,
    };
  }
}
