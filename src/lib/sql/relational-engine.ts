/**
 * Labo STI - Moteur SQL Relationnel Complet (PRD §8.2, F-25 à F-31, TEC-02)
 *
 * Moteur SQL relationnel en mémoire certifié pour le programme officiel du Bac STI :
 * - Découpage lexical respectant les chaînes de caractères contenant ';' et les commentaires '--' / '/* ... *\/'
 * - Schéma relationnel strict avec typage (INT, VARCHAR, CHAR, DECIMAL, DATE, DATETIME, FLOAT)
 * - Contraintes d'intégrité : PRIMARY KEY (simple et composée), FOREIGN KEY (RESTRICT/CASCADE),
 *   NOT NULL, UNIQUE, DEFAULT, CHECK
 * - DDL : CREATE TABLE, ALTER TABLE (ADD COLUMN, ADD CONSTRAINT, DROP COLUMN), DROP TABLE
 * - DML : INSERT INTO (multi-tuples), UPDATE, DELETE FROM (avec contrôle d'intégrité référentielle)
 * - SELECT complet :
 *   * Jointures INNER JOIN, LEFT JOIN, jointures implicites virgule (FROM t1, t2)
 *   * Prédicats WHERE complexes : AND, OR, NOT, parenthèses, =, !=, <>, <, <=, >, >=,
 *     BETWEEN, IN, LIKE (avec wildcards % et _), IS NULL, IS NOT NULL
 *   * GROUP BY et agrégations : COUNT(*), COUNT(col), COUNT(DISTINCT col), SUM, AVG, MIN, MAX
 *   * Filtrage de groupes HAVING
 *   * Tri ORDER BY multi-colonnes (ASC / DESC)
 *   * Pagination LIMIT [offset,] count
 */

export interface RelationalColumnDef {
  name: string;
  rawType: string;
  baseType:
    "VARCHAR" | "CHAR" | "INT" | "DECIMAL" | "DATE" | "DATETIME" | "FLOAT" | "TEXT" | "OTHER";
  length?: number | undefined;
  precision?: number | undefined;
  scale?: number | undefined;
  notNull: boolean;
  unique: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  defaultValue?: unknown;
  checkExpr?: string | undefined;
}

export interface RelationalForeignKeyDef {
  constraintName?: string | undefined;
  columns: string[];
  refTable: string;
  refColumns: string[];
  onDelete: "RESTRICT" | "CASCADE";
  onUpdate: "RESTRICT" | "CASCADE";
}

export interface RelationalTable {
  name: string;
  columns: RelationalColumnDef[];
  primaryKey: string[];
  foreignKeys: RelationalForeignKeyDef[];
  uniqueSets: string[][];
  checkConstraints: string[];
  rows: Record<string, unknown>[];
  autoIncrementCounter: number;
}

export interface RelationalQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  numRows: number;
  affectedRows: number;
  durationMs: number;
  error?: string | undefined;
  errno?: number | undefined;
}

/**
 * Découpe un script SQL multi-instructions en requêtes individuelles
 * en respectant les chaînes de caractères ('...', "...", `...`) et les commentaires.
 */
export function decouperRequetesSql(sqlScript: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  const len = sqlScript.length;

  for (let i = 0; i < len; i++) {
    const ch = sqlScript[i] ?? "";
    const nextCh = i + 1 < len ? (sqlScript[i + 1] ?? "") : "";

    // 1. Gestion des commentaires en ligne (-- ...)
    if (inLineComment) {
      if (ch === "\n" || ch === "\r") {
        inLineComment = false;
        current += " ";
      }
      continue;
    }

    // 2. Gestion des commentaires en bloc (/* ... */)
    if (inBlockComment) {
      if (ch === "*" && nextCh === "/") {
        inBlockComment = false;
        i++; // Sauter le '/'
        current += " ";
      }
      continue;
    }

    // 3. Détection de début de commentaire hors-chaîne
    if (!inSingle && !inDouble && !inBacktick) {
      if (ch === "-" && nextCh === "-") {
        inLineComment = true;
        i++;
        continue;
      }
      if (ch === "/" && nextCh === "*") {
        inBlockComment = true;
        i++;
        continue;
      }
    }

    // 4. Gestion des délimiteurs de chaînes
    if (ch === "'" && !inDouble && !inBacktick) {
      if (inSingle && nextCh === "'") {
        // Échappement SQL standard ''
        current += "''";
        i++;
        continue;
      }
      if (inSingle && (i === 0 || sqlScript[i - 1] !== "\\")) {
        inSingle = false;
      } else if (!inSingle) {
        inSingle = true;
      }
      current += ch;
      continue;
    }

    if (ch === '"' && !inSingle && !inBacktick) {
      if (inDouble && (i === 0 || sqlScript[i - 1] !== "\\")) {
        inDouble = false;
      } else if (!inDouble) {
        inDouble = true;
      }
      current += ch;
      continue;
    }

    if (ch === "`" && !inSingle && !inDouble) {
      inBacktick = !inBacktick;
      current += ch;
      continue;
    }

    // 5. Découpage par point-virgule
    if (ch === ";" && !inSingle && !inDouble && !inBacktick) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = "";
      continue;
    }

    current += ch;
  }

  const trimmedEnd = current.trim();
  if (trimmedEnd.length > 0) {
    statements.push(trimmedEnd);
  }

  return statements;
}

/**
 * Sépare des éléments d'une liste par virgule au niveau supérieur (ignore les virgules dans les parenthèses ou chaînes)
 */
export function splitTopLevelCommas(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? "";
    const nextCh = i + 1 < text.length ? (text[i + 1] ?? "") : "";

    if (ch === "'" && !inDouble) {
      if (inSingle && nextCh === "'") {
        i++; // Échappement SQL ''
        continue;
      }
      if (inSingle && (i === 0 || text[i - 1] !== "\\")) {
        inSingle = false;
      } else if (!inSingle) {
        inSingle = true;
      }
    } else if (ch === '"' && !inSingle) {
      if (inDouble && (i === 0 || text[i - 1] !== "\\")) {
        inDouble = false;
      } else if (!inDouble) {
        inDouble = true;
      }
    } else if (!inSingle && !inDouble) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === "," && depth === 0) {
        parts.push(text.slice(start, i).trim());
        start = i + 1;
      }
    }
  }

  const remainder = text.slice(start).trim();
  if (remainder.length > 0) {
    parts.push(remainder);
  }
  return parts;
}

/**
 * Moteur Relationnel SQL complet
 */
export class RelationalDatabaseEngine {
  private tables: Map<string, RelationalTable> = new Map();
  private lastError: string = "";
  private lastErrno: number = 0;
  private lastAffectedRows: number = 0;

  public getLastError(): string {
    return this.lastError;
  }

  public getLastErrno(): number {
    return this.lastErrno;
  }

  public getLastAffectedRows(): number {
    return this.lastAffectedRows;
  }

  public clear(): void {
    this.tables.clear();
    this.lastError = "";
    this.lastErrno = 0;
    this.lastAffectedRows = 0;
  }

  public getTableNames(): string[] {
    return Array.from(this.tables.keys());
  }

  public getTable(name: string): RelationalTable | undefined {
    return this.tables.get(name.toLowerCase());
  }

  public getTableRows(tableName: string): Record<string, unknown>[] {
    return this.tables.get(tableName.toLowerCase())?.rows ?? [];
  }

  private setError(errno: number, message: string): void {
    this.lastErrno = errno;
    this.lastError = `#${errno} - ${message}`;
  }

  private clearError(): void {
    this.lastErrno = 0;
    this.lastError = "";
  }

  /**
   * Exécute un script multi-instructions
   */
  public executeScript(script: string): { success: boolean; results: RelationalQueryResult[] } {
    const stmts = decouperRequetesSql(script);
    const results: RelationalQueryResult[] = [];
    let success = true;

    for (const stmt of stmts) {
      const res = this.query(stmt);
      results.push(res);
      if (res.error) {
        success = false;
        break;
      }
    }

    return { success, results };
  }

  /**
   * Exécute une requête SQL individuelle
   */
  public query(sql: string): RelationalQueryResult {
    const startTime = Date.now();
    this.clearError();
    this.lastAffectedRows = 0;

    const trimmed = sql.trim().replace(/;$/, "").trim();
    if (!trimmed) {
      return {
        columns: [],
        rows: [],
        numRows: 0,
        affectedRows: 0,
        durationMs: 0,
      };
    }

    const upper = trimmed.toUpperCase();

    try {
      if (upper.startsWith("CREATE TABLE")) {
        this.handleCreateTable(trimmed);
        return {
          columns: [],
          rows: [],
          numRows: 0,
          affectedRows: 0,
          durationMs: Math.max(Date.now() - startTime, 1),
        };
      }

      if (upper.startsWith("ALTER TABLE")) {
        this.handleAlterTable(trimmed);
        return {
          columns: [],
          rows: [],
          numRows: 0,
          affectedRows: 0,
          durationMs: Math.max(Date.now() - startTime, 1),
        };
      }

      if (upper.startsWith("DROP TABLE")) {
        this.handleDropTable(trimmed);
        return {
          columns: [],
          rows: [],
          numRows: 0,
          affectedRows: 0,
          durationMs: Math.max(Date.now() - startTime, 1),
        };
      }

      if (upper.startsWith("INSERT INTO")) {
        const count = this.handleInsert(trimmed);
        this.lastAffectedRows = count;
        return {
          columns: [],
          rows: [],
          numRows: 0,
          affectedRows: count,
          durationMs: Math.max(Date.now() - startTime, 1),
        };
      }

      if (upper.startsWith("UPDATE")) {
        const count = this.handleUpdate(trimmed);
        this.lastAffectedRows = count;
        return {
          columns: [],
          rows: [],
          numRows: 0,
          affectedRows: count,
          durationMs: Math.max(Date.now() - startTime, 1),
        };
      }

      if (upper.startsWith("DELETE FROM")) {
        const count = this.handleDelete(trimmed);
        this.lastAffectedRows = count;
        return {
          columns: [],
          rows: [],
          numRows: 0,
          affectedRows: count,
          durationMs: Math.max(Date.now() - startTime, 1),
        };
      }

      if (upper.startsWith("SELECT")) {
        const { columns, rows } = this.handleSelect(trimmed);
        return {
          columns,
          rows,
          numRows: rows.length,
          affectedRows: 0,
          durationMs: Math.max(Date.now() - startTime, 1),
        };
      }

      this.setError(
        1064,
        `You have an error in your SQL syntax; check the manual near '${trimmed.slice(0, 30)}'`,
      );
      return {
        columns: [],
        rows: [],
        numRows: 0,
        affectedRows: 0,
        durationMs: Math.max(Date.now() - startTime, 1),
        error: this.lastError,
        errno: this.lastErrno,
      };
    } catch (err: unknown) {
      if (!this.lastError) {
        this.setError(1064, err instanceof Error ? err.message : String(err));
      }
      return {
        columns: [],
        rows: [],
        numRows: 0,
        affectedRows: 0,
        durationMs: Math.max(Date.now() - startTime, 1),
        error: this.lastError,
        errno: this.lastErrno,
      };
    }
  }

  // =========================================================================
  // CREATE TABLE
  // =========================================================================
  private handleCreateTable(stmt: string): void {
    const match = stmt.match(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([a-zA-Z0-9_]+)[`"']?\s*\(([\s\S]+)\)/i,
    );
    if (!match || !match[1] || !match[2]) {
      this.setError(1064, "Syntaxe CREATE TABLE invalide");
      throw new Error(this.lastError);
    }

    const tableName = match[1].toLowerCase();
    const isIfNotExists = /IF\s+NOT\s+EXISTS/i.test(stmt);
    if (this.tables.has(tableName)) {
      if (isIfNotExists) return;
      this.setError(1050, `Table '${tableName}' already exists`);
      throw new Error(this.lastError);
    }

    const items = splitTopLevelCommas(match[2]);
    const columns: RelationalColumnDef[] = [];
    const primaryKey: string[] = [];
    const foreignKeys: RelationalForeignKeyDef[] = [];
    const uniqueSets: string[][] = [];
    const checkConstraints: string[] = [];

    for (const item of items) {
      const cleanItem = item.trim();
      const upperItem = cleanItem.toUpperCase();

      // Contrainte de table : PRIMARY KEY (...)
      const pkMatch = cleanItem.match(
        /^(?:CONSTRAINT\s+[`"']?\w+[`"']?\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i,
      );
      if (pkMatch && pkMatch[1]) {
        const cols = pkMatch[1].split(",").map((c) => this.cleanIdentifier(c));
        for (const col of cols) {
          if (!primaryKey.includes(col)) primaryKey.push(col);
        }
        continue;
      }

      // Contrainte de table : FOREIGN KEY (...) REFERENCES refTable(...)
      const fkMatch = cleanItem.match(
        /^(?:CONSTRAINT\s+[`"']?(\w+)[`"']?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|RESTRICT|SET\s+NULL))?(?:\s+ON\s+UPDATE\s+(CASCADE|RESTRICT))?/i,
      );
      if (fkMatch && fkMatch[2] && fkMatch[3] && fkMatch[4]) {
        const constraintName = fkMatch[1];
        const cols = fkMatch[2].split(",").map((c) => this.cleanIdentifier(c));
        const refTable = fkMatch[3].toLowerCase();
        const refCols = fkMatch[4].split(",").map((c) => this.cleanIdentifier(c));
        const onDelete = (
          fkMatch[5]?.toUpperCase().trim() === "CASCADE" ? "CASCADE" : "RESTRICT"
        ) as "RESTRICT" | "CASCADE";
        const onUpdate = (
          fkMatch[6]?.toUpperCase().trim() === "CASCADE" ? "CASCADE" : "RESTRICT"
        ) as "RESTRICT" | "CASCADE";

        foreignKeys.push({
          constraintName,
          columns: cols,
          refTable,
          refColumns: refCols,
          onDelete,
          onUpdate,
        });
        continue;
      }

      // Contrainte de table : UNIQUE KEY (...) ou UNIQUE (...)
      const uqMatch = cleanItem.match(
        /^(?:CONSTRAINT\s+[`"']?\w+[`"']?\s+)?UNIQUE(?:\s+KEY)?(?:\s+[`"']?\w+[`"']?)?\s*\(([^)]+)\)/i,
      );
      if (uqMatch && uqMatch[1]) {
        const cols = uqMatch[1].split(",").map((c) => this.cleanIdentifier(c));
        uniqueSets.push(cols);
        continue;
      }

      // Contrainte de table : CHECK (...)
      const chkMatch = cleanItem.match(
        /^(?:CONSTRAINT\s+[`"']?\w+[`"']?\s+)?CHECK\s*\(([\s\S]+)\)/i,
      );
      if (chkMatch && chkMatch[1]) {
        checkConstraints.push(chkMatch[1].trim());
        continue;
      }

      // Définition de colonne standard
      const colDef = this.parseColumnDefinition(cleanItem);
      if (colDef) {
        columns.push(colDef);
        if (colDef.primaryKey && !primaryKey.includes(colDef.name)) {
          primaryKey.push(colDef.name);
        }
        if (colDef.unique) {
          uniqueSets.push([colDef.name]);
        }
        if (colDef.checkExpr) {
          checkConstraints.push(colDef.checkExpr);
        }
      }
    }

    // Marquer les colonnes de la clé primaire comme NOT NULL
    for (const pkCol of primaryKey) {
      const col = columns.find((c) => c.name === pkCol);
      if (col) {
        col.primaryKey = true;
        col.notNull = true;
      }
    }

    const table: RelationalTable = {
      name: tableName,
      columns,
      primaryKey,
      foreignKeys,
      uniqueSets,
      checkConstraints,
      rows: [],
      autoIncrementCounter: 0,
    };

    this.tables.set(tableName, table);
  }

  private cleanIdentifier(id: string): string {
    return id.trim().replace(/[`"']/g, "").toLowerCase();
  }

  private parseColumnDefinition(def: string): RelationalColumnDef | null {
    const m = def.match(/^[`"']?([a-zA-Z0-9_]+)[`"']?\s+([a-zA-Z]+(?:\s*\([^)]+\))?)([\s\S]*)$/i);
    if (!m || !m[1] || !m[2]) return null;

    const name = m[1].toLowerCase();
    const rawType = m[2].trim();
    const rest = m[3] || "";
    const upperRest = rest.toUpperCase();

    let baseType: RelationalColumnDef["baseType"] = "OTHER";
    let length: number | undefined;
    let precision: number | undefined;
    let scale: number | undefined;

    const typeMatch = rawType.match(/^([a-zA-Z]+)(?:\s*\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\))?/i);
    const typeName = (typeMatch?.[1] || rawType).toUpperCase();

    if (
      typeName.includes("INT") ||
      typeName === "INTEGER" ||
      typeName === "TINYINT" ||
      typeName === "BIGINT"
    ) {
      baseType = "INT";
    } else if (typeName === "VARCHAR") {
      baseType = "VARCHAR";
      length = typeMatch?.[2] ? parseInt(typeMatch[2], 10) : 255;
    } else if (typeName === "CHAR") {
      baseType = "CHAR";
      length = typeMatch?.[2] ? parseInt(typeMatch[2], 10) : 1;
    } else if (typeName === "DECIMAL" || typeName === "NUMERIC") {
      baseType = "DECIMAL";
      precision = typeMatch?.[2] ? parseInt(typeMatch[2], 10) : 10;
      scale = typeMatch?.[3] ? parseInt(typeMatch[3], 10) : 0;
    } else if (typeName === "DATE") {
      baseType = "DATE";
    } else if (typeName === "DATETIME" || typeName === "TIMESTAMP") {
      baseType = "DATETIME";
    } else if (typeName === "FLOAT" || typeName === "DOUBLE") {
      baseType = "FLOAT";
    } else if (typeName === "TEXT") {
      baseType = "TEXT";
    }

    const primaryKey = /\bPRIMARY\s+KEY\b/i.test(upperRest);
    const notNull = /\bNOT\s+NULL\b/i.test(upperRest) || primaryKey;
    const unique = /\bUNIQUE\b/i.test(upperRest);
    const autoIncrement =
      /\bAUTO_INCREMENT\b/i.test(upperRest) || /\bAUTOINCREMENT\b/i.test(upperRest);

    let defaultValue: unknown = undefined;
    const defMatch = rest.match(
      /\bDEFAULT\s+('([^']*)'|"([^"]*)"|CURRENT_TIMESTAMP|NOW\(\)|CURDATE\(\)|-?\d+(?:\.\d+)?|NULL)/i,
    );
    if (defMatch) {
      const rawDef = defMatch[1] ?? "";
      if (rawDef.toUpperCase() === "NULL") defaultValue = null;
      else if (defMatch[2] !== undefined) defaultValue = defMatch[2];
      else if (defMatch[3] !== undefined) defaultValue = defMatch[3];
      else if (/CURRENT_TIMESTAMP|NOW\(\)/i.test(rawDef)) defaultValue = "CURRENT_TIMESTAMP";
      else if (/CURDATE\(\)/i.test(rawDef)) defaultValue = "CURDATE()";
      else defaultValue = Number(rawDef);
    }

    let checkExpr: string | undefined = undefined;
    const chkMatch = rest.match(/\bCHECK\s*\(([\s\S]+)\)/i);
    if (chkMatch && chkMatch[1]) {
      checkExpr = chkMatch[1].trim();
    }

    return {
      name,
      rawType,
      baseType,
      length,
      precision,
      scale,
      notNull,
      unique,
      primaryKey,
      autoIncrement,
      defaultValue,
      checkExpr,
    };
  }

  // =========================================================================
  // ALTER TABLE
  // =========================================================================
  private handleAlterTable(stmt: string): void {
    const match = stmt.match(/^ALTER\s+TABLE\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s+([\s\S]+)$/i);
    if (!match || !match[1] || !match[2]) {
      this.setError(1064, "Syntaxe ALTER TABLE invalide");
      throw new Error(this.lastError);
    }

    const tableName = match[1].toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) {
      this.setError(1146, `Table '${tableName}' doesn't exist`);
      throw new Error(this.lastError);
    }

    const clause = match[2].trim();

    // 1. ADD CONSTRAINT FOREIGN KEY
    const fkMatch = clause.match(
      /^ADD\s+(?:CONSTRAINT\s+[`"']?(\w+)[`"']?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|RESTRICT))?(?:\s+ON\s+UPDATE\s+(CASCADE|RESTRICT))?/i,
    );
    if (fkMatch && fkMatch[2] && fkMatch[3] && fkMatch[4]) {
      const constraintName = fkMatch[1];
      const cols = fkMatch[2].split(",").map((c) => this.cleanIdentifier(c));
      const refTable = fkMatch[3].toLowerCase();
      const refCols = fkMatch[4].split(",").map((c) => this.cleanIdentifier(c));
      const onDelete = (fkMatch[5]?.toUpperCase().trim() === "CASCADE" ? "CASCADE" : "RESTRICT") as
        "RESTRICT" | "CASCADE";
      const onUpdate = (fkMatch[6]?.toUpperCase().trim() === "CASCADE" ? "CASCADE" : "RESTRICT") as
        "RESTRICT" | "CASCADE";

      table.foreignKeys.push({
        constraintName,
        columns: cols,
        refTable,
        refColumns: refCols,
        onDelete,
        onUpdate,
      });
      return;
    }

    // 2. ADD CONSTRAINT PRIMARY KEY
    const pkMatch = clause.match(
      /^ADD\s+(?:CONSTRAINT\s+[`"']?\w+[`"']?\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i,
    );
    if (pkMatch && pkMatch[1]) {
      const cols = pkMatch[1].split(",").map((c) => this.cleanIdentifier(c));
      for (const col of cols) {
        if (!table.primaryKey.includes(col)) table.primaryKey.push(col);
        const colDef = table.columns.find((c) => c.name === col);
        if (colDef) {
          colDef.primaryKey = true;
          colDef.notNull = true;
        }
      }
      return;
    }

    // 3. ADD CONSTRAINT CHECK
    const chkMatch = clause.match(
      /^ADD\s+(?:CONSTRAINT\s+[`"']?\w+[`"']?\s+)?CHECK\s*\(([\s\S]+)\)/i,
    );
    if (chkMatch && chkMatch[1]) {
      table.checkConstraints.push(chkMatch[1].trim());
      return;
    }

    // 4. ADD [COLUMN] colDef
    const addColMatch = clause.match(/^ADD\s+(?:COLUMN\s+)?(.+)$/i);
    if (addColMatch && addColMatch[1]) {
      const colDef = this.parseColumnDefinition(addColMatch[1]);
      if (colDef) {
        table.columns.push(colDef);
        // Initialiser pour chaque ligne existante
        for (const row of table.rows) {
          row[colDef.name] = colDef.defaultValue !== undefined ? colDef.defaultValue : null;
        }
        return;
      }
    }

    // 5. DROP [COLUMN] colName
    const dropColMatch = clause.match(/^DROP\s+(?:COLUMN\s+)?[`"']?([a-zA-Z0-9_]+)[`"']?/i);
    if (dropColMatch && dropColMatch[1]) {
      const colName = dropColMatch[1].toLowerCase();
      table.columns = table.columns.filter((c) => c.name !== colName);
      table.primaryKey = table.primaryKey.filter((c) => c !== colName);
      for (const row of table.rows) {
        delete row[colName];
      }
      return;
    }
  }

  // =========================================================================
  // DROP TABLE
  // =========================================================================
  private handleDropTable(stmt: string): void {
    const m = stmt.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?[`"']?([a-zA-Z0-9_]+)[`"']?/i);
    if (!m || !m[1]) {
      this.setError(1064, "Syntaxe DROP TABLE invalide");
      throw new Error(this.lastError);
    }

    const tableName = m[1].toLowerCase();
    const isIfExists = /IF\s+EXISTS/i.test(stmt);

    if (!this.tables.has(tableName)) {
      if (isIfExists) return;
      this.setError(1051, `Unknown table '${tableName}'`);
      throw new Error(this.lastError);
    }

    // Vérifier si une autre table la référence
    for (const [otherName, otherTbl] of this.tables.entries()) {
      if (otherName === tableName) continue;
      const references = otherTbl.foreignKeys.some((fk) => fk.refTable === tableName);
      if (references && otherTbl.rows.length > 0) {
        this.setError(1451, `Cannot delete or update a parent row: a foreign key constraint fails`);
        throw new Error(this.lastError);
      }
    }

    this.tables.delete(tableName);
  }

  // =========================================================================
  // INSERT INTO
  // =========================================================================
  private handleInsert(stmt: string): number {
    const m = stmt.match(
      /^INSERT\s+INTO\s+[`"']?([a-zA-Z0-9_]+)[`"']?(?:\s*\(([^)]+)\))?\s+VALUES\s*([\s\S]+)$/i,
    );
    if (!m || !m[1] || !m[3]) {
      this.setError(1064, "Syntaxe INSERT INTO invalide");
      throw new Error(this.lastError);
    }

    const tableName = m[1].toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) {
      this.setError(1146, `Table '${tableName}' doesn't exist`);
      throw new Error(this.lastError);
    }

    const specifiedCols = m[2]
      ? m[2].split(",").map((c) => this.cleanIdentifier(c))
      : table.columns.map((c) => c.name);

    // Extraction des tuples (...) de VALUES
    const valuesSection = m[3].trim();
    const tuples: string[] = [];
    let depth = 0;
    let start = -1;
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < valuesSection.length; i++) {
      const ch = valuesSection[i] ?? "";
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (ch === '"' && !inSingle) inDouble = !inDouble;
      else if (!inSingle && !inDouble) {
        if (ch === "(") {
          if (depth === 0) start = i + 1;
          depth++;
        } else if (ch === ")") {
          depth--;
          if (depth === 0 && start !== -1) {
            tuples.push(valuesSection.slice(start, i));
            start = -1;
          }
        }
      }
    }

    let inserted = 0;
    for (const tuple of tuples) {
      const parsedVals = this.parseValueLiterals(tuple);
      const row: Record<string, unknown> = {};

      table.autoIncrementCounter++;

      for (const col of table.columns) {
        const colIdx = specifiedCols.indexOf(col.name);
        let rawVal = colIdx !== -1 ? parsedVals[colIdx] : undefined;

        if (rawVal === undefined) {
          if (col.autoIncrement) {
            rawVal = table.autoIncrementCounter;
          } else if (col.defaultValue !== undefined) {
            rawVal =
              col.defaultValue === "CURRENT_TIMESTAMP"
                ? new Date().toISOString().replace("T", " ").slice(0, 19)
                : col.defaultValue;
          } else {
            rawVal = null;
          }
        } else if (col.autoIncrement && typeof rawVal === "number") {
          table.autoIncrementCounter = Math.max(table.autoIncrementCounter, rawVal);
        }

        row[col.name] = this.validateAndCoerce(table, col, rawVal);
      }

      this.verifyIntegrityConstraints(table, row);
      table.rows.push(row);
      inserted++;
    }

    return inserted;
  }

  // =========================================================================
  // UPDATE
  // =========================================================================
  private handleUpdate(stmt: string): number {
    const m = stmt.match(
      /^UPDATE\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i,
    );
    if (!m || !m[1] || !m[2]) {
      this.setError(1064, "Syntaxe UPDATE invalide");
      throw new Error(this.lastError);
    }

    const tableName = m[1].toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) {
      this.setError(1146, `Table '${tableName}' doesn't exist`);
      throw new Error(this.lastError);
    }

    const setClauses = splitTopLevelCommas(m[2]);
    const assignments: { col: RelationalColumnDef; val: unknown }[] = [];

    for (const clause of setClauses) {
      const assignMatch = clause.match(/^[`"']?([a-zA-Z0-9_]+)[`"']?\s*=\s*([\s\S]+)$/);
      if (!assignMatch || !assignMatch[1] || !assignMatch[2]) continue;

      const colName = assignMatch[1].toLowerCase();
      const colDef = table.columns.find((c) => c.name === colName);
      if (!colDef) {
        this.setError(1054, `Unknown column '${colName}' in 'field list'`);
        throw new Error(this.lastError);
      }

      const parsedVal = this.parseValueLiterals(assignMatch[2])[0];
      assignments.push({ col: colDef, val: parsedVal });
    }

    const whereClause = m[3] || "";
    let affected = 0;

    table.rows.forEach((row, idx) => {
      if (!this.evaluateWhereCondition(row, whereClause, [table])) return;

      const updatedRow = { ...row };
      for (const { col, val } of assignments) {
        updatedRow[col.name] = this.validateAndCoerce(table, col, val);
      }

      this.verifyIntegrityConstraints(table, updatedRow, idx);
      Object.assign(row, updatedRow);
      affected++;
    });

    return affected;
  }

  // =========================================================================
  // DELETE FROM
  // =========================================================================
  private handleDelete(stmt: string): number {
    const m = stmt.match(/^DELETE\s+FROM\s+[`"']?([a-zA-Z0-9_]+)[`"']?(?:\s+WHERE\s+([\s\S]+))?$/i);
    if (!m || !m[1]) {
      this.setError(1064, "Syntaxe DELETE FROM invalide");
      throw new Error(this.lastError);
    }

    const tableName = m[1].toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) {
      this.setError(1146, `Table '${tableName}' doesn't exist`);
      throw new Error(this.lastError);
    }

    const whereClause = m[2] || "";
    const remaining: Record<string, unknown>[] = [];
    let deletedCount = 0;

    for (const row of table.rows) {
      if (this.evaluateWhereCondition(row, whereClause, [table])) {
        // Contrôle d'intégrité référentielle : vérification des tables enfants
        for (const [childName, childTbl] of this.tables.entries()) {
          for (const fk of childTbl.foreignKeys) {
            if (fk.refTable === tableName) {
              const hasChild = childTbl.rows.some((childRow) =>
                fk.columns.every((cCol, idx) => {
                  const pCol = fk.refColumns[idx] || cCol;
                  return String(childRow[cCol]) === String(row[pCol]);
                }),
              );

              if (hasChild) {
                if (fk.onDelete === "CASCADE") {
                  childTbl.rows = childTbl.rows.filter(
                    (childRow) =>
                      !fk.columns.every((cCol, idx) => {
                        const pCol = fk.refColumns[idx] || cCol;
                        return String(childRow[cCol]) === String(row[pCol]);
                      }),
                  );
                } else {
                  this.setError(
                    1451,
                    `Cannot delete or update a parent row: a foreign key constraint fails (\`${childName}\`, CONSTRAINT \`fk_${childName}_${tableName}\` FOREIGN KEY (\`${fk.columns.join("`, `")}\`) REFERENCES \`${tableName}\` (\`${fk.refColumns.join("`, `")}\`))`,
                  );
                  throw new Error(this.lastError);
                }
              }
            }
          }
        }
        deletedCount++;
      } else {
        remaining.push(row);
      }
    }

    table.rows = remaining;
    return deletedCount;
  }

  // =========================================================================
  // SELECT COMPLET (JOIN, GROUP BY, HAVING, ORDER BY, LIMIT)
  // =========================================================================
  private handleSelect(stmt: string): { columns: string[]; rows: Record<string, unknown>[] } {
    // Nettoyer les sauts de lignes et espaces multiples
    const cleanStmt = stmt.replace(/\s+/g, " ").trim();

    // 1. Extraire les clauses de niveau supérieur
    const selectMatch = cleanStmt.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+([\s\S]+)$/i);
    if (!selectMatch || !selectMatch[1] || !selectMatch[2]) {
      this.setError(1064, "Syntaxe SELECT invalide");
      throw new Error(this.lastError);
    }

    const selectExprs = splitTopLevelCommas(selectMatch[1].trim());
    const rest = selectMatch[2].trim();

    // Analyse de la clause FROM et des JOINs
    const fromAndRestMatch = rest.match(
      /^([\s\S]+?)(?:\s+WHERE\s+([\s\S]+?))?(?:\s+GROUP\s+BY\s+([\s\S]+?))?(?:\s+HAVING\s+([\s\S]+?))?(?:\s+ORDER\s+BY\s+([\s\S]+?))?(?:\s+LIMIT\s+([\s\S]+?))?$/i,
    );

    const fromPart = fromAndRestMatch ? (fromAndRestMatch[1]?.trim() ?? "") : rest;
    const whereClause = fromAndRestMatch?.[2]?.trim() ?? "";
    const groupByPart = fromAndRestMatch?.[3]?.trim() ?? "";
    const havingClause = fromAndRestMatch?.[4]?.trim() ?? "";
    const orderByPart = fromAndRestMatch?.[5]?.trim() ?? "";
    const limitPart = fromAndRestMatch?.[6]?.trim() ?? "";

    // 2. Résolution des tables et jointures
    const joinedRows = this.resolveJoinedRows(fromPart);

    // 3. Filtrage WHERE
    const filteredRows = whereClause
      ? joinedRows.filter((r) => this.evaluateWhereCondition(r, whereClause))
      : joinedRows;

    // 4. GROUP BY et agrégations
    const hasAggregates = selectExprs.some((e) => /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(e));
    let finalGroups: Record<string, unknown>[][];

    if (groupByPart) {
      const groupCols = splitTopLevelCommas(groupByPart).map((c) => this.cleanIdentifier(c));
      const groupMap = new Map<string, Record<string, unknown>[]>();

      for (const row of filteredRows) {
        const key = groupCols.map((c) => String(this.resolveValue(row, c))).join("|||");
        const existing = groupMap.get(key) || [];
        existing.push(row);
        groupMap.set(key, existing);
      }
      finalGroups = Array.from(groupMap.values());
    } else if (hasAggregates) {
      finalGroups = [filteredRows];
    } else {
      finalGroups = filteredRows.map((r) => [r]);
    }

    // 5. Calcul des lignes projetées avec agrégats
    let projectedRows: Record<string, unknown>[] = [];
    const outputColumns: string[] = [];

    for (const group of finalGroups) {
      if (group.length === 0 && !hasAggregates) continue;
      const firstRow = group[0] || {};
      const outRow: Record<string, unknown> = {};

      for (const expr of selectExprs) {
        const aliasMatch = expr.match(/^(.+?)\s+(?:AS\s+)?([`"']?[a-zA-Z0-9_]+[`"']?)$/i);
        let rawExpr = expr.trim();
        let colAlias = rawExpr;

        if (
          aliasMatch &&
          aliasMatch[1] &&
          aliasMatch[2] &&
          !/\b(COUNT|SUM|AVG|MIN|MAX)\s*\([^)]*$/i.test(aliasMatch[1])
        ) {
          rawExpr = aliasMatch[1].trim();
          colAlias = aliasMatch[2].replace(/[`"']/g, "");
        } else if (colAlias.includes(".")) {
          // Sans AS explicite, la colonne prend le nom sans préfixe de table (ex: c.nom -> nom)
          colAlias = colAlias.split(".").pop()!.replace(/[`"']/g, "");
        }

        if (rawExpr === "*") {
          for (const [k, v] of Object.entries(firstRow)) {
            // Retirer le préfixe de table si simple
            const bareKey = k.includes(".") ? k.split(".")[1]! : k;
            outRow[bareKey] = v;
            if (!outputColumns.includes(bareKey)) outputColumns.push(bareKey);
          }
          continue;
        }

        // Agrégation COUNT(*)
        if (/^COUNT\s*\(\s*\*\s*\)$/i.test(rawExpr)) {
          outRow[colAlias] = group.length;
          if (!outputColumns.includes(colAlias)) outputColumns.push(colAlias);
          continue;
        }

        // Agrégation COUNT(DISTINCT col)
        const countDistMatch = rawExpr.match(
          /^COUNT\s*\(\s*DISTINCT\s+[`"']?([a-zA-Z0-9_.]+)[`"']?\s*\)$/i,
        );
        if (countDistMatch && countDistMatch[1]) {
          const col = countDistMatch[1];
          const distinctVals = new Set(
            group
              .map((r) => this.resolveValue(r, col))
              .filter((v) => v !== null && v !== undefined),
          );
          outRow[colAlias] = distinctVals.size;
          if (!outputColumns.includes(colAlias)) outputColumns.push(colAlias);
          continue;
        }

        // Agrégation COUNT(col)
        const countMatch = rawExpr.match(/^COUNT\s*\(\s*[`"']?([a-zA-Z0-9_.]+)[`"']?\s*\)$/i);
        if (countMatch && countMatch[1]) {
          const col = countMatch[1];
          const nonNullCount = group.filter((r) => {
            const v = this.resolveValue(r, col);
            return v !== null && v !== undefined;
          }).length;
          outRow[colAlias] = nonNullCount;
          if (!outputColumns.includes(colAlias)) outputColumns.push(colAlias);
          continue;
        }

        // Agrégation SUM(col)
        const sumMatch = rawExpr.match(/^SUM\s*\(\s*[`"']?([a-zA-Z0-9_.]+)[`"']?\s*\)$/i);
        if (sumMatch && sumMatch[1]) {
          const col = sumMatch[1];
          const sum = group.reduce((acc, r) => acc + (Number(this.resolveValue(r, col)) || 0), 0);
          outRow[colAlias] = sum;
          if (!outputColumns.includes(colAlias)) outputColumns.push(colAlias);
          continue;
        }

        // Agrégation AVG(col)
        const avgMatch = rawExpr.match(/^AVG\s*\(\s*[`"']?([a-zA-Z0-9_.]+)[`"']?\s*\)$/i);
        if (avgMatch && avgMatch[1]) {
          const col = avgMatch[1];
          const nums = group
            .map((r) => Number(this.resolveValue(r, col)))
            .filter((n) => !Number.isNaN(n));
          const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
          outRow[colAlias] = Number(avg.toFixed(2));
          if (!outputColumns.includes(colAlias)) outputColumns.push(colAlias);
          continue;
        }

        // Agrégation MIN(col)
        const minMatch = rawExpr.match(/^MIN\s*\(\s*[`"']?([a-zA-Z0-9_.]+)[`"']?\s*\)$/i);
        if (minMatch && minMatch[1]) {
          const col = minMatch[1];
          const vals = group
            .map((r) => this.resolveValue(r, col))
            .filter((v) => v !== null && v !== undefined);
          const minVal = vals.length > 0 ? vals.reduce((a, b) => (a < b ? a : b)) : null;
          outRow[colAlias] = minVal;
          if (!outputColumns.includes(colAlias)) outputColumns.push(colAlias);
          continue;
        }

        // Agrégation MAX(col)
        const maxMatch = rawExpr.match(/^MAX\s*\(\s*[`"']?([a-zA-Z0-9_.]+)[`"']?\s*\)$/i);
        if (maxMatch && maxMatch[1]) {
          const col = maxMatch[1];
          const vals = group
            .map((r) => this.resolveValue(r, col))
            .filter((v) => v !== null && v !== undefined);
          const maxVal = vals.length > 0 ? vals.reduce((a, b) => (a > b ? a : b)) : null;
          outRow[colAlias] = maxVal;
          if (!outputColumns.includes(colAlias)) outputColumns.push(colAlias);
          continue;
        }

        // Colonne simple
        const val = this.resolveValue(firstRow, rawExpr);
        outRow[colAlias] = val;
        if (rawExpr.includes(".")) {
          outRow[rawExpr.toLowerCase()] = val;
        }
        if (!outputColumns.includes(colAlias)) outputColumns.push(colAlias);
      }

      projectedRows.push(outRow);
    }

    // 6. Filtrage HAVING
    if (havingClause) {
      projectedRows = projectedRows.filter((r) => this.evaluateWhereCondition(r, havingClause));
    }

    // 7. Tri ORDER BY
    if (orderByPart) {
      const orderItems = splitTopLevelCommas(orderByPart).map((item) => {
        const m = item.trim().match(/^([`"']?[a-zA-Z0-9_.]+[`"']?)\s*(ASC|DESC)?$/i);
        const col = (m?.[1] || item).replace(/[`"']/g, "");
        const dir = (m?.[2]?.toUpperCase() === "DESC" ? "DESC" : "ASC") as "ASC" | "DESC";
        return { col, dir };
      });

      projectedRows.sort((a, b) => {
        for (const { col, dir } of orderItems) {
          const va = this.resolveValue(a, col);
          const vb = this.resolveValue(b, col);
          if (va === vb) continue;

          let cmp = 0;
          if (va === null || va === undefined) cmp = -1;
          else if (vb === null || vb === undefined) cmp = 1;
          else if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
          else cmp = String(va).localeCompare(String(vb));

          return dir === "DESC" ? -cmp : cmp;
        }
        return 0;
      });
    }

    // 8. Pagination LIMIT
    if (limitPart) {
      const limitMatch = limitPart.match(/^(\d+)(?:\s*(?:OFFSET|,)\s*(\d+))?$/i);
      if (limitMatch && limitMatch[1]) {
        let offset = 0;
        let count = parseInt(limitMatch[1], 10);
        if (limitMatch[2]) {
          if (limitPart.includes(",")) {
            offset = parseInt(limitMatch[1], 10);
            count = parseInt(limitMatch[2], 10);
          } else {
            count = parseInt(limitMatch[1], 10);
            offset = parseInt(limitMatch[2], 10);
          }
        }
        projectedRows = projectedRows.slice(offset, offset + count);
      }
    }

    return { columns: outputColumns, rows: projectedRows };
  }

  /**
   * Résout les jointures multi-tables (INNER JOIN, LEFT JOIN, virgule implicite)
   */
  private resolveJoinedRows(fromPart: string): Record<string, unknown>[] {
    // Détection de jointures explicites : table1 [alias] [INNER|LEFT] JOIN table2 [alias] ON cond
    const joinTokens = fromPart.split(/\s+(INNER\s+JOIN|LEFT\s+JOIN|JOIN)\s+/i);

    if (joinTokens.length > 1) {
      // Base table (premier token)
      const firstTableSpec = joinTokens[0]!.trim();
      const firstTbl = this.parseTableAlias(firstTableSpec);
      let currentRows = this.getTableRowsWithPrefix(firstTbl.name, firstTbl.alias);

      for (let i = 1; i < joinTokens.length; i += 2) {
        const joinType = (joinTokens[i] || "JOIN").toUpperCase();
        const joinBody = (joinTokens[i + 1] || "").trim();
        const onIdx = joinBody.search(/\s+ON\s+/i);
        if (onIdx === -1) continue;

        const tableSpec = joinBody.slice(0, onIdx).trim();
        const onCond = joinBody
          .slice(onIdx)
          .replace(/^\s+ON\s+/i, "")
          .trim();

        const rightTbl = this.parseTableAlias(tableSpec);
        const rightRows = this.getTableRowsWithPrefix(rightTbl.name, rightTbl.alias);
        const isLeftJoin = joinType.includes("LEFT");

        const nextJoined: Record<string, unknown>[] = [];

        for (const lRow of currentRows) {
          let matched = false;
          for (const rRow of rightRows) {
            const combined = { ...lRow, ...rRow };
            if (this.evaluateWhereCondition(combined, onCond)) {
              nextJoined.push(combined);
              matched = true;
            }
          }
          if (!matched && isLeftJoin) {
            const emptyRight: Record<string, unknown> = {};
            const rDef = this.tables.get(rightTbl.name);
            if (rDef) {
              for (const col of rDef.columns) {
                const colLower = col.name.toLowerCase();
                emptyRight[`${rightTbl.alias}.${colLower}`] = null;
                emptyRight[colLower] = null;
              }
            }
            nextJoined.push({ ...lRow, ...emptyRight });
          }
        }

        currentRows = nextJoined;
      }

      return currentRows;
    }

    // Jointure par virgules : FROM table1, table2
    const commaTables = splitTopLevelCommas(fromPart);
    if (commaTables.length > 1) {
      let combined: Record<string, unknown>[] = [{}];

      for (const tSpec of commaTables) {
        const parsed = this.parseTableAlias(tSpec);
        const tRows = this.getTableRowsWithPrefix(parsed.name, parsed.alias);
        const next: Record<string, unknown>[] = [];

        for (const c of combined) {
          for (const r of tRows) {
            next.push({ ...c, ...r });
          }
        }
        combined = next;
      }
      return combined;
    }

    // Table unique
    const single = this.parseTableAlias(fromPart);
    return this.getTableRowsWithPrefix(single.name, single.alias);
  }

  private parseTableAlias(spec: string): { name: string; alias: string } {
    const m = spec
      .trim()
      .match(/^[`"']?([a-zA-Z0-9_]+)[`"']?(?:\s+(?:AS\s+)?([`"']?[a-zA-Z0-9_]+[`"']?))?$/i);
    const name = (m?.[1] || spec).replace(/[`"']/g, "").toLowerCase();
    const alias = (m?.[2] || name).replace(/[`"']/g, "").toLowerCase();
    return { name, alias };
  }

  private getTableRowsWithPrefix(tableName: string, alias: string): Record<string, unknown>[] {
    const table = this.tables.get(tableName);
    if (!table) {
      this.setError(1146, `Table '${tableName}' doesn't exist`);
      throw new Error(this.lastError);
    }

    return table.rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        out[k.toLowerCase()] = v;
        out[`${alias}.${k.toLowerCase()}`] = v;
      }
      return out;
    });
  }

  // =========================================================================
  // ÉVALUATION DES CONDITIONS WHERE / ON / HAVING / CHECK
  // =========================================================================
  public evaluateWhereCondition(
    row: Record<string, unknown>,
    condition: string,
    _contextTables?: RelationalTable[],
  ): boolean {
    const trimmed = condition.trim();
    if (!trimmed) return true;

    // Découpage récursif OR (plus faible précédence)
    const orParts = this.splitByLogicalOp(trimmed, "OR");
    if (orParts.length > 1) {
      return orParts.some((part) => this.evaluateWhereCondition(row, part));
    }

    // Découpage récursif AND
    const andParts = this.splitByLogicalOp(trimmed, "AND");
    if (andParts.length > 1) {
      return andParts.every((part) => this.evaluateWhereCondition(row, part));
    }

    // Parenthèses enveloppantes : (cond)
    if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
      const inner = trimmed.slice(1, -1).trim();
      // Vérifier que la parenthèse fermante correspond bien à la première ouvrante
      let depth = 0;
      let matchedOuter = true;
      for (let i = 0; i < trimmed.length - 1; i++) {
        if (trimmed[i] === "(") depth++;
        else if (trimmed[i] === ")") depth--;
        if (depth === 0) {
          matchedOuter = false;
          break;
        }
      }
      if (matchedOuter) {
        return this.evaluateWhereCondition(row, inner);
      }
    }

    // Opérateur NOT
    if (/^NOT\s+/i.test(trimmed)) {
      return !this.evaluateWhereCondition(row, trimmed.replace(/^NOT\s+/i, ""));
    }

    // 1. IS NULL / IS NOT NULL
    const nullMatch = trimmed.match(/^([`"']?[a-zA-Z0-9_.]+[`"']?)\s+IS\s+(NOT\s+)?NULL$/i);
    if (nullMatch && nullMatch[1]) {
      const val = this.resolveValue(row, nullMatch[1]);
      const isNull = val === null || val === undefined;
      return nullMatch[2] ? !isNull : isNull;
    }

    // 2. BETWEEN val1 AND val2
    const betweenMatch = trimmed.match(
      /^([`"']?[a-zA-Z0-9_.]+[`"']?)\s+BETWEEN\s+('([^']*)'|"([^"]*)"|-?\d+(?:\.\d+)?)\s+AND\s+('([^']*)'|"([^"]*)"|-?\d+(?:\.\d+)?)$/i,
    );
    if (betweenMatch && betweenMatch[1]) {
      const val = this.resolveValue(row, betweenMatch[1]);
      const min =
        betweenMatch[3] !== undefined
          ? betweenMatch[3]
          : betweenMatch[4] !== undefined
            ? betweenMatch[4]
            : Number(betweenMatch[2]);
      const max =
        betweenMatch[6] !== undefined
          ? betweenMatch[6]
          : betweenMatch[7] !== undefined
            ? betweenMatch[7]
            : Number(betweenMatch[5]);

      if (typeof val === "number" && typeof min === "number" && typeof max === "number") {
        return val >= min && val <= max;
      }
      return String(val) >= String(min) && String(val) <= String(max);
    }

    // 3. IN (val1, val2, ...) ou NOT IN
    const inMatch = trimmed.match(/^([`"']?[a-zA-Z0-9_.]+[`"']?)\s+(NOT\s+)?IN\s*\(([\s\S]+)\)$/i);
    if (inMatch && inMatch[1] && inMatch[3]) {
      const val = this.resolveValue(row, inMatch[1]);
      const allowed = this.parseValueLiterals(inMatch[3]);
      const isPresent = allowed.some((item) => String(item) === String(val));
      return inMatch[2] ? !isPresent : isPresent;
    }

    // 4. LIKE (avec % et _)
    const likeMatch = trimmed.match(
      /^([`"']?[a-zA-Z0-9_.]+[`"']?)\s+(NOT\s+)?LIKE\s+('([^']*)'|"([^"]*)")$/i,
    );
    if (likeMatch && likeMatch[1]) {
      const val = String(this.resolveValue(row, likeMatch[1]) ?? "");
      const pattern = likeMatch[4] !== undefined ? likeMatch[4] : (likeMatch[5] ?? "");
      const regexStr =
        "^" +
        pattern
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          .replace(/%/g, ".*")
          .replace(/_/g, ".") +
        "$";
      const regex = new RegExp(regexStr, "i");
      const isMatch = regex.test(val);
      return likeMatch[2] ? !isMatch : isMatch;
    }

    // 5. Comparaisons directes : =, !=, <>, >=, <=, >, <
    const cmpMatch = trimmed.match(
      /^([`"']?[a-zA-Z0-9_.]+[`"']?)\s*(=|!=|<>|>=|<=|>|<)\s*([\s\S]+)$/i,
    );
    if (cmpMatch && cmpMatch[1] && cmpMatch[2] && cmpMatch[3]) {
      const leftKey = cmpMatch[1];
      const op = cmpMatch[2];
      const rawRight = cmpMatch[3].trim();

      const leftVal = this.resolveValue(row, leftKey);
      let rightVal: unknown;

      if (rawRight.startsWith("'") && rawRight.endsWith("'")) {
        rightVal = rawRight.slice(1, -1);
      } else if (rawRight.startsWith('"') && rawRight.endsWith('"')) {
        rightVal = rawRight.slice(1, -1);
      } else if (/^-?\d+(?:\.\d+)?$/.test(rawRight)) {
        rightVal = Number(rawRight);
      } else if (/^null$/i.test(rawRight)) {
        rightVal = null;
      } else {
        // C'est potentiellement une colonne de jointure : u.idUtil = d.idUtil
        rightVal = this.resolveValue(row, rawRight);
      }

      return this.compareValues(leftVal, op, rightVal);
    }

    return true;
  }

  private compareValues(lhs: unknown, op: string, rhs: unknown): boolean {
    if (lhs === null || lhs === undefined || rhs === null || rhs === undefined) {
      if (op === "=") return lhs === rhs;
      if (op === "!=" || op === "<>") return lhs !== rhs;
      return false;
    }

    if (typeof lhs === "number" || typeof rhs === "number") {
      const n1 = Number(lhs);
      const n2 = Number(rhs);
      switch (op) {
        case "=":
          return n1 === n2;
        case "!=":
        case "<>":
          return n1 !== n2;
        case ">":
          return n1 > n2;
        case ">=":
          return n1 >= n2;
        case "<":
          return n1 < n2;
        case "<=":
          return n1 <= n2;
      }
    }

    const s1 = String(lhs);
    const s2 = String(rhs);
    switch (op) {
      case "=":
        return s1 === s2;
      case "!=":
      case "<>":
        return s1 !== s2;
      case ">":
        return s1 > s2;
      case ">=":
        return s1 >= s2;
      case "<":
        return s1 < s2;
      case "<=":
        return s1 <= s2;
    }

    return false;
  }

  private resolveValue(row: Record<string, unknown>, expr: string): unknown {
    const clean = expr.trim().replace(/[`"']/g, "").toLowerCase();
    if (row[clean] !== undefined) return row[clean];

    // Recherche par suffixe de colonne (ex: "idUtil" quand le row est stocké sous "u.idutil")
    const entries = Object.entries(row);
    const found = entries.find(([k]) => k === clean || k.endsWith(`.${clean}`));
    if (found) return found[1];

    return undefined;
  }

  private splitByLogicalOp(expr: string, op: "AND" | "OR"): string[] {
    const parts: string[] = [];
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let last = 0;
    let unpairedBetween = 0;

    const opRegex = new RegExp(`^${op}\\b`, "i");
    const betweenRegex = /^BETWEEN\b/i;
    const andRegex = /^AND\b/i;

    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i] ?? "";
      const prevCh = i > 0 ? (expr[i - 1] ?? "") : " ";
      const isWordBoundaryBefore = !/\w/.test(prevCh);

      if (ch === "'" && !inDouble) {
        if (inSingle && (i === 0 || expr[i - 1] !== "\\")) inSingle = false;
        else if (!inSingle) inSingle = true;
      } else if (ch === '"' && !inSingle) {
        if (inDouble && (i === 0 || expr[i - 1] !== "\\")) inDouble = false;
        else if (!inDouble) inDouble = true;
      } else if (!inSingle && !inDouble) {
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        else if (depth === 0 && isWordBoundaryBefore) {
          const slice = expr.slice(i);

          if (betweenRegex.test(slice)) {
            unpairedBetween++;
            i += 6; // saut 'BETWEEN' - 1
            continue;
          }

          if (andRegex.test(slice) && unpairedBetween > 0) {
            unpairedBetween--;
            i += 2; // saut 'AND' - 1
            continue;
          }

          if (opRegex.test(slice)) {
            parts.push(expr.slice(last, i).trim());
            i += op.length - 1;
            last = i + 1;
          }
        }
      }
    }

    const tail = expr.slice(last).trim();
    if (tail.length > 0) parts.push(tail);
    return parts.length > 1 ? parts : [expr];
  }

  // =========================================================================
  // PARSING DES VALEURS LITTÉRALES & CONTRAINTES
  // =========================================================================
  public parseValueLiterals(tupleStr: string): unknown[] {
    const items = splitTopLevelCommas(tupleStr);
    return items.map((item) => {
      const clean = item.trim();
      if (/^null$/i.test(clean)) return null;
      if (/^true$/i.test(clean)) return true;
      if (/^false$/i.test(clean)) return false;
      if (
        (clean.startsWith("'") && clean.endsWith("'")) ||
        (clean.startsWith('"') && clean.endsWith('"'))
      ) {
        return clean.slice(1, -1).replace(/''/g, "'").replace(/\\'/g, "'");
      }
      if (/^-?\d+(?:\.\d+)?$/.test(clean)) {
        return Number(clean);
      }
      return clean;
    });
  }

  private validateAndCoerce(
    table: RelationalTable,
    col: RelationalColumnDef,
    val: unknown,
  ): unknown {
    if (val === null || val === undefined) {
      if (col.notNull) {
        this.setError(1048, `Column '${col.name}' cannot be null`);
        throw new Error(this.lastError);
      }
      return null;
    }

    if (col.baseType === "INT") {
      const num = parseInt(String(val), 10);
      if (Number.isNaN(num)) {
        this.setError(1366, `Incorrect integer value: '${val}' for column '${col.name}'`);
        throw new Error(this.lastError);
      }
      return num;
    }

    if (col.baseType === "DECIMAL" || col.baseType === "FLOAT") {
      const num = parseFloat(String(val));
      if (Number.isNaN(num)) {
        this.setError(1366, `Incorrect decimal value: '${val}' for column '${col.name}'`);
        throw new Error(this.lastError);
      }
      return col.scale !== undefined ? Number(num.toFixed(col.scale)) : num;
    }

    if (col.baseType === "VARCHAR" || col.baseType === "CHAR") {
      const str = String(val);
      if (col.length && str.length > col.length) {
        this.setError(1406, `Data too long for column '${col.name}' at row 1`);
        throw new Error(this.lastError);
      }
      return str;
    }

    return val;
  }

  private verifyIntegrityConstraints(
    table: RelationalTable,
    candidateRow: Record<string, unknown>,
    ignoreRowIndex?: number,
  ): void {
    // 1. CHECK constraints
    for (const chk of table.checkConstraints) {
      if (!this.evaluateWhereCondition(candidateRow, chk)) {
        this.setError(3819, `Check constraint '${table.name}_chk' is violated (${chk}).`);
        throw new Error(this.lastError);
      }
    }

    // 2. PRIMARY KEY
    if (table.primaryKey.length > 0) {
      for (const pkCol of table.primaryKey) {
        if (
          candidateRow[pkCol] === null ||
          candidateRow[pkCol] === undefined ||
          candidateRow[pkCol] === ""
        ) {
          this.setError(1048, `Column '${pkCol}' cannot be null`);
          throw new Error(this.lastError);
        }
      }

      const duplicate = table.rows.some((existing, idx) => {
        if (ignoreRowIndex !== undefined && idx === ignoreRowIndex) return false;
        return table.primaryKey.every((k) => String(existing[k]) === String(candidateRow[k]));
      });

      if (duplicate) {
        const keyVal = table.primaryKey.map((k) => String(candidateRow[k])).join("-");
        this.setError(1062, `Duplicate entry '${keyVal}' for key '${table.name}.PRIMARY'`);
        throw new Error(this.lastError);
      }
    }

    // 3. UNIQUE
    for (const uqCols of table.uniqueSets) {
      const duplicate = table.rows.some((existing, idx) => {
        if (ignoreRowIndex !== undefined && idx === ignoreRowIndex) return false;
        return uqCols.every(
          (k) =>
            candidateRow[k] !== null &&
            existing[k] !== null &&
            String(existing[k]) === String(candidateRow[k]),
        );
      });
      if (duplicate) {
        const keyVal = uqCols.map((k) => String(candidateRow[k])).join("-");
        this.setError(
          1062,
          `Duplicate entry '${keyVal}' for key '${table.name}.${uqCols.join("_")}'`,
        );
        throw new Error(this.lastError);
      }
    }

    // 4. FOREIGN KEY
    for (const fk of table.foreignKeys) {
      const parentTable = this.tables.get(fk.refTable);
      if (!parentTable) {
        this.setError(
          1452,
          `Cannot add or update a child row: referenced table '${fk.refTable}' does not exist`,
        );
        throw new Error(this.lastError);
      }

      const allNull = fk.columns.every(
        (c) => candidateRow[c] === null || candidateRow[c] === undefined,
      );
      if (allNull) continue;

      const existsInParent = parentTable.rows.some((pRow) =>
        fk.columns.every((cCol, idx) => {
          const pCol = fk.refColumns[idx] || cCol;
          return String(pRow[pCol]) === String(candidateRow[cCol]);
        }),
      );

      if (!existsInParent) {
        this.setError(
          1452,
          `Cannot add or update a child row: a foreign key constraint fails (\`${table.name}\`, CONSTRAINT \`fk_${table.name}_${fk.refTable}\` FOREIGN KEY (\`${fk.columns.join("`, `")}\`) REFERENCES \`${fk.refTable}\` (\`${fk.refColumns.join("`, `")}\`))`,
        );
        throw new Error(this.lastError);
      }
    }
  }
}
