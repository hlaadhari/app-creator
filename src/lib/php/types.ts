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
  files?: Record<string, string>;
  entrypoint?: string;
  method?: "GET" | "POST";
  url?: string;
  get?: Record<string, string>;
  post?: Record<string, string>;
  cookies?: Record<string, string>;
  server?: Record<string, string>;
  session?: Record<string, unknown>;
  sqliteBuffer?: Uint8Array | null;
  maxExecutionTimeMs?: number;
  memoryLimitBytes?: number;
  maxStdoutBytes?: number;
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
  error?: string;
  friendlyMessage?: string;
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
