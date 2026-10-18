/**
 * Labo STI - Telemetry & Error Sanitizer (T-13, PRD §12)
 *
 * Assure qu'aucune donnée personnelle d'élève (nom, prénom, courriel),
 * ni code source élève, ni secret d'infrastructure n'est transmis aux
 * collecteurs d'erreurs (Sentry, Lovable, logs externes).
 */

const PII_PATTERNS = [
  // Emails
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Supabase service_role keys or JWTs
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
  // Common token prefixes
  /(?:Bearer\s+)[a-zA-Z0-9_\-\.]{20,}/gi,
  /(?:sbp_[a-zA-Z0-9]{20,})/gi,
];

const CODE_KEYWORDS = [
  /function\s*\(/g,
  /const\s+[a-zA-Z0-9_]+\s*=/g,
  /let\s+[a-zA-Z0-9_]+\s*=/g,
  /var\s+[a-zA-Z0-9_]+\s*=/g,
  /<\?php/gi,
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
];

export interface SanitizedTelemetryPayload {
  message: string;
  context: Record<string, unknown>;
  sanitized: boolean;
}

/**
 * Nettoie une chaîne de caractères en masquant les données sensibles PII et code source.
 */
export function sanitizeString(input: string): string {
  if (!input) return "";

  let cleaned = input;

  // 1. Remplacement des tokens et emails
  for (const pattern of PII_PATTERNS) {
    cleaned = cleaned.replace(pattern, "[REDACTED_PII]");
  }

  // 2. Remplacement des blocs de code
  for (const kw of CODE_KEYWORDS) {
    if (kw.test(cleaned)) {
      cleaned = cleaned.replace(kw, "[REDACTED_CODE]");
    }
  }

  return cleaned;
}

/**
 * Nettoie récursivement un objet de contexte avant envoi à la télémétrie.
 */
export function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const forbiddenKeys = [
    "code",
    "source",
    "solution",
    "mot_de_passe",
    "password",
    "token",
    "service_role",
    "eleve_nom",
    "eleve_prenom",
    "email",
  ];

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    if (forbiddenKeys.some((f) => lowerKey.includes(f))) {
      result[key] = "[REDACTED]";
      continue;
    }

    if (typeof value === "string") {
      result[key] = sanitizeString(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeContext(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => (typeof item === "string" ? sanitizeString(item) : item));
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Vérifie et assainit le payload télémétrique complet.
 */
export function sanitizeTelemetry(
  error: unknown,
  context: Record<string, unknown> = {},
): SanitizedTelemetryPayload {
  const rawMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
  const cleanedMessage = sanitizeString(rawMessage);
  const cleanedContext = sanitizeContext(context);

  return {
    message: cleanedMessage,
    context: cleanedContext,
    sanitized: true,
  };
}
