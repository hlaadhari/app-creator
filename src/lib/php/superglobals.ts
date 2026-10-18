/**
 * Labo STI - Émulateur des superglobales PHP ($ _GET, $_POST, $_SERVER, $_SESSION, $_COOKIE)
 * Conforme aux spécifications du PRD §8.1 et F-22
 */

import type { PhpExecutionRequest, PhpSuperglobals } from "./types";

export const DEFAULT_SERVER_VARS: Record<string, string> = {
  SERVER_SOFTWARE: "Labo-STI/PHP-WASM-8.2",
  SERVER_NAME: "localhost",
  SERVER_ADDR: "127.0.0.1",
  SERVER_PORT: "80",
  REMOTE_ADDR: "127.0.0.1",
  DOCUMENT_ROOT: "/htdocs",
  REQUEST_SCHEME: "http",
  HTTP_HOST: "localhost",
  HTTP_USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LaboSTI-Preview/1.0",
  HTTP_ACCEPT: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  HTTP_ACCEPT_LANGUAGE: "fr-FR,fr;q=0.9,en;q=0.8",
  SCRIPT_NAME: "/index.php",
  PHP_SELF: "/index.php",
  REQUEST_URI: "/index.php",
  REQUEST_METHOD: "GET",
  QUERY_STRING: "",
};

/**
 * Extrait les paramètres de requête depuis une URL
 */
export function extraireQueryParams(urlStr: string): {
  path: string;
  query: Record<string, string>;
  queryString: string;
} {
  try {
    const url = new URL(urlStr, "http://localhost");
    const query: Record<string, string> = {};
    url.searchParams.forEach((val, key) => {
      query[key] = val;
    });
    return {
      path: url.pathname || "/index.php",
      query,
      queryString: url.search.startsWith("?") ? url.search.slice(1) : url.search,
    };
  } catch {
    const qIndex = urlStr.indexOf("?");
    if (qIndex === -1) {
      return { path: urlStr || "/index.php", query: {}, queryString: "" };
    }
    const path = urlStr.slice(0, qIndex) || "/index.php";
    const queryString = urlStr.slice(qIndex + 1);
    const query: Record<string, string> = {};
    const parts = queryString.split("&");
    for (const part of parts) {
      const [k, v] = part.split("=");
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || "");
    }
    return { path, query, queryString };
  }
}

/**
 * Construit l'environnement complet des superglobales pour une requête donnée
 */
export function preparerSuperglobales(req: PhpExecutionRequest): {
  server: Record<string, string>;
  get: Record<string, string>;
  post: Record<string, string>;
  cookies: Record<string, string>;
  session: Record<string, unknown>;
} {
  const method = (req.method || "GET").toUpperCase();
  const rawUrl = req.url || (req.entrypoint ? `/${req.entrypoint}` : "/index.php");
  const { path, query, queryString } = extraireQueryParams(rawUrl);

  const mergedGet = { ...query, ...(req.get || {}) };
  const mergedPost = { ...(req.post || {}) };
  const mergedCookies = { ...(req.cookies || {}) };
  const mergedSession = { ...(req.session || {}) };

  const server: Record<string, string> = {
    ...DEFAULT_SERVER_VARS,
    REQUEST_METHOD: method,
    REQUEST_URI: queryString ? `${path}?${queryString}` : path,
    SCRIPT_NAME: path,
    PHP_SELF: path,
    QUERY_STRING: queryString,
    ...(req.server || {}),
  };

  return {
    server,
    get: mergedGet,
    post: mergedPost,
    cookies: mergedCookies,
    session: mergedSession,
  };
}

/**
 * Génère le script de prélude PHP qui injecte les superglobales et configure la capture de session
 */
export function genererPreludePhp(globals: ReturnType<typeof preparerSuperglobales>): string {
  const jsonServer = JSON.stringify(globals.server);
  const jsonGet = JSON.stringify(globals.get);
  const jsonPost = JSON.stringify(globals.post);
  const jsonCookies = JSON.stringify(globals.cookies);
  const jsonSession = JSON.stringify(globals.session);

  return `<?php
// === PRELUDE LABO STI : EMULATION DES SUPERGLOBALES ===
$_SERVER = json_decode(${JSON.stringify(jsonServer)}, true) ?: [];
$_GET = json_decode(${JSON.stringify(jsonGet)}, true) ?: [];
$_POST = json_decode(${JSON.stringify(jsonPost)}, true) ?: [];
$_COOKIE = json_decode(${JSON.stringify(jsonCookies)}, true) ?: [];

// Initialisation de session émulée
$__labo_sti_initial_session = json_decode(${JSON.stringify(jsonSession)}, true) ?: [];
if (!isset($_SESSION) || !is_array($_SESSION)) {
    $_SESSION = $__labo_sti_initial_session;
}

// Fonction personnalisée de capture des en-têtes
if (!function_exists('labo_sti_headers_list')) {
    $GLOBALS['__labo_sti_headers'] = [];
}
// === FIN DU PRELUDE ===
?>`;
}

/**
 * Balise de clôture de script pour extraire la session mise à jour et les métadonnées
 */
export const SESSION_TRAILER_MARKER = "___LABO_STI_TRAILER_DELIMITER___";

export function genererTrailerPhp(): string {
  return `<?php
// === TRAILER LABO STI : CAPTURE DE SESSION ET EN-TETES ===
if (isset($_SESSION) && is_array($_SESSION)) {
    echo "${SESSION_TRAILER_MARKER}" . json_encode([
        'session' => $_SESSION,
        'headers' => function_exists('headers_list') ? headers_list() : ($GLOBALS['__labo_sti_headers'] ?? [])
    ]);
}
// === FIN DU TRAILER ===
?>`;
}
