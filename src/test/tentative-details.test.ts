import { describe, expect, it } from "vitest";

import { analyserDetailsTentative } from "@/lib/supabase/tentative-details";

describe("Lecture du détail d'une tentative (suivi enseignant)", () => {
  it("lit le format de la page sujet { id: { ok, label } }", () => {
    const b = analyserDetailsTentative({
      c1: { ok: true, label: "Titre" },
      c2: { ok: false, label: "Liste" },
      c3: { ok: false, label: "Style" },
    });
    expect(b).toEqual({ total: 3, reussis: 1, pointsFaibles: ["Liste", "Style"] });
  });

  it("lit l'ancien format { criteres: [...] }", () => {
    const b = analyserDetailsTentative({
      criteres: [
        { valide: true, code: "a" },
        { valide: false, titre: "Menu" },
      ],
    });
    expect(b).toEqual({ total: 2, reussis: 1, pointsFaibles: ["Menu"] });
  });

  it("renvoie un bilan vide pour un détail absent ou inconnu", () => {
    expect(analyserDetailsTentative(null).total).toBe(0);
    expect(analyserDetailsTentative("x").total).toBe(0);
    expect(analyserDetailsTentative({ note: 12 }).total).toBe(0);
  });
});
