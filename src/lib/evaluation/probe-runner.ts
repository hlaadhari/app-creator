export interface DomProbe {
  type: "dom_selector";
  selector: string;
  minCount?: number;
  textNotEmpty?: boolean;
  containsText?: string;
  hasAttribute?: string;
  attributeStartsWith?: { name: string; prefix: string };
  containsClass?: string;
}

export interface CssProbe {
  type: "css_property";
  selector: string;
  property: string;
  expectedValue?: string;
  isGreaterThanZero?: boolean;
}

export interface JsProbe {
  type: "js_eval";
  actions?: Array<{
    type: "click";
    selector: string;
    repeat?: number;
  }>;
  checkSelector: string;
  checkText?: string;
  checkClass?: string;
}

export type ProbeDefinition = DomProbe | CssProbe | JsProbe;

export interface CriterionDefinition {
  id: string;
  code: string;
  label: string;
  points: number;
  ordre: number;
  sonde: ProbeDefinition;
  message_echec: string;
}

export interface CriterionEvaluationResult {
  id: string;
  code: string;
  label: string;
  points: number;
  maxPoints: number;
  passed: boolean;
  message: string;
  durationMs: number;
  /** Faux : aucune vérification automatique réelle (critère évalué par l'enseignant). */
  automatique?: boolean;
}

export interface EvaluationSummary {
  results: CriterionEvaluationResult[];
  earnedPoints: number;
  totalPoints: number;
  /** Points de critères sans vérification automatique, jamais comptés dans la note. */
  pointsNonVerifiables?: number;
  note20: number;
  totalDurationMs: number;
  evaluatedAt: number;
}

/**
 * Lit une propriété CSS calculée de manière normalisée
 */
function getComputedProp(win: Window, el: Element | null, property: string): string {
  if (!el) return "";
  try {
    return win.getComputedStyle(el).getPropertyValue(property).trim();
  } catch {
    return "";
  }
}

/**
 * Exécute une sonde DOM sur le document HTML sandboxé
 */
function evaluateDomProbe(probe: DomProbe, doc: Document): { passed: boolean; hint?: string } {
  const elements = doc.querySelectorAll(probe.selector);

  if (elements.length === 0) {
    return {
      passed: false,
      hint: `L'élément correspondant au sélecteur "${probe.selector}" est introuvable.`,
    };
  }

  if (probe.minCount !== undefined && elements.length < probe.minCount) {
    return {
      passed: false,
      hint: `Trouvé ${elements.length} élément(s), mais au moins ${probe.minCount} sont requis.`,
    };
  }

  const first = elements[0];
  if (!first) return { passed: false };

  if (probe.textNotEmpty) {
    const text = first.textContent?.trim() || "";
    if (text.length === 0) {
      return { passed: false, hint: `L'élément "${probe.selector}" ne doit pas être vide.` };
    }
  }

  if (probe.containsText) {
    const text = first.textContent || "";
    if (!text.toLowerCase().includes(probe.containsText.toLowerCase())) {
      return { passed: false, hint: `L'élément doit contenir le texte "${probe.containsText}".` };
    }
  }

  if (probe.attributeStartsWith) {
    const attrVal = first.getAttribute(probe.attributeStartsWith.name) || "";
    if (!attrVal.startsWith(probe.attributeStartsWith.prefix)) {
      return {
        passed: false,
        hint: `L'attribut ${probe.attributeStartsWith.name} doit commencer par "${probe.attributeStartsWith.prefix}".`,
      };
    }
  }

  if (probe.containsClass) {
    if (!first.classList.contains(probe.containsClass)) {
      return {
        passed: false,
        hint: `La classe CSS "${probe.containsClass}" est manquante sur l'élément.`,
      };
    }
  }

  return { passed: true };
}

/**
 * Exécute une sonde CSS sur le document sandboxé
 */
function evaluateCssProbe(
  probe: CssProbe,
  doc: Document,
  win: Window,
): { passed: boolean; hint?: string } {
  const el = doc.querySelector(probe.selector);
  if (!el) {
    return {
      passed: false,
      hint: `Élément cible "${probe.selector}" introuvable pour vérifier le style CSS.`,
    };
  }

  const actualValue = getComputedProp(win, el, probe.property);

  if (probe.isGreaterThanZero) {
    const num = parseFloat(actualValue);
    if (isNaN(num) || num <= 0) {
      return {
        passed: false,
        hint: `La propriété CSS "${probe.property}" doit être supérieure à 0 (valeur mesurée : "${actualValue}").`,
      };
    }
    return { passed: true };
  }

  if (probe.expectedValue) {
    if (actualValue.toLowerCase() !== probe.expectedValue.toLowerCase()) {
      return {
        passed: false,
        hint: `Valeur CSS attendue pour "${probe.property}" : ${probe.expectedValue} (mesurée : ${actualValue || "non définie"}).`,
      };
    }
  }

  return { passed: true };
}

/**
 * Exécute une sonde dynamique JavaScript
 */
function evaluateJsProbe(probe: JsProbe, doc: Document): { passed: boolean; hint?: string } {
  // Simuler les interactions utilisateur requises
  if (probe.actions) {
    for (const act of probe.actions) {
      if (act.type === "click") {
        const btn = doc.querySelector(act.selector) as HTMLElement | null;
        if (!btn) {
          return { passed: false, hint: `Bouton "${act.selector}" introuvable pour le clic.` };
        }
        const times = act.repeat || 1;
        for (let i = 0; i < times; i++) {
          btn.click();
        }
      }
    }
  }

  const checkEl = doc.querySelector(probe.checkSelector);
  if (!checkEl) {
    return {
      passed: false,
      hint: `Élément de contrôle "${probe.checkSelector}" introuvable après interaction.`,
    };
  }

  if (probe.checkText !== undefined) {
    const text = checkEl.textContent?.trim();
    if (text !== probe.checkText) {
      return {
        passed: false,
        hint: `Le texte de "${probe.checkSelector}" est "${text}", mais "${probe.checkText}" était attendu.`,
      };
    }
  }

  if (probe.checkClass !== undefined) {
    if (!checkEl.classList.contains(probe.checkClass)) {
      return {
        passed: false,
        hint: `L'élément "${probe.checkSelector}" devrait posséder la classe CSS "${probe.checkClass}".`,
      };
    }
  }

  return { passed: true };
}

/**
 * Exécute l'évaluation formative d'une liste de critères sur un iframe / document sandboxé
 * Respecte la contrainte de temps : exécution en moins de 3 secondes (PRD §10).
 */
export function evaluateCriteria(
  criteria: CriterionDefinition[],
  doc: Document,
  win: Window,
): EvaluationSummary {
  const startTime = performance.now();
  const results: CriterionEvaluationResult[] = [];

  let earnedPoints = 0;
  let totalPoints = 0;

  for (const c of criteria) {
    const cStartTime = performance.now();
    let passed = false;
    let detailHint: string | undefined;

    totalPoints += c.points;

    try {
      if (c.sonde.type === "dom_selector") {
        const res = evaluateDomProbe(c.sonde, doc);
        passed = res.passed;
        detailHint = res.hint;
      } else if (c.sonde.type === "css_property") {
        const res = evaluateCssProbe(c.sonde, doc, win);
        passed = res.passed;
        detailHint = res.hint;
      } else if (c.sonde.type === "js_eval") {
        const res = evaluateJsProbe(c.sonde, doc);
        passed = res.passed;
        detailHint = res.hint;
      }
    } catch (err) {
      passed = false;
      detailHint = `Erreur d'analyse : ${String(err)}`;
    }

    const cDuration = Math.round(performance.now() - cStartTime);
    const pts = passed ? c.points : 0;
    earnedPoints += pts;

    results.push({
      id: c.id,
      code: c.code,
      label: c.label,
      points: pts,
      maxPoints: c.points,
      passed,
      message: passed ? "Critère validé avec succès !" : detailHint || c.message_echec,
      durationMs: cDuration,
    });
  }

  const totalDurationMs = Math.round(performance.now() - startTime);
  const note20 = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 200) / 10 : 0;

  return {
    results,
    earnedPoints,
    totalPoints,
    note20,
    totalDurationMs,
    evaluatedAt: Date.now(),
  };
}
