/**
 * Labo STI - Types du moteur SQL, du visualiseur et du contrôleur de dialecte (PRD F-25 à F-31, §8.2)
 */

export interface SqlColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: boolean;
  defaultValue?: string | null;
}

export interface SqlTableInfo {
  name: string;
  columns: SqlColumnInfo[];
  rowCount: number;
}

export type DialectSeverity = "avertissement" | "info" | "incompatibilite";

export interface SqlDialectWarning {
  code: string;
  titre: string;
  message: string;
  suggestion: string;
  severite: DialectSeverity;
  position?: { line: number; column: number };
}

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowsAffected: number;
  durationMs: number;
  error?: string;
  dialectWarnings: SqlDialectWarning[];
}

export interface SqlEngineConfig {
  initialSql?: string;
  enableDialectController?: boolean;
}
