import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { contentSubjects } from "@/lib/content/all-subjects";
import { construireDocumentEvaluation } from "@/lib/evaluation/document-evaluation";
import { runCriteria, score } from "@/lib/exercises";

/**
 * Banc de test de la notation (AGENTS.md : 2 corrigés valides + 1 invalide testés avant
 * publication). La page de l'élève est assemblée par le même constructeur que l'application,
 * puis chaque critère est évalué sur le résultat obtenu.
 */

const CONTENT_DIR = path.resolve(process.cwd(), "content");

type Fichiers = Record<string, string>;

function lireVariante(id: string, variante: "initial" | "solution"): Fichiers {
  const dossier = path.join(CONTENT_DIR, id, variante);
  const fichiers: Fichiers = {};
  for (const nom of fs.readdirSync(dossier)) {
    const chemin = path.join(dossier, nom);
    if (fs.statSync(chemin).isFile()) fichiers[nom] = fs.readFileSync(chemin, "utf-8");
  }
  return fichiers;
}

function evaluer(id: string, fichiers: Fichiers) {
  const sujet = contentSubjects.find((s) => s.id === id);
  if (!sujet) throw new Error(`Sujet inconnu : ${id}`);

  const dom = new JSDOM(construireDocumentEvaluation(fichiers), { runScripts: "dangerously" });
  try {
    const resultats = runCriteria(sujet.criteria, dom.window.document, dom.window as never);
    const bilan = score(resultats);
    return {
      ...bilan,
      reussis: resultats.filter((r) => r.ok).map((r) => r.id),
      echoues: resultats.filter((r) => !r.ok).map((r) => r.id),
    };
  } finally {
    dom.window.close();
  }
}

/** Corrigé officiel dont un fichier est remplacé : sert à fabriquer une variante. */
const avec = (id: string, remplacements: Fichiers): Fichiers => ({
  ...lireVariante(id, "solution"),
  ...remplacements,
});

describe("Banc de test de la notation : ex-js-01 (JavaScript)", () => {
  const ID = "ex-js-01";
  const TOUS = [
    "c1_verif_exists",
    "c2_length_control",
    "c3_reject_short",
    "c4_reject_alpha",
    "c5_accept_valid",
  ];

  it("le corrigé officiel obtient tous les points, tous les critères étant vérifiables", () => {
    const r = evaluer(ID, lireVariante(ID, "solution"));
    expect(r.got).toBe(r.total);
    expect(r.verifiable).toBe(r.total);
    expect(r.echoues).toEqual([]);
  });

  it("le code de départ ne gagne qu'une consigne sur cinq (la déclaration de verif)", () => {
    const r = evaluer(ID, lireVariante(ID, "initial"));
    expect(r.reussis).toEqual(["c1_verif_exists"]);
    expect(r.got / r.total).toBeLessThanOrEqual(0.2);
  });

  it("une deuxième solution valide, par expression régulière, obtient tous les points", () => {
    const r = evaluer(
      ID,
      avec(ID, {
        "controle.js": `function verif() {
          const v = document.getElementById("cin").value;
          if (!/^[0-9]{8}$/.test(v)) { alert("CIN invalide"); return false; }
          return true;
        }`,
      }),
    );
    expect(r.echoues).toEqual([]);
    expect(r.got).toBe(20);
  });

  it("une troisième solution valide, lisant le champ par le formulaire, obtient tous les points", () => {
    const r = evaluer(
      ID,
      avec(ID, {
        "controle.js": `function verif() {
          const cin = document.getElementById("cin");
          const ok = cin.value.length === 8 && !isNaN(Number(cin.value)) && !/[^0-9]/.test(cin.value);
          if (!ok) cin.focus();
          return ok;
        }`,
      }),
    );
    expect(r.echoues).toEqual([]);
  });

  describe("solutions invalides : seuls les critères concernés échouent", () => {
    const cas: Array<[string, string, string[]]> = [
      [
        "sans contrôle de longueur",
        "function verif() { return /^[0-9]+$/.test(document.getElementById('cin').value); }",
        ["c2_length_control", "c3_reject_short"],
      ],
      [
        "sans contrôle numérique",
        "function verif() { return document.getElementById('cin').value.length === 8; }",
        ["c4_reject_alpha"],
      ],
      [
        "accepte tout",
        "function verif() { return true; }",
        ["c2_length_control", "c3_reject_short", "c4_reject_alpha"],
      ],
      ["refuse tout (code de départ)", "function verif() { return false; }", TOUS.slice(1)],
      [
        "fonction mal nommée",
        "function verifier() { return /^[0-9]{8}$/.test(document.getElementById('cin').value); }",
        TOUS,
      ],
      [
        "ne lit pas le champ (valeur figée)",
        "function verif() { return /^[0-9]{8}$/.test('12345678'); }",
        ["c2_length_control", "c3_reject_short", "c4_reject_alpha"],
      ],
    ];

    it.each(cas)("%s", (_nom, code, attendusEnEchec) => {
      const r = evaluer(ID, avec(ID, { "controle.js": code }));
      expect(r.echoues).toEqual(attendusEnEchec);
    });
  });

  it("une erreur d'exécution dans la fonction ne valide aucun critère de comportement", () => {
    const r = evaluer(
      ID,
      avec(ID, { "controle.js": "function verif() { throw new Error('x'); }" }),
    );
    expect(r.reussis).toEqual(["c1_verif_exists"]);
  });

  it("un champ #cin absent n'est jamais compté comme une réussite", () => {
    const r = evaluer(ID, {
      "formulaire.html": "<html><body><p>pas de champ</p></body></html>",
      "controle.js": "function verif() { return true; }",
    });
    expect(r.reussis).toEqual(["c1_verif_exists"]);
  });
});

describe("Banc de test de la notation : ex-html-css-01 (CSS)", () => {
  const ID = "ex-html-css-01";
  const TOUS = [
    "c1_display_inline_block",
    "c2_width",
    "c3_border",
    "c4_border_radius",
    "c5_transition",
    "c6_hover_rule",
  ];

  it("le corrigé officiel obtient tous les points, tous les critères étant vérifiables", () => {
    const r = evaluer(ID, lireVariante(ID, "solution"));
    expect(r.got).toBe(r.total);
    expect(r.verifiable).toBe(r.total);
    expect(r.echoues).toEqual([]);
  });

  it("le code de départ ne gagne aucun point", () => {
    const r = evaluer(ID, lireVariante(ID, "initial"));
    expect(r.got).toBe(0);
    expect(r.echoues).toEqual(TOUS);
  });

  it("une deuxième solution valide, en propriétés détaillées, obtient tous les points", () => {
    const r = evaluer(
      ID,
      avec(ID, {
        "style.css": `
          h1 { transition-property: color; transition-duration: 0.3s; }
          h1:hover { color: #cc0000; }
          .L1 { display: inline-block; width: 250px; }
          .b1 { border-width: 2px; border-style: solid; border-color: #0066cc; border-radius: 8px; }
        `,
      }),
    );
    expect(r.echoues).toEqual([]);
    expect(r.got).toBe(20);
  });

  describe("solutions invalides : seuls les critères concernés échouent", () => {
    const base = lireVariante(ID, "solution")["style.css"] ?? "";
    const cas: Array<[string, string, string[]]> = [
      ["sans coins arrondis", base.replace("border-radius: 8px;", ""), ["c4_border_radius"]],
      ["mauvaise largeur", base.replace("width: 250px;", "width: 300px;"), ["c2_width"]],
      [
        "règle de survol vide",
        base.replace(/h1:hover\s*\{[^}]*\}/, "h1:hover { }"),
        ["c6_hover_rule"],
      ],
      ["pas de transition", base.replace("transition: all 0.3s ease;", ""), ["c5_transition"]],
      [
        "blocs non alignés",
        base.replace("display: inline-block;", "display: block;"),
        ["c1_display_inline_block"],
      ],
      ["feuille de style vide", "", TOUS],
    ];

    it.each(cas)("%s", (_nom, css, attendusEnEchec) => {
      const r = evaluer(ID, avec(ID, { "style.css": css }));
      expect(r.echoues).toEqual(attendusEnEchec);
    });
  });
});

describe("Banc de test de la notation : sujets pas encore vérifiables", () => {
  // Ces sujets contiennent encore des critères sans vérification réelle (PHP, SQL, JavaScript des
  // examens). Cette liste doit rétrécir : un sujet y entre tant que son banc n'est pas écrit.
  const EN_ATTENTE = [
    "ex-sql-01",
    "tp-fs-01",
    "tp-fs-02",
    "exam-bac2018-test-drive",
    "exam-bac2023-location-habits",
  ];

  it.each(EN_ATTENTE)(
    "%s : aucun point gagné avec le code de départ, jamais de faux 20/20",
    (id) => {
      const r = evaluer(id, lireVariante(id, "initial"));
      expect(r.got / r.total).toBeLessThan(0.5);
      expect(r.nonVerifiable).toBeGreaterThan(0);
    },
  );
});
