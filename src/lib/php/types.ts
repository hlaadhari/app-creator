/**
 * Labo STI - Définition des types pour le runtime PHP WASM et Web Worker (PRD F-22 à F-24, T-10, §8.1)
 */

export interface PhpSuperglobals {
  get?: Record<string, string>;
  post?: Record<string, string>;
  cookies?: Record<string, string>;
  server?: Record<string, string>;
  session?: Record<string, unknown>;
}

export interface PhpExecutionRequest {
  id: string;
  script: string;
  files?: Record<string, string> | undefined;
  entrypoint?: string | undefined;
  method?: "GET" | "POST" | undefined;
  url?: string | undefined;
  get?: Record<string, string> | undefined;
  post?: Record<string, string> | undefined;
  cookies?: Record<string, string> | undefined;
  server?: Record<string, string> | undefined;
  session?: Record<string, unknown> | undefined;
  sqliteBuffer?: Uint8Array | null | undefined;
  initialSql?: string | undefined;
  simulator?: unknown | undefined;
  maxExecutionTimeMs?: number | undefined;
  memoryLimitBytes?: number | undefined;
  maxStdoutBytes?: number | undefined;
}

export interface PhpExecutionResponse {
  id: string;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  headers: Record<string, string>;
  session: Record<string, unknown>;
  durationMs: number;
  memoryUsageBytes: number;
  timedOut: boolean;
  memoryExceeded: boolean;
  error?: string | undefined;
  friendlyMessage?: string | undefined;
  engine?: string | undefined;
  isSimulator?: boolean | undefined;
  executedQueries?: string[] | undefined;
  mysqliErrors?: string[] | undefined;
  databaseState?: Record<string, Record<string, unknown>[]> | undefined;
  simulator?: unknown | undefined;
}

export type PhpWorkerIncomingMessage =
  | { type: "INIT"; phpVersion?: string }
  | { type: "EXECUTE"; payload: PhpExecutionRequest }
  | { type: "PING" }
  | { type: "RESET" };

export type PhpWorkerOutgoingMessage =
  | { type: "READY"; phpVersion: string; extensions: string[] }
  | { type: "EXECUTION_RESULT"; payload: PhpExecutionResponse }
  | { type: "PONG" }
  | { type: "ERROR"; error: string };

export interface PhpRunnerOptions {
  workerFactory?: () => Worker;
  defaultTimeoutMs?: number;
  memoryLimitBytes?: number;
  maxStdoutBytes?: number;
}
