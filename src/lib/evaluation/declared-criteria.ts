/**
 * Vérifications déclarées dans les critères des sujets (content/<sujet>/criteria.json) :
 * résultat CSS calculé, règle CSS non vide, fonction JavaScript présente et comportement de cette
 * fonction sur des saisies données. Chaque vérification est exécutée sur la page de l'élève.
 *
 * Un critère dont la déclaration n'est pas comprise ici n'est pas vérifiable automatiquement :
 * `construireVerificationDeclaree` renvoie alors `null` (et jamais une vérification toujours vraie).
 */

export type VerificationCritere = (doc: Document, win: Window) => boolean;

type CritereBrut = Record<string, unknown>;

const FONCTION_PAR_DEFAUT = "verif";

const texte = (valeur: unknown): string | undefined =>
  typeof valeur === "string" && valeur.trim() !== "" ? valeur.trim() : undefined;

const fonctionGlobale = (win: Window, nom: string): ((...args: unknown[]) => unknown) | null => {
  const candidate = (win as unknown as Record<string, unknown>)[nom];
  return typeof candidate === "function" ? (candidate as (...args: unknown[]) => unknown) : null;
};

/** Champ de formulaire désigné par son id, à défaut par son nom. */
const trouverChamp = (doc: Document, nom: string): HTMLInputElement | null =>
  (doc.getElementById(nom) as HTMLInputElement | null) ??
  (doc.getElementsByName(nom)[0] as HTMLInputElement | undefined) ??
  null;

/**
 * Remplit les champs, appelle la fonction de l'élève (boîtes de dialogue neutralisées),
 * puis restaure les champs. Renvoie `undefined` si la fonction ou un champ est absent.
 */
function appelerAvecSaisies(
  doc: Document,
  win: Window,
  nomFonction: string,
  saisies: Record<string, string>,
): { vrai: boolean } | undefined {
  const fn = fonctionGlobale(win, nomFonction);
  if (!fn) return undefined;

  const champs: Array<{ champ: HTMLInputElement; ancienne: string }> = [];
  for (const [nom, valeur] of Object.entries(saisies)) {
    const champ = trouverChamp(doc, nom);
    if (!champ) return undefined;
    champs.push({ champ, ancienne: champ.value });
    champ.value = valeur;
  }

  const dialogues = win as unknown as Record<"alert" | "confirm" | "prompt", unknown>;
  const sauvegardes = {
    alert: dialogues.alert,
    confirm: dialogues.confirm,
    prompt: dialogues.prompt,
  };
  dialogues.alert = () => undefined;
  dialogues.confirm = () => false;
  dialogues.prompt = () => null;

  try {
    return { vrai: Boolean(fn.call(win)) };
  } finally {
    dialogues.alert = sauvegardes.alert;
    dialogues.confirm = sauvegardes.confirm;
    dialogues.prompt = sauvegardes.prompt;
    for (const { champ, ancienne } of champs) champ.value = ancienne;
  }
}

/** Saisies d'un critère : les clés « input_<champ> ». */
function saisiesDuCritere(critere: CritereBrut): Record<string, string> {
  const saisies: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(critere)) {
    if (cle.startsWith("input_") && cle.length > "input_".length) {
      saisies[cle.slice("input_".length)] = String(valeur);
    }
  }
  return saisies;
}

function saisiesControle(critere: CritereBrut): Record<string, string> | null {
  const controle = critere["controle_positif"];
  if (!controle || typeof controle !== "object" || Array.isArray(controle)) return null;
  const saisies: Record<string, string> = {};
  for (const [champ, valeur] of Object.entries(controle as Record<string, unknown>)) {
    saisies[champ] = String(valeur);
  }
  return Object.keys(saisies).length > 0 ? saisies : null;
}

function verificationComportement(critere: CritereBrut): VerificationCritere | null {
  const saisies = saisiesDuCritere(critere);
  const attendu = critere["expected_return"];
  if (Object.keys(saisies).length === 0 || typeof attendu !== "boolean") return null;

  const nomFonction = texte(critere["function_name"]) ?? FONCTION_PAR_DEFAUT;
  const controle = saisiesControle(critere);

  // Un test qui attend « false » est vrai pour une fonction qui répond toujours « false »
  // (le code de départ) : il faut donc aussi vérifier qu'une saisie valide est acceptée.
  if (attendu === false && !controle) return null;

  return (doc, win) => {
    if (controle) {
      const accepte = appelerAvecSaisies(doc, win, nomFonction, controle);
      if (!accepte?.vrai) return false;
    }
    const resultat = appelerAvecSaisies(doc, win, nomFonction, saisies);
    return resultat !== undefined && resultat.vrai === attendu;
  };
}

/**
 * Écritures abrégées qui portent une propriété détaillée. Un navigateur renseigne toujours la
 * propriété détaillée ; certains moteurs plus simples ne la déduisent pas de l'écriture abrégée.
 */
const ECRITURE_ABREGEE: Record<string, string> = {
  "transition-duration": "transition",
  "transition-property": "transition",
  "transition-timing-function": "transition",
  "border-style": "border",
  "border-width": "border",
  "border-color": "border",
};

const contientValeur = (valeur: string, cible: string): boolean =>
  valeur !== "" && (valeur === cible || valeur.split(/[\s,]+/).includes(cible));

function verificationCssCalcule(critere: CritereBrut): VerificationCritere | null {
  const selecteur = texte(critere["selector"]);
  const propriete = texte(critere["css_property"]);
  const attendue = texte(critere["expected_value"]);
  if (!selecteur || !propriete || !attendue) return null;

  return (doc, win) => {
    const element = doc.querySelector(selecteur);
    if (!element) return false;
    const style = win.getComputedStyle(element);
    const cible = attendue.toLowerCase();
    const valeur = style.getPropertyValue(propriete).trim().toLowerCase();
    if (valeur !== "") return contientValeur(valeur, cible);

    // Repli : propriété détaillée vide, on lit l'écriture abrégée qui la porte.
    const abregee = ECRITURE_ABREGEE[propriete];
    return abregee
      ? contientValeur(style.getPropertyValue(abregee).trim().toLowerCase(), cible)
      : false;
  };
}

const normaliserSelecteur = (selecteur: string) => selecteur.toLowerCase().replace(/\s+/g, "");

function verificationRegleCss(critere: CritereBrut): VerificationCritere | null {
  const cherche = texte(critere["css_rule_contains"]);
  if (!cherche) return null;
  const cible = normaliserSelecteur(cherche);

  return (doc) => {
    // La règle doit exister ET déclarer au moins une propriété : une règle vide ne compte pas.
    for (const feuille of Array.from(doc.styleSheets)) {
      let regles: CSSRule[] = [];
      try {
        regles = Array.from(feuille.cssRules);
      } catch {
        continue;
      }
      for (const regle of regles) {
        const style = regle as CSSStyleRule;
        if (
          typeof style.selectorText === "string" &&
          normaliserSelecteur(style.selectorText).includes(cible) &&
          style.style.length > 0
        ) {
          return true;
        }
      }
    }
    return false;
  };
}

/**
 * Interprète la déclaration d'un critère. Renvoie `null` quand elle n'est pas comprise ou
 * qu'elle serait vraie sans que l'élève ait rien fait.
 */
export function construireVerificationDeclaree(critere: CritereBrut): VerificationCritere | null {
  switch (critere["type"]) {
    case "js_function_exists": {
      const nom = texte(critere["function_name"]);
      return nom ? (_doc, win) => fonctionGlobale(win, nom) !== null : null;
    }
    case "js_test_execution":
      return verificationComportement(critere);
    case undefined:
      return verificationCssCalcule(critere) ?? verificationRegleCss(critere) ?? null;
    default:
      return null;
  }
}
