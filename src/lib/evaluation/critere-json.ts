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
        if (probe.expectedValue) return val.includes(probe.expectedValue);
        if (probe.isGreaterThanZero) return parseFloat(val) > 0;
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
