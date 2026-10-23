import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  analyserDetailsTentative,
  estTentativeOfficielle,
  getLibelleSourceTentative,
} from "@/lib/supabase/tentative-details";
import {
  filtrerTentativesOfficielles,
  type StudentAttemptRecord,
} from "@/lib/subjects/contestations-service";

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

  describe("SEC-02 / T-15 : Provenance des tentatives et exclusion des agrégats officiels (Issue #116)", () => {
    const migration0019 = readFileSync(
      resolve(process.cwd(), "supabase/migrations/20261023150000_0019_tentatives_source.sql"),
      "utf-8",
    );

    it("T-15 : la migration 0019 ajoute source ('client' | 'serveur' | 'enseignant') et verrouille l'insertion élève à source = 'client'", () => {
      expect(migration0019).toContain(
        "add column if not exists source text not null default 'client'",
      );
      expect(migration0019).toContain("check (source in ('client', 'serveur', 'enseignant'))");
      expect(migration0019).toContain("source = 'client'");
      expect(migration0019).toContain("trg_verifier_source_tentative");
      expect(migration0019).toContain("T-15");
    });

    it("distingue explicitement les libellés de provenance Déclaratif vs Vérifié / Enseignant", () => {
      expect(getLibelleSourceTentative("client")).toBe("Déclaratif (poste élève)");
      expect(getLibelleSourceTentative(undefined)).toBe("Déclaratif (poste élève)");
      expect(getLibelleSourceTentative("serveur")).toBe("Vérifié / Enseignant");
      expect(getLibelleSourceTentative("enseignant")).toBe("Vérifié / Enseignant");

      expect(estTentativeOfficielle("client")).toBe(false);
      expect(estTentativeOfficielle("serveur")).toBe(true);
      expect(estTentativeOfficielle("enseignant")).toBe(true);
    });

    it("exclut les tentatives déclaratives (source = 'client') des notes d'examen officielles", () => {
      const tentatives: StudentAttemptRecord[] = [
        {
          id: "t-client",
          eleve_id: "e1",
          eleve_nom: "Élève 1",
          note20: 20,
          points_obtenus: 20,
          points_total: 20,
          source: "client",
          criteres: [],
        },
        {
          id: "t-serveur",
          eleve_id: "e2",
          eleve_nom: "Élève 2",
          note20: 15,
          points_obtenus: 15,
          points_total: 20,
          source: "serveur",
          criteres: [],
        },
        {
          id: "t-prof",
          eleve_id: "e3",
          eleve_nom: "Élève 3",
          note20: 17,
          points_obtenus: 17,
          points_total: 20,
          source: "enseignant",
          criteres: [],
        },
      ];

      const officielles = filtrerTentativesOfficielles(tentatives);
      expect(officielles.map((t) => t.id)).toEqual(["t-serveur", "t-prof"]);
    });
  });
});
