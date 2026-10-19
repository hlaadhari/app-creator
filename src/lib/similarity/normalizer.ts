/**
 * Normaliseur et Tokeniseur Multi-Langage pour la Détection Anti-Plagiat (PRD Section 16, F-65)
 *
 * Élimine les variations cosmétiques superficielles :
 * - Commentaires (mono-ligne et multi-lignes)
 * - Espacements, indentations et sauts de lignes
 * - Renommage trivial de variables et identifiants locaux
 */

// Mots-clés et identifiants du langage à préserver absolument
const RESERVED_KEYWORDS = new Set([
  // JavaScript / PHP
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "var",
  "let",
  "const",
  "new",
  "this",
  "try",
  "catch",
  "finally",
  "throw",
  "class",
  "extends",
  "import",
  "export",
  "default",
  "async",
  "await",
  "typeof",
  "instanceof",
  "document",
  "window",
  "console",
  "addEventListener",
  "querySelector",
  "querySelectorAll",
  "getElementById",
  "value",
  "length",
  "preventDefault",
  "stopPropagation",
  "innerHTML",
  "textContent",
  "style",
  "classList",
  "add",
  "remove",
  "toggle",
  "contains",
  "fetch",
  "json",
  "then",
  "catch",
  "push",
  "pop",
  "shift",
  "map",
  "filter",
  "reduce",
  "forEach",
  "echo",
  "php",
  "isset",
  "empty",
  "session_start",
  "header",
  "die",
  "exit",
  "array",
  "post",
  "get",
  "_post",
  "_get",
  "_session",
  // SQL
  "select",
  "from",
  "where",
  "join",
  "inner",
  "left",
  "right",
  "outer",
  "on",
  "group",
  "by",
  "order",
  "having",
  "limit",
  "insert",
  "into",
  "values",
  "update",
  "set",
  "delete",
  "create",
  "table",
  "alter",
  "drop",
  "and",
  "or",
  "not",
  "in",
  "is",
  "null",
  "like",
  "between",
  "as",
  "count",
  "sum",
  "avg",
  "min",
  "max",
  // HTML / CSS
  "html",
  "head",
  "body",
  "div",
  "span",
  "p",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "footer",
  "nav",
  "main",
  "article",
  "section",
  "form",
  "input",
  "button",
  "label",
  "table",
  "tr",
  "td",
  "th",
  "ul",
  "ol",
  "li",
  "img",
  "meta",
  "link",
  "title",
  "display",
  "flex",
  "grid",
  "color",
  "background",
  "margin",
  "padding",
  "border",
  "width",
  "height",
  "font",
  "align",
  "justify",
]);

/**
 * Supprime tous les commentaires d'un code source selon son extension ou type de langage
 */
export function supprimerCommentaires(code: string, extension: string = "js"): string {
  const clean = extension.toLowerCase().trim();
  const parts = clean.split(".");
  const ext = parts.length > 1 ? (parts[parts.length - 1] ?? clean) : clean;

  let sanitized = code;

  if (ext === "html" || ext === "htm") {
    // Commentaires HTML : <!-- ... -->
    sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, "");
  }

  if (ext === "css") {
    // Commentaires CSS : /* ... */
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, "");
  }

  if (ext === "sql") {
    // Commentaires SQL : -- ou /* ... */ ou #
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, "");
    sanitized = sanitized.replace(/--.*$/gm, "");
    sanitized = sanitized.replace(/#.*$/gm, "");
  }

  if (ext === "js" || ext === "ts" || ext === "php") {
    // Commentaires JS/PHP : /* ... */ et // ...
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, "");
    sanitized = sanitized.replace(/\/\/.*$/gm, "");
    if (ext === "php") {
      sanitized = sanitized.replace(/#.*$/gm, "");
    }
  }

  return sanitized;
}

/**
 * Normalise les espacements et la casse
 */
export function normaliserEspaces(code: string): string {
  return code
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

/**
 * Tokenise un code source en une séquence de lexèmes canoniques.
 * Les identifiants personnalisés (variables, noms de fonctions) sont normalisés en ID_n
 * pour détecter les plagiats par simple renommage de variables.
 */
export function tokeniserCode(code: string, extension: string = "js"): string[] {
  const codeSansCommentaires = supprimerCommentaires(code, extension);
  const codeNettoye = normaliserEspaces(codeSansCommentaires);

  // Expression régulière découpant les mots, opérateurs et symboles syntaxiques
  const lexerRegex =
    /[a-zA-Z_$][a-zA-Z0-9_$]*|==|!=|<=|>=|=>|&&|\|\||[0-9]+|"[^"]*"|'[^']*'|[{}()[\];,.+\-*/=<>!:]/g;
  const matches = codeNettoye.match(lexerRegex) || [];

  const identifierMap = new Map<string, string>();
  let identifierCounter = 1;

  const tokens: string[] = [];

  for (const token of matches) {
    const lower = token.toLowerCase();

    // 1. Les mots-clés réservés restent inchangés
    if (RESERVED_KEYWORDS.has(lower)) {
      tokens.push(lower);
      continue;
    }

    // 2. Les symboles de ponctuation ou opérateurs restent inchangés
    if (/^[{}()[\];,.+\-*/=<>!:]+$/.test(token) || /^(==|!=|<=|>=|=>|&&|\|\|)$/.test(token)) {
      tokens.push(token);
      continue;
    }

    // 3. Les nombres
    if (/^[0-9]+$/.test(token)) {
      tokens.push("NUM");
      continue;
    }

    // 4. Les chaînes de caractères
    if (token.startsWith('"') || token.startsWith("'")) {
      tokens.push("STR");
      continue;
    }

    // 5. Identifiant personnalisé (variable ou fonction) -> normalisation canonique
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(token)) {
      if (!identifierMap.has(token)) {
        identifierMap.set(token, `ID_${identifierCounter++}`);
      }
      tokens.push(identifierMap.get(token)!);
      continue;
    }

    tokens.push(token);
  }

  return tokens;
}

/**
 * Normalise et tokenise le contenu d'un code source
 */
export function normaliserContenuCode(code: string, extension: string = "js"): string[] {
  return tokeniserCode(code, extension);
}
