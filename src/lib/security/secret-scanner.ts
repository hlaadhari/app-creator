/**
 * Labo STI - Static Secret Scanner (T-12, PRD §12, docs/SECURITY.md)
 *
 * Analyse les chaînes et fichiers de bundle pour détecter toute fuite
 * accidentelle de clés d'administration (service_role, JWT privé, clés d'API secrètes).
 */

export const FORBIDDEN_SECRET_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /service_role/i,
  /sbp_[a-zA-Z0-9]{30,}/,
  /sk-ant-[a-zA-Z0-9_-]{20,}/,
  /ghp_[a-zA-Z0-9]{30,}/,
];

export interface SecretScanResult {
  hasSecrets: boolean;
  violations: string[];
}

/**
 * Scanne un contenu textuel ou un bundle JS pour détecter la présence de secrets d'infrastructure (T-12).
 */
export function scanBundleForSecrets(
  content: string,
  filename: string = "bundle.js",
): SecretScanResult {
  const violations: string[] = [];

  for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(
        `Secret interdit détecté dans ${filename} matching motif ${pattern.toString()}`,
      );
    }
  }

  return {
    hasSecrets: violations.length > 0,
    violations,
  };
}
