/**
 * Critère décrit en JSON (content/<sujet>/criteria.json, ou saisi dans le Studio enseignant),
 * converti en critère exécutable. Même conversion pour les sujets du catalogue et le Studio :
 * un critère sans vérification réelle n'est jamais validé.
 */

import type { Criterion } from "../exercises";
import { construireVerificationDeclaree } from "./declared-criteria";

export interface RawProbe {
  type?: string;
  selector?: string;
  minCount?: number;
  property?: string;
  expectedValue?: string;
  isGreaterThanZero?: boolean;
  checkSelector?: string;
  [key: string]: unknown;
}

// Sélecteurs présents dans toute page : une sonde qui les vise est vraie même pour une page vide.
const SELECTEURS_TOUJOURS_PRESENTS = new Set(["html", "head", "body", ":root", "*"]);

/**
 * Une sonde est vérifiable seulement si elle teste un résultat observable qu'une page vide ne
 * satisfait pas : absence de sonde, sélecteur toujours présent, ou js_eval qui ne teste que
 * l'existence d'un champ (sans exécuter le code de l'élève) ne vérifient rien.
 */
export function sondeEstVerifiable(probe: RawProbe | null | undefined): boolean {
  if (!probe || typeof probe !== "object") return false;
  switch (probe.type) {
    case "dom_selector": {
      const selecteur = probe.selector?.trim().toLowerCase();
      return !!selecteur && !SELECTEURS_TOUJOURS_PRESENTS.has(selecteur);
    }
    case "css_property":
      return !!probe.selector?.trim() && !!probe.property?.trim();
    case "js_test_cas":
      return Array.isArray(probe["cas"]) && (probe["cas"] as unknown[]).length > 0;
    case "sql_table_check":
      return typeof probe["table"] === "string" && (probe["table"] as string).trim().length > 0;
    case "sql_query_result":
      return typeof probe["query"] === "string" && (probe["query"] as string).trim().length > 0;
    case "php_mysqli_check":
      return true;
    default:
      // js_eval (existence seule) et types inconnus : non vérifiables automatiquement.
      return false;
  }
}

export interface RawCriterion {
  id?: string;
  code?: string;
  titre?: string;
  label?: string;
  points: number;
  fail_message?: string;
  fail?: string;
  sonde?: RawProbe;
  [key: string]: unknown;
}

/**
 * Valeur calculée par le navigateur pour `valeur` appliquée à `propriete` sur un élément neutre
 * (ex. « blue » → « rgb(0, 0, 255) »). `null` si la valeur est invalide ou si rien n'est calculé.
 */
function valeurNormalisee(
  doc: Document,
  win: Window,
  propriete: string,
  valeur: string,
): string | null {
  const sonde = doc.createElement("span");
  sonde.style.setProperty(propriete, valeur);
  if (sonde.style.getPropertyValue(propriete) === "") return null; // valeur refusée par le navigateur
  (doc.body ?? doc.documentElement).appendChild(sonde);
  try {
    const calculee = win.getComputedStyle(sonde).getPropertyValue(propriete).trim();
    return calculee === "" ? null : calculee;
  } finally {
    sonde.remove();
  }
}

export function makeProbeCheck(
  probe: RawProbe | null | undefined,
): (doc: Document, win: Window) => boolean {
  return (doc: Document, win: Window) => {
    // Échec par défaut : sans sonde réellement vérifiable, le critère n'est jamais validé.
    if (!sondeEstVerifiable(probe) || !probe) return false;
    try {
      if (probe.type === "dom_selector") {
        if (!probe.selector) return false;
        const els = doc.querySelectorAll(probe.selector);
        if (probe.minCount && els.length < probe.minCount) return false;
        return els.length > 0;
      }
      if (probe.type === "css_property") {
        if (!probe.selector || !probe.property) return false;
        const el = doc.querySelector(probe.selector);
        if (!el) return false;
        const val = win.getComputedStyle(el).getPropertyValue(probe.property).trim();
        if (probe.expectedValue) {
          const exp = probe.expectedValue.trim().toLowerCase();
          const valNorm = val.toLowerCase();
          // Comparaison exacte directe
          if (valNorm === exp) return true;
          // Comparaison normalisée (ex: "blue" -> "rgb(0, 0, 255)")
          const normalisee = valeurNormalisee(doc, win, probe.property, probe.expectedValue);
          if (normalisee !== null && valNorm === normalisee.toLowerCase()) return true;
          // Si la valeur attendue est un mot-clé ou valeur dans une liste/shorthand
          // Découpage strict par délimiteurs pour éviter que "1" match "10px"
          const tokens = valNorm.split(/[\s,]+/);
          if (tokens.includes(exp)) return true;
          if (normalisee !== null && tokens.includes(normalisee.toLowerCase())) return true;
          return false;
        }
        if (probe.isGreaterThanZero) {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        }
        // Durcissement PED-05 (Issue #130) : ne valide plus 0px ou none par défaut
        const valLower = val.toLowerCase();
        if (
          !valLower ||
          valLower === "none" ||
          valLower === "0" ||
          valLower === "0px" ||
          valLower === "0rem" ||
          valLower === "0em" ||
          valLower === "0%" ||
          valLower === "transparent" ||
          valLower === "initial" ||
          valLower === "inherit" ||
          valLower === "unset" ||
          parseFloat(valLower) === 0
        ) {
          return false;
        }
        return val.length > 0;
      }
      return false;
    } catch {
      return false;
    }
  };
}

/** Valeur de « correction » qui réserve un critère à la correction de l'enseignant. */
export const CORRECTION_ENSEIGNANT = "enseignant";

export function critereDepuisJson(c: RawCriterion): Criterion {
  // Critère déclaré « corrigé par l'enseignant » : jamais évalué automatiquement.
  const manuel = c["correction"] === CORRECTION_ENSEIGNANT;
  // Vérification déclarée dans le critère (CSS calculé, fonction JS…), sinon sonde explicite.
  const declaree = manuel ? null : construireVerificationDeclaree(c);
  return {
    id: (c.id as string) || (c.code as string) || "crit",
    label: (c.titre as string) || (c.label as string) || "Critère",
    points: c.points,
    fail: (c.fail_message as string) || (c.fail as string) || "Critère non satisfait",
    automatique: !manuel && (declaree !== null || sondeEstVerifiable(c.sonde)),
    ...(manuel ? { manuel: true } : {}),
    ...(typeof c["fichier"] === "string" ? { fichier: c["fichier"] } : {}),
    raw: c as Record<string, unknown>,
    check: declaree ?? makeProbeCheck(c.sonde),
  };
}
