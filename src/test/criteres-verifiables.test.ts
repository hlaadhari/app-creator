import { describe, expect, it } from "vitest";

import { contentSubjects, sondeEstVerifiable } from "@/lib/content/all-subjects";
import {
  initialExercises,
  MESSAGE_NON_VERIFIABLE,
  runCriteria,
  score,
  type Criterion,
} from "@/lib/exercises";

const tousLesSujets = [...initialExercises, ...contentSubjects];

function documentVide(): { doc: Document; win: Window } {
  const doc = document.implementation.createHTMLDocument("vide");
  return { doc, win: window };
}

describe("Critères sans vérification réelle (issue #82)", () => {
  describe("sondeEstVerifiable", () => {
    it("refuse l'absence de sonde et les types inconnus", () => {
      expect(sondeEstVerifiable(undefined)).toBe(false);
      expect(sondeEstVerifiable(null)).toBe(false);
      expect(sondeEstVerifiable({})).toBe(false);
      expect(sondeEstVerifiable({ type: "php_output" })).toBe(false);
    });

    it("refuse un sélecteur présent dans toute page", () => {
      for (const selector of ["body", "html", "head", "*", ":root", "  BODY "]) {
        expect(sondeEstVerifiable({ type: "dom_selector", selector }), selector).toBe(false);
      }
    });

    it("refuse js_eval qui ne teste que l'existence d'un champ", () => {
      expect(sondeEstVerifiable({ type: "js_eval", checkSelector: "#cin" })).toBe(false);
      expect(sondeEstVerifiable({ type: "js_eval" })).toBe(false);
    });

    it("accepte une sonde DOM ou CSS précise", () => {
      expect(sondeEstVerifiable({ type: "dom_selector", selector: "form#location" })).toBe(true);
      expect(
        sondeEstVerifiable({
          type: "css_property",
          selector: "fieldset",
          property: "border-width",
        }),
      ).toBe(true);
      expect(sondeEstVerifiable({ type: "css_property", selector: "fieldset" })).toBe(false);
      expect(sondeEstVerifiable({ type: "dom_selector", selector: "" })).toBe(false);
    });
  });

  describe("runCriteria", () => {
    const toujoursVrai: Criterion = {
      id: "c1",
      label: "Critère sans vérification",
      points: 4,
      fail: "échec",
      automatique: false,
      check: () => true,
    };

    it("ne valide jamais un critère non vérifiable, même si sa fonction répond vrai", () => {
      const { doc, win } = documentVide();
      const [resultat] = runCriteria([toujoursVrai], doc, win);

      expect(resultat?.ok).toBe(false);
      expect(resultat?.automatique).toBe(false);
      expect(resultat?.message).toBe(MESSAGE_NON_VERIFIABLE);
    });

    it("n'exécute pas la fonction d'un critère non vérifiable", () => {
      let appels = 0;
      const { doc, win } = documentVide();
      runCriteria(
        [
          {
            ...toujoursVrai,
            check: () => {
              appels += 1;
              return true;
            },
          },
        ],
        doc,
        win,
      );
      expect(appels).toBe(0);
    });

    it("évalue normalement un critère vérifiable", () => {
      const { doc, win } = documentVide();
      const resultats = runCriteria(
        [
          { id: "ok", label: "ok", points: 1, fail: "x", check: () => true },
          { id: "ko", label: "ko", points: 1, fail: "raté", check: () => false },
        ],
        doc,
        win,
      );
      expect(resultats.map((r) => [r.ok, r.automatique, r.message])).toEqual([
        [true, true, "Validé"],
        [false, true, "raté"],
      ]);
    });
  });

  describe("invariant sur les 13 sujets", () => {
    it("aucun critère n'est validé sur une page vide", () => {
      const fautifs: string[] = [];
      for (const sujet of tousLesSujets) {
        const { doc, win } = documentVide();
        for (const r of runCriteria(sujet.criteria, doc, win)) {
          if (r.ok) fautifs.push(`${sujet.id} / ${r.id} / ${r.label}`);
        }
      }
      expect(fautifs).toEqual([]);
    });

    it("ex-sql-01 et tp-fs-02 ont désormais tous leurs critères vérifiables (PED-03 / issue #129)", () => {
      for (const id of ["ex-sql-01", "tp-fs-02"]) {
        const sujet = contentSubjects.find((s) => s.id === id)!;
        const { doc, win } = documentVide();
        const sc = score(runCriteria(sujet.criteria, doc, win));

        expect(sc.verifiable, id).toBe(sc.total);
        expect(sc.got, id).toBe(0);
        expect(sc.nonVerifiable, id).toBe(0);
      }
    });

    it("ex-html-css-01 et ex-js-01 ont désormais tous leurs critères vérifiables", () => {
      for (const id of ["ex-html-css-01", "ex-js-01"]) {
        const sujet = contentSubjects.find((s) => s.id === id)!;
        expect(
          sujet.criteria.every((c) => c.automatique !== false),
          id,
        ).toBe(true);
      }
    });

    it("les sujets d'initiation gardent des critères tous vérifiables", () => {
      for (const sujet of initialExercises) {
        expect(
          sujet.criteria.every((c) => c.automatique !== false),
          sujet.id,
        ).toBe(true);
      }
    });

    it("l'examen Bac 2023 compte désormais l'ensemble de ses 20 points vérifiables", () => {
      const sujet = contentSubjects.find((s) => s.id === "exam-bac2023-location-habits")!;
      const { doc, win } = documentVide();
      const sc = score(runCriteria(sujet.criteria, doc, win));

      expect(sc.verifiable).toBe(20);
      expect(sc.nonVerifiable).toBe(0);
      expect(sc.got).toBe(0);
    });

    it("chaque critère non vérifiable porte le drapeau, aucun n'est vérifiable par erreur", () => {
      for (const sujet of contentSubjects) {
        const { doc, win } = documentVide();
        for (const c of sujet.criteria) {
          if (c.automatique === false) continue;
          // Un critère déclaré vérifiable doit pouvoir échouer sur une page vide.
          expect(c.check(doc, win), `${sujet.id}/${c.id}`).toBe(false);
        }
      }
    });
  });
});
