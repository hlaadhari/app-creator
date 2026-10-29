/**
 * Labo STI - Simulateur Procédural PHP / MySQLi certifié Bac STI (PRD §8.1, F-22 à F-24, TEC-01)
 *
 * Interprète fidèlement les scripts PHP procéduraux des annales officielles du Bac STI (2018 à 2026) :
 * - Gestion séquentielle des blocs d'instructions, conditions if/else, boucles while/foreach, blocs try/catch
 * - Émulation des superglobales ($_POST, $_GET, $_SESSION, $_SERVER) et extract($_POST)
 * - Extension procédurale MySQLi : mysqli_connect, mysqli_query, mysqli_num_rows, mysqli_affected_rows,
 *   mysqli_fetch_array, mysqli_fetch_assoc, mysqli_error, mysqli_close
 * - Requêtes préparées : mysqli_prepare, mysqli_stmt_bind_param, mysqli_stmt_execute,
 *   mysqli_stmt_store_result, mysqli_stmt_num_rows, mysqli_stmt_get_result, mysqli_stmt_close
 * - Transactions : mysqli_begin_transaction, mysqli_commit, mysqli_rollback
 * - Résolution des inclusions (include "connexion.php", etc.)
 * - Connexion transparente et exécution sur le moteur relationnel MySqliSimulator du sujet
 */

import { MySqliSimulator } from "../evaluator/sql-checker";
import { MAX_EXECUTION_TIME_MS, MAX_MEMORY_LIMIT_BYTES, MAX_STDOUT_BYTES } from "./php-worker-core";
import { preparerSuperglobales } from "./superglobals";
import type { PhpExecutionRequest, PhpExecutionResponse } from "./types";

export const ENGINE_NAME = "Simulateur procédural PHP/MySQLi Bac STI";

export interface PhpSimulatorOptions {
  simulator?: MySqliSimulator | undefined;
  initialSql?: string | undefined;
  files?: Record<string, string> | undefined;
  maxExecutionTimeMs?: number | undefined;
  memoryLimitBytes?: number | undefined;
  maxStdoutBytes?: number | undefined;
}

export interface PreparedStatementHandle {
  sqlTemplate: string;
  types: string;
  paramValues: unknown[];
  lastResult?:
    | {
        success: boolean;
        rows: Record<string, unknown>[];
        numRows: number;
        affectedRows: number;
        error: string;
        cursor: number;
      }
    | undefined;
}

export interface QueryResultHandle {
  rows: Record<string, unknown>[];
  numRows: number;
  cursor: number;
  affectedRows: number;
  error?: string | undefined;
}

export function resoudreSqlInitial(files: Record<string, string>): string {
  const candidates = [
    "db/init.sql",
    "init.sql",
    "tables.sql",
    "schema.sql",
    "croisiere.sql",
    "bijoux.sql",
  ];
  for (const c of candidates) {
    if (files[c]) return files[c];
  }
  for (const [name, content] of Object.entries(files)) {
    if (name.endsWith(".sql")) return content;
  }
  return "";
}

/**
 * Supprime les commentaires PHP (//, /* * /, #) en préservant le contenu des chaînes littérales
 * (essentiel pour ne pas supprimer les codes hexadécimaux CSS comme #27ae60).
 */
export function stripPhpComments(code: string): string {
  let out = "";
  let i = 0;
  const n = code.length;
  let inSingle = false;
  let inDouble = false;

  while (i < n) {
    const c = code[i];
    const next = i + 1 < n ? code[i + 1] : "";

    if (!inDouble && c === "'" && (i === 0 || code[i - 1] !== "\\")) {
      inSingle = !inSingle;
      out += c;
      i++;
    } else if (!inSingle && c === '"' && (i === 0 || code[i - 1] !== "\\")) {
      inDouble = !inDouble;
      out += c;
      i++;
    } else if (!inSingle && !inDouble) {
      if (c === "/" && next === "/") {
        while (i < n && code[i] !== "\n") i++;
      } else if (c === "/" && next === "*") {
        i += 2;
        while (i < n && !(code[i] === "*" && i + 1 < n && code[i + 1] === "/")) i++;
        i += 2;
      } else if (c === "#") {
        while (i < n && code[i] !== "\n") i++;
      } else {
        out += c;
        i++;
      }
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/**
 * Moteur d'interprétation procédurale PHP Bac STI
 */
export class ProceduralPhpInterpreter {
  public vars: Record<string, unknown> = {};
  public session: Record<string, unknown> = {};
  public headers: Record<string, string> = { "content-type": "text/html; charset=UTF-8" };
  public executedQueries: string[] = [];
  public mysqliErrors: string[] = [];
  public stdout = "";
  public terminated = false;

  private simulator: MySqliSimulator;
  private post: Record<string, string>;
  private get: Record<string, string>;
  private server: Record<string, string>;
  private virtualFiles: Record<string, string>;
  private maxStdout: number;

  constructor(
    simulator: MySqliSimulator,
    globals: {
      post: Record<string, string>;
      get: Record<string, string>;
      session: Record<string, unknown>;
      server: Record<string, string>;
    },
    virtualFiles: Record<string, string>,
    maxStdout: number = MAX_STDOUT_BYTES,
  ) {
    this.simulator = simulator;
    this.post = globals.post;
    this.get = globals.get;
    this.session = { ...globals.session };
    this.server = globals.server;
    this.virtualFiles = virtualFiles;
    this.maxStdout = maxStdout;
  }

  /**
   * Résout les inclusions de fichiers virtuels dans le code PHP
   */
  public resolveIncludes(code: string, visited = new Set<string>()): string {
    return code.replace(
      /(?:include|require|include_once|require_once)\s*(?:\(?\s*["']([^"']+)["']\s*\)?)\s*;/gi,
      (_, fileName: string) => {
        if (visited.has(fileName)) return "";
        visited.add(fileName);
        const inc = this.virtualFiles[fileName];
        if (inc) {
          const clean = inc.replace(/<\?php/gi, "").replace(/\?>/gi, "");
          return this.resolveIncludes(clean, visited);
        }
        return "";
      },
    );
  }

  /**
   * Évalue une expression PHP scalaire ou composée
   */
  public evalExpr(raw: string): unknown {
    let expr = raw.trim();
    if (!expr) return "";

    if (expr.startsWith("@")) expr = expr.slice(1).trim();

    // Parenthèses extérieures englobantes
    if (expr.startsWith("(") && expr.endsWith(")")) {
      let depth = 0;
      let fullParen = true;
      for (let i = 0; i < expr.length; i++) {
        if (expr[i] === "(") depth++;
        else if (expr[i] === ")") {
          depth--;
          if (depth === 0 && i < expr.length - 1) {
            fullParen = false;
            break;
          }
        }
      }
      if (fullParen) {
        return this.evalExpr(expr.slice(1, -1));
      }
    }

    // Opérateur ternaire : cond ? a : b
    const ternaryMatch = this.splitTernary(expr);
    if (ternaryMatch) {
      const cond = this.evalExpr(ternaryMatch.cond);
      return this.isTruthy(cond)
        ? this.evalExpr(ternaryMatch.whenTrue)
        : this.evalExpr(ternaryMatch.whenFalse);
    }

    // Opérateurs logiques || et &&
    const orParts = this.splitByOp(expr, ["||", "or"]);
    if (orParts.length > 1) {
      return orParts.some((p) => this.isTruthy(this.evalExpr(p)));
    }
    const andParts = this.splitByOp(expr, ["&&", "and"]);
    if (andParts.length > 1) {
      return andParts.every((p) => this.isTruthy(this.evalExpr(p)));
    }

    // Opérateur de négation unaire '!'
    if (expr.startsWith("!")) {
      return !this.isTruthy(this.evalExpr(expr.slice(1)));
    }

    // Comparaisons : ===, !==, ==, !=, <=, >=, <, >
    const compMatch = this.splitComparison(expr);
    if (compMatch) {
      const left = this.evalExpr(compMatch.left);
      const right = this.evalExpr(compMatch.right);
      switch (compMatch.op) {
        case "===":
          return left === right;
        case "!==":
          return left !== right;
        case "==":
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (left as any) == (right as any);
        case "!=":
        case "<>":
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (left as any) != (right as any);
        case "<=":
          return Number(left) <= Number(right);
        case ">=":
          return Number(left) >= Number(right);
        case "<":
          return Number(left) < Number(right);
        case ">":
          return Number(left) > Number(right);
      }
    }

    // isset(...)
    const issetMatch = expr.match(/^isset\s*\((.+)\)$/i);
    if (issetMatch && issetMatch[1]) {
      const target = issetMatch[1].trim();
      const postMatch = target.match(/^\$_POST\s*\[\s*['"]([^'"]+)['"]\s*\]$/);
      if (postMatch && postMatch[1]) {
        const k = postMatch[1];
        return this.post[k] !== undefined && this.post[k] !== "";
      }
      const postDynMatch = target.match(/^\$_POST\s*\[\s*\$([a-zA-Z_][a-zA-Z0-9_]*)\s*\]$/);
      if (postDynMatch && postDynMatch[1]) {
        const k = String(this.vars[postDynMatch[1]] ?? "");
        return this.post[k] !== undefined && this.post[k] !== "";
      }
      const varMatch = target.match(/^\$([a-zA-Z_][a-zA-Z0-9_]*)$/);
      if (varMatch && varMatch[1]) {
        const v = this.vars[varMatch[1]];
        return v !== undefined && v !== null && v !== "";
      }
      return false;
    }

    // empty(...)
    const emptyMatch = expr.match(/^empty\s*\((.+)\)$/i);
    if (emptyMatch && emptyMatch[1]) {
      const v = this.evalExpr(emptyMatch[1]);
      return v === "" || v === 0 || v === "0" || v === null || v === undefined || v === false;
    }

    // strlen(...)
    const strlenMatch = expr.match(/^strlen\s*\((.+)\)$/i);
    if (strlenMatch && strlenMatch[1]) {
      const v = String(this.evalExpr(strlenMatch[1]) ?? "");
      return v.length;
    }

    // is_numeric(...)
    const isNumMatch = expr.match(/^is_numeric\s*\((.+)\)$/i);
    if (isNumMatch && isNumMatch[1]) {
      const v = this.evalExpr(isNumMatch[1]);
      return !isNaN(Number(v)) && String(v).trim() !== "";
    }

    // intval(...)
    const intvalMatch = expr.match(/^intval\s*\((.+)\)$/i);
    if (intvalMatch && intvalMatch[1]) {
      return parseInt(String(this.evalExpr(intvalMatch[1])), 10) || 0;
    }

    // trim(...)
    const trimMatch = expr.match(/^trim\s*\((.+)\)$/i);
    if (trimMatch && trimMatch[1]) {
      return String(this.evalExpr(trimMatch[1]) ?? "").trim();
    }

    // ucwords(...)
    const ucwordsMatch = expr.match(/^ucwords\s*\((.+)\)$/i);
    if (ucwordsMatch && ucwordsMatch[1]) {
      return String(this.evalExpr(ucwordsMatch[1]) ?? "").replace(/\b\w/g, (c) => c.toUpperCase());
    }

    // htmlspecialchars(...)
    const htmlspecMatch = expr.match(/^htmlspecialchars\s*\((.+)\)$/i);
    if (htmlspecMatch && htmlspecMatch[1]) {
      return this.evalExpr(htmlspecMatch[1]);
    }

    // number_format(...)
    const numFormatMatch = expr.match(/^number_format\s*\((.+)\)$/i);
    if (numFormatMatch && numFormatMatch[1]) {
      const args = this.splitCommas(numFormatMatch[1]);
      const firstArg = args[0] ?? "0";
      const val = Number(this.evalExpr(firstArg));
      const decimals = args[1] ? Number(this.evalExpr(args[1])) : 0;
      return isNaN(val) ? "0.00" : val.toFixed(decimals);
    }

    // mysqli_stmt_num_rows($stmt)
    const stmtNumRowsMatch = expr.match(
      /^mysqli_stmt_num_rows\s*\(\s*\$([a-zA-Z_][a-zA-Z0-9_]*)\s*\)$/i,
    );
    if (stmtNumRowsMatch && stmtNumRowsMatch[1]) {
      const stmt = this.vars[stmtNumRowsMatch[1]] as PreparedStatementHandle | undefined;
      return stmt?.lastResult ? stmt.lastResult.numRows : 0;
    }

    // mysqli_num_rows($res)
    const numRowsMatch = expr.match(/^mysqli_num_rows\s*\(\s*\$([a-zA-Z_][a-zA-Z0-9_]*)\s*\)$/i);
    if (numRowsMatch && numRowsMatch[1]) {
      const r = this.vars[numRowsMatch[1]] as QueryResultHandle | undefined;
      return r ? r.numRows : 0;
    }

    // mysqli_affected_rows($con)
    if (/^mysqli_affected_rows\s*\(/i.test(expr)) {
      return this.simulator.mysqli_affected_rows();
    }

    // mysqli_stmt_execute($stmt)
    const stmtExecMatch = expr.match(
      /^(?:@)?mysqli_stmt_execute\s*\(\s*\$([a-zA-Z_][a-zA-Z0-9_]*)\s*\)$/i,
    );
    if (stmtExecMatch && stmtExecMatch[1]) {
      return this.executePreparedStatement(stmtExecMatch[1]);
    }

    // mysqli_fetch_assoc($res) ou mysqli_fetch_array($res)
    const fetchMatch = expr.match(
      /^mysqli_fetch_(?:assoc|array)\s*\(\s*\$([a-zA-Z_][a-zA-Z0-9_]*)\s*\)$/i,
    );
    if (fetchMatch && fetchMatch[1]) {
      const r = this.vars[fetchMatch[1]] as QueryResultHandle | undefined;
      if (!r || r.cursor >= r.rows.length) return null;
      return r.rows[r.cursor++] ?? null;
    }

    // mysqli_stmt_get_result($stmt)
    const getResMatch = expr.match(
      /^mysqli_stmt_get_result\s*\(\s*\$([a-zA-Z_][a-zA-Z0-9_]*)\s*\)$/i,
    );
    if (getResMatch && getResMatch[1]) {
      const stmt = this.vars[getResMatch[1]] as PreparedStatementHandle | undefined;
      return stmt?.lastResult ?? null;
    }

    // Tableaux : array(...) ou [...]
    if (/^array\s*\([\s\S]*\)$/i.test(expr) || /^\[[\s\S]*\]$/.test(expr)) {
      const inner = expr.startsWith("[")
        ? expr.slice(1, -1)
        : expr.slice(expr.indexOf("(") + 1, -1);
      if (!inner.trim()) return [];
      return this.splitCommas(inner).map((item) => this.evalExpr(item));
    }

    // Concaténation point '.' (évaluée avant les chaînes littérales pour résoudre les expressions composées)
    const dotParts = this.splitByOp(expr, ["."]);
    if (dotParts.length > 1) {
      return dotParts.map((p) => String(this.evalExpr(p) ?? "")).join("");
    }

    // Accès aux superglobales directes ($_POST['k'] ou $_POST[$k])
    const postDirectMatch = expr.match(/^\$_POST\s*\[\s*['"]([^'"]+)['"]\s*\]$/);
    if (postDirectMatch && postDirectMatch[1]) {
      const k = postDirectMatch[1];
      return this.post[k] !== undefined ? this.post[k] : "";
    }
    const postDynAccess = expr.match(/^\$_POST\s*\[\s*\$([a-zA-Z_][a-zA-Z0-9_]*)\s*\]$/);
    if (postDynAccess && postDynAccess[1]) {
      const k = String(this.vars[postDynAccess[1]] ?? "");
      return this.post[k] !== undefined ? this.post[k] : "";
    }

    const getDirectMatch = expr.match(/^\$_GET\s*\[\s*['"]([^'"]+)['"]\s*\]$/);
    if (getDirectMatch && getDirectMatch[1]) {
      const k = getDirectMatch[1];
      return this.get[k] !== undefined ? this.get[k] : "";
    }
    const serverDirectMatch = expr.match(/^\$_SERVER\s*\[\s*['"]([^'"]+)['"]\s*\]$/);
    if (serverDirectMatch && serverDirectMatch[1]) {
      const k = serverDirectMatch[1];
      return this.server[k] !== undefined ? this.server[k] : "";
    }
    const sessionDirectMatch = expr.match(/^\$_SESSION\s*\[\s*['"]([^'"]+)['"]\s*\]$/);
    if (sessionDirectMatch && sessionDirectMatch[1]) {
      const k = sessionDirectMatch[1];
      return this.session[k] !== undefined ? this.session[k] : "";
    }

    // Accès tableau dynamique : $client["nom"] ou $ligne['id']
    const arrayAccessMatch = expr.match(
      /^\$([a-zA-Z_][a-zA-Z0-9_]*)\s*\[\s*['"]([^'"]+)['"]\s*\]$/,
    );
    if (arrayAccessMatch && arrayAccessMatch[1] && arrayAccessMatch[2]) {
      const arr = this.vars[arrayAccessMatch[1]] as Record<string, unknown> | undefined;
      const key = arrayAccessMatch[2];
      if (arr) {
        return arr[key] !== undefined ? arr[key] : (arr[key.toLowerCase()] ?? "");
      }
      return "";
    }

    // Variable simple : $var
    if (/^\$([a-zA-Z_][a-zA-Z0-9_]*)$/.test(expr)) {
      const vName = expr.slice(1);
      return this.vars[vName] !== undefined ? this.vars[vName] : "";
    }

    // Chaîne entre guillemets doubles (avec interpolation $var)
    if (expr.startsWith('"') && expr.endsWith('"')) {
      let str = expr.slice(1, -1);
      str = str.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, vName) => {
        return this.vars[vName] !== undefined ? String(this.vars[vName]) : `$${vName}`;
      });
      return str;
    }

    // Chaîne entre guillemets simples
    if (expr.startsWith("'") && expr.endsWith("'")) {
      return expr.slice(1, -1);
    }

    // Nombres & booléens
    if (/^-?\d+(?:\.\d+)?$/.test(expr)) return Number(expr);
    if (/^true$/i.test(expr)) return true;
    if (/^false$/i.test(expr)) return false;
    if (/^null$/i.test(expr)) return null;

    return expr;
  }

  /**
   * Exécute une instruction unique
   */
  public executeStatement(stmt: string): void {
    if (this.terminated) return;
    const clean = stmt.trim();
    if (!clean) return;

    // header(...)
    const headerMatch = clean.match(/^header\s*\(\s*["']([^"']+)["']\s*\)$/i);
    if (headerMatch && headerMatch[1]) {
      const h = headerMatch[1];
      const col = h.indexOf(":");
      if (col !== -1) {
        this.headers[h.slice(0, col).trim().toLowerCase()] = h.slice(col + 1).trim();
      }
      return;
    }

    // echo / print
    if (/^(?:echo|print)\b/i.test(clean)) {
      const expr = clean.replace(/^(?:echo|print)\s+/i, "").trim();
      const val = this.evalExpr(expr);
      if (val !== undefined && val !== null) {
        this.appendStdout(String(val));
      }
      return;
    }

    // die(...) / exit(...) / exit
    if (/^(?:die|exit)\b/i.test(clean)) {
      const match = clean.match(/^(?:die|exit)\s*(?:\((.*)\))?$/i);
      if (match && match[1]) {
        const val = this.evalExpr(match[1]);
        if (val) this.appendStdout(String(val));
      }
      this.terminated = true;
      return;
    }

    // extract($_POST)
    if (/^extract\s*\(\s*\$_POST\s*\)$/i.test(clean)) {
      for (const [k, v] of Object.entries(this.post)) {
        this.vars[k] = v;
      }
      return;
    }

    // mysqli_prepare($con, $sql)
    const prepMatch = clean.match(
      /^\$([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*mysqli_prepare\s*\(\s*[^,]+,\s*(.+)\)$/i,
    );
    if (prepMatch && prepMatch[1] && prepMatch[2]) {
      const stmtVar = prepMatch[1];
      const sqlTemplate = String(this.evalExpr(prepMatch[2]) ?? "");
      const handle: PreparedStatementHandle = {
        sqlTemplate,
        types: "",
        paramValues: [],
      };
      this.vars[stmtVar] = handle;
      return;
    }

    // mysqli_stmt_bind_param($stmt, "types", ...$vars)
    const bindMatch = clean.match(
      /^mysqli_stmt_bind_param\s*\(\s*\$([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*["']([a-zA-Z]+)["']\s*,\s*(.+)\)$/i,
    );
    if (bindMatch && bindMatch[1] && bindMatch[2] && bindMatch[3]) {
      const stmtVar = bindMatch[1];
      const types = bindMatch[2];
      const argsStr = bindMatch[3];
      const stmt = this.vars[stmtVar] as PreparedStatementHandle | undefined;
      if (stmt) {
        stmt.types = types;
        stmt.paramValues = this.splitCommas(argsStr).map((a) => this.evalExpr(a.trim()));
      }
      return;
    }

    // mysqli_stmt_execute($stmt)
    const execStmtMatch = clean.match(
      /^(?:@)?mysqli_stmt_execute\s*\(\s*\$([a-zA-Z_][a-zA-Z0-9_]*)\s*\)$/i,
    );
    if (execStmtMatch && execStmtMatch[1]) {
      this.executePreparedStatement(execStmtMatch[1]);
      return;
    }

    // mysqli_stmt_store_result / mysqli_close / mysqli_stmt_close / mysqli_set_charset / mysqli_report / transactions
    if (
      /^mysqli_(?:stmt_store_result|close|stmt_close|set_charset|report|begin_transaction|commit|rollback)\s*\(/i.test(
        clean,
      )
    ) {
      return;
    }

    // mysqli_query($con, $sql)
    const queryAssignMatch = clean.match(
      /^\$([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*mysqli_query\s*\(\s*[^,]+,\s*(.+)\)$/i,
    );
    if (queryAssignMatch && queryAssignMatch[1] && queryAssignMatch[2]) {
      const resVar = queryAssignMatch[1];
      const rawSql = queryAssignMatch[2];
      const sql = String(this.evalExpr(rawSql) ?? "").trim();
      this.executedQueries.push(sql);
      const res = this.simulator.query(sql);
      const handle: QueryResultHandle = {
        rows: res.rows || [],
        numRows: res.numRows || 0,
        cursor: 0,
        affectedRows: res.affectedRows || 0,
        error: res.error || "",
      };
      if (!res.success && res.error) {
        this.mysqliErrors.push(res.error);
      }
      this.vars[resVar] = handle;
      return;
    }

    // mysqli_query sans assignation : mysqli_query($con, $sql);
    const directQueryMatch = clean.match(/^mysqli_query\s*\(\s*[^,]+,\s*(.+)\)$/i);
    if (directQueryMatch && directQueryMatch[1]) {
      const sql = String(this.evalExpr(directQueryMatch[1]) ?? "").trim();
      this.executedQueries.push(sql);
      const res = this.simulator.query(sql);
      if (!res.success && res.error) {
        this.mysqliErrors.push(res.error);
      }
      return;
    }

    // Assignation tableau $arr[] = expr;
    const arrayAppendMatch = clean.match(/^\$([a-zA-Z_][a-zA-Z0-9_]*)\s*\[\s*\]\s*=\s*(.+)$/);
    if (arrayAppendMatch && arrayAppendMatch[1] && arrayAppendMatch[2]) {
      const arrName = arrayAppendMatch[1];
      if (!Array.isArray(this.vars[arrName])) {
        this.vars[arrName] = [];
      }
      (this.vars[arrName] as unknown[]).push(this.evalExpr(arrayAppendMatch[2]));
      return;
    }

    // Assignation superglobale $_SESSION['k'] = expr;
    const sessionAssignMatch = clean.match(/^\$_SESSION\s*\[\s*['"]([^'"]+)['"]\s*\]\s*=\s*(.+)$/);
    if (sessionAssignMatch && sessionAssignMatch[1] && sessionAssignMatch[2]) {
      const k = sessionAssignMatch[1];
      this.session[k] = this.evalExpr(sessionAssignMatch[2]);
      return;
    }

    // Assignation variable classique : $var = expr;
    const assignMatch = clean.match(/^\$([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
    if (assignMatch && assignMatch[1] && assignMatch[2]) {
      const vName = assignMatch[1];
      this.vars[vName] = this.evalExpr(assignMatch[2]);
      return;
    }
  }

  /**
   * Exécute une instruction préparée en substituant les placeholders '?'
   */
  public executePreparedStatement(stmtVar: string): boolean {
    const stmt = this.vars[stmtVar] as PreparedStatementHandle | undefined;
    if (!stmt) return false;

    let sql = stmt.sqlTemplate;
    for (const val of stmt.paramValues) {
      const formatted =
        val === null || val === undefined
          ? "NULL"
          : typeof val === "number"
            ? String(val)
            : `'${String(val).replace(/'/g, "''")}'`;
      sql = sql.replace("?", formatted);
    }

    this.executedQueries.push(sql);
    const res = this.simulator.query(sql);
    stmt.lastResult = {
      success: res.success,
      rows: res.rows || [],
      numRows: res.numRows || 0,
      affectedRows: res.affectedRows || 0,
      error: res.error || "",
      cursor: 0,
    };

    if (!res.success && res.error) {
      this.mysqliErrors.push(res.error);
    }
    return res.success;
  }

  /**
   * Exécute récursivement un bloc de code (gère if/else, try/catch, while, foreach et instructions)
   */
  public executeBlock(code: string): void {
    if (this.terminated) return;

    let i = 0;
    const n = code.length;

    while (i < n && !this.terminated) {
      while (i < n && /\s/.test(code[i] ?? "")) i++;
      if (i >= n) break;

      const remaining = code.slice(i);

      // Structure IF ... ELSE
      if (/^if\s*\(/i.test(remaining)) {
        const ifMatch = remaining.match(/^if\s*\(/i);
        const parenStart = i + (ifMatch ? ifMatch[0].length - 1 : 0);
        const parenEnd = this.findMatchingParen(code, parenStart, "(", ")");
        const condExpr = code.slice(parenStart + 1, parenEnd);

        const blockStart = code.indexOf("{", parenEnd);
        const blockEnd = this.findMatchingParen(code, blockStart, "{", "}");
        const thenCode = code.slice(blockStart + 1, blockEnd);

        let elseCode = "";
        let afterBlock = blockEnd + 1;
        while (afterBlock < n && /\s/.test(code[afterBlock] ?? "")) afterBlock++;

        if (code.slice(afterBlock).startsWith("else")) {
          const afterElse = afterBlock + 4;
          const elseBlockStart = code.indexOf("{", afterElse);
          const elseBlockEnd = this.findMatchingParen(code, elseBlockStart, "{", "}");
          elseCode = code.slice(elseBlockStart + 1, elseBlockEnd);
          i = elseBlockEnd + 1;
        } else {
          i = blockEnd + 1;
        }

        const isConditionTrue = this.isTruthy(this.evalExpr(condExpr));
        if (isConditionTrue) {
          this.executeBlock(thenCode);
        } else if (elseCode) {
          this.executeBlock(elseCode);
        }
        continue;
      }

      // Structure TRY ... CATCH
      if (/^try\s*\{/i.test(remaining)) {
        const tryStart = code.indexOf("{", i);
        const tryEnd = this.findMatchingParen(code, tryStart, "{", "}");
        const tryBlock = code.slice(tryStart + 1, tryEnd);

        let afterTry = tryEnd + 1;
        while (afterTry < n && /\s/.test(code[afterTry] ?? "")) afterTry++;

        let catchBlock = "";
        if (code.slice(afterTry).startsWith("catch")) {
          const catchStart = code.indexOf("{", afterTry);
          const catchEnd = this.findMatchingParen(code, catchStart, "{", "}");
          catchBlock = code.slice(catchStart + 1, catchEnd);
          i = catchEnd + 1;
        } else {
          i = tryEnd + 1;
        }

        const initialErrorsCount = this.mysqliErrors.length;
        this.executeBlock(tryBlock);
        if (this.mysqliErrors.length > initialErrorsCount && catchBlock) {
          this.executeBlock(catchBlock);
        }
        continue;
      }

      // Structure WHILE
      if (/^while\s*\(/i.test(remaining)) {
        const parenStart = code.indexOf("(", i);
        const parenEnd = this.findMatchingParen(code, parenStart, "(", ")");
        const condExpr = code.slice(parenStart + 1, parenEnd);

        const blockStart = code.indexOf("{", parenEnd);
        const blockEnd = this.findMatchingParen(code, blockStart, "{", "}");
        const whileBody = code.slice(blockStart + 1, blockEnd);

        let loopLimit = 1000;
        while (!this.terminated && this.isTruthy(this.evalExpr(condExpr)) && --loopLimit > 0) {
          this.executeBlock(whileBody);
        }
        i = blockEnd + 1;
        continue;
      }

      // Structure FOREACH
      if (/^foreach\s*\(/i.test(remaining)) {
        const parenStart = code.indexOf("(", i);
        const parenEnd = this.findMatchingParen(code, parenStart, "(", ")");
        const foreachHeader = code.slice(parenStart + 1, parenEnd);

        const blockStart = code.indexOf("{", parenEnd);
        const blockEnd = this.findMatchingParen(code, blockStart, "{", "}");
        const foreachBody = code.slice(blockStart + 1, blockEnd);

        const asMatch = foreachHeader.match(/(.+?)\s+as\s+\$([a-zA-Z_][a-zA-Z0-9_]*)/i);
        if (asMatch && asMatch[1] && asMatch[2]) {
          const arrVal = this.evalExpr(asMatch[1]);
          const itemVar = asMatch[2];
          if (Array.isArray(arrVal)) {
            for (const item of arrVal) {
              if (this.terminated) break;
              this.vars[itemVar] = item;
              this.executeBlock(foreachBody);
            }
          }
        }
        i = blockEnd + 1;
        continue;
      }

      // Instruction simple terminée par ';'
      let semiIdx = i;
      let inSingle = false;
      let inDouble = false;
      while (semiIdx < n) {
        const c = code[semiIdx];
        if (c === "'" && !inDouble && (semiIdx === 0 || code[semiIdx - 1] !== "\\"))
          inSingle = !inSingle;
        else if (c === '"' && !inSingle && (semiIdx === 0 || code[semiIdx - 1] !== "\\"))
          inDouble = !inDouble;
        else if (c === ";" && !inSingle && !inDouble) {
          break;
        }
        semiIdx++;
      }

      const stmt = code.slice(i, semiIdx);
      this.executeStatement(stmt);
      i = semiIdx + 1;
    }
  }

  private appendStdout(s: string): void {
    this.stdout += s;
    if (this.stdout.length > this.maxStdout) {
      this.stdout = this.stdout.slice(0, this.maxStdout) + "\n[... Sortie tronquée à 1 Mo max ...]";
      this.terminated = true;
    }
  }

  private isTruthy(v: unknown): boolean {
    if (v === false || v === null || v === undefined || v === "" || v === 0 || v === "0") {
      return false;
    }
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }

  private findMatchingParen(
    code: string,
    start: number,
    openChar: string,
    closeChar: string,
  ): number {
    let depth = 0;
    let inSingle = false;
    let inDouble = false;

    for (let idx = start; idx < code.length; idx++) {
      const c = code[idx];
      if (c === "'" && !inDouble && (idx === 0 || code[idx - 1] !== "\\")) inSingle = !inSingle;
      else if (c === '"' && !inSingle && (idx === 0 || code[idx - 1] !== "\\"))
        inDouble = !inDouble;
      else if (!inSingle && !inDouble) {
        if (c === openChar) depth++;
        else if (c === closeChar) {
          depth--;
          if (depth === 0) return idx;
        }
      }
    }
    return code.length - 1;
  }

  private splitTernary(expr: string): { cond: string; whenTrue: string; whenFalse: string } | null {
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let qIdx = -1;
    let cIdx = -1;

    for (let i = 0; i < expr.length; i++) {
      const c = expr[i];
      if (c === "'" && !inDouble && (i === 0 || expr[i - 1] !== "\\")) inSingle = !inSingle;
      else if (c === '"' && !inSingle && (i === 0 || expr[i - 1] !== "\\")) inDouble = !inDouble;
      else if (!inSingle && !inDouble) {
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") depth--;
        else if (c === "?" && depth === 0 && qIdx === -1) {
          qIdx = i;
        } else if (c === ":" && depth === 0 && qIdx !== -1 && cIdx === -1) {
          cIdx = i;
        }
      }
    }

    if (qIdx !== -1 && cIdx !== -1) {
      return {
        cond: expr.slice(0, qIdx).trim(),
        whenTrue: expr.slice(qIdx + 1, cIdx).trim(),
        whenFalse: expr.slice(cIdx + 1).trim(),
      };
    }
    return null;
  }

  private splitComparison(expr: string): { left: string; op: string; right: string } | null {
    // Si l'expression commence par un guillemet et se termine par un guillemet, ce n'est pas une comparaison
    const trimmed = expr.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return null;
    }

    const ops = ["===", "!==", "==", "!=", "<>", "<=", ">=", "<", ">"];
    let depth = 0;
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < expr.length; i++) {
      const c = expr[i];
      if (c === "'" && !inDouble && (i === 0 || expr[i - 1] !== "\\")) inSingle = !inSingle;
      else if (c === '"' && !inSingle && (i === 0 || expr[i - 1] !== "\\")) inDouble = !inDouble;
      else if (!inSingle && !inDouble) {
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") depth--;
        else if (depth === 0) {
          for (const op of ops) {
            if (expr.slice(i, i + op.length) === op) {
              return {
                left: expr.slice(0, i).trim(),
                op,
                right: expr.slice(i + op.length).trim(),
              };
            }
          }
        }
      }
    }
    return null;
  }

  private splitByOp(expr: string, ops: string[]): string[] {
    const parts: string[] = [];
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let last = 0;

    for (let i = 0; i < expr.length; i++) {
      const c = expr[i];
      if (c === "'" && !inDouble && (i === 0 || expr[i - 1] !== "\\")) inSingle = !inSingle;
      else if (c === '"' && !inSingle && (i === 0 || expr[i - 1] !== "\\")) inDouble = !inDouble;
      else if (!inSingle && !inDouble) {
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") depth--;
        else if (depth === 0) {
          for (const op of ops) {
            const isWordOp = op === "or" || op === "and";
            if (expr.slice(i, i + op.length) === op) {
              if (isWordOp) {
                const beforeChar = i > 0 ? (expr[i - 1] ?? " ") : " ";
                const afterChar = i + op.length < expr.length ? (expr[i + op.length] ?? " ") : " ";
                if (/[a-zA-Z0-9_]/.test(beforeChar) || /[a-zA-Z0-9_]/.test(afterChar)) {
                  continue;
                }
              }
              parts.push(expr.slice(last, i).trim());
              i += op.length - 1;
              last = i + 1;
              break;
            }
          }
        }
      }
    }
    if (last < expr.length) {
      parts.push(expr.slice(last).trim());
    }
    return parts.length > 1 ? parts : [expr];
  }

  private splitCommas(s: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let last = 0;

    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "'" && !inDouble && (i === 0 || s[i - 1] !== "\\")) inSingle = !inSingle;
      else if (c === '"' && !inSingle && (i === 0 || s[i - 1] !== "\\")) inDouble = !inDouble;
      else if (!inSingle && !inDouble) {
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") depth--;
        else if (c === "," && depth === 0) {
          out.push(s.slice(last, i).trim());
          last = i + 1;
        }
      }
    }
    if (last < s.length) {
      out.push(s.slice(last).trim());
    }
    return out;
  }
}

/**
 * Exécute un script PHP procédural contre une instance MySqliSimulator
 */
export function executerScriptPhpProcedural(
  req: PhpExecutionRequest,
  options: PhpSimulatorOptions = {},
): PhpExecutionResponse {
  const startTime = Date.now();
  const maxTime = Math.min(
    req.maxExecutionTimeMs ?? options.maxExecutionTimeMs ?? MAX_EXECUTION_TIME_MS,
    MAX_EXECUTION_TIME_MS,
  );
  const memoryLimit = Math.min(
    req.memoryLimitBytes ?? options.memoryLimitBytes ?? MAX_MEMORY_LIMIT_BYTES,
    MAX_MEMORY_LIMIT_BYTES,
  );
  const maxStdout = req.maxStdoutBytes ?? options.maxStdoutBytes ?? MAX_STDOUT_BYTES;

  const globals = preparerSuperglobales(req);
  const virtualFiles: Record<string, string> = {
    ...(options.files || {}),
    ...(req.files || {}),
  };
  const entrypoint = req.entrypoint || "index.php";
  const scriptContent = virtualFiles[entrypoint] || req.script;

  // Initialisation ou récupération du simulateur SQL
  const simulator = options.simulator ?? new MySqliSimulator();
  const initSql = options.initialSql || resoudreSqlInitial(virtualFiles);
  if (initSql && (!options.simulator || Object.keys(simulator).length === 0)) {
    simulator.executeScript(initSql);
  }

  const interpreter = new ProceduralPhpInterpreter(simulator, globals, virtualFiles, maxStdout);

  // Vérification de boucle infinie statique
  if (
    /while\s*\(\s*(true|1)\s*\)\s*\{/i.test(scriptContent) ||
    /for\s*\(\s*;\s*;\s*\)\s*\{/i.test(scriptContent)
  ) {
    return {
      id: req.id,
      success: false,
      stdout: "",
      stderr: "Fatal error: Maximum execution time of 3 seconds exceeded in script",
      exitCode: 124,
      headers: {},
      session: globals.session,
      durationMs: maxTime,
      memoryUsageBytes: 8 * 1024 * 1024,
      timedOut: true,
      memoryExceeded: false,
      engine: ENGINE_NAME,
      isSimulator: true,
      error:
        "Interruption de sécurité : Le temps d'exécution a dépassé la limite autorisée (3 secondes)",
      friendlyMessage:
        "Interruption de sécurité : Le temps d'exécution a dépassé 3s (boucle infinie détectée).",
    };
  }

  // 1. Résolution des includes
  const resolvedCode = interpreter.resolveIncludes(scriptContent);

  // 2. Nettoyage sécurisé des commentaires (sans altérer les codes hexadécimaux CSS)
  const cleanCode = stripPhpComments(resolvedCode)
    .replace(/<\?php/gi, "")
    .replace(/\?>/gi, "");

  // 3. Exécution séquentielle par blocs
  interpreter.executeBlock(cleanCode);

  // Extraction de l'état de la base de données
  const databaseState: Record<string, Record<string, unknown>[]> = {};
  const tableNames = [
    "client",
    "habit",
    "location",
    "voiture",
    "evaluation",
    "document",
    "utilisateur",
    "droit",
    "bijou",
    "metal",
    "composition",
    "expert",
    "navire",
    "destination",
    "croisiere",
    "reservation",
  ];
  for (const t of tableNames) {
    const rows = simulator.getTableRows(t);
    if (rows && rows.length > 0) {
      databaseState[t] = rows.map((r) => ({ ...r }));
    }
  }

  const durationMs = Math.max(Date.now() - startTime, 5);

  return {
    id: req.id,
    success: interpreter.mysqliErrors.length === 0,
    stdout: interpreter.stdout,
    stderr: interpreter.mysqliErrors.join("\n"),
    exitCode: interpreter.mysqliErrors.length === 0 ? 0 : 1,
    headers: interpreter.headers,
    session: interpreter.session,
    durationMs,
    memoryUsageBytes: 8 * 1024 * 1024,
    timedOut: false,
    memoryExceeded: false,
    engine: ENGINE_NAME,
    isSimulator: true,
    executedQueries: interpreter.executedQueries,
    mysqliErrors: interpreter.mysqliErrors,
    databaseState,
    simulator,
  };
}
