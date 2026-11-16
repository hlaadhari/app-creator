import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { initialExercises, runCriteria, score, type Files } from "@/lib/exercises";
import { construireDocumentEvaluation } from "@/lib/evaluation/document-evaluation";
import { evaluerParPage } from "@/lib/evaluation/evaluation-par-page";
import { sampleWrittenExam } from "@/lib/content/written-subjects";
import { evaluerCopieEcrite } from "@/lib/evaluator/written/written-exam-evaluator";

async function evalExercise(id: string, files: Files) {
  const ex = initialExercises.find((e) => e.id === id);
  if (!ex) throw new Error(`Exercice introuvable: ${id}`);

  const resultats = await evaluerParPage(ex.criteria, files, async (page, crits) => {
    const dom = new JSDOM(construireDocumentEvaluation(files, page), {
      runScripts: "dangerously",
    });
    try {
      return runCriteria(crits, dom.window.document, dom.window as never);
    } finally {
      dom.window.close();
    }
  });

  return score(resultats);
}

describe("Issue #284 : Banc didactique des exercices intégrés (carte-profil, mise-en-forme, compteur) & written-bac-demo", () => {
  it("garantit 0/10 sur le code de départ (starter) de chacun des 3 exercices intégrés", async () => {
    for (const ex of initialExercises) {
      const res = await evalExercise(ex.id, ex.starter);
      expect(res.got, `${ex.id} starter devrait valoir 0`).toBe(0);
      expect(res.total).toBe(10);
    }
  });

  it("carte-profil : valide solution (10/10), solution-alt (10/10) et rejette solution-invalide", async () => {
    const base = initialExercises.find((e) => e.id === "carte-profil")!.starter;

    const sol: Files = {
      ...base,
      "index.html": `<!DOCTYPE html><html lang="fr"><body>
        <article class="carte">
          <h1>Amine</h1>
          <p>Élève en 4ème Bac STI.</p>
          <ul><li>Code</li><li>Foot</li><li>Lecture</li></ul>
          <a href="mailto:amine@exemple.tn">Contact</a>
        </article>
      </body></html>`,
    };
    const alt: Files = {
      ...base,
      "index.html": `<!DOCTYPE html><html lang="fr"><body>
        <article class="carte profil">
          <h1>Sarra</h1>
          <p>Passionnée de bases de données.</p>
          <ul><li>SQL</li><li>PHP</li><li>Échecs</li><li>Musique</li></ul>
          <a href="mailto:sarra@lycee.tn?subject=Bonjour">Écrire</a>
        </article>
      </body></html>`,
    };
    const inv: Files = {
      ...base,
      "index.html": `<!DOCTYPE html><html lang="fr"><body>
        <article class="carte">
          <h1>Test</h1>
          <p>Un seul loisir et pas de lien mailto valide.</p>
          <ul><li>Seul</li></ul>
          <Mail mailto:test@exemple.tn>
        </article>
      </body></html>`,
    };

    expect((await evalExercise("carte-profil", sol)).got).toBe(10);
    expect((await evalExercise("carte-profil", alt)).got).toBe(10);
    expect((await evalExercise("carte-profil", inv)).got).toBeLessThan(10);
  });

  it("mise-en-forme : valide solution (10/10), solution-alt (10/10) et rejette solution-invalide", async () => {
    const base = initialExercises.find((e) => e.id === "mise-en-forme")!.starter;

    const sol: Files = {
      ...base,
      "style.css": `
        h1 { text-align: center; }
        #valider {
          background-color: #0066cc;
          color: white;
          border-radius: 8px;
          padding: 10px 20px;
        }
      `,
    };
    const alt: Files = {
      ...base,
      "style.css": `
        h1 { text-align: center; }
        button#valider {
          background-color: rgb(0, 102, 204);
          color: #ffffff;
          border-radius: 0.5rem;
          padding-top: 12px;
          padding-bottom: 12px;
        }
      `,
    };
    const inv: Files = {
      ...base,
      "style.css": `
        h1 { text-align: left; }
        #valider { background-color: red; color: black; padding: 0; }
      `,
    };

    expect((await evalExercise("mise-en-forme", sol)).got).toBe(10);
    expect((await evalExercise("mise-en-forme", alt)).got).toBe(10);
    expect((await evalExercise("mise-en-forme", inv)).got).toBeLessThan(10);
  });

  it("compteur : valide solution (10/10), solution-alt (10/10) et rejette solution-invalide", async () => {
    const base = initialExercises.find((e) => e.id === "compteur")!.starter;

    const sol: Files = {
      ...base,
      "script.js": `
        let count = 0;
        const btn = document.getElementById("plus");
        const span = document.getElementById("total");
        btn.addEventListener("click", () => {
          count++;
          span.textContent = String(count);
          if (count >= 5) span.classList.add("max");
        });
      `,
    };
    const alt: Files = {
      ...base,
      "script.js": `
        document.querySelector("#plus").onclick = function () {
          const total = document.querySelector("#total");
          const next = Number(total.textContent) + 1;
          total.textContent = next;
          if (next === 5) total.className = "max";
        };
      `,
    };
    const inv: Files = {
      ...base,
      "script.js": `
        document.getElementById("plus").addEventListener("click", () => {
          document.getElementById("total").textContent = "1";
        });
      `,
    };

    expect((await evalExercise("compteur", sol)).got).toBe(10);
    expect((await evalExercise("compteur", alt)).got).toBe(10);
    expect((await evalExercise("compteur", inv)).got).toBeLessThan(10);
  });

  it("written-bac-demo : obtient 0 sur copie vide", async () => {
    const report = await evaluerCopieEcrite(sampleWrittenExam, {}, sampleWrittenExam.initialSql);
    const earned = report.sections.reduce((s, sec) => s + sec.pointsEarned, 0);
    expect(earned).toBe(0);
    expect(report.sections.reduce((s, sec) => s + sec.pointsMax, 0)).toBeGreaterThan(0);
  });
});
