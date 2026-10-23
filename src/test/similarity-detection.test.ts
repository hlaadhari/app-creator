import { describe, it, expect } from "vitest";
import {
  normaliserContenuCode,
  supprimerCommentaires,
  tokeniserCode,
} from "@/lib/similarity/normalizer";
import {
  genererShingles,
  calculerSimilariteJaccard,
  calculerLcsRatio,
  calculerScoreSimilariteTokens,
  calculerSimilariteTexte,
} from "@/lib/similarity/shingling";
import { comparerDeuxCopies, analyserSimilariteClasse } from "@/lib/similarity/comparator";
import type { StudentCopyData } from "@/lib/similarity/types";

describe("Moteur d'analyse de similarité & Détection anti-plagiat (PRD F-65 / Issue #36)", () => {
  describe("1. Normalisation & Tokenisation Multi-langage", () => {
    it("doit supprimer les commentaires et normaliser les espaces en JS", () => {
      const codeAvecCommentaires = `
        // Validation CIN élève
        function verifierSaisie(cin) {
          /* Vérification de la longueur */
          if (cin.length !== 8) {
            return false; // Invalide
          }
          return true;
        }
      `;
      const codePropre = `
        function verifierSaisie(cin) {
          if (cin.length !== 8) {
            return false;
          }
          return true;
        }
      `;

      const tokens1 = normaliserContenuCode(codeAvecCommentaires, "script.js");
      const tokens2 = normaliserContenuCode(codePropre, "script.js");

      expect(tokens1).toEqual(tokens2);
    });

    it("doit supprimer les commentaires HTML et CSS", () => {
      const html1 = `<!-- Header --> <div class="card"> <h1>Titre</h1> </div>`;
      const html2 = `<div class="card"><h1>Titre</h1></div>`;

      const tokensHtml1 = normaliserContenuCode(html1, "index.html");
      const tokensHtml2 = normaliserContenuCode(html2, "index.html");
      expect(tokensHtml1).toEqual(tokensHtml2);

      const css1 = `/* Theme principal */ .box { color: red; /* test */ }`;
      const css2 = `.box { color: red; }`;
      const tokensCss1 = normaliserContenuCode(css1, "style.css");
      const tokensCss2 = normaliserContenuCode(css2, "style.css");
      expect(tokensCss1).toEqual(tokensCss2);
    });

    it("neutralise les commentaires HTML imbriqués ou non fermés sans laisser de séquence <!-- (CodeQL #4)", () => {
      const htmlImbrique = `<!<!-- commentaire interne -->-- commentaire reconstitué --><div>Contenu</div><!-- non fermé`;
      const propre = supprimerCommentaires(htmlImbrique, "index.html");

      expect(propre).not.toContain("<!--");
      expect(propre).not.toContain("-->");
      expect(propre).toContain("<div>Contenu</div>");
    });

    it("doit normaliser les renommages de variables vers des identifiants canoniques", () => {
      const codeA = `
        const monForm = document.querySelector("#form");
        const valCIN = monForm.elements["cin"].value;
        if (valCIN.length !== 8) {
          afficherErreur(valCIN);
        }
      `;

      const codeB = `
        const f = document.querySelector("#form");
        const x = f.elements["cin"].value;
        if (x.length !== 8) {
          afficherErreur(x);
        }
      `;

      const tokensA = normaliserContenuCode(codeA, "script.js");
      const tokensB = normaliserContenuCode(codeB, "script.js");

      // Les deux flux de tokens normalisés doivent être rigoureusement identiques
      expect(tokensA).toEqual(tokensB);
    });
  });

  describe("2. Calcul de similarité (Jaccard, LCS & Score composite)", () => {
    it("doit donner 100% de similarité pour des codes identiques", () => {
      const code = `
        function calculerTotal(items) {
          let sum = 0;
          for (let i = 0; i < items.length; i++) {
            sum += items[i].prix;
          }
          return sum;
        }
      `;

      const sim = calculerSimilariteTexte(code, code, "script.js");
      expect(sim.similarity).toBe(100);
      expect(sim.suspectSegmentsCount).toBeGreaterThanOrEqual(1);
    });

    it("doit donner une similarité très faible pour des codes totalement distincts", () => {
      const codeA = `
        function additionner(a, b) {
          return a + b;
        }
      `;

      const codeB = `
        class GestionnaireBDD {
          connecter(hote, port) {
            this.connexion = new Socket(hote, port);
            return this.connexion.ouvrir();
          }
        }
      `;

      const sim = calculerSimilariteTexte(codeA, codeB, "script.js");
      expect(sim.similarity).toBeLessThan(35);
    });

    it("gère les cas limites de fichiers vides", () => {
      const sim1 = calculerSimilariteTexte("", "", "script.js");
      expect(sim1.similarity).toBe(100);

      const sim2 = calculerSimilariteTexte("console.log('test');", "", "script.js");
      expect(sim2.similarity).toBe(0);
    });
  });

  describe("3. Critère d'Acceptation DoD #1 : Détection >= 85% pour code modifié", () => {
    it("doit détecter >= 85% de similarité entre une copie originale et une copie avec renommage de variables et retouches cosmétiques", () => {
      const copieOriginale = `
        // Copie Lucas - Formulaire Don
        const formDon = document.querySelector("#form-don");
        const champCin = document.querySelector("#cin");
        const boxMessage = document.querySelector("#message");

        formDon.addEventListener("submit", function(evenement) {
          evenement.preventDefault();
          const saisie = champCin.value.trim();
          if (saisie.length !== 8 || isNaN(saisie)) {
            boxMessage.textContent = "Erreur: CIN doit comporter 8 chiffres.";
            boxMessage.className = "alert-danger";
            return false;
          }
          boxMessage.textContent = "Succès de la validation.";
          boxMessage.className = "alert-success";
          return true;
        });
      `;

      // Copie modifiée : variables renommées, commentaires changés, espaces modifiés
      const copiePlagiee = `
        /* Script de validation Ines */
        const f = document.querySelector("#form-don");
        const c = document.querySelector("#cin");
        const m = document.querySelector("#message");

        f.addEventListener("submit", function(e) {
          e.preventDefault();
          const v = c.value.trim();
          if (v.length !== 8 || isNaN(v)) {
            m.textContent = "Erreur: CIN doit comporter 8 chiffres.";
            m.className = "alert-danger";
            return false;
          }
          m.textContent = "Succès de la validation.";
          m.className = "alert-success";
          return true;
        });
      `;

      const sim = calculerSimilariteTexte(copieOriginale, copiePlagiee, "script.js");

      // DoD Criterion #1 : >= 85%
      expect(sim.similarity).toBeGreaterThanOrEqual(85);
    });
  });

  describe("4. Comparaison multi-fichiers de deux copies (comparerDeuxCopies)", () => {
    const studentA: StudentCopyData = {
      eleveId: "s1",
      nom: "Bernard",
      prenom: "Lucas",
      fichiers: [
        {
          chemin: "index.html",
          contenu: `<!DOCTYPE html><html><body><form id="f"><input id="cin"/><button>OK</button></form></body></html>`,
        },
        {
          chemin: "style.css",
          contenu: `body { font-family: sans-serif; } .card { padding: 10px; }`,
        },
        {
          chemin: "script.js",
          contenu: `
            const btn = document.querySelector("button");
            btn.addEventListener("click", () => {
              const val = document.querySelector("#cin").value;
              if (val.length === 8) console.log("valide");
            });
          `,
        },
      ],
    };

    const studentB: StudentCopyData = {
      eleveId: "s2",
      nom: "Khelifi",
      prenom: "Inès",
      fichiers: [
        {
          chemin: "index.html",
          contenu: `<!DOCTYPE html><html><body><form id="f"><input id="cin"/><button>OK</button></form></body></html>`,
        },
        {
          chemin: "style.css",
          contenu: `body { font-family: sans-serif; } .card { padding: 10px; }`,
        },
        {
          chemin: "script.js",
          contenu: `
            // Code avec variables renommées
            const b = document.querySelector("button");
            b.addEventListener("click", () => {
              const x = document.querySelector("#cin").value;
              if (x.length === 8) console.log("valide");
            });
          `,
        },
      ],
    };

    const studentC: StudentCopyData = {
      eleveId: "s3",
      nom: "Zitouni",
      prenom: "Mehdi",
      fichiers: [
        {
          chemin: "index.html",
          contenu: `<!DOCTYPE html><html><body><main><section><h1>Portail</h1></section></main></body></html>`,
        },
        {
          chemin: "style.css",
          contenu: `main { display: grid; grid-template-columns: 1fr; }`,
        },
        {
          chemin: "script.js",
          contenu: `
            window.addEventListener("DOMContentLoaded", () => {
              fetch("/api/donneurs").then(res => res.json()).then(data => console.log(data));
            });
          `,
        },
      ],
    };

    it("doit classifier une copie plagiée comme 'plagiat_probable' ou 'suspect' avec score élevé", () => {
      const resAB = comparerDeuxCopies(studentA, studentB, 80);

      expect(resAB.overallSimilarity).toBeGreaterThanOrEqual(85);
      expect(resAB.severity).toBe("plagiat_probable");
      expect(resAB.fileDetails.length).toBe(3);
      expect(resAB.verdictProf).toBe("en_attente");
    });

    it("doit classifier deux copies indépendantes comme 'normal'", () => {
      const resAC = comparerDeuxCopies(studentA, studentC, 80);

      expect(resAC.overallSimilarity).toBeLessThan(40);
      expect(resAC.severity).toBe("normal");
    });
  });

  describe("5. Analyse matricielle de classe (analyserSimilariteClasse)", () => {
    const copiesClasse: StudentCopyData[] = [
      {
        eleveId: "s1",
        nom: "Bernard",
        prenom: "Lucas",
        fichiers: [
          { chemin: "index.html", contenu: `<form id="f"><input id="cin"/></form>` },
          { chemin: "script.js", contenu: `const cin = document.querySelector('#cin').value;` },
        ],
      },
      {
        eleveId: "s2",
        nom: "Khelifi",
        prenom: "Inès",
        fichiers: [
          { chemin: "index.html", contenu: `<form id="f"><input id="cin"/></form>` },
          { chemin: "script.js", contenu: `const c = document.querySelector('#cin').value;` },
        ],
      },
      {
        eleveId: "s3",
        nom: "Zitouni",
        prenom: "Mehdi",
        fichiers: [
          { chemin: "index.html", contenu: `<main><h1>Autre approche</h1></main>` },
          { chemin: "script.js", contenu: `console.log("Solution 3 différente");` },
        ],
      },
      {
        eleveId: "s4",
        nom: "Moreau",
        prenom: "Camille",
        fichiers: [{ chemin: "index.html", contenu: `<div>Brouillon</div>` }],
      },
    ];

    it("doit générer exactement N*(N-1)/2 paires (6 paires pour 4 élèves)", () => {
      const matrix = analyserSimilariteClasse(copiesClasse, 80, { classId: "cls-1" });

      expect(matrix.totalCopies).toBe(4);
      expect(matrix.totalPaires).toBe(6);
      expect(matrix.pairs.length).toBe(6);
      expect(matrix.classId).toBe("cls-1");

      // Vérifier que la paire Lucas & Inès est en tête (plus forte similarité)
      const topPair = matrix.pairs[0];
      expect(topPair).toBeDefined();
      if (topPair) {
        expect(topPair.overallSimilarity).toBeGreaterThanOrEqual(85);
        expect(
          (topPair.studentA.id === "s1" && topPair.studentB.id === "s2") ||
            (topPair.studentA.id === "s2" && topPair.studentB.id === "s1"),
        ).toBe(true);
      }
    });

    it("respecte le principe 'L\\'algorithme informe, l\\'humain décide'", () => {
      const matrix = analyserSimilariteClasse(copiesClasse, 80);
      const topPair = matrix.pairs[0]!;

      // Initialement en attente d'arbitrage
      expect(topPair.verdictProf).toBe("en_attente");
      expect(topPair.notesProf).toBeUndefined();
    });
  });
});
