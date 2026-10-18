/**
 * Labo STI - Gestionnaire et orchestrateur d'exécution PHP WASM (PRD §8.1, F-22 à F-24, T-10)
 *
 * Gère le cycle de vie du Web Worker isolé, applique le watchdog strict de 3 secondes,
 * limite la mémoire à 64 Mo, tronque les sorties stdout à 1 Mo et fournit des messages
 * d'erreurs pédagogiques bienveillants (T-10).
 */

import {
  executerScriptPhpCore,
  MAX_EXECUTION_TIME_MS,
  MAX_MEMORY_LIMIT_BYTES,
  MAX_STDOUT_BYTES,
  SUPPORTED_PHP_EXTENSIONS,
} from "./php-worker-core";
import type {
  PhpExecutionRequest,
  PhpExecutionResponse,
  PhpRunnerOptions,
  PhpWorkerIncomingMessage,
  PhpWorkerOutgoingMessage,
} from "./types";

export interface ExecutionOptions {
  timeoutMs?: number;
  memoryLimitBytes?: number;
  maxStdoutBytes?: number;
  maintainSession?: boolean;
}

export class PhpRunner {
  private worker: Worker | null = null;
  private workerReady = false;
  private currentSession: Record<string, unknown> = {};
  private virtualFiles: Record<string, string> = {};
  private readonly defaultTimeoutMs: number;
  private readonly memoryLimitBytes: number;
  private readonly maxStdoutBytes: number;
  private readonly customWorkerFactory?: (() => Worker) | undefined;

  constructor(options: PhpRunnerOptions = {}) {
    this.defaultTimeoutMs = Math.min(
      options.defaultTimeoutMs ?? MAX_EXECUTION_TIME_MS,
      MAX_EXECUTION_TIME_MS,
    );
    this.memoryLimitBytes = Math.min(
      options.memoryLimitBytes ?? MAX_MEMORY_LIMIT_BYTES,
      MAX_MEMORY_LIMIT_BYTES,
    );
    this.maxStdoutBytes = options.maxStdoutBytes ?? MAX_STDOUT_BYTES;
    this.customWorkerFactory = options.workerFactory;
  }

  /**
   * Initialise ou réinitialise le Web Worker isolé
   */
  public async init(): Promise<{ phpVersion: string; extensions: string[] }> {
    this.terminate();

    // Vérifier si l'environnement supporte les Web Workers (navigateur)
    const hasWorker =
      typeof this.customWorkerFactory === "function" ||
      (typeof window !== "undefined" && typeof Worker !== "undefined");

    if (hasWorker) {
      try {
        if (this.customWorkerFactory) {
          this.worker = this.customWorkerFactory();
        } else {
          // Création worker via URL Vite
          this.worker = new Worker(new URL("../../workers/php-worker.ts", import.meta.url), {
            type: "module",
          });
        }

        const initPromise = new Promise<{ phpVersion: string; extensions: string[] }>(
          (resolve, reject) => {
            if (!this.worker) {
              reject(new Error("Worker non instancié"));
              return;
            }

            const handler = (evt: MessageEvent<PhpWorkerOutgoingMessage>) => {
              if (evt.data.type === "READY") {
                this.workerReady = true;
                this.worker?.removeEventListener("message", handler);
                resolve({
                  phpVersion: evt.data.phpVersion,
                  extensions: evt.data.extensions,
                });
              } else if (evt.data.type === "ERROR") {
                this.worker?.removeEventListener("message", handler);
                reject(new Error(evt.data.error));
              }
            };

            this.worker.addEventListener("message", handler);
            const initMsg: PhpWorkerIncomingMessage = { type: "INIT" };
            this.worker.postMessage(initMsg);
          },
        );

        return await initPromise;
      } catch {
        // En cas d'échec de chargement Web Worker (ex: environnement headless), fallback isomorphic
        this.workerReady = true;
        return {
          phpVersion: "8.2.14",
          extensions: SUPPORTED_PHP_EXTENSIONS,
        };
      }
    }

    // Environnement Node/Vitest ou headless sans Worker
    this.workerReady = true;
    return {
      phpVersion: "8.2.14",
      extensions: SUPPORTED_PHP_EXTENSIONS,
    };
  }

  /**
   * Définit les fichiers virtuels du projet (ex: config.php, functions.php)
   */
  public setVirtualFiles(files: Record<string, string>): void {
    this.virtualFiles = { ...files };
  }

  /**
   * Obtient l'état courant de la session PHP
   */
  public getSession(): Record<string, unknown> {
    return { ...this.currentSession };
  }

  /**
   * Définit manuellement l'état de la session PHP
   */
  public setSession(session: Record<string, unknown>): void {
    this.currentSession = { ...session };
  }

  /**
   * Réinitialise la session et les fichiers virtuels
   */
  public reset(): void {
    this.currentSession = {};
    this.virtualFiles = {};
  }

  /**
   * Exécute un code PHP ou une requête HTTP simulée avec Watchdog 3s et limites de ressources
   */
  public async execute(
    scriptOrRequest: string | Partial<PhpExecutionRequest>,
    options: ExecutionOptions = {},
  ): Promise<PhpExecutionResponse> {
    if (!this.workerReady) {
      await this.init();
    }

    const timeoutMs = Math.min(options.timeoutMs ?? this.defaultTimeoutMs, MAX_EXECUTION_TIME_MS);
    const memoryLimit = Math.min(
      options.memoryLimitBytes ?? this.memoryLimitBytes,
      MAX_MEMORY_LIMIT_BYTES,
    );
    const maxStdout = options.maxStdoutBytes ?? this.maxStdoutBytes;

    const req: PhpExecutionRequest =
      typeof scriptOrRequest === "string"
        ? {
            id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            script: scriptOrRequest,
            files: { ...this.virtualFiles },
            entrypoint: "index.php",
            session: { ...this.currentSession },
            maxExecutionTimeMs: timeoutMs,
            memoryLimitBytes: memoryLimit,
            maxStdoutBytes: maxStdout,
          }
        : {
            id: scriptOrRequest.id || `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            script: scriptOrRequest.script || "",
            files: { ...this.virtualFiles, ...(scriptOrRequest.files || {}) },
            entrypoint: scriptOrRequest.entrypoint || "index.php",
            method: scriptOrRequest.method || "GET",
            url: scriptOrRequest.url || "/index.php",
            get: scriptOrRequest.get || {},
            post: scriptOrRequest.post || {},
            cookies: scriptOrRequest.cookies || {},
            server: scriptOrRequest.server || {},
            session: scriptOrRequest.session ?? { ...this.currentSession },
            maxExecutionTimeMs: timeoutMs,
            memoryLimitBytes: memoryLimit,
            maxStdoutBytes: maxStdout,
          };

    // Exécution avec Web Worker dédié si actif
    if (this.worker) {
      return this.executeWithRealWorker(req, timeoutMs, options.maintainSession ?? true);
    }

    // Exécution isomorphique (Node / headless / Vitest) avec Watchdog émulé
    return this.executeIsomorphic(req, timeoutMs, options.maintainSession ?? true);
  }

  /**
   * Exécution au travers du véritable Web Worker avec Watchdog réel (worker.terminate())
   */
  private async executeWithRealWorker(
    req: PhpExecutionRequest,
    timeoutMs: number,
    maintainSession: boolean,
  ): Promise<PhpExecutionResponse> {
    const startTime = Date.now();

    return new Promise<PhpExecutionResponse>((resolve) => {
      let resolved = false;

      // Déclencheur du Watchdog 3s (T-10)
      const timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;

        // Tuer immédiatement le Worker qui freeze (ex: while(true))
        this.terminate();

        const duration = Date.now() - startTime;
        const timeoutResponse: PhpExecutionResponse = {
          id: req.id,
          success: false,
          stdout: "",
          stderr: `Fatal error: Maximum execution time of ${Math.round(timeoutMs / 1000)} seconds exceeded in script`,
          exitCode: 124,
          headers: {},
          session: req.session || {},
          durationMs: duration,
          memoryUsageBytes: this.memoryLimitBytes,
          timedOut: true,
          memoryExceeded: false,
          error: `Interruption de sécurité : Le temps d'exécution a dépassé la limite autorisée (${timeoutMs / 1000} secondes)`,
          friendlyMessage:
            "Interruption de sécurité : Le temps d'exécution a dépassé la limite autorisée (3 secondes). Vérifiez la présence éventuelle d'une boucle infinie (while, for sans incrémentation) dans votre script PHP.",
        };

        // Réinitialiser un nouveau Worker propre en arrière-plan
        this.init().catch(() => {});

        resolve(timeoutResponse);
      }, timeoutMs);

      const messageHandler = (evt: MessageEvent<PhpWorkerOutgoingMessage>) => {
        if (resolved) return;

        if (evt.data.type === "EXECUTION_RESULT" && evt.data.payload.id === req.id) {
          resolved = true;
          clearTimeout(timer);
          this.worker?.removeEventListener("message", messageHandler);

          const result = evt.data.payload;
          if (maintainSession && result.session) {
            this.currentSession = { ...result.session };
          }
          resolve(result);
        } else if (evt.data.type === "ERROR") {
          resolved = true;
          clearTimeout(timer);
          this.worker?.removeEventListener("message", messageHandler);

          resolve({
            id: req.id,
            success: false,
            stdout: "",
            stderr: evt.data.error,
            exitCode: 1,
            headers: {},
            session: req.session || {},
            durationMs: Date.now() - startTime,
            memoryUsageBytes: 0,
            timedOut: false,
            memoryExceeded: false,
            error: evt.data.error,
          });
        }
      };

      this.worker?.addEventListener("message", messageHandler);
      const executeMsg: PhpWorkerIncomingMessage = {
        type: "EXECUTE",
        payload: req,
      };
      this.worker?.postMessage(executeMsg);
    });
  }

  /**
   * Exécution isomorphique (Node / headless)
   */
  private async executeIsomorphic(
    req: PhpExecutionRequest,
    timeoutMs: number,
    maintainSession: boolean,
  ): Promise<PhpExecutionResponse> {
    const startTime = Date.now();

    // Watchdog Promise
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<PhpExecutionResponse>((resolve) => {
      timeoutHandle = setTimeout(() => {
        const duration = Date.now() - startTime;
        resolve({
          id: req.id,
          success: false,
          stdout: "",
          stderr: `Fatal error: Maximum execution time of ${Math.round(timeoutMs / 1000)} seconds exceeded`,
          exitCode: 124,
          headers: {},
          session: req.session || {},
          durationMs: duration,
          memoryUsageBytes: this.memoryLimitBytes,
          timedOut: true,
          memoryExceeded: false,
          error: `Interruption de sécurité : Le temps d'exécution a dépassé la limite autorisée (${timeoutMs / 1000} secondes)`,
          friendlyMessage:
            "Interruption de sécurité : Le temps d'exécution a dépassé la limite autorisée (3 secondes). Vérifiez la présence éventuelle d'une boucle infinie (while, for sans incrémentation) dans votre script PHP.",
        });
      }, timeoutMs);
    });

    const executionPromise = (async () => {
      const res = await executerScriptPhpCore(req, {
        maxExecutionTimeMs: timeoutMs,
        memoryLimitBytes: req.memoryLimitBytes ?? this.memoryLimitBytes,
        maxStdoutBytes: req.maxStdoutBytes ?? this.maxStdoutBytes,
      });
      return res;
    })();

    const result = await Promise.race([executionPromise, timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);

    if (maintainSession && result.session) {
      this.currentSession = { ...result.session };
    }

    return result;
  }

  /**
   * Arrête immédiatement le Web Worker s'il est en cours
   */
  public terminate(): void {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // Ignorer les erreurs de terminaison
      }
      this.worker = null;
    }
    this.workerReady = false;
  }
}

/**
 * Instance singleton par défaut pour usage direct dans l'application
 */
let defaultRunnerInstance: PhpRunner | null = null;

export function getPhpRunner(): PhpRunner {
  if (!defaultRunnerInstance) {
    defaultRunnerInstance = new PhpRunner();
  }
  return defaultRunnerInstance;
}
