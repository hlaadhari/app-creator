import { describe, expect, it } from "vitest";
import { getExercise, runCriteria, score, type Files } from "@/lib/exercises";
import { JSDOM } from "jsdom";

function evaluateFiles(exerciseId: string, files: Files) {
  const ex = getExercise(exerciseId);
  if (!ex) throw new Error(`Exercise ${exerciseId} not found`);

  const dom = new JSDOM(files["index.html"], { runScripts: "dangerously" });
  const win = dom.window as unknown as Window;
  const doc = win.document;

  // Inject style
  const styleEl = doc.createElement("style");
  styleEl.textContent = files["style.css"] || "";
  doc.head.appendChild(styleEl);

  // Inject script
  if (files["script.js"]?.trim()) {
    const scriptEl = doc.createElement("script");
    scriptEl.textContent = files["script.js"];
    doc.body.appendChild(scriptEl);
  }

  const results = runCriteria(ex.criteria, doc, win);
  return { results, score: score(results) };
}

describe("Règle Pédagogique PRD §10.4 : Validation des Sujets Pré-Publication", () => {
  describe("Sujet 1 : Carte de profil (carte-profil)", () => {
    it("valide la Solution A (canonique) à 100%", () => {
      const files: Files = {
        "index.html": `
          <article class="carte">
            <h1>Hatem</h1>
            <p>Développeur passionné d'informatique.</p>
            <ul>
              <li>Programmation</li>
              <li>Électronique</li>
              <li>Systèmes réseau</li>
            </ul>
            <a href="mailto:contact@lycee.fr">Me contacter</a>
          </article>
        `,
        "style.css": "",
        "script.js": "",
      };
      const { score: s } = evaluateFiles("carte-profil", files);
      expect(s.got).toBe(s.total);
      expect(s.note20).toBe(20);
    });

    it("valide la Solution B (alternative valide avec balises imbriquées) à 100%", () => {
      const files: Files = {
        "index.html": `
          <main>
            <article class="carte">
              <h1><span>Sarah</span> - Portfolio</h1>
              <p>Élève en Terminale <strong>STI2D</strong>.</p>
              <ul>
                <li><span>Robotique</span></li>
                <li><span>Domotique</span></li>
                <li><span>Impression 3D</span></li>
                <li><span>Vélo</span></li>
              </ul>
              <a href="mailto:sarah@ecole.org?subject=Contact">Envoyer un message</a>
            </article>
          </main>
        `,
        "style.css": "",
        "script.js": "",
      };
      const { score: s } = evaluateFiles("carte-profil", files);
      expect(s.got).toBe(s.total);
      expect(s.note20).toBe(20);
    });

    it("rejette la Solution C (invalide : seulement 2 éléments dans la liste)", () => {
      const files: Files = {
        "index.html": `
          <article class="carte">
            <h1>Alex</h1>
            <p>Passionné de web.</p>
            <ul>
              <li>Jeux</li>
              <li>Musique</li>
            </ul>
            <a href="mailto:alex@lycee.fr">Contact</a>
          </article>
        `,
        "style.css": "",
        "script.js": "",
      };
      const { results, score: s } = evaluateFiles("carte-profil", files);
      expect(s.got).toBeLessThan(s.total);
      const ulResult = results.find((r) => r.id === "ul");
      expect(ulResult?.ok).toBe(false);
    });
  });

  describe("Sujet 2 : Mise en forme d'un bouton (mise-en-forme)", () => {
    it("valide la Solution A (canonique) à 100%", () => {
      const files: Files = {
        "index.html": `
          <h1>Inscription</h1>
          <button id="valider">Valider</button>
        `,
        "style.css": `
          h1 { text-align: center; }
          #valider {
            background-color: rgb(0, 102, 204);
            color: rgb(255, 255, 255);
            border-radius: 6px;
            border-top-left-radius: 6px;
            padding: 8px 16px;
          }
        `,
        "script.js": "",
      };
      const { score: s } = evaluateFiles("mise-en-forme", files);
      expect(s.got).toBe(s.total);
      expect(s.note20).toBe(20);
    });

    it("valide la Solution B (alternative avec inline style ou hex) à 100%", () => {
      const files: Files = {
        "index.html": `
          <h1>Inscription</h1>
          <button id="valider">Valider</button>
        `,
        "style.css": `
          h1 { text-align: center; }
          #valider {
            background-color: rgb(0, 102, 204);
            color: rgb(255, 255, 255);
            border-top-left-radius: 8px;
            padding-top: 12px;
          }
        `,
        "script.js": "",
      };
      const { score: s } = evaluateFiles("mise-en-forme", files);
      expect(s.got).toBe(s.total);
      expect(s.note20).toBe(20);
    });

    it("rejette le starter inchangé (note très basse < 5/20)", () => {
      const ex = getExercise("mise-en-forme")!;
      const { score: s } = evaluateFiles("mise-en-forme", ex.starter);
      expect(s.note20).toBeLessThan(5);
    });
  });

  describe("Sujet 3 : Compteur de clics (compteur)", () => {
    it("valide la Solution A (canonique) à 100%", () => {
      const files: Files = {
        "index.html": `
          <p>Total : <span id="total">0</span></p>
          <button id="plus">+1</button>
        `,
        "style.css": ".max { color: red; font-weight: bold; }",
        "script.js": `
          let total = 0;
          const span = document.getElementById("total");
          document.getElementById("plus").addEventListener("click", () => {
            total++;
            span.textContent = total;
            if (total >= 5) span.classList.add("max");
          });
        `,
      };
      const { score: s } = evaluateFiles("compteur", files);
      expect(s.got).toBe(s.total);
      expect(s.note20).toBe(20);
    });

    it("valide la Solution B (alternative valide avec parseInt) à 100%", () => {
      const files: Files = {
        "index.html": `
          <p>Total : <span id="total">0</span></p>
          <button id="plus">+1</button>
        `,
        "style.css": "",
        "script.js": `
          document.querySelector("#plus").onclick = function() {
            const el = document.querySelector("#total");
            const val = parseInt(el.textContent, 10) + 1;
            el.textContent = String(val);
            if (val >= 5) {
              el.className = "max";
            }
          };
        `,
      };
      const { score: s } = evaluateFiles("compteur", files);
      expect(s.got).toBe(s.total);
      expect(s.note20).toBe(20);
    });

    it("rejette la Solution C (invalide : oubli de la classe 'max')", () => {
      const files: Files = {
        "index.html": `
          <p>Total : <span id="total">0</span></p>
          <button id="plus">+1</button>
        `,
        "style.css": "",
        "script.js": `
          let total = 0;
          document.getElementById("plus").addEventListener("click", () => {
            total++;
            document.getElementById("total").textContent = total;
            // oubli de l'ajout de la classe max
          });
        `,
      };
      const { results, score: s } = evaluateFiles("compteur", files);
      expect(s.got).toBeLessThan(s.total);
      const maxResult = results.find((r) => r.id === "max");
      expect(maxResult?.ok).toBe(false);
    });
  });
});
