import { describe, expect, it } from "vitest";
import { erreursAvantEnregistrement } from "@/lib/subjects/studio-validation";

describe("validation du Studio avant enregistrement (#194)", () => {
  it("refuse un identifiant vide pour un nouveau sujet", () => {
    expect(erreursAvantEnregistrement({ sujet_id: "", titre: "Menu" }, true)).toEqual([
      "L'identifiant du sujet est obligatoire (ex. tp-menu-01).",
    ]);
  });
  it("refuse un identifiant mal formé et un titre vide", () => {
    const e = erreursAvantEnregistrement({ sujet_id: "Menu 01", titre: " " }, true);
    expect(e).toHaveLength(2);
  });
  it("accepte un sujet valide et n'exige pas l'identifiant d'un brouillon existant", () => {
    expect(erreursAvantEnregistrement({ sujet_id: "tp-menu-01", titre: "Menu" }, true)).toEqual([]);
    expect(erreursAvantEnregistrement({ sujet_id: "", titre: "Menu" }, false)).toEqual([]);
  });
});
