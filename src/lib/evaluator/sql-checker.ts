/**
 * Labo STI - Vérificateur SQL & Conformité SGBD MySQL/MariaDB (Bac STI)
 *
 * Implémente :
 * - Simulation fidèle d'un SGBD MySQL/MariaDB (types VARCHAR, CHAR, INT, DECIMAL, DATE).
 * - Contrôle strict des contraintes d'intégrité : PRIMARY KEY (simple et composée),
 *   FOREIGN KEY ... REFERENCES, NOT NULL, UNIQUE, DEFAULT et CHECK.
 * - Messages d'erreur au format exact de `mysqli_error($cnx)` (ex: Error 1062, 1452, 1048, 3819, 1406).
 * - Détection et avertissements pédagogiques sur les syntaxes hors-programme Bac STI
 *   (PostgreSQL SERIAL, RETURNING, ILIKE, ::type, SQLite AUTOINCREMENT, PRAGMA, ||, strftime).
 */

export interface SqlCurriculumWarning {
  code: string;
  syntaxeDetectee: string;
  message: string;
  suggestion: string;
}

export interface SqlCriterionReport {
  id: string;
  code: string;
  titre: string;
  valide: boolean;
  points: number;
  pointsMax: number;
  feedbackPedagogique: string;
  mysqliError?: string | undefined;
}

export interface SqlValidationReport {
  conformeProgramme: boolean;
  score: number;
  scoreMax: number;
  criteres: SqlCriterionReport[];
  avertissementsHorsProgramme: SqlCurriculumWarning[];
  erreursMysqli: string[];
}

export interface SqlColumnConstraint {
  name: string;
  rawType: string;
  baseType: "VARCHAR" | "CHAR" | "INT" | "DECIMAL" | "DATE" | "OTHER";
  length?: number | undefined;
  precision?: number | undefined;
  scale?: number | undefined;
  notNull: boolean;
  unique: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  defaultValue?: string | number | null | undefined;
  checkExpr?: string | undefined;
}

export interface SqlForeignKeyConstraint {
  columns: string[];
  refTable: string;
  refColumns: string[];
}

export interface SqlTableSchema {
  name: string;
  columns: SqlColumnConstraint[];
  primaryKey: string[];
  foreignKeys: SqlForeignKeyConstraint[];
  uniqueSets: string[][];
  checkConstraints: string[];
  rows: Record<string, unknown>[];
  autoIncrementCounter: number;
}

/**
 * Détecte les syntaxes SQL hors-programme du Bac STI (PostgreSQL, SQLite natif, T-SQL)
 */
export function detecterSyntaxesSqlHorsProgramme(sql: string): SqlCurriculumWarning[] {
  const warnings: SqlCurriculumWarning[] = [];
  const clean = sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

  // 1. PostgreSQL SERIAL / BIGSERIAL
  if (/\b(?:BIG|SMALL)?SERIAL\b/i.test(clean)) {
    warnings.push({
      code: "SQL_HP_SERIAL",
      syntaxeDetectee: "SERIAL (PostgreSQL)",
      message:
        "Le type auto-incrémenté SERIAL appartient au dialecte PostgreSQL et n'est pas au programme du Bac STI.",
      suggestion: "Utilisez INT AUTO_INCREMENT conformément à la syntaxe officielle MySQL.",
    });
  }

  // 2. PostgreSQL RETURNING
  if (/\bRETURNING\b/i.test(clean)) {
    warnings.push({
      code: "SQL_HP_RETURNING",
      syntaxeDetectee: "RETURNING (PostgreSQL)",
      message: "La clause RETURNING est hors-programme Bac STI.",
      suggestion:
        "Utilisez mysqli_insert_id($cnx) ou une requête SELECT dédiée après votre INSERT.",
    });
  }

  // 3. PostgreSQL ILIKE ou cast ::
  if (/\bILIKE\b/i.test(clean) || /::[a-zA-Z]+/.test(clean)) {
    warnings.push({
      code: "SQL_HP_PG_SYNTAX",
      syntaxeDetectee: "ILIKE / ::cast (PostgreSQL)",
      message:
        "Les opérateurs PostgreSQL ILIKE ou de transtypage '::' ne sont pas reconnus par MySQL.",
      suggestion: "Utilisez l'opérateur standard LIKE (insensible à la casse par défaut en MySQL).",
    });
  }

  // 4. SQLite AUTOINCREMENT (sans underscore)
  if (/\bAUTOINCREMENT\b/i.test(clean) && !/\bAUTO_INCREMENT\b/i.test(clean)) {
    warnings.push({
      code: "SQL_HP_SQLITE_AUTOINCREMENT",
      syntaxeDetectee: "AUTOINCREMENT (SQLite)",
      message: "Le mot-clé AUTOINCREMENT sans tiret bas (_) est spécifique à SQLite.",
      suggestion: "Écrivez AUTO_INCREMENT (avec un tiret bas) pour MySQL/MariaDB.",
    });
  }

  // 5. SQLite PRAGMA
  if (/\bPRAGMA\b/i.test(clean)) {
    warnings.push({
      code: "SQL_HP_SQLITE_PRAGMA",
      syntaxeDetectee: "PRAGMA (SQLite)",
      message: "Les directives PRAGMA sont propres à SQLite et hors-programme Bac STI.",
      suggestion: "Définissez vos contraintes directement dans CREATE TABLE ou ALTER TABLE.",
    });
  }

  // 6. Opérateur de concaténation ||
  if (clean.includes("||")) {
    warnings.push({
      code: "SQL_HP_CONCAT_PIPE",
      syntaxeDetectee: "Opérateur || (SQLite/PostgreSQL)",
      message:
        "L'opérateur '||' est interprété comme un OU logique (OR) sous MySQL par défaut, et non comme une concaténation.",
      suggestion: "Utilisez la fonction officielle MySQL CONCAT(ch1, ch2).",
    });
  }

  // 7. Fonctions de date SQLite strftime / date('now')
  if (/\bstrftime\s*\(/i.test(clean) || /\bdate(?:time)?\s*\(\s*['"]now['"]\s*\)/i.test(clean)) {
    warnings.push({
      code: "SQL_HP_SQLITE_DATE",
      syntaxeDetectee: "strftime() / date('now') (SQLite)",
      message: "Les fonctions de date SQLite ne sont pas valides sous MySQL.",
      suggestion: "Utilisez CURDATE(), NOW(), YEAR(), MONTH() ou DAY() au programme du Bac STI.",
    });
  }

  return warnings;
}

/**
 * Découpe le corps d'un CREATE TABLE par virgule de premier niveau (ignore les virgules dans les parenthèses)
 */
function splitTopLevelCommas(body: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (ch === "(") depth++;
      else if (ch === ")") depth = Math.max(0, depth - 1);
      else if (ch === "," && depth === 0) {
        if (current.trim()) parts.push(current.trim());
        current = "";
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Moteur de simulation MySQLi strict avec contrôle des types et contraintes d'intégrité
 */
export class MySqliSimulator {
  private tables: Map<string, SqlTableSchema> = new Map();
  private lastError: string = "";
  private lastErrno: number = 0;
  private lastAffectedRows: number = 0;

  public mysqli_error(): string {
    return this.lastError;
  }

  public mysqli_errno(): number {
    return this.lastErrno;
  }

  public mysqli_affected_rows(): number {
    return this.lastAffectedRows;
  }

  public getTableSchema(tableName: string): SqlTableSchema | undefined {
    return this.tables.get(tableName.toLowerCase());
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
   * Exécute un script SQL multi-instructions
   */
  public executeScript(sqlScript: string): { success: boolean; errors: string[] } {
    const clean = sqlScript.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const statements = clean
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const errors: string[] = [];
    for (const stmt of statements) {
      const res = this.query(stmt);
      if (!res.success && this.lastError) {
        errors.push(this.lastError);
      }
    }
    return { success: errors.length === 0, errors };
  }

  /**
   * Exécute une requête SQL unique à la manière de `mysqli_query($cnx, $req)`
   */
  public query(sql: string): {
    success: boolean;
    rows: Record<string, unknown>[];
    numRows: number;
    affectedRows: number;
    error: string;
  } {
    this.clearError();
    this.lastAffectedRows = 0;
    const trimmed = sql.trim().replace(/;$/, "").trim();

    if (!trimmed) {
      return { success: true, rows: [], numRows: 0, affectedRows: 0, error: "" };
    }

    const upper = trimmed.toUpperCase();
    try {
      if (upper.startsWith("CREATE TABLE")) {
        this.handleCreateTable(trimmed);
        return { success: true, rows: [], numRows: 0, affectedRows: 0, error: "" };
      }
      if (upper.startsWith("ALTER TABLE")) {
        this.handleAlterTable(trimmed);
        return { success: true, rows: [], numRows: 0, affectedRows: 0, error: "" };
      }
      if (upper.startsWith("INSERT INTO")) {
        const affected = this.handleInsert(trimmed);
        this.lastAffectedRows = affected;
        return { success: true, rows: [], numRows: 0, affectedRows: affected, error: "" };
      }
      if (upper.startsWith("UPDATE")) {
        const affected = this.handleUpdate(trimmed);
        this.lastAffectedRows = affected;
        return { success: true, rows: [], numRows: 0, affectedRows: affected, error: "" };
      }
      if (upper.startsWith("DELETE FROM")) {
        const affected = this.handleDelete(trimmed);
        this.lastAffectedRows = affected;
        return { success: true, rows: [], numRows: 0, affectedRows: affected, error: "" };
      }
      if (upper.startsWith("SELECT")) {
        const rows = this.handleSelect(trimmed);
        return {
          success: true,
          rows,
          numRows: rows.length,
          affectedRows: 0,
          error: "",
        };
      }
      if (upper.startsWith("DROP TABLE")) {
        const m = trimmed.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?[`"']?(\w+)[`"']?/i);
        if (m?.[1]) {
          this.tables.delete(m[1].toLowerCase());
        }
        return { success: true, rows: [], numRows: 0, affectedRows: 0, error: "" };
      }

      this.setError(
        1064,
        `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version near '${trimmed.slice(0, 30)}'`,
      );
      return {
        success: false,
        rows: [],
        numRows: 0,
        affectedRows: 0,
        error: this.lastError,
      };
    } catch (err: unknown) {
      if (!this.lastError) {
        this.setError(1064, err instanceof Error ? err.message : String(err));
      }
      return {
        success: false,
        rows: [],
        numRows: 0,
        affectedRows: 0,
        error: this.lastError,
      };
    }
  }

  private handleCreateTable(stmt: string): void {
    const match = stmt.match(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([a-zA-Z0-9_]+)[`"']?\s*\(([\s\S]+)\)/i,
    );
    if (!match || !match[1] || !match[2]) {
      this.setError(1064, "You have an error in your SQL syntax near CREATE TABLE");
      throw new Error(this.lastError);
    }

    const tableName = match[1].toLowerCase();
    const items = splitTopLevelCommas(match[2]);

    const columns: SqlColumnConstraint[] = [];
    const primaryKey: string[] = [];
    const foreignKeys: SqlForeignKeyConstraint[] = [];
    const uniqueSets: string[][] = [];
    const checkConstraints: string[] = [];

    for (const item of items) {
      const upperItem = item.toUpperCase().trim();

      // Table-level PRIMARY KEY (...)
      const pkTableMatch = item.match(
        /^(?:CONSTRAINT\s+[`"']?\w+[`"']?\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i,
      );
      if (pkTableMatch && pkTableMatch[1]) {
        const pkCols = pkTableMatch[1].split(",").map((c) =>
          c
            .trim()
            .replace(/[`"'#]/g, "")
            .toLowerCase(),
        );
        for (const pkCol of pkCols) {
          if (!primaryKey.includes(pkCol)) primaryKey.push(pkCol);
        }
        continue;
      }

      // Table-level FOREIGN KEY (...) REFERENCES table(...)
      const fkTableMatch = item.match(
        /^(?:CONSTRAINT\s+[`"']?\w+[`"']?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s*\(([^)]+)\)/i,
      );
      if (fkTableMatch && fkTableMatch[1] && fkTableMatch[2] && fkTableMatch[3]) {
        const fkCols = fkTableMatch[1].split(",").map((c) =>
          c
            .trim()
            .replace(/[`"'#]/g, "")
            .toLowerCase(),
        );
        const refTable = fkTableMatch[2].toLowerCase();
        const refCols = fkTableMatch[3].split(",").map((c) =>
          c
            .trim()
            .replace(/[`"'#]/g, "")
            .toLowerCase(),
        );
        foreignKeys.push({ columns: fkCols, refTable, refColumns: refCols });
        continue;
      }

      // Table-level UNIQUE (...)
      const uqTableMatch = item.match(
        /^(?:CONSTRAINT\s+[`"']?\w+[`"']?\s+)?UNIQUE(?:\s+KEY|\s+INDEX)?\s*(?:[`"']?\w+[`"']?\s*)?\(([^)]+)\)/i,
      );
      if (uqTableMatch && uqTableMatch[1]) {
        const uqCols = uqTableMatch[1].split(",").map((c) =>
          c
            .trim()
            .replace(/[`"'#]/g, "")
            .toLowerCase(),
        );
        uniqueSets.push(uqCols);
        continue;
      }

      // Table-level CHECK (...)
      const chkTableMatch = item.match(
        /^(?:CONSTRAINT\s+[`"']?\w+[`"']?\s+)?CHECK\s*\(([\s\S]+)\)$/i,
      );
      if (chkTableMatch && chkTableMatch[1]) {
        checkConstraints.push(chkTableMatch[1].trim());
        continue;
      }

      if (upperItem.startsWith("KEY ") || upperItem.startsWith("INDEX ")) {
        continue;
      }

      // Column definition
      const colMatch = item.match(
        /^[`"']?([a-zA-Z0-9_#]+)[`"']?\s+([a-zA-Z]+(?:\s*\(\s*\d+(?:\s*,\s*\d+)?\s*\))?)([\s\S]*)$/i,
      );
      if (!colMatch || !colMatch[1] || !colMatch[2]) continue;

      const colName = colMatch[1].replace(/#$/, "").toLowerCase();
      const rawType = colMatch[2].trim().toUpperCase();
      const modifiers = colMatch[3] || "";
      const upperMod = modifiers.toUpperCase();

      let baseType: SqlColumnConstraint["baseType"] = "OTHER";
      let length: number | undefined;
      let precision: number | undefined;
      let scale: number | undefined;

      const typeParse = rawType.match(/^([A-Z]+)(?:\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\))?$/);
      const typeKeyword = typeParse?.[1] || rawType;
      if (typeKeyword === "VARCHAR") {
        baseType = "VARCHAR";
        length = typeParse?.[2] ? parseInt(typeParse[2], 10) : 255;
      } else if (typeKeyword === "CHAR") {
        baseType = "CHAR";
        length = typeParse?.[2] ? parseInt(typeParse[2], 10) : 1;
      } else if (
        typeKeyword === "INT" ||
        typeKeyword === "INTEGER" ||
        typeKeyword === "SMALLINT" ||
        typeKeyword === "TINYINT"
      ) {
        baseType = "INT";
        length = typeParse?.[2] ? parseInt(typeParse[2], 10) : undefined;
      } else if (
        typeKeyword === "DECIMAL" ||
        typeKeyword === "NUMERIC" ||
        typeKeyword === "FLOAT" ||
        typeKeyword === "DOUBLE"
      ) {
        baseType = "DECIMAL";
        precision = typeParse?.[2] ? parseInt(typeParse[2], 10) : 10;
        scale = typeParse?.[3] ? parseInt(typeParse[3], 10) : 2;
      } else if (typeKeyword === "DATE" || typeKeyword === "DATETIME") {
        baseType = "DATE";
      }

      const isPk = /\bPRIMARY\s+KEY\b/i.test(upperMod);
      const isNotNull = /\bNOT\s+NULL\b/i.test(upperMod) || isPk;
      const isUnique = /\bUNIQUE\b/i.test(upperMod);
      const isAuto = /\bAUTO_INCREMENT\b/i.test(upperMod) || /\bAUTOINCREMENT\b/i.test(upperMod);

      let defaultValue: string | number | null | undefined = undefined;
      const defMatch = modifiers.match(/\bDEFAULT\s+('[^']*'|"[^"]*"|-?\d+(?:\.\d+)?|NULL)/i);
      if (defMatch && defMatch[1]) {
        const rawDef = defMatch[1];
        if (rawDef.toUpperCase() === "NULL") defaultValue = null;
        else if (
          (rawDef.startsWith("'") && rawDef.endsWith("'")) ||
          (rawDef.startsWith('"') && rawDef.endsWith('"'))
        ) {
          defaultValue = rawDef.slice(1, -1);
        } else {
          defaultValue = Number(rawDef);
        }
      }

      let checkExpr: string | undefined;
      const chkIndex = modifiers.search(/\bCHECK\s*\(/i);
      if (chkIndex !== -1) {
        const fromCheck = modifiers.slice(chkIndex);
        const firstParen = fromCheck.indexOf("(");
        if (firstParen !== -1) {
          let depth = 0;
          let endParen = -1;
          for (let i = firstParen; i < fromCheck.length; i++) {
            if (fromCheck[i] === "(") depth++;
            else if (fromCheck[i] === ")") {
              depth--;
              if (depth === 0) {
                endParen = i;
                break;
              }
            }
          }
          if (endParen !== -1) {
            checkExpr = fromCheck.slice(firstParen + 1, endParen).trim();
            checkConstraints.push(checkExpr);
          }
        }
      }

      // Inline REFERENCES table(col)
      const inlineRef = modifiers.match(
        /\bREFERENCES\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s*\(\s*[`"']?([a-zA-Z0-9_#]+)[`"']?\s*\)/i,
      );
      if (inlineRef && inlineRef[1] && inlineRef[2]) {
        foreignKeys.push({
          columns: [colName],
          refTable: inlineRef[1].toLowerCase(),
          refColumns: [inlineRef[2].replace(/#$/, "").toLowerCase()],
        });
      }

      if (isPk && !primaryKey.includes(colName)) {
        primaryKey.push(colName);
      }
      if (isUnique) {
        uniqueSets.push([colName]);
      }

      columns.push({
        name: colName,
        rawType,
        baseType,
        length,
        precision,
        scale,
        notNull: isNotNull,
        unique: isUnique,
        primaryKey: isPk,
        autoIncrement: isAuto,
        defaultValue,
        checkExpr,
      });
    }

    // Marquer les colonnes de clé primaire composée comme primaryKey + notNull
    for (const pkCol of primaryKey) {
      const col = columns.find((c) => c.name === pkCol);
      if (col) {
        col.primaryKey = true;
        col.notNull = true;
      }
    }

    this.tables.set(tableName, {
      name: tableName,
      columns,
      primaryKey,
      foreignKeys,
      uniqueSets,
      checkConstraints,
      rows: [],
      autoIncrementCounter: 0,
    });
  }

  private handleAlterTable(stmt: string): void {
    const m = stmt.match(/ALTER\s+TABLE\s+[`"']?(\w+)[`"']?\s+([\s\S]+)$/i);
    if (!m || !m[1] || !m[2]) return;
    const table = this.tables.get(m[1].toLowerCase());
    if (!table) {
      this.setError(1146, `Table '${m[1]}' doesn't exist`);
      throw new Error(this.lastError);
    }
    const action = m[2].trim();

    // ADD PRIMARY KEY (...)
    const pkMatch = action.match(/ADD\s+(?:CONSTRAINT\s+\w+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (pkMatch && pkMatch[1]) {
      const cols = pkMatch[1].split(",").map((c) =>
        c
          .trim()
          .replace(/[`"'#]/g, "")
          .toLowerCase(),
      );
      table.primaryKey = cols;
      cols.forEach((cName) => {
        const col = table.columns.find((c) => c.name === cName);
        if (col) {
          col.primaryKey = true;
          col.notNull = true;
        }
      });
    }

    // ADD FOREIGN KEY (...) REFERENCES ...
    const fkMatch = action.match(
      /ADD\s+(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)/i,
    );
    if (fkMatch && fkMatch[1] && fkMatch[2] && fkMatch[3]) {
      table.foreignKeys.push({
        columns: fkMatch[1].split(",").map((c) =>
          c
            .trim()
            .replace(/[`"'#]/g, "")
            .toLowerCase(),
        ),
        refTable: fkMatch[2].toLowerCase(),
        refColumns: fkMatch[3].split(",").map((c) =>
          c
            .trim()
            .replace(/[`"'#]/g, "")
            .toLowerCase(),
        ),
      });
    }

    // ADD CHECK (...)
    const chkMatch = action.match(/ADD\s+(?:CONSTRAINT\s+\w+\s+)?CHECK\s*\(([\s\S]+)\)/i);
    if (chkMatch && chkMatch[1]) {
      table.checkConstraints.push(chkMatch[1].trim());
    }
  }

  private parseValueLiterals(tupleStr: string): unknown[] {
    const items = splitTopLevelCommas(tupleStr);
    return items.map((raw) => {
      const t = raw.trim();
      if (t.toUpperCase() === "NULL") return null;
      if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
        return t.slice(1, -1);
      }
      if (/^-?\d+(?:\.\d+)?$/.test(t)) {
        return Number(t);
      }
      if (/^CURDATE\s*\(\s*\)$/i.test(t) || /^NOW\s*\(\s*\)$/i.test(t)) {
        return new Date().toISOString().slice(0, 10);
      }
      return t;
    });
  }

  private validateAndCoerceColumnValue(
    table: SqlTableSchema,
    col: SqlColumnConstraint,
    val: unknown,
  ): unknown {
    if (val === null || val === undefined) {
      if (col.notNull && !col.autoIncrement && col.defaultValue === undefined) {
        this.setError(1048, `Column '${col.name}' cannot be null`);
        throw new Error(this.lastError);
      }
      return null;
    }

    if (col.baseType === "VARCHAR" || col.baseType === "CHAR") {
      const strVal = String(val);
      if (col.length !== undefined && strVal.length > col.length) {
        this.setError(1406, `Data too long for column '${col.name}' at row 1 (max ${col.length})`);
        throw new Error(this.lastError);
      }
      return strVal;
    }

    if (col.baseType === "INT") {
      const num = typeof val === "number" ? val : Number(val);
      if (Number.isNaN(num) || !Number.isInteger(num)) {
        this.setError(
          1366,
          `Incorrect integer value: '${String(val)}' for column '${col.name}' at row 1`,
        );
        throw new Error(this.lastError);
      }
      return num;
    }

    if (col.baseType === "DECIMAL") {
      const num = typeof val === "number" ? val : Number(val);
      if (Number.isNaN(num)) {
        this.setError(
          1366,
          `Incorrect decimal value: '${String(val)}' for column '${col.name}' at row 1`,
        );
        throw new Error(this.lastError);
      }
      if (col.precision !== undefined && col.scale !== undefined) {
        const maxIntDigits = col.precision - col.scale;
        const intPart = Math.floor(Math.abs(num));
        if (String(intPart).length > maxIntDigits && intPart !== 0) {
          this.setError(1264, `Out of range value for column '${col.name}' at row 1`);
          throw new Error(this.lastError);
        }
      }
      return num;
    }

    if (col.baseType === "DATE") {
      const strVal = String(val);
      if (!/^\d{4}-\d{2}-\d{2}/.test(strVal)) {
        this.setError(1292, `Incorrect date value: '${strVal}' for column '${col.name}' at row 1`);
        throw new Error(this.lastError);
      }
      const d = new Date(strVal.slice(0, 10));
      if (Number.isNaN(d.getTime())) {
        this.setError(1292, `Incorrect date value: '${strVal}' for column '${col.name}' at row 1`);
        throw new Error(this.lastError);
      }
      return strVal.slice(0, 10);
    }

    return val;
  }

  private evaluateCheckConstraint(expr: string, row: Record<string, unknown>): boolean {
    // Supporte :
    // 1. col IN ('a', 'b', ...)
    const inMatch = expr.match(/[`"']?(\w+)[`"']?\s+IN\s*\(([^)]+)\)/i);
    if (inMatch && inMatch[1] && inMatch[2]) {
      const colName = inMatch[1].toLowerCase();
      const allowed = this.parseValueLiterals(inMatch[2]).map((v) => String(v));
      const actual = row[colName];
      if (actual === null || actual === undefined) return true;
      return allowed.includes(String(actual));
    }

    // 2. col BETWEEN a AND b
    const betweenMatch = expr.match(
      /[`"']?(\w+)[`"']?\s+BETWEEN\s+(-?\d+(?:\.\d+)?)\s+AND\s+(-?\d+(?:\.\d+)?)/i,
    );
    if (betweenMatch && betweenMatch[1] && betweenMatch[2] && betweenMatch[3]) {
      const colName = betweenMatch[1].toLowerCase();
      const min = Number(betweenMatch[2]);
      const max = Number(betweenMatch[3]);
      const actual = Number(row[colName]);
      return !Number.isNaN(actual) && actual >= min && actual <= max;
    }

    // 3. col OP val (>, >=, <, <=, =, !=, <>)
    const cmpMatch = expr.match(
      /[`"']?(\w+)[`"']?\s*(>=|<=|<>|!=|>|<|=)\s*('[^']*'|"[^"]*"|-?\d+(?:\.\d+)?)/i,
    );
    if (cmpMatch && cmpMatch[1] && cmpMatch[2] && cmpMatch[3]) {
      const colName = cmpMatch[1].toLowerCase();
      const op = cmpMatch[2];
      const rawRhs = cmpMatch[3];
      const actual = row[colName];

      const isStr =
        (rawRhs.startsWith("'") && rawRhs.endsWith("'")) ||
        (rawRhs.startsWith('"') && rawRhs.endsWith('"'));
      const rhs = isStr ? rawRhs.slice(1, -1) : Number(rawRhs);
      const lhs = isStr ? String(actual) : Number(actual);

      switch (op) {
        case ">":
          return lhs > rhs;
        case ">=":
          return lhs >= rhs;
        case "<":
          return lhs < rhs;
        case "<=":
          return lhs <= rhs;
        case "=":
          return lhs === rhs;
        case "!=":
        case "<>":
          return lhs !== rhs;
      }
    }

    return true;
  }

  private verifyIntegrityConstraints(
    table: SqlTableSchema,
    candidateRow: Record<string, unknown>,
    ignoreRowIndex?: number,
  ): void {
    // 1. CHECK constraints
    for (const chk of table.checkConstraints) {
      if (!this.evaluateCheckConstraint(chk, candidateRow)) {
        this.setError(3819, `Check constraint '${table.name}_chk' is violated (${chk}).`);
        throw new Error(this.lastError);
      }
    }

    // 2. PRIMARY KEY uniqueness (simple ou composée)
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
        return table.primaryKey.every(
          (pkCol) => String(existing[pkCol]) === String(candidateRow[pkCol]),
        );
      });

      if (duplicate) {
        const keyVal = table.primaryKey.map((k) => String(candidateRow[k])).join("-");
        this.setError(1062, `Duplicate entry '${keyVal}' for key '${table.name}.PRIMARY'`);
        throw new Error(this.lastError);
      }
    }

    // 3. UNIQUE constraints
    for (const uqCols of table.uniqueSets) {
      const duplicate = table.rows.some((existing, idx) => {
        if (ignoreRowIndex !== undefined && idx === ignoreRowIndex) return false;
        return uqCols.every(
          (col) =>
            candidateRow[col] !== null &&
            existing[col] !== null &&
            String(existing[col]) === String(candidateRow[col]),
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

    // 4. FOREIGN KEY ... REFERENCES
    for (const fk of table.foreignKeys) {
      const parentTable = this.tables.get(fk.refTable);
      if (!parentTable) {
        this.setError(
          1452,
          `Cannot add or update a child row: referenced table '${fk.refTable}' does not exist`,
        );
        throw new Error(this.lastError);
      }

      // Si toutes les colonnes FK sont NULL (et autorisées), pas de contrôle
      const allNull = fk.columns.every(
        (c) => candidateRow[c] === null || candidateRow[c] === undefined,
      );
      if (allNull) continue;

      const existsInParent = parentTable.rows.some((pRow) =>
        fk.columns.every((childCol, i) => {
          const refCol = fk.refColumns[i] || childCol;
          return String(pRow[refCol]) === String(candidateRow[childCol]);
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

  private handleInsert(stmt: string): number {
    const headerMatch = stmt.match(
      /^INSERT\s+INTO\s+[`"']?([a-zA-Z0-9_]+)[`"']?(?:\s*\(([^)]+)\))?\s+VALUES\s*([\s\S]+)$/i,
    );
    if (!headerMatch || !headerMatch[1] || !headerMatch[3]) {
      this.setError(1064, "You have an error in your SQL syntax near INSERT INTO");
      throw new Error(this.lastError);
    }

    const tableName = headerMatch[1].toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) {
      this.setError(1146, `Table '${tableName}' doesn't exist`);
      throw new Error(this.lastError);
    }

    const specifiedCols = headerMatch[2]
      ? headerMatch[2].split(",").map((c) =>
          c
            .trim()
            .replace(/[`"'#]/g, "")
            .toLowerCase(),
        )
      : table.columns.map((c) => c.name);

    // Extraire chaque tuple (...) de VALUES
    const valuesSection = headerMatch[3].trim();
    const tuples: string[] = [];
    let depth = 0;
    let start = -1;
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < valuesSection.length; i++) {
      const ch = valuesSection[i];
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

    let insertedCount = 0;
    for (const tuple of tuples) {
      const parsedVals = this.parseValueLiterals(tuple);
      const row: Record<string, unknown> = {};

      table.autoIncrementCounter++;

      for (const col of table.columns) {
        const colIdx = specifiedCols.indexOf(col.name);
        let rawVal: unknown = colIdx !== -1 ? parsedVals[colIdx] : undefined;

        if (rawVal === undefined) {
          if (col.autoIncrement) {
            rawVal = table.autoIncrementCounter;
          } else if (col.defaultValue !== undefined) {
            rawVal = col.defaultValue;
          } else {
            rawVal = null;
          }
        } else if (col.autoIncrement && typeof rawVal === "number") {
          table.autoIncrementCounter = Math.max(table.autoIncrementCounter, rawVal);
        }

        row[col.name] = this.validateAndCoerceColumnValue(table, col, rawVal);
      }

      this.verifyIntegrityConstraints(table, row);
      table.rows.push(row);
      insertedCount++;
    }

    return insertedCount;
  }

  private matchesWhere(row: Record<string, unknown>, whereClause: string): boolean {
    if (!whereClause.trim()) return true;

    // Supporte plusieurs conditions séparées par AND
    const conditions = whereClause.split(/\bAND\b/i).map((c) => c.trim());
    for (const cond of conditions) {
      const eqMatch = cond.match(
        /[`"']?([a-zA-Z0-9_]+)[`"']?\s*(=|!=|<>|>=|<=|>|<)\s*('[^']*'|"[^"]*"|-?\d+(?:\.\d+)?)/i,
      );
      if (eqMatch && eqMatch[1] && eqMatch[2] && eqMatch[3]) {
        const col = eqMatch[1].toLowerCase();
        const op = eqMatch[2];
        const rawVal = eqMatch[3];
        const cleanVal =
          (rawVal.startsWith("'") && rawVal.endsWith("'")) ||
          (rawVal.startsWith('"') && rawVal.endsWith('"'))
            ? rawVal.slice(1, -1)
            : Number(rawVal);

        const rowVal = row[col];
        switch (op) {
          case "=":
            if (String(rowVal) !== String(cleanVal)) return false;
            break;
          case "!=":
          case "<>":
            if (String(rowVal) === String(cleanVal)) return false;
            break;
          case ">":
            if (!(Number(rowVal) > Number(cleanVal))) return false;
            break;
          case ">=":
            if (!(Number(rowVal) >= Number(cleanVal))) return false;
            break;
          case "<":
            if (!(Number(rowVal) < Number(cleanVal))) return false;
            break;
          case "<=":
            if (!(Number(rowVal) <= Number(cleanVal))) return false;
            break;
        }
      }
    }
    return true;
  }

  private handleUpdate(stmt: string): number {
    const m = stmt.match(
      /^UPDATE\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i,
    );
    if (!m || !m[1] || !m[2]) {
      this.setError(1064, "You have an error in your SQL syntax near UPDATE");
      throw new Error(this.lastError);
    }

    const tableName = m[1].toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) {
      this.setError(1146, `Table '${tableName}' doesn't exist`);
      throw new Error(this.lastError);
    }

    const setAssignments = splitTopLevelCommas(m[2]);
    const whereClause = m[3] || "";
    let affected = 0;

    table.rows.forEach((row, idx) => {
      if (!this.matchesWhere(row, whereClause)) return;

      const updated: Record<string, unknown> = { ...row };
      for (const assign of setAssignments) {
        const eqIdx = assign.indexOf("=");
        if (eqIdx === -1) continue;
        const colName = assign
          .slice(0, eqIdx)
          .trim()
          .replace(/[`"'#]/g, "")
          .toLowerCase();
        const valExpr = assign.slice(eqIdx + 1).trim();
        const parsed = this.parseValueLiterals(valExpr)[0];

        const colDef = table.columns.find((c) => c.name === colName);
        if (!colDef) {
          this.setError(1054, `Unknown column '${colName}' in 'field list'`);
          throw new Error(this.lastError);
        }
        updated[colName] = this.validateAndCoerceColumnValue(table, colDef, parsed);
      }

      this.verifyIntegrityConstraints(table, updated, idx);
      Object.assign(row, updated);
      affected++;
    });

    return affected;
  }

  private handleDelete(stmt: string): number {
    const m = stmt.match(/^DELETE\s+FROM\s+[`"']?([a-zA-Z0-9_]+)[`"']?(?:\s+WHERE\s+([\s\S]+))?$/i);
    if (!m || !m[1]) {
      this.setError(1064, "You have an error in your SQL syntax near DELETE");
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
    let deleted = 0;

    for (const row of table.rows) {
      if (this.matchesWhere(row, whereClause)) {
        deleted++;
      } else {
        remaining.push(row);
      }
    }
    table.rows = remaining;
    return deleted;
  }

  private handleSelect(stmt: string): Record<string, unknown>[] {
    const fromMatch = stmt.match(
      /^SELECT\s+([\s\S]+?)\s+FROM\s+[`"']?([a-zA-Z0-9_]+)[`"']?(?:\s+WHERE\s+([\s\S]+?))?(?:\s+GROUP\s+BY[\s\S]+|\s+ORDER\s+BY[\s\S]+|\s+LIMIT[\s\S]+)?$/i,
    );
    if (!fromMatch || !fromMatch[1] || !fromMatch[2]) {
      return [];
    }

    const selectPart = fromMatch[1].trim();
    const tableName = fromMatch[2].toLowerCase();
    const whereClause = fromMatch[3] || "";

    const table = this.tables.get(tableName);
    if (!table) {
      this.setError(1146, `Table '${tableName}' doesn't exist`);
      throw new Error(this.lastError);
    }

    const filtered = table.rows.filter((r) => this.matchesWhere(r, whereClause));

    if (selectPart === "*") {
      return filtered.map((r) => ({ ...r }));
    }

    if (/^COUNT\s*\(\s*\*\s*\)/i.test(selectPart)) {
      const aliasMatch = selectPart.match(/AS\s+[`"']?(\w+)[`"']?/i);
      const key = aliasMatch?.[1] || "COUNT(*)";
      return [{ [key]: filtered.length }];
    }

    const cols = selectPart.split(",").map((c) => c.trim().replace(/[`"']/g, "").toLowerCase());

    return filtered.map((r) => {
      const out: Record<string, unknown> = {};
      for (const c of cols) {
        out[c] = r[c];
      }
      return out;
    });
  }
}

export interface SqlTableAssertionSpec {
  tableName: string;
  expectedColumns?: Array<{
    name: string;
    baseType?: SqlColumnConstraint["baseType"];
    notNull?: boolean;
    unique?: boolean;
    hasDefault?: boolean;
    hasCheck?: boolean;
  }>;
  expectedPrimaryKey?: string[];
  expectedForeignKeys?: Array<{
    column: string;
    refTable: string;
    refColumn?: string;
  }>;
}

/**
 * Évalue un script SQL élève par rapport aux attentes du barème Bac STI
 */
export function evaluerConformiteSqlBacSti(
  studentSql: string,
  spec: SqlTableAssertionSpec,
  baseSchemaSql: string = "",
): SqlValidationReport {
  const sim = new MySqliSimulator();
  if (baseSchemaSql.trim()) {
    sim.executeScript(baseSchemaSql);
  }

  const avertissementsHorsProgramme = detecterSyntaxesSqlHorsProgramme(studentSql);
  const execRes = sim.executeScript(studentSql);
  const criteres: SqlCriterionReport[] = [];

  const schema = sim.getTableSchema(spec.tableName);

  // Critère 1 : Existence de la table
  criteres.push({
    id: `SQL-TABLE-${spec.tableName.toUpperCase()}`,
    code: "SQL-DDL-01",
    titre: `Création de la table ${spec.tableName}`,
    valide: Boolean(schema),
    points: schema ? 1 : 0,
    pointsMax: 1,
    feedbackPedagogique: schema
      ? `La table '${spec.tableName}' a été créée avec succès.`
      : `La table '${spec.tableName}' est introuvable ou contient une erreur de syntaxe SQL (${execRes.errors[0] || "CREATE TABLE manquant"}).`,
    mysqliError: execRes.errors[0],
  });

  // Critère 2 : Clé primaire (simple ou composée)
  if (spec.expectedPrimaryKey && spec.expectedPrimaryKey.length > 0) {
    const expectedNorm = spec.expectedPrimaryKey.map((c) => c.replace(/#$/, "").toLowerCase());
    const actualPk = schema?.primaryKey ?? [];
    const pkOk =
      expectedNorm.length === actualPk.length &&
      expectedNorm.every((col) => actualPk.includes(col));

    criteres.push({
      id: `SQL-PK-${spec.tableName.toUpperCase()}`,
      code: "SQL-DDL-02",
      titre: `Clé primaire (${spec.expectedPrimaryKey.join(", ")})`,
      valide: pkOk,
      points: pkOk ? 1.5 : 0,
      pointsMax: 1.5,
      feedbackPedagogique: pkOk
        ? `Clé primaire (${expectedNorm.join(", ")}) conforme.`
        : `La clé primaire attendue est PRIMARY KEY (${expectedNorm.join(", ")}), trouvé : (${actualPk.join(", ") || "aucune"}).`,
    });
  }

  // Critère 3 : Clés étrangères (intégrité référentielle)
  if (spec.expectedForeignKeys && spec.expectedForeignKeys.length > 0) {
    const fks = schema?.foreignKeys ?? [];
    const allFksOk = spec.expectedForeignKeys.every((exp) => {
      const colClean = exp.column.replace(/#$/, "").toLowerCase();
      const refTableClean = exp.refTable.toLowerCase();
      return fks.some(
        (actual) => actual.columns.includes(colClean) && actual.refTable === refTableClean,
      );
    });

    criteres.push({
      id: `SQL-FK-${spec.tableName.toUpperCase()}`,
      code: "SQL-DDL-03",
      titre: `Clés étrangères (${spec.expectedForeignKeys.map((f) => f.column).join(", ")})`,
      valide: allFksOk,
      points: allFksOk ? 1.5 : 0,
      pointsMax: 1.5,
      feedbackPedagogique: allFksOk
        ? "Toutes les contraintes d'intégrité référentielle FOREIGN KEY ... REFERENCES sont présentes."
        : `Contraintes FOREIGN KEY manquantes ou incomplètes sur (${spec.expectedForeignKeys.map((f) => `${f.column} -> ${f.refTable}`).join(", ")}).`,
    });
  }

  // Critère 4 : Types et contraintes de colonnes (NOT NULL, DEFAULT, CHECK, UNIQUE)
  if (spec.expectedColumns && spec.expectedColumns.length > 0) {
    const missingDetails: string[] = [];
    for (const expCol of spec.expectedColumns) {
      const colName = expCol.name.replace(/#$/, "").toLowerCase();
      const actualCol = schema?.columns.find((c) => c.name === colName);
      if (!actualCol) {
        missingDetails.push(`colonne '${colName}' absente`);
        continue;
      }
      if (expCol.baseType && actualCol.baseType !== expCol.baseType) {
        missingDetails.push(
          `type de '${colName}' attendu ${expCol.baseType} (reçu ${actualCol.rawType})`,
        );
      }
      if (expCol.notNull && !actualCol.notNull) {
        missingDetails.push(`contrainte NOT NULL manquante sur '${colName}'`);
      }
      if (
        expCol.unique &&
        !actualCol.unique &&
        !schema?.uniqueSets.some((u) => u.includes(colName))
      ) {
        missingDetails.push(`contrainte UNIQUE manquante sur '${colName}'`);
      }
      if (expCol.hasDefault && actualCol.defaultValue === undefined) {
        missingDetails.push(`clause DEFAULT manquante sur '${colName}'`);
      }
      if (expCol.hasCheck && !actualCol.checkExpr && (schema?.checkConstraints.length ?? 0) === 0) {
        missingDetails.push(`contrainte CHECK manquante sur '${colName}'`);
      }
    }

    const colsOk = missingDetails.length === 0 && Boolean(schema);
    criteres.push({
      id: `SQL-COLS-${spec.tableName.toUpperCase()}`,
      code: "SQL-DDL-04",
      titre: "Typage des colonnes et contraintes de domaine",
      valide: colsOk,
      points: colsOk ? 1 : 0,
      pointsMax: 1,
      feedbackPedagogique: colsOk
        ? "Les types de colonnes et contraintes de domaine (NOT NULL, DEFAULT, CHECK) sont respectés."
        : `Anomalies détectées : ${missingDetails.join(" ; ")}.`,
    });
  }

  const score = criteres.reduce((acc, c) => acc + c.points, 0);
  const scoreMax = criteres.reduce((acc, c) => acc + c.pointsMax, 0);

  return {
    conformeProgramme:
      avertissementsHorsProgramme.length === 0 && execRes.errors.length === 0 && score === scoreMax,
    score,
    scoreMax,
    criteres,
    avertissementsHorsProgramme,
    erreursMysqli: execRes.errors,
  };
}
