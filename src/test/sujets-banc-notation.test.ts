import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { contentSubjects } from "@/lib/content/all-subjects";
import { construireDocumentEvaluation } from "@/lib/evaluation/document-evaluation";
import { evaluerParPage } from "@/lib/evaluation/evaluation-par-page";
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

async function evaluer(id: string, fichiers: Fichiers) {
  const sujet = contentSubjects.find((s) => s.id === id);
  if (!sujet) throw new Error(`Sujet inconnu : ${id}`);

  // Même orchestration que l'application : chaque critère est évalué sur sa page.
  const resultats = await evaluerParPage(sujet.criteria, fichiers, async (page, criteres) => {
    const dom = new JSDOM(construireDocumentEvaluation(fichiers, page), {
      runScripts: "dangerously",
    });
    try {
      return runCriteria(criteres, dom.window.document, dom.window as never);
    } finally {
      dom.window.close();
    }
  });

  const bilan = score(resultats);
  return {
    ...bilan,
    reussis: resultats.filter((r) => r.ok).map((r) => r.id),
    echoues: resultats.filter((r) => !r.ok).map((r) => r.id),
  };
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

  it("le corrigé officiel obtient tous les points, tous les critères étant vérifiables", async () => {
    const r = await evaluer(ID, lireVariante(ID, "solution"));
    expect(r.got).toBe(r.total);
    expect(r.verifiable).toBe(r.total);
    expect(r.echoues).toEqual([]);
  });

  it("le code de départ ne gagne qu'une consigne sur cinq (la déclaration de verif)", async () => {
    const r = await evaluer(ID, lireVariante(ID, "initial"));
    expect(r.reussis).toEqual(["c1_verif_exists"]);
    expect(r.got / r.total).toBeLessThanOrEqual(0.2);
  });

  it("une deuxième solution valide, par expression régulière, obtient tous les points", async () => {
    const r = await evaluer(
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

  it("une troisième solution valide, lisant le champ par le formulaire, obtient tous les points", async () => {
    const r = await evaluer(
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

    it.each(cas)("%s", async (_nom, code, attendusEnEchec) => {
      const r = await evaluer(ID, avec(ID, { "controle.js": code }));
      expect(r.echoues).toEqual(attendusEnEchec);
    });
  });

  it("une erreur d'exécution dans la fonction ne valide aucun critère de comportement", async () => {
    const r = await evaluer(
      ID,
      avec(ID, { "controle.js": "function verif() { throw new Error('x'); }" }),
    );
    expect(r.reussis).toEqual(["c1_verif_exists"]);
  });

  it("un champ #cin absent n'est jamais compté comme une réussite", async () => {
    const r = await evaluer(ID, {
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

  it("le corrigé officiel obtient tous les points, tous les critères étant vérifiables", async () => {
    const r = await evaluer(ID, lireVariante(ID, "solution"));
    expect(r.got).toBe(r.total);
    expect(r.verifiable).toBe(r.total);
    expect(r.echoues).toEqual([]);
  });

  it("le code de départ ne gagne aucun point", async () => {
    const r = await evaluer(ID, lireVariante(ID, "initial"));
    expect(r.got).toBe(0);
    expect(r.echoues).toEqual(TOUS);
  });

  it("une deuxième solution valide, en propriétés détaillées, obtient tous les points", async () => {
    const r = await evaluer(
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

    it.each(cas)("%s", async (_nom, css, attendusEnEchec) => {
      const r = await evaluer(ID, avec(ID, { "style.css": css }));
      expect(r.echoues).toEqual(attendusEnEchec);
    });
  });
});

describe("Banc de test de la notation : examens à plusieurs pages", () => {
  const NOUVEAUX = [
    "exam-bac2025-droits-acces",
    "exam-bac2026-bijoux-aurythia",
    "exam-bac2026-croisieres-marivana",
  ];
  const ANCIENS = ["exam-bac2018-test-drive", "exam-bac2023-location-habits"];

  it.each(NOUVEAUX)(
    "%s : le corrigé gagne tous les points vérifiables, le code de départ aucun",
    async (id) => {
      const solution = await evaluer(id, lireVariante(id, "solution"));
      expect(solution.verifiable).toBeGreaterThan(0);
      expect(solution.got).toBe(solution.verifiable);

      const depart = await evaluer(id, lireVariante(id, "initial"));
      expect(depart.got).toBe(0);
    },
  );

  it.each(NOUVEAUX)(
    "%s : le corrigé gagne des points sur des pages autres que la page principale",
    async (id) => {
      const sujet = contentSubjects.find((s) => s.id === id)!;
      const solution = await evaluer(id, lireVariante(id, "solution"));
      const autresPages = sujet.criteria.filter(
        (c) => c.automatique !== false && c.fichier && c.fichier !== "index.html",
      );

      // Avant l'évaluation page par page, ces critères étaient évalués sur index.html et perdus.
      expect(autresPages.length).toBeGreaterThan(0);
      for (const c of autresPages) expect(solution.reussis, c.id).toContain(c.id);
    },
  );

  it.each(ANCIENS)(
    "%s : le corrigé gagne les points vérifiables ; le code fourni en donne au plus 20 %",
    async (id) => {
      const solution = await evaluer(id, lireVariante(id, "solution"));
      expect(solution.got).toBe(solution.verifiable);

      const depart = await evaluer(id, lireVariante(id, "initial"));
      // Le formulaire et le style sont déjà fournis : ces points sont donnés par l'énoncé.
      expect(depart.got / depart.total).toBeLessThanOrEqual(0.2);
    },
  );

  describe("solutions invalides : les points suivent ce que l'élève a réellement fait", () => {
    const ID = "exam-bac2025-droits-acces";

    it("une page supprimée du projet fait perdre les critères de cette page", async () => {
      const complet = await evaluer(ID, lireVariante(ID, "solution"));
      const fichiers = lireVariante(ID, "solution");
      delete fichiers["utilisateur.html"];

      const sans = await evaluer(ID, fichiers);
      const sujet = contentSubjects.find((s) => s.id === ID)!;
      const critDeLaPage = sujet.criteria
        .filter((c) => c.fichier === "utilisateur.html" && c.automatique !== false)
        .map((c) => c.id);

      expect(critDeLaPage.length).toBeGreaterThan(0);
      for (const idCritere of critDeLaPage) expect(sans.echoues).toContain(idCritere);
      expect(sans.got).toBeLessThan(complet.got);
      // Les autres pages ne sont pas pénalisées.
      expect(sans.reussis.length).toBeGreaterThan(0);
    });

    it("une feuille de style vide fait perdre les critères CSS mais pas ceux du HTML", async () => {
      const complet = await evaluer(ID, lireVariante(ID, "solution"));
      const sans = await evaluer(ID, avec(ID, { "mesStyles.css": "" }));

      expect(sans.got).toBeLessThan(complet.got);
      expect(sans.got).toBeGreaterThan(0);
    });

    it("une page vide ne rapporte rien", async () => {
      const fichiers = lireVariante(ID, "solution");
      for (const nom of Object.keys(fichiers)) {
        if (nom.endsWith(".html")) fichiers[nom] = "<html><body></body></html>";
      }
      const r = await evaluer(ID, fichiers);
      expect(r.got).toBeLessThan(2);
    });
  });
});

describe("Banc de test de la notation : JavaScript des examens (js_test_cas)", () => {
  const ID25 = "exam-bac2025-droits-acces";
  const ID26B = "exam-bac2026-bijoux-aurythia";
  const ID26C = "exam-bac2026-croisieres-marivana";

  const lireJs = (id: string, fichier: string) => lireVariante(id, "solution")[fichier] as string;
  /** Remplace une fonction (de `function nom` jusqu'à son accolade fermante de tête de ligne). */
  const remplacerFonction = (code: string, nom: string, nouvelle: string) => {
    const debut = code.indexOf(`function ${nom}(`);
    expect(debut, `fonction ${nom}`).toBeGreaterThanOrEqual(0);
    const fin = code.indexOf("\n}\n", debut) + 3;
    return code.slice(0, debut) + nouvelle + "\n" + code.slice(fin);
  };

  describe("Bac 2025 – verif1, verif2, choix1-3", () => {
    const js = () => lireJs(ID25, "mesControles.js");

    it("le corrigé gagne les critères JavaScript, le code de départ aucun", async () => {
      const sol = await evaluer(ID25, lireVariante(ID25, "solution"));
      expect(sol.reussis).toEqual(expect.arrayContaining(["EX25-07", "EX25-10"]));
      const dep = await evaluer(ID25, lireVariante(ID25, "initial"));
      expect(dep.echoues).toEqual(expect.arrayContaining(["EX25-07", "EX25-10"]));
    });

    it("une réécriture valide (expressions régulières, autre logique) gagne les mêmes points", async () => {
      let code = remplacerFonction(
        js(),
        "verif1",
        `function verif1() {
  var id = document.getElementById("idUtil").value;
  var nom = document.getElementById("nomPrenom").value;
  if (!/^U\\d{3}$/.test(id) || !/^[A-Za-z ]{5,50}$/.test(nom)) {
    alert("Saisie invalide");
    return false;
  }
  return true;
}`,
      );
      code = remplacerFonction(
        code,
        "choix2",
        `function choix2() {
  var lecture = document.getElementById("lecture");
  if (lecture.checked === false) {
    document.getElementById("ecriture").checked = lecture.checked;
    document.getElementById("impression").checked = lecture.checked;
  }
}`,
      );
      const r = await evaluer(ID25, avec(ID25, { "mesControles.js": code }));
      expect(r.reussis).toEqual(expect.arrayContaining(["EX25-07", "EX25-10"]));
    });

    it("verif1 qui accepte tout, ou qui refuse tout, ne gagne rien", async () => {
      for (const corps of ["return true;", "return false;"]) {
        const code = remplacerFonction(js(), "verif1", `function verif1() { ${corps} }`);
        const r = await evaluer(ID25, avec(ID25, { "mesControles.js": code }));
        expect(r.echoues, corps).toContain("EX25-07");
      }
    });

    it("un choix2 qui décoche toujours, ou un verif2 qui ignore les droits, fait perdre EX25-10", async () => {
      const toujoursDecoche = remplacerFonction(
        js(),
        "choix2",
        `function choix2() {
  document.getElementById("ecriture").checked = false;
  document.getElementById("impression").checked = false;
}`,
      );
      const r1 = await evaluer(ID25, avec(ID25, { "mesControles.js": toujoursDecoche }));
      expect(r1.echoues).toContain("EX25-10");

      const sansDroits = remplacerFonction(
        js(),
        "verif2",
        `function verif2() { return document.getElementById("doc").value !== ""; }`,
      );
      const r2 = await evaluer(ID25, avec(ID25, { "mesControles.js": sansDroits }));
      expect(r2.echoues).toContain("EX25-10");
    });
  });

  describe("Bac 2026 Bijoux – valide1, valide2", () => {
    const js = () => lireJs(ID26B, "mesControles.js");

    it("le corrigé gagne les critères JavaScript, le code de départ aucun", async () => {
      const sol = await evaluer(ID26B, lireVariante(ID26B, "solution"));
      expect(sol.reussis).toEqual(expect.arrayContaining(["EX26B-06", "EX26B-10"]));
      const dep = await evaluer(ID26B, lireVariante(ID26B, "initial"));
      expect(dep.echoues).toEqual(expect.arrayContaining(["EX26B-06", "EX26B-10"]));
    });

    it("une réécriture valide de valide1 gagne EX26B-06", async () => {
      const code = remplacerFonction(
        js(),
        "valide1",
        `function valide1() {
  var id = document.getElementById("idBij").value;
  var prix = parseFloat(document.getElementById("prix").value);
  var metaux = ["c1", "c2", "c3"].filter(function (c) {
    return document.getElementById(c).checked;
  });
  if (!/^[a-z]{2}[0-9]{3}$/i.test(id)) return false;
  if (isNaN(prix) || prix < 100) return false;
  return metaux.length > 0;
}`,
      );
      const r = await evaluer(ID26B, avec(ID26B, { "mesControles.js": code }));
      expect(r.reussis).toContain("EX26B-06");
    });

    it("valide1 sans contrôle du prix ou valide2 qui accepte une finition de 6 perdent leurs critères", async () => {
      const sansPrix = remplacerFonction(
        js(),
        "valide1",
        `function valide1() {
  var id = document.getElementById("idBij").value;
  var coche = ["c1", "c2", "c3"].some(function (c) { return document.getElementById(c).checked; });
  return /^[A-Za-z]{2}[0-9]{3}$/.test(id) && coche;
}`,
      );
      const r1 = await evaluer(ID26B, avec(ID26B, { "mesControles.js": sansPrix }));
      expect(r1.echoues).toContain("EX26B-06");

      const finitionLarge = js().replace("Number(finition) > 5", "Number(finition) > 6");
      expect(finitionLarge).not.toBe(js());
      const r2 = await evaluer(ID26B, avec(ID26B, { "mesControles.js": finitionLarge }));
      expect(r2.echoues).toContain("EX26B-10");
    });
  });

  describe("Bac 2026 Croisières – verif1, nombres, verif2", () => {
    const js = () => lireJs(ID26C, "controles2.js");

    it("le corrigé gagne les critères JavaScript, le code de départ aucun", async () => {
      const sol = await evaluer(ID26C, lireVariante(ID26C, "solution"));
      expect(sol.reussis).toEqual(expect.arrayContaining(["EX26C-07", "EX26C-11"]));
      const dep = await evaluer(ID26C, lireVariante(ID26C, "initial"));
      expect(dep.echoues).toEqual(expect.arrayContaining(["EX26C-07", "EX26C-11"]));
    });

    it("une comparaison de dates écrite autrement (chaînes ISO) gagne EX26C-07", async () => {
      const code = remplacerFonction(
        js(),
        "verif1",
        `function verif1() {
  var dest = document.getElementById("dest").value;
  var d1 = document.getElementById("DD").value;
  var d2 = document.getElementById("DF").value;
  var aujourdhui = new Date().toLocaleDateString("sv-SE");
  if (dest === "" || d1 === "" || d2 === "") return false;
  if (d1 <= aujourdhui) return false;
  return d2 > d1;
}`,
      );
      const r = await evaluer(ID26C, avec(ID26C, { "controles2.js": code }));
      expect(r.reussis).toContain("EX26C-07");
    });

    it("accepter la date du jour, ou afficher un mauvais total, fait perdre les critères", async () => {
      const accepteAujourdhui = js().replace("<= aujourdhui", "< aujourdhui");
      expect(accepteAujourdhui).not.toBe(js());
      const r1 = await evaluer(ID26C, avec(ID26C, { "controles2.js": accepteAujourdhui }));
      expect(r1.echoues).toContain("EX26C-07");

      const mauvaisTotal = js().replace('.value + "/10"', '.value + "/20"');
      expect(mauvaisTotal).not.toBe(js());
      const r2 = await evaluer(ID26C, avec(ID26C, { "controles2.js": mauvaisTotal }));
      expect(r2.echoues).toContain("EX26C-11");
    });
  });

  it("les critères PHP/SQL des 3 examens sont déclarés « corrigés par l'enseignant », jamais gagnés", async () => {
    for (const id of [ID25, ID26B, ID26C]) {
      const sujet = contentSubjects.find((c) => c.id === id)!;
      const manuels = sujet.criteria.filter((c) => c.manuel);
      expect(manuels.length, id).toBe(4);
      const sol = await evaluer(id, lireVariante(id, "solution"));
      for (const c of manuels) expect(sol.reussis, `${id} ${c.id}`).not.toContain(c.id);
      // Tout critère non vérifiable est explicitement déclaré : rien d'implicite.
      expect(
        sujet.criteria.filter((c) => c.automatique === false && !c.manuel),
        id,
      ).toEqual([]);
    }
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
    async (id) => {
      const r = await evaluer(id, lireVariante(id, "initial"));
      expect(r.got / r.total).toBeLessThan(0.5);
      expect(r.nonVerifiable).toBeGreaterThan(0);
    },
  );
});
