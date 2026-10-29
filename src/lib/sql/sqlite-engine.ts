/**
 * Labo STI - Moteur SQL Relationnel Local (PRD §8.2, F-25 à F-31, TEC-02)
 *
 * Moteur de base de données relationnelle locale exécutant le SQL dans le navigateur
 * avec contrôle de dialecte MySQL/MariaDB, visualiseur de tables et réinitialisation instantanée.
 *
 * Supporte :
 * - Découpage lexical SQL respectant les chaînes de caractères contenant ';' et les commentaires '--' / '/* ... *\/'
 * - INNER JOIN / LEFT JOIN / jointures implicites multi-tables
 * - GROUP BY, HAVING, ORDER BY ASC|DESC, LIMIT
 * - Fonctions d'agrégation COUNT, SUM, AVG, MIN, MAX
 * - Opérateurs =, !=, <>, <, <=, >, >=, BETWEEN, IN, LIKE, IS NULL, IS NOT NULL, AND, OR
 * - Application stricte de PRIMARY KEY (simple et composée), FOREIGN KEY, NOT NULL, UNIQUE, DEFAULT, CHECK et ALTER TABLE
 */

import { verifierDialecteSql } from "./dialect-controller";
import { decouperRequetesSql, RelationalDatabaseEngine } from "./relational-engine";
import type { SqlColumnInfo, SqlEngineConfig, SqlQueryResult, SqlTableInfo } from "./types";

export class SqliteEngine {
  private engine: RelationalDatabaseEngine = new RelationalDatabaseEngine();
  private initialSql: string = "";
  private readonly enableDialectController: boolean;

  constructor(config: SqlEngineConfig = {}) {
    this.enableDialectController = config.enableDialectController ?? true;
    if (config.initialSql) {
      this.initialSql = config.initialSql;
    }
  }

  /**
   * Retourne l'instance sous-jacente du moteur relationnel
   */
  public getRelationalEngine(): RelationalDatabaseEngine {
    return this.engine;
  }

  /**
   * Initialise le moteur et charge le script SQL initial
   */
  public async init(initialSql?: string): Promise<void> {
    if (initialSql !== undefined) {
      this.initialSql = initialSql;
    }
    this.engine.clear();
    if (this.initialSql.trim()) {
      await this.loadSql(this.initialSql);
    }
  }

  /**
   * Réinitialise la base à son état initial exact (PRD F-27)
   */
  public async reset(): Promise<void> {
    this.engine.clear();
    if (this.initialSql.trim()) {
      await this.loadSql(this.initialSql);
    }
  }

  /**
   * Exécute un script multi-instructions SQL (.sql)
   */
  public async loadSql(sqlScript: string): Promise<SqlQueryResult[]> {
    const statements = decouperRequetesSql(sqlScript);
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

    // 2. Exécution relationnelle
    const res = this.engine.query(trimmed);

    const out: SqlQueryResult = {
      columns: res.columns,
      rows: res.rows,
      rowsAffected: res.affectedRows,
      durationMs: Math.max(Date.now() - startTime, res.durationMs || 1),
      dialectWarnings,
    };

    if (res.error) {
      out.error = res.error;
    }

    return out;
  }

  /**
   * Retourne la liste et structure de toutes les tables existantes
   */
  public async getTables(): Promise<SqlTableInfo[]> {
    const result: SqlTableInfo[] = [];
    const tableNames = this.engine.getTableNames();

    for (const name of tableNames) {
      const table = this.engine.getTable(name);
      if (!table) continue;

      result.push({
        name: table.name,
        rowCount: table.rows.length,
        columns: table.columns.map((c): SqlColumnInfo => ({
          name: c.name,
          type: c.rawType,
          primaryKey: c.primaryKey,
          notNull: c.notNull,
          defaultValue: c.defaultValue !== undefined ? String(c.defaultValue) : null,
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
    const table = this.engine.getTable(tableName);
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

    for (const name of this.engine.getTableNames()) {
      const table = this.engine.getTable(name);
      if (!table) continue;

      lines.push(`-- Structure de la table \`${table.name}\``);
      lines.push(`CREATE TABLE IF NOT EXISTS \`${table.name}\` (`);
      const colDefs = table.columns.map((c) => {
        let def = `  \`${c.name}\` ${c.rawType}`;
        if (c.primaryKey) def += " PRIMARY KEY";
        if (c.autoIncrement) def += " AUTO_INCREMENT";
        if (c.notNull) def += " NOT NULL";
        if (c.defaultValue !== undefined && c.defaultValue !== null) {
          def += ` DEFAULT '${c.defaultValue}'`;
        }
        return def;
      });

      // Contraintes de table
      for (const fk of table.foreignKeys) {
        colDefs.push(
          `  CONSTRAINT \`fk_${table.name}_${fk.refTable}\` FOREIGN KEY (\`${fk.columns.join("`, `")}\`) REFERENCES \`${fk.refTable}\` (\`${fk.refColumns.join("`, `")}\`)`,
        );
      }
      for (const chk of table.checkConstraints) {
        colDefs.push(`  CHECK (${chk})`);
      }

      lines.push(colDefs.join(",\n"));
      lines.push(");");
      lines.push("");

      if (table.rows.length > 0) {
        lines.push(`-- Données de la table \`${table.name}\``);
        const colNames = table.columns.map((c) => `\`${c.name}\``).join(", ");
        for (const row of table.rows) {
          const values = table.columns.map((c) => {
            const val = row[c.name];
            if (val === null || val === undefined) return "NULL";
            if (typeof val === "number") return String(val);
            return `'${String(val).replace(/'/g, "''")}'`;
          });
          lines.push(`INSERT INTO \`${table.name}\` (${colNames}) VALUES (${values.join(", ")});`);
        }
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Dump de l'état en dictionnaire { nomTable: lignes[] }
   */
  public async dumpState(): Promise<Record<string, Record<string, unknown>[]>> {
    const state: Record<string, Record<string, unknown>[]> = {};
    for (const name of this.engine.getTableNames()) {
      state[name] = this.engine.getTableRows(name);
    }
    return state;
  }
}
