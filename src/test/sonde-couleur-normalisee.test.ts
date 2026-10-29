import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { makeProbeCheck } from "@/lib/evaluation/critere-json";

/**
 * JSDOM renvoie les couleurs telles qu'écrites (« blue »), un vrai navigateur les renvoie en
 * « rgb(0, 0, 255) ». On simule ce comportement pour vérifier la comparaison normalisée.
 */
function fenetreComme(navigateur: "jsdom" | "reel") {
  const dom = new JSDOM(`<body><h1>Titre</h1></body>`);
  const win = dom.window as unknown as Window;
  const reel = {
    getComputedStyle: (el: Element) => ({
      getPropertyValue: (propriete: string) => {
        const brute = (el as HTMLElement).style.getPropertyValue(propriete);
        const valeur = brute || (el.tagName === "H1" ? "blue" : "");
        return navigateur === "reel" && valeur === "blue" ? "rgb(0, 0, 255)" : valeur;
      },
    }),
  };
  const fenetre = Object.assign(Object.create(win), { getComputedStyle: reel.getComputedStyle });
  return { doc: dom.window.document, win: fenetre as Window };
}

const sonde = {
  type: "css_property",
  selector: "h1",
  property: "background-color",
  expectedValue: "blue",
};

describe("Sonde css_property : couleurs nommées (issue #152)", () => {
  it("valide « blue » quand le moteur renvoie le mot-clé (JSDOM)", () => {
    const { doc, win } = fenetreComme("jsdom");
    expect(makeProbeCheck(sonde)(doc, win)).toBe(true);
  });

  it("valide « blue » quand le navigateur renvoie rgb(0, 0, 255)", () => {
    const { doc, win } = fenetreComme("reel");
    expect(makeProbeCheck(sonde)(doc, win)).toBe(true);
  });

  it("refuse une autre couleur même normalisée", () => {
    const { doc, win } = fenetreComme("reel");
    expect(makeProbeCheck({ ...sonde, expectedValue: "red" })(doc, win)).toBe(false);
  });

  it("refuse une valeur attendue invalide au lieu de la valider", () => {
    const { doc, win } = fenetreComme("reel");
    expect(makeProbeCheck({ ...sonde, expectedValue: "pas-une-couleur" })(doc, win)).toBe(false);
  });
});
