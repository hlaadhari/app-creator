/**
 * Construction du document d'évaluation formative : le même pour la page du sujet et pour les
 * tests, afin que les tests de notation exercent exactement ce que l'élève exécute.
 *
 * SEC-04 / T-17 : Pour l'évaluation dans une iframe confinée (`sandbox="allow-scripts"` sans
 * `allow-same-origin`), `construireDocumentEvaluationSandbox` injecte le harnais d'évaluation
 * directement dans le `srcdoc` et renvoie le rapport sérialisé via `parent.postMessage`.
 */

import {
  MESSAGE_CORRECTION_ENSEIGNANT,
  MESSAGE_NON_VERIFIABLE,
  type Criterion,
} from "@/lib/exercises";

export type FichiersEvaluation = Record<string, string>;

export interface CritereSerialise {
  id: string;
  label: string;
  points: number;
  fail: string;
  automatique: boolean;
  manuel?: boolean;
  raw?: Record<string, unknown>;
  checkSource?: string;
}

/** Page HTML principale : index.html, à défaut le premier fichier .html. */
export function pageParDefaut(fichiers: FichiersEvaluation): string {
  return fichiers["index.html"] !== undefined
    ? "index.html"
    : (Object.keys(fichiers).find((k) => k.endsWith(".html")) ?? "index.html");
}

/**
 * Assemble la page de l'élève : la page demandée (par défaut la page principale), avec tous les
 * .css dans <style> et tous les .js dans <script>.
 */
export function construireDocumentEvaluation(fichiers: FichiersEvaluation, page?: string): string {
  const html = fichiers[page ?? pageParDefaut(fichiers)] ?? "";
  const css = Object.entries(fichiers)
    .filter(([k]) => k.endsWith(".css"))
    .map(([, contenu]) => contenu)
    .join("\n");
  const js = Object.entries(fichiers)
    .filter(([k]) => k.endsWith(".js"))
    .map(([, contenu]) => contenu)
    .join("\n");

  const safeJs = js.replace(/<\/script>/gi, "<\\/script>");
  return `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html.replace(/<!DOCTYPE.*?>/i, "")}<script>${safeJs}</script></body></html>`;
}

/** Sérialise la liste de critères pour l'injecter dans l'iframe sandboxée sans allow-same-origin. */
export function serialiserCriteresPourSandbox(criteres: Criterion[]): CritereSerialise[] {
  return criteres.map((c) => ({
    id: c.id,
    label: c.label,
    points: c.points,
    fail: c.fail,
    automatique: c.automatique !== false,
    ...(c.manuel ? { manuel: true } : {}),
    ...(c.raw ? { raw: c.raw } : { checkSource: c.check.toString() }),
  }));
}

/**
 * Construit le `srcdoc` d'évaluation isolée (`sandbox="allow-scripts"`) incluant le script
 * d'exécution des sondes et l'envoi du rapport au parent via `postMessage`.
 */
export function construireDocumentEvaluationSandbox(
  fichiers: FichiersEvaluation,
  page: string | undefined,
  criteres: Criterion[],
  requestId: string,
): string {
  const baseDoc = construireDocumentEvaluation(fichiers, page);
  const payloadJson = JSON.stringify({
    requestId,
    criteres: serialiserCriteresPourSandbox(criteres),
    msgNonVerifiable: MESSAGE_NON_VERIFIABLE,
    msgEnseignant: MESSAGE_CORRECTION_ENSEIGNANT,
  }).replace(/<\/script>/gi, "<\\/script>");

  const harnessScript = `<script>
(function() {
  var PAYLOAD = ${payloadJson};
  var SELECTEURS_TOUJOURS_PRESENTS = { "html": true, "head": true, "body": true, ":root": true, "*": true };
  var ECRITURE_ABREGEE = {
    "transition-duration": "transition",
    "transition-property": "transition",
    "transition-timing-function": "transition",
    "border-style": "border",
    "border-width": "border",
    "border-color": "border"
  };

  function texte(v) {
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  }

  function dictionnaire(v) {
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  }

  function fonctionGlobale(win, nom) {
    var fn = win[nom];
    return typeof fn === "function" ? fn : null;
  }

  function trouverChamp(doc, nom) {
    return doc.getElementById(nom) || doc.getElementsByName(nom)[0] || null;
  }

  function dateRelative(signe, jours) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + (signe === "-" ? -jours : jours));
    var deux = function(n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + deux(d.getMonth() + 1) + "-" + deux(d.getDate());
  }

  function valeurDeChamp(valeur) {
    if (typeof valeur === "boolean") return valeur;
    var s = String(valeur);
    var m = /^([+-])(\\d{1,4})j$/.exec(s);
    return m ? dateRelative(m[1], Number(m[2])) : s;
  }

  function appelerAvecSaisies(doc, win, nomFonction, saisies) {
    var fn = fonctionGlobale(win, nomFonction);
    if (!fn) return undefined;
    var champs = [];
    var entries = Object.entries(saisies);
    for (var i = 0; i < entries.length; i++) {
      var nom = entries[i][0];
      var val = entries[i][1];
      var champ = trouverChamp(doc, nom);
      if (!champ) return undefined;
      champs.push({ champ: champ, ancienne: champ.value });
      champ.value = val;
    }
    var sauvegardes = { alert: win.alert, confirm: win.confirm, prompt: win.prompt };
    win.alert = function() {};
    win.confirm = function() { return false; };
    win.prompt = function() { return null; };
    try {
      return { vrai: Boolean(fn.call(win)) };
    } finally {
      win.alert = sauvegardes.alert;
      win.confirm = sauvegardes.confirm;
      win.prompt = sauvegardes.prompt;
      for (var j = 0; j < champs.length; j++) {
        champs[j].champ.value = champs[j].ancienne;
      }
    }
  }

  function executerCas(doc, win, cas, defaut) {
    var saisies = dictionnaire(cas.saisies) || {};
    var etat = dictionnaire(cas.etat);
    var txt = dictionnaire(cas.texte);
    var nomFonction = typeof cas.appel === "string" ? cas.appel : defaut;
    var fn = nomFonction ? fonctionGlobale(win, nomFonction) : null;
    if (!fn) return false;

    var touches = new Map();
    var retenir = function(nom) {
      var champ = trouverChamp(doc, nom);
      if (champ && !touches.has(nom)) {
        touches.set(nom, {
          champ: champ,
          valeur: champ.value,
          coche: champ.checked,
          texte: champ.textContent || ""
        });
      }
      return champ;
    };

    var sauvegardes = { alert: win.alert, confirm: win.confirm, prompt: win.prompt };
    try {
      var sEntries = Object.entries(saisies);
      for (var i = 0; i < sEntries.length; i++) {
        var c = retenir(sEntries[i][0]);
        if (!c) return false;
        var v = valeurDeChamp(sEntries[i][1]);
        if (typeof v === "boolean") c.checked = v;
        else c.value = v;
      }
      var extraKeys = Object.keys(etat || {}).concat(Object.keys(txt || {}));
      for (var k = 0; k < extraKeys.length; k++) {
        if (!retenir(extraKeys[k])) return false;
      }
      win.alert = function() {};
      win.confirm = function() { return false; };
      win.prompt = function() { return null; };
      var retour = Boolean(fn.call(win));
      if (typeof cas.attendu === "boolean" && retour !== cas.attendu) return false;
      var eEntries = Object.entries(etat || {});
      for (var m = 0; m < eEntries.length; m++) {
        var ch = touches.get(eEntries[m][0]);
        if (!ch) return false;
        var att = eEntries[m][1];
        if (typeof att === "boolean" ? ch.champ.checked !== att : ch.champ.value !== String(att)) {
          return false;
        }
      }
      var tEntries = Object.entries(txt || {});
      for (var n = 0; n < tEntries.length; n++) {
        var chT = touches.get(tEntries[n][0]);
        if (((chT && chT.champ.textContent) || "").trim() !== String(tEntries[n][1])) return false;
      }
      return true;
    } catch (_e) {
      return false;
    } finally {
      win.alert = sauvegardes.alert;
      win.confirm = sauvegardes.confirm;
      win.prompt = sauvegardes.prompt;
      touches.forEach(function(item) {
        item.champ.value = item.valeur;
        item.champ.checked = item.coche;
        if (item.champ.textContent !== item.texte) item.champ.textContent = item.texte;
      });
    }
  }

  function contientValeur(valeur, cible) {
    return valeur !== "" && (valeur === cible || valeur.split(/[\\s,]+/).indexOf(cible) !== -1);
  }

  function evaluerRaw(raw, doc, win) {
    if (!raw || typeof raw !== "object") return false;
    var type = raw.type;
    if (type === "js_function_exists") {
      var nom = texte(raw.function_name);
      return nom ? fonctionGlobale(win, nom) !== null : false;
    }
    if (type === "js_test_execution") {
      var saisies = {};
      Object.keys(raw).forEach(function(k) {
        if (k.indexOf("input_") === 0 && k.length > 6) {
          saisies[k.slice(6)] = String(raw[k]);
        }
      });
      var attendu = raw.expected_return;
      if (Object.keys(saisies).length === 0 || typeof attendu !== "boolean") return false;
      var nomFn = texte(raw.function_name) || "verif";
      var ctrlObj = dictionnaire(raw.controle_positif);
      var controle = null;
      if (ctrlObj) {
        controle = {};
        Object.keys(ctrlObj).forEach(function(ck) { controle[ck] = String(ctrlObj[ck]); });
      }
      if (attendu === false && (!controle || Object.keys(controle).length === 0)) return false;
      if (controle && Object.keys(controle).length > 0) {
        var acc = appelerAvecSaisies(doc, win, nomFn, controle);
        if (!acc || !acc.vrai) return false;
      }
      var res = appelerAvecSaisies(doc, win, nomFn, saisies);
      return res !== undefined && res.vrai === attendu;
    }
    if (type === "js_test_cas") {
      var cas = raw.cas;
      if (!Array.isArray(cas) || cas.length === 0) return false;
      var defaut = texte(raw.function_name);
      return cas.every(function(c) { return executerCas(doc, win, c, defaut); });
    }
    if (type === undefined) {
      var selecteur = texte(raw.selector);
      var propriete = texte(raw.css_property);
      var attendue = texte(raw.expected_value);
      if (selecteur && propriete && attendue) {
        var el = doc.querySelector(selecteur);
        if (!el) return false;
        var style = win.getComputedStyle(el);
        var cible = attendue.toLowerCase();
        var valeur = style.getPropertyValue(propriete).trim().toLowerCase();
        if (valeur !== "") return contientValeur(valeur, cible);
        var abregee = ECRITURE_ABREGEE[propriete];
        return abregee ? contientValeur(style.getPropertyValue(abregee).trim().toLowerCase(), cible) : false;
      }
      var cherche = texte(raw.css_rule_contains);
      if (cherche) {
        var cibleCss = cherche.toLowerCase().replace(/\\s+/g, "");
        var feuilles = Array.from(doc.styleSheets || []);
        for (var i = 0; i < feuilles.length; i++) {
          var regles = [];
          try { regles = Array.from(feuilles[i].cssRules || []); } catch (_e) { continue; }
          for (var j = 0; j < regles.length; j++) {
            var r = regles[j];
            if (typeof r.selectorText === "string" &&
                r.selectorText.toLowerCase().replace(/\\s+/g, "").indexOf(cibleCss) !== -1 &&
                r.style && r.style.length > 0) {
              return true;
            }
          }
        }
        return false;
      }
    }
    var probe = dictionnaire(raw.sonde);
    if (probe) {
      if (probe.type === "dom_selector") {
        var sel = texte(probe.selector);
        if (!sel || SELECTEURS_TOUJOURS_PRESENTS[sel.toLowerCase()]) return false;
        var els = doc.querySelectorAll(sel);
        if (probe.minCount && els.length < Number(probe.minCount)) return false;
        return els.length > 0;
      }
      if (probe.type === "css_property") {
        var selCss = texte(probe.selector);
        var propCss = texte(probe.property);
        if (!selCss || !propCss) return false;
        var elem = doc.querySelector(selCss);
        if (!elem) return false;
        var valCss = win.getComputedStyle(elem).getPropertyValue(propCss).trim();
        if (probe.expectedValue) return valCss.indexOf(String(probe.expectedValue)) !== -1;
        if (probe.isGreaterThanZero) return parseFloat(valCss) > 0;
        return valCss.length > 0;
      }
    }
    return false;
  }

  function evaluerCritere(c, doc, win) {
    var automatique = c.automatique !== false;
    var ok = false;
    if (automatique) {
      try {
        if (c.raw) {
          ok = Boolean(evaluerRaw(c.raw, doc, win));
        } else if (c.checkSource) {
          var cssHelper = function(w, el, prop) {
            return el ? w.getComputedStyle(el).getPropertyValue(prop).trim() : "";
          };
          var fn = new Function("css", "return (" + c.checkSource + ");")(cssHelper);
          ok = Boolean(fn(doc, win));
        }
      } catch (_err) {
        ok = false;
      }
    }
    var res = {
      id: c.id,
      label: c.label,
      points: c.points,
      ok: ok,
      automatique: automatique,
      message: c.manuel
        ? PAYLOAD.msgEnseignant
        : !automatique
          ? PAYLOAD.msgNonVerifiable
          : ok
            ? "Validé"
            : c.fail
    };
    if (c.manuel) res.manuel = true;
    return res;
  }

  function runAndPost() {
    var results = PAYLOAD.criteres.map(function(c) {
      return evaluerCritere(c, document, window);
    });
    parent.postMessage({
      type: "LABO_STI_EVAL_RESULT",
      requestId: PAYLOAD.requestId,
      results: results
    }, "*");
  }

  if (document.readyState === "complete") {
    runAndPost();
  } else {
    window.addEventListener("load", runAndPost, { once: true });
  }
})();
</script>`;

  if (baseDoc.includes("</body>")) {
    return baseDoc.replace(/<\/body>/i, `${harnessScript}</body>`);
  }
  return `${baseDoc}${harnessScript}`;
}
