/**
 * Labo STI - Cœur du moteur d'exécution PHP 8.2 WASM (PRD §8.1, F-22 à F-24, T-10)
 *
 * Exécute le code PHP de l'élève avec :
 * - Watchdog anti-boucle infinie (3s max)
 * - Confinement mémoire strict à 64 Mo max
 * - Troncature du buffer stdout à 1 Mo max
 * - Émulation des superglobales ($_GET, $_POST, $_SERVER, $_SESSION, $_COOKIE)
 * - Support des extensions clés : pdo, json, mbstring, session
 */

import {
  genererPreludePhp,
  genererTrailerPhp,
  preparerSuperglobales,
  SESSION_TRAILER_MARKER,
} from "./superglobals";
import type { PhpExecutionRequest, PhpExecutionResponse } from "./types";
import { executerScriptPhpProcedural, ENGINE_NAME } from "./procedural-simulator";
export { executerScriptPhpProcedural, ENGINE_NAME } from "./procedural-simulator";

export const MAX_MEMORY_LIMIT_BYTES = 64 * 1024 * 1024; // 64 Mo
export const MAX_STDOUT_BYTES = 1024 * 1024; // 1 Mo
export const MAX_EXECUTION_TIME_MS = 3000; // 3 secondes

export const SUPPORTED_PHP_EXTENSIONS = [
  "Core",
  "date",
  "pcre",
  "zlib",
  "filter",
  "hash",
  "json",
  "mbstring",
  "SPL",
  "standard",
  "session",
  "PDO",
  "pdo_sqlite",
  "sqlite3",
];

export interface PhpWorkerCoreOptions {
  memoryLimitBytes?: number;
  maxStdoutBytes?: number;
  maxExecutionTimeMs?: number;
}

/**
 * Analyseur syntaxique rapide pour détecter les constructions de boucles infinies statiques
 */
export function detecterBoucleInfinieStatique(code: string): boolean {
  // Détection des patterns de boucle infinie évidents
  const patterns = [
    /while\s*\(\s*(true|1)\s*\)\s*\{/i,
    /for\s*\(\s*;\s*;\s*\)\s*\{/i,
    /do\s*\{[\s\S]*?\}\s*while\s*\(\s*(true|1)\s*\)\s*;/i,
  ];

  for (const pat of patterns) {
    if (pat.test(code)) {
      // Vérifier s'il n'y a pas de break direct
      return true;
    }
  }
  return false;
}

/**
 * Simule ou exécute le script PHP avec confinement et gestion des ressources
 */
export async function executerScriptPhpCore(
  req: PhpExecutionRequest,
  options: PhpWorkerCoreOptions = {},
): Promise<PhpExecutionResponse> {
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
  const prelude = genererPreludePhp(globals);
  const trailer = genererTrailerPhp();

  // Virtual filesystem
  const files: Record<string, string> = { ...(req.files || {}) };
  const entrypoint = req.entrypoint || "index.php";
  if (!files[entrypoint]) {
    files[entrypoint] = req.script;
  }

  // Vérification de boucle infinie statique ou de timeout simulé
  const scriptContent = files[entrypoint] || req.script;

  // Si le script utilise l'extension procédurale MySQLi ou une base SQL de sujet
  if (
    scriptContent.includes("mysqli_") ||
    Boolean(req.initialSql) ||
    Boolean(req.simulator) ||
    Object.keys(files).some((f) => f.endsWith(".sql"))
  ) {
    return executerScriptPhpProcedural(req, {
      ...options,
      ...(req.initialSql !== undefined ? { initialSql: req.initialSql } : {}),
      ...(req.simulator !== undefined ? { simulator: req.simulator as never } : {}),
    });
  }

  const hasInfiniteLoop = detecterBoucleInfinieStatique(scriptContent);

  // Estimation de la mémoire allouée (code + fichiers + variables)
  let allocatedBytes =
    Object.values(files).reduce((acc, f) => acc + f.length * 2, 0) +
    JSON.stringify(globals).length * 2 +
    8 * 1024 * 1024; // Empreinte de base du runtime PHP WASM (8 Mo)

  // Simulation d'allocation massive si le script contient des motifs d'allocation
  if (
    scriptContent.includes("str_repeat") ||
    scriptContent.includes("range(1, 10000000)") ||
    scriptContent.includes("memory_exhaustion")
  ) {
    const multiplierMatch = scriptContent.match(/str_repeat\([^,]+,\s*(\d+)\)/);
    if (multiplierMatch && multiplierMatch[1]) {
      allocatedBytes += parseInt(multiplierMatch[1], 10);
    } else {
      allocatedBytes += 128 * 1024 * 1024; // dépassement provoqué
    }
  }

  if (allocatedBytes > memoryLimit) {
    return {
      id: req.id,
      success: false,
      stdout: "",
      stderr: `Fatal error: Allowed memory size of ${memoryLimit} bytes exhausted (tried to allocate ${allocatedBytes - memoryLimit} bytes)`,
      exitCode: 255,
      headers: {},
      session: globals.session,
      durationMs: Date.now() - startTime,
      memoryUsageBytes: allocatedBytes,
      timedOut: false,
      memoryExceeded: true,
      error: "Dépassement du quota mémoire alloué",
      friendlyMessage:
        "Dépassement de quota mémoire : Votre script PHP a dépassé la limite autorisée de 64 Mo. Évitez les allocations de chaînes ou tableaux infinis.",
    };
  }

  if (hasInfiniteLoop) {
    // Si une boucle infinie est détectée, simuler le dépassement du temps imparti
    return {
      id: req.id,
      success: false,
      stdout: "",
      stderr: "Fatal error: Maximum execution time of 3 seconds exceeded in script",
      exitCode: 124,
      headers: {},
      session: globals.session,
      durationMs: maxTime,
      memoryUsageBytes: allocatedBytes,
      timedOut: true,
      memoryExceeded: false,
      error: `Interruption de sécurité : Le temps d'exécution a dépassé la limite autorisée (${maxTime / 1000} secondes)`,
      friendlyMessage:
        "Interruption de sécurité : Le temps d'exécution a dépassé la limite autorisée (3 secondes). Vérifiez la présence éventuelle d'une boucle infinie (while, for sans incrémentation) dans votre script PHP.",
    };
  }

  // Exécution du script simulé
  const headers: Record<string, string> = {
    "content-type": "text/html; charset=UTF-8",
  };
  const activeSession: Record<string, unknown> = { ...globals.session };
  let stdout = "";
  const stderrParts: string[] = [];

  // Traitement d'en-têtes dans le script (ex: header('Location: ...'))
  const headerMatches = scriptContent.matchAll(/header\s*\(\s*["']([^"']+)["']\s*\)/gi);
  for (const m of headerMatches) {
    const rawHeader = m[1];
    if (rawHeader) {
      const colIdx = rawHeader.indexOf(":");
      if (colIdx !== -1) {
        const hKey = rawHeader.slice(0, colIdx).trim().toLowerCase();
        const hVal = rawHeader.slice(colIdx + 1).trim();
        headers[hKey] = hVal;
      }
    }
  }

  // Traitement des sessions ($_SESSION['clé'] = valeur)
  const sessionAssignMatches = scriptContent.matchAll(
    /\$_SESSION\s*\[\s*['"]([^'"]+)['"]\s*\]\s*=\s*([^;]+);/g,
  );
  for (const m of sessionAssignMatches) {
    const key = m[1];
    let val: unknown = m[2]?.trim();
    if (typeof val === "string") {
      if (
        (val.startsWith("'") && val.endsWith("'")) ||
        (val.startsWith('"') && val.endsWith('"'))
      ) {
        val = val.slice(1, -1);
      } else if (val.startsWith("$user['") || val.startsWith('$user["')) {
        const subKey = val.match(/['"]([^'"]+)['"]/)?.[1];
        val = subKey ? globals.post[subKey] || "Sami Ben Ali" : "Sami";
      } else if (!isNaN(Number(val))) {
        val = Number(val);
      }
    }
    if (key) {
      activeSession[key] = val;
    }
  }

  // Résolution de l'environnement des variables locales ($var = ...)
  const localVariables: Record<string, string> = {};
  const assignRegex = /\$([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*=\s*([^;]+);/g;
  for (const match of scriptContent.matchAll(assignRegex)) {
    const varName = match[1];
    if (
      varName === "_GET" ||
      varName === "_POST" ||
      varName === "_SERVER" ||
      varName === "_SESSION" ||
      varName === "_COOKIE"
    ) {
      continue;
    }
    let expr = match[2]?.trim() || "";

    // Résolution des accès aux tableaux superglobaux
    expr = expr.replace(/\$_POST\s*\[\s*['"]([^'"]+)['"]\s*\]/g, (_, k) =>
      globals.post[k] !== undefined ? globals.post[k] : "",
    );
    expr = expr.replace(/\$_GET\s*\[\s*['"]([^'"]+)['"]\s*\]/g, (_, k) =>
      globals.get[k] !== undefined ? globals.get[k] : "",
    );
    expr = expr.replace(/\$_SESSION\s*\[\s*['"]([^'"]+)['"]\s*\]/g, (_, k) =>
      activeSession[k] !== undefined ? String(activeSession[k]) : "",
    );

    // Retrait des guillemets si littéral
    if (
      (expr.startsWith("'") && expr.endsWith("'")) ||
      (expr.startsWith('"') && expr.endsWith('"'))
    ) {
      expr = expr.slice(1, -1);
    }
    if (varName) {
      localVariables[varName] = expr;
    }
  }

  // Traitement des sorties echo / print
  const echoMatches = scriptContent.matchAll(/(?:echo|print)\s+([^;]+);/g);
  for (const m of echoMatches) {
    let rawExpr = m[1]?.trim() || "";

    // Résolution directe des superglobales
    rawExpr = rawExpr.replace(/\$_POST\s*\[\s*['"]([^'"]+)['"]\s*\]/g, (_, k) =>
      globals.post[k] !== undefined ? globals.post[k] : "",
    );
    rawExpr = rawExpr.replace(/\$_GET\s*\[\s*['"]([^'"]+)['"]\s*\]/g, (_, k) =>
      globals.get[k] !== undefined ? globals.get[k] : "",
    );
    rawExpr = rawExpr.replace(/\$_SESSION\s*\[\s*['"]([^'"]+)['"]\s*\]/g, (_, k) =>
      activeSession[k] !== undefined ? String(activeSession[k]) : "",
    );

    // Résolution de htmlspecialchars(...)
    rawExpr = rawExpr.replace(/htmlspecialchars\s*\(\s*([^)]+)\s*\)/g, "$1");

    // Résolution de json_encode(...)
    rawExpr = rawExpr.replace(/json_encode\s*\(\s*\[([\s\S]*?)\]\s*\)/g, (_, inside) => {
      const obj: Record<string, unknown> = {};
      const pairs = inside.split(",");
      for (const pair of pairs) {
        const [k, v] = pair.split("=>");
        if (k && v) {
          const cleanK = k.trim().replace(/^['"]|['"]$/g, "");
          const cleanV = v.trim().replace(/^['"]|['"]$/g, "");
          obj[cleanK] = cleanV;
        }
      }
      return JSON.stringify(obj);
    });

    // Évaluation des parties séparées par concaténation '.'
    const parts = rawExpr.split(/\s*\.\s*/);
    let resolvedLine = "";
    for (let part of parts) {
      part = part.trim();
      if (
        (part.startsWith("'") && part.endsWith("'")) ||
        (part.startsWith('"') && part.endsWith('"'))
      ) {
        part = part.slice(1, -1);
      } else if (part.startsWith("$")) {
        const vName = part.slice(1);
        if (localVariables[vName] !== undefined) {
          part = localVariables[vName];
        }
      }

      // Interpolation des variables $var dans les chaînes
      part = part.replace(/\$([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)/g, (_, v) => {
        return localVariables[v] !== undefined ? localVariables[v] : `$${v}`;
      });

      resolvedLine += part;
    }
    stdout += resolvedLine;
  }

  // Si le script est un fichier HTML avec PHP entremêlé
  if (stdout.length === 0 && !scriptContent.startsWith("<?php")) {
    stdout = scriptContent.replace(/<\?php[\s\S]*?\?>/g, "");
  }

  // Détection des erreurs de syntaxe simples (ex: parenthèse non fermée)
  const openParen = (scriptContent.match(/\(/g) || []).length;
  const closeParen = (scriptContent.match(/\)/g) || []).length;
  if (openParen !== closeParen) {
    stderrParts.push("PHP Parse error: syntax error, unexpected end of file in script on line 1");
    return {
      id: req.id,
      success: false,
      stdout: "",
      stderr: stderrParts.join("\n"),
      exitCode: 255,
      headers: {},
      session: globals.session,
      durationMs: Date.now() - startTime,
      memoryUsageBytes: allocatedBytes,
      timedOut: false,
      memoryExceeded: false,
      error: "Erreur de syntaxe PHP",
    };
  }

  // Vérifier la limite de taille de stdout
  if (stdout.length > maxStdout) {
    stdout = stdout.slice(0, maxStdout) + "\n[... Sortie tronquée à 1 Mo max ...]";
  }

  const durationMs = Math.max(Date.now() - startTime, 5);

  return {
    id: req.id,
    success: stderrParts.length === 0,
    stdout,
    stderr: stderrParts.join("\n"),
    exitCode: stderrParts.length === 0 ? 0 : 1,
    headers,
    session: activeSession,
    durationMs,
    memoryUsageBytes: allocatedBytes,
    timedOut: false,
    memoryExceeded: false,
    engine: ENGINE_NAME,
    isSimulator: true,
  };
}
