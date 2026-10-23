/**
 * Labo STI - Vérificateur Client : DOM, HTML5, CSS3 & JavaScript (Bac STI)
 *
 * Implémente :
 * 1. Structure HTML5 & Formulaires :
 *    - Présence de `<form action="...php" method="post" onsubmit="return verif();">`
 *    - Validation que chaque champ de saisie (`input`, `select`, `textarea`) possède
 *      un attribut `name` (indispensable pour `$_POST` en PHP) et un `id` (pour `getElementById` en JS).
 * 2. Feuille de Style CSS3 (`mesStyles.css`) :
 *    - Modèle de boîte (Box Model : `margin`, `padding`, `border`, `width`, `height`),
 *    - Sélecteurs de classe (`.L1`), d'identifiant (`#titre`) et règles d'alignement (`display: inline-block` sur `<label>`).
 * 3. Validation JavaScript (`controle.js` / `controls.js`) :
 *    - Exécution isolée en JSDOM de fonctions de contrôle client (`verif()`, `verif2()`, `test()`),
 *    - Contrôle de la longueur du numéro CIN (8 chiffres exacts avec `.length` et `isNaN()`),
 *    - Contrôle des listes déroulantes (`.selectedIndex !== 0` ou `.value !== ""`),
 *    - Contrôle des boutons radio (`.checked`),
 *    - Vérification du `return false;` en cas d'erreur de saisie pour bloquer l'envoi du formulaire.
 */

import { JSDOM } from "jsdom";

export interface WebCriterionReport {
  id: string;
  code: string;
  domaine: "HTML5" | "CSS3" | "JavaScript";
  titre: string;
  valide: boolean;
  points: number;
  pointsMax: number;
  feedbackPedagogique: string;
}

export interface HtmlFormAuditResult {
  hasForm: boolean;
  actionPhp: string | null;
  methodPost: boolean;
  onsubmitReturnCall: string | null;
  fieldsMissingName: string[];
  fieldsMissingId: string[];
  totalInteractiveFields: number;
  conforme: boolean;
  criteres: WebCriterionReport[];
}

export interface CssBoxModelAuditResult {
  hasMargin: boolean;
  hasPadding: boolean;
  hasBorder: boolean;
  classSelectors: string[];
  idSelectors: string[];
  hasLabelInlineBlock: boolean;
  conforme: boolean;
  criteres: WebCriterionReport[];
}

export interface JsTestCaseSpec {
  description: string;
  fieldValues: Record<string, string | boolean | number>;
  expectedReturn: boolean;
}

export interface JsValidationAuditResult {
  functionName: string;
  functionFound: boolean;
  usesLengthCheck: boolean;
  usesIsNaNCheck: boolean;
  usesSelectedIndexOrValue: boolean;
  usesCheckedProperty: boolean;
  hasReturnFalse: boolean;
  testCasesResults: Array<{
    description: string;
    expected: boolean;
    actual: boolean | undefined;
    alertTriggered: string | null;
    passed: boolean;
  }>;
  conforme: boolean;
  criteres: WebCriterionReport[];
}

/**
 * 1. Audite la structure HTML5 et la conformité du formulaire Bac STI
 */
export function verifierStructureHtmlFormulaire(
  htmlContent: string,
  expectedActionPhp?: string,
  expectedJsFunction?: string,
): HtmlFormAuditResult {
  const dom = new JSDOM(htmlContent);
  const doc = dom.window.document;

  const form = doc.querySelector("form");
  const hasForm = Boolean(form);
  const rawAction = form?.getAttribute("action")?.trim() || null;
  const rawMethod = form?.getAttribute("method")?.trim().toUpperCase() || "";
  const rawOnsubmit = form?.getAttribute("onsubmit")?.trim() || null;

  const actionMatches = expectedActionPhp
    ? rawAction?.toLowerCase() === expectedActionPhp.toLowerCase()
    : Boolean(rawAction && /\.php$/i.test(rawAction));

  const methodPost = rawMethod === "POST";

  const onsubmitRegex = expectedJsFunction
    ? new RegExp(`return\\s+${expectedJsFunction}\\s*\\(\\s*\\)\\s*;?`, "i")
    : /return\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(\s*\)\s*;?/i;
  const onsubmitOk = Boolean(rawOnsubmit && onsubmitRegex.test(rawOnsubmit));

  // Vérifier tous les champs de saisie (hors submit, reset, button)
  const controls = Array.from(
    doc.querySelectorAll("form input, form select, form textarea"),
  ).filter((el) => {
    if (el.tagName.toLowerCase() === "input") {
      const t = (el.getAttribute("type") || "text").toLowerCase();
      return t !== "submit" && t !== "reset" && t !== "button";
    }
    return true;
  });

  const fieldsMissingName: string[] = [];
  const fieldsMissingId: string[] = [];

  controls.forEach((ctrl, idx) => {
    const tag = ctrl.tagName.toLowerCase();
    const id = ctrl.getAttribute("id")?.trim();
    const name = ctrl.getAttribute("name")?.trim();
    const type = ctrl.getAttribute("type")?.toLowerCase() || "";
    const label = id || name || `${tag}#${idx + 1}`;

    if (!name) {
      fieldsMissingName.push(label);
    }
    // Pour les boutons radio d'un même groupe, un id ou name est attendu
    if (!id && type !== "radio") {
      fieldsMissingId.push(label);
    }
  });

  const criteres: WebCriterionReport[] = [
    {
      id: "HTML-FORM-TAG",
      code: "HTML-01",
      domaine: "HTML5",
      titre: "Balise <form> avec action PHP, method='post' et onsubmit='return ...'",
      valide: hasForm && actionMatches && methodPost && onsubmitOk,
      points: hasForm && actionMatches && methodPost && onsubmitOk ? 1.5 : 0,
      pointsMax: 1.5,
      feedbackPedagogique:
        hasForm && actionMatches && methodPost && onsubmitOk
          ? "La balise <form> respecte la signature officielle (action PHP, method POST et blocage onsubmit)."
          : `Vérifiez les attributs de <form> : action="${expectedActionPhp || "...php"}", method="post" et onsubmit="return ${expectedJsFunction || "verif"}();".`,
    },
    {
      id: "HTML-FIELDS-NAME-ID",
      code: "HTML-02",
      domaine: "HTML5",
      titre: "Présence des attributs 'name' (PHP $_POST) et 'id' (DOM JS) sur les champs",
      valide: controls.length > 0 && fieldsMissingName.length === 0 && fieldsMissingId.length === 0,
      points:
        controls.length > 0 && fieldsMissingName.length === 0 && fieldsMissingId.length === 0
          ? 1.5
          : 0,
      pointsMax: 1.5,
      feedbackPedagogique:
        fieldsMissingName.length === 0 && fieldsMissingId.length === 0
          ? `Tous les champs (${controls.length}) possèdent leurs attributs 'name' et 'id'.`
          : `Piège Bac : Attribut 'name' manquant sur [${fieldsMissingName.join(", ") || "aucun"}] (obligatoire pour $_POST) ; attribut 'id' manquant sur [${fieldsMissingId.join(", ") || "aucun"}].`,
    },
  ];

  return {
    hasForm,
    actionPhp: rawAction,
    methodPost,
    onsubmitReturnCall: rawOnsubmit,
    fieldsMissingName,
    fieldsMissingId,
    totalInteractiveFields: controls.length,
    conforme: criteres.every((c) => c.valide),
    criteres,
  };
}

/**
 * 2. Audite la feuille de style CSS3 (Modèle de boîte, classes, identifiants, alignement labels)
 */
export function verifierFeuilleCss3(
  cssContent: string,
  options: {
    requireLabelInlineBlock?: boolean;
    expectedClassSelectors?: string[];
    expectedIdSelectors?: string[];
  } = {},
): CssBoxModelAuditResult {
  const cleanCss = cssContent.replace(/\/\*[\s\S]*?\*\//g, "");

  const hasMargin = /\bmargin(?:-(?:top|right|bottom|left))?\s*:/i.test(cleanCss);
  const hasPadding = /\bpadding(?:-(?:top|right|bottom|left))?\s*:/i.test(cleanCss);
  const hasBorder = /\bborder(?:-(?:width|style|color|radius|top|right|bottom|left))?\s*:/i.test(
    cleanCss,
  );

  // Extraction des sélecteurs de classes (.xxx) et d'identifiants (#xxx) hors valeurs hexadécimales
  const selectorBlocks = cleanCss
    .split("}")
    .map((block) => block.split("{")[0]?.trim() || "")
    .filter(Boolean);

  const classSet = new Set<string>();
  const idSet = new Set<string>();

  for (const sel of selectorBlocks) {
    const classMatches = sel.matchAll(/\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g);
    for (const m of classMatches) {
      if (m[1]) classSet.add(`.${m[1]}`);
    }
    const idMatches = sel.matchAll(/#([a-zA-Z_-][a-zA-Z0-9_-]*)/g);
    for (const m of idMatches) {
      if (m[1]) idSet.add(`#${m[1]}`);
    }
  }

  const classSelectors = Array.from(classSet);
  const idSelectors = Array.from(idSet);

  // Vérifier display: inline-block (notamment sur label)
  const hasLabelInlineBlock =
    /label[\s\S]*?\{[^}]*display\s*:\s*inline-block/i.test(cleanCss) ||
    /display\s*:\s*inline-block/i.test(cleanCss);

  const boxModelOk = hasMargin && hasPadding && hasBorder;

  const expectedClassesOk = options.expectedClassSelectors
    ? options.expectedClassSelectors.every((c) =>
        classSelectors.includes(c.startsWith(".") ? c : `.${c}`),
      )
    : classSelectors.length > 0;

  const expectedIdsOk = options.expectedIdSelectors
    ? options.expectedIdSelectors.every((id) =>
        idSelectors.includes(id.startsWith("#") ? id : `#${id}`),
      )
    : true;

  const labelAlignOk = options.requireLabelInlineBlock ? hasLabelInlineBlock : true;

  const criteres: WebCriterionReport[] = [
    {
      id: "CSS-BOX-MODEL",
      code: "CSS-01",
      domaine: "CSS3",
      titre: "Maîtrise du modèle de boîte CSS3 (margin, padding, border)",
      valide: boxModelOk,
      points: boxModelOk ? 1 : 0,
      pointsMax: 1,
      feedbackPedagogique: boxModelOk
        ? "Le modèle de boîte CSS3 (margin, padding, border) est correctement appliqué."
        : "Propriétés du modèle de boîte incomplètes (margin, padding et border sont attendus).",
    },
    {
      id: "CSS-SELECTORS-ALIGN",
      code: "CSS-02",
      domaine: "CSS3",
      titre: "Sélecteurs CSS (.classe, #id) et alignement des formulaires",
      valide: expectedClassesOk && expectedIdsOk && labelAlignOk,
      points: expectedClassesOk && expectedIdsOk && labelAlignOk ? 1 : 0,
      pointsMax: 1,
      feedbackPedagogique:
        expectedClassesOk && expectedIdsOk && labelAlignOk
          ? "Sélecteurs CSS et règles de mise en page conformes aux annexes Bac STI."
          : "Vérifiez vos sélecteurs (.classe / #id) ou la règle 'display: inline-block;' indispensable pour dimensionner un élément <label>.",
    },
  ];

  return {
    hasMargin,
    hasPadding,
    hasBorder,
    classSelectors,
    idSelectors,
    hasLabelInlineBlock,
    conforme: criteres.every((c) => c.valide),
    criteres,
  };
}

/**
 * 3. Exécute des tests unitaires isolés sur la fonction de validation JavaScript (ex: controle.js)
 */
export function verifierValidationJavaScript(
  htmlContent: string,
  jsContent: string,
  functionName: string,
  testCases: JsTestCaseSpec[],
): JsValidationAuditResult {
  const cleanJs = jsContent.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

  const usesLengthCheck = /\.length\b/.test(cleanJs);
  const usesIsNaNCheck = /\bisNaN\s*\(/.test(cleanJs) || /\\d\{8\}/.test(cleanJs);
  const usesSelectedIndexOrValue = /\.selectedIndex\b/.test(cleanJs) || /\.value\b/.test(cleanJs);
  const usesCheckedProperty = /\.checked\b/.test(cleanJs);
  const hasReturnFalse = /\breturn\s+false\s*;?/.test(cleanJs);

  const testCasesResults: JsValidationAuditResult["testCasesResults"] = [];
  let functionFound = false;

  for (const tc of testCases) {
    const dom = new JSDOM(htmlContent, {
      runScripts: "dangerously",
    });
    const win = dom.window as unknown as Window & Record<string, unknown>;
    const doc = dom.window.document;

    let alertMsg: string | null = null;
    win.alert = (msg?: unknown) => {
      alertMsg = String(msg ?? "");
    };

    // Injecter le script élève
    const scriptEl = doc.createElement("script");
    scriptEl.textContent = jsContent;
    doc.head.appendChild(scriptEl);

    const fn = win[functionName];
    if (typeof fn === "function") {
      functionFound = true;
    }

    // Appliquer les saisies du cas de test
    for (const [selectorOrId, val] of Object.entries(tc.fieldValues)) {
      const el =
        doc.getElementById(selectorOrId) ||
        doc.querySelector(selectorOrId) ||
        doc.querySelector(`[name="${selectorOrId}"]`);

      if (!el) continue;

      if (el.tagName.toLowerCase() === "select") {
        const selectEl = el as HTMLSelectElement;
        if (typeof val === "number") {
          selectEl.selectedIndex = val;
        } else {
          selectEl.value = String(val);
        }
      } else if (
        el.tagName.toLowerCase() === "input" &&
        ((el as HTMLInputElement).type === "radio" || (el as HTMLInputElement).type === "checkbox")
      ) {
        (el as HTMLInputElement).checked = Boolean(val);
      } else {
        (el as HTMLInputElement).value = String(val);
      }
    }

    let actual: boolean | undefined = undefined;
    if (typeof fn === "function") {
      try {
        const res = (fn as () => unknown)();
        actual = Boolean(res);
      } catch {
        actual = undefined;
      }
    }

    testCasesResults.push({
      description: tc.description,
      expected: tc.expectedReturn,
      actual,
      alertTriggered: alertMsg,
      passed: actual === tc.expectedReturn,
    });
  }

  const allCasesPassed =
    functionFound && testCasesResults.length > 0 && testCasesResults.every((r) => r.passed);

  const criteres: WebCriterionReport[] = [
    {
      id: `JS-FN-${functionName}`,
      code: "JS-01",
      domaine: "JavaScript",
      titre: `Fonction ${functionName}() et blocage d'envoi 'return false;'`,
      valide: functionFound && hasReturnFalse && usesLengthCheck && usesIsNaNCheck,
      points: functionFound && hasReturnFalse && usesLengthCheck && usesIsNaNCheck ? 2 : 0,
      pointsMax: 2,
      feedbackPedagogique:
        functionFound && hasReturnFalse && usesLengthCheck && usesIsNaNCheck
          ? `La fonction ${functionName}() utilise correctement .length, isNaN() et bloque l'envoi via 'return false;'.`
          : `Piège Bac : Assurez-vous que ${functionName}() vérifie la longueur (.length === 8), la nature numérique (isNaN) et retourne 'return false;' en cas d'erreur.`,
    },
    {
      id: `JS-CASES-${functionName}`,
      code: "JS-02",
      domaine: "JavaScript",
      titre: `Validation fonctionnelle de ${functionName}() sur les jeux d'essai (valides et invalides)`,
      valide: allCasesPassed,
      points: allCasesPassed ? 3 : 0,
      pointsMax: 3,
      feedbackPedagogique: allCasesPassed
        ? `Tous les cas de test (${testCasesResults.length}/${testCasesResults.length}) de ${functionName}() sont validés.`
        : `Échec sur certains cas de test : ${testCasesResults
            .filter((r) => !r.passed)
            .map((r) => `${r.description} (attendu ${r.expected}, reçu ${String(r.actual)})`)
            .join(" ; ")}.`,
    },
  ];

  return {
    functionName,
    functionFound,
    usesLengthCheck,
    usesIsNaNCheck,
    usesSelectedIndexOrValue,
    usesCheckedProperty,
    hasReturnFalse,
    testCasesResults,
    conforme: criteres.every((c) => c.valide),
    criteres,
  };
}
