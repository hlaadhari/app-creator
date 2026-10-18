import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { evaluateCriteria, type CriterionDefinition } from "@/lib/evaluation/probe-runner";
import { debloquerNiveauIndice, getNombreIndices } from "@/lib/evaluation/hints-service";

describe("Moteur d'Évaluation Formative 3 Niveaux (Issue #8 - PRD F-38 à F-48, T-04, §10)", () => {
  describe("Sondes DOM, CSS et JS dans le bac à sable", () => {
    it("évalue avec succès les sondes DOM (sélecteurs, présence, attributs)", () => {
      const html = `
        <article class="carte">
          <h1>Hatem</h1>
          <p>Élève STI2D</p>
          <ul>
            <li>Prog</li>
            <li>Élec</li>
            <li>Réseau</li>
          </ul>
          <a href="mailto:contact@lycee.fr">Contact</a>
        </article>
      `;

      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const win = dom.window as unknown as Window;

      const criteria: CriterionDefinition[] = [
        {
          id: "c1",
          code: "DOM-01",
          label: "Article carte",
          points: 2,
          ordre: 1,
          sonde: { type: "dom_selector", selector: "article.carte" },
          message_echec: "Article carte manquant",
        },
        {
          id: "c2",
          code: "DOM-02",
          label: "Titre non vide",
          points: 2,
          ordre: 2,
          sonde: { type: "dom_selector", selector: "article.carte h1", textNotEmpty: true },
          message_echec: "Titre vide",
        },
        {
          id: "c3",
          code: "DOM-03",
          label: "Liste de 3 éléments",
          points: 3,
          ordre: 3,
          sonde: { type: "dom_selector", selector: "article.carte ul > li", minCount: 3 },
          message_echec: "Moins de 3 éléments",
        },
        {
          id: "c4",
          code: "DOM-04",
          label: "Lien mailto",
          points: 2,
          ordre: 4,
          sonde: {
            type: "dom_selector",
            selector: "article.carte a",
            attributeStartsWith: { name: "href", prefix: "mailto:" },
          },
          message_echec: "Lien mailto manquant",
        },
      ];

      const res = evaluateCriteria(criteria, doc, win);

      expect(res.results.every((r) => r.passed)).toBe(true);
      expect(res.earnedPoints).toBe(res.totalPoints);
      expect(res.note20).toBe(20);
      expect(res.totalDurationMs).toBeLessThan(3000); // Exécution < 3s (PRD §10)
    });

    it("évalue les sondes JS dynamiques avec simulation d'événements utilisateur", () => {
      const html = `
        <div>
          <span id="total">0</span>
          <button id="plus">+1</button>
        </div>
      `;

      const dom = new JSDOM(html, { runScripts: "dangerously" });
      const doc = dom.window.document;
      const win = dom.window as unknown as Window;

      // Logique simulée de l'élève
      let count = 0;
      const span = doc.getElementById("total")!;
      const btn = doc.getElementById("plus")!;
      btn.addEventListener("click", () => {
        count++;
        span.textContent = String(count);
        if (count >= 5) {
          span.classList.add("max");
        }
      });

      const criteria: CriterionDefinition[] = [
        {
          id: "js1",
          code: "JS-01",
          label: "Incrémentation au premier clic",
          points: 4,
          ordre: 1,
          sonde: {
            type: "js_eval",
            actions: [{ type: "click", selector: "#plus", repeat: 1 }],
            checkSelector: "#total",
            checkText: "1",
          },
          message_echec: "Le clic n'affiche pas 1",
        },
        {
          id: "js2",
          code: "JS-02",
          label: "Total atteint 5 après 4 clics supplémentaires",
          points: 3,
          ordre: 2,
          sonde: {
            type: "js_eval",
            actions: [{ type: "click", selector: "#plus", repeat: 4 }],
            checkSelector: "#total",
            checkText: "5",
          },
          message_echec: "Le total n'atteint pas 5",
        },
        {
          id: "js3",
          code: "JS-03",
          label: "Classe max présente à 5",
          points: 3,
          ordre: 3,
          sonde: {
            type: "js_eval",
            checkSelector: "#total",
            checkClass: "max",
          },
          message_echec: "Classe max absente",
        },
      ];

      const res = evaluateCriteria(criteria, doc, win);

      expect(res.results.every((r) => r.passed)).toBe(true);
      expect(res.earnedPoints).toBe(10);
      expect(res.note20).toBe(20);
    });
  });

  describe("Déblocage progressif d'indices à 3 niveaux (T-04)", () => {
    it("débloque séquentiellement les niveaux Conceptuel, Syntaxique et Extrait", async () => {
      const h1 = await debloquerNiveauIndice("carte-profil", 1);
      expect(h1.success).toBe(true);
      expect(h1.hint?.level).toBe(1);
      expect(h1.hint?.levelName).toBe("Conceptuel");
      expect(h1.hint?.texte).toBeTruthy();

      const h2 = await debloquerNiveauIndice("carte-profil", 2);
      expect(h2.success).toBe(true);
      expect(h2.hint?.level).toBe(2);
      expect(h2.hint?.levelName).toBe("Syntaxique");

      const h3 = await debloquerNiveauIndice("carte-profil", 3);
      expect(h3.success).toBe(true);
      expect(h3.hint?.level).toBe(3);
      expect(h3.hint?.levelName).toBe("Extrait de code");
    });

    it("refuse le déblocage au-delà du nombre maximal d'indices", async () => {
      const h4 = await debloquerNiveauIndice("carte-profil", 4);
      expect(h4.success).toBe(false);
      expect(h4.error).toContain("déjà été débloqués");
    });

    it("ne transmet que le compteur d'indices disponibles sans fuiter le texte (T-04)", async () => {
      const count = await getNombreIndices("carte-profil");
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});
