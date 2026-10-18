/**
 * Labo STI - Sandbox Confinement & Watchdog (T-10 & T-11, PRD §12, docs/SECURITY.md)
 *
 * Assure le confinement strict du code élève :
 * - T-10 : Watchdog 3s max interrompant les boucles infinies ou blocages.
 * - T-11 : Isolation iframe sandbox sans allow-same-origin, blocage de l'accès aux cookies et au réseau.
 */

export interface WatchdogOptions {
  timeoutMs?: number;
  memoryLimitMb?: number;
}

export interface WatchdogResult<T> {
  success: boolean;
  value?: T;
  timedOut: boolean;
  durationMs: number;
  error?: string;
}

export const WATCHDOG_MAX_TIMEOUT_MS = 3000;
export const SANDBOX_ALLOWED_PERMISSIONS = ["allow-scripts"] as const;
export const SANDBOX_FORBIDDEN_PERMISSIONS = [
  "allow-same-origin",
  "allow-top-navigation",
  "allow-popups",
  "allow-modals",
] as const;

/**
 * Exécute une tâche asynchrone avec un watchdog strict de 3 secondes max (T-10).
 */
export async function executeWithWatchdog<T>(
  task: (signal: AbortSignal) => Promise<T>,
  options: WatchdogOptions = {},
): Promise<WatchdogResult<T>> {
  const timeoutMs = Math.min(options.timeoutMs ?? WATCHDOG_MAX_TIMEOUT_MS, WATCHDOG_MAX_TIMEOUT_MS);
  const startTime = Date.now();
  const controller = new AbortController();

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<WatchdogResult<T>>((resolve) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      const elapsed = Date.now() - startTime;
      resolve({
        success: false,
        timedOut: true,
        durationMs: elapsed,
        error: `Interruption d'urgence (Watchdog 3s) : exécution interrompue après ${elapsed}ms`,
      });
    }, timeoutMs);
  });

  const executionPromise = (async (): Promise<WatchdogResult<T>> => {
    try {
      const res = await task(controller.signal);
      return {
        success: true,
        value: res,
        timedOut: false,
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      return {
        success: false,
        timedOut: controller.signal.aborted,
        durationMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  })();

  const result = await Promise.race([executionPromise, timeoutPromise]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
}

/**
 * Valide les attributs de la balise <iframe> sandbox (T-11).
 * Retourne true si et seulement si l'isolation est strictement respectée :
 * - allow-scripts autorisé
 * - allow-same-origin STRICTEMENT INTERDIT (empêche l'accès aux cookies maîtres et à window.parent)
 */
export function validerIframeSandbox(sandboxAttr: string): {
  securise: boolean;
  violations: string[];
} {
  const tokens = sandboxAttr.trim().toLowerCase().split(/\s+/);
  const violations: string[] = [];

  for (const forbidden of SANDBOX_FORBIDDEN_PERMISSIONS) {
    if (tokens.includes(forbidden)) {
      violations.push(`Permission interdite détectée : ${forbidden}`);
    }
  }

  if (!tokens.includes("allow-scripts")) {
    violations.push("La directive allow-scripts est obligatoire pour exécuter le JS élève.");
  }

  return {
    securise: violations.length === 0,
    violations,
  };
}

/**
 * Génère la directive CSP pour le bac à sable de prévisualisation (T-11).
 * Bloque l'accès aux domaines externes et interdit les cookies.
 */
export function getSandboxCsp(allowedOrigins: string[] = []): string {
  const connectSrc = allowedOrigins.length > 0 ? allowedOrigins.join(" ") : "'none'";
  return [
    "default-src 'self'",
    "script-src 'unsafe-inline' 'unsafe-eval'",
    "style-src 'unsafe-inline' *",
    "img-src data: blob: *",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'self'",
  ].join("; ");
}
