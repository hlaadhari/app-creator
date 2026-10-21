import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

import {
  controlesEnDirect,
  getEtatSysteme,
  mesurerLatenceEtHorloge,
  type EtatSysteme,
} from "@/lib/supabase/system-health";
import { getSecurityTestsMatrix } from "@/lib/supabase/admin";

const etatSain: EtatSysteme = {
  horlogeServeur: "2026-10-21T12:00:00Z",
  tables: 29,
  tablesSansRls: [],
  politiques: 60,
  droitsClientsCorriges: 0,
  tablesAnonEcriture: [],
  ecritureDirecteUserRoles: false,
  ecritureDirecteJournal: false,
  triggersImmuabiliteAttendus: 8,
  triggersImmuabilitePresents: 8,
};

describe("État réel du système pour /admin (issue #54)", () => {
  beforeEach(() => {
    rpc.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getEtatSysteme", () => {
    it("convertit la réponse de la fonction SQL", async () => {
      rpc.mockResolvedValueOnce({
        data: {
          horloge_serveur: "2026-10-21T12:00:00Z",
          tables: 29,
          tables_sans_rls: ["classes"],
          politiques: 60,
          droits_clients_corriges: 2,
          tables_anon_ecriture: ["user_roles"],
          ecriture_directe_user_roles: true,
          ecriture_directe_journal: true,
          triggers_immuabilite_attendus: 8,
          triggers_immuabilite_presents: 7,
        },
        error: null,
      });

      const etat = await getEtatSysteme();

      expect(rpc).toHaveBeenCalledWith("admin_etat_systeme");
      expect(etat).toMatchObject({
        tables: 29,
        tablesSansRls: ["classes"],
        droitsClientsCorriges: 2,
        tablesAnonEcriture: ["user_roles"],
        ecritureDirecteUserRoles: true,
        ecritureDirecteJournal: true,
        triggersImmuabilitePresents: 7,
      });
    });

    it("lève une erreur lisible pour un non-admin", async () => {
      rpc.mockResolvedValueOnce({ data: null, error: { message: "acces_refuse" } });
      await expect(getEtatSysteme()).rejects.toThrow("réservée aux administrateurs");
    });
  });

  describe("contrôles en direct", () => {
    it("tous les contrôles sont OK sur un système sain", () => {
      const controles = controlesEnDirect(etatSain);
      expect(controles.length).toBeGreaterThanOrEqual(4);
      expect(controles.every((c) => c.ok)).toBe(true);
      expect(controles.find((c) => c.codes.includes("T-04"))?.detail).toContain("0 droit");
    });

    it("signale une table sans RLS", () => {
      const c = controlesEnDirect({ ...etatSain, tablesSansRls: ["classes"] }).find((x) =>
        x.codes.includes("T-01"),
      );
      expect(c?.ok).toBe(false);
      expect(c?.detail).toContain("classes");
    });

    it("signale un droit client sur solutions ou criteres", () => {
      const c = controlesEnDirect({ ...etatSain, droitsClientsCorriges: 1 }).find((x) =>
        x.libelle.includes("solutions"),
      );
      expect(c?.ok).toBe(false);
    });

    it("signale une écriture directe possible sur user_roles", () => {
      const c = controlesEnDirect({ ...etatSain, ecritureDirecteUserRoles: true }).find((x) =>
        x.libelle.includes("Rôles"),
      );
      expect(c?.ok).toBe(false);
    });

    it("signale une écriture directe possible sur le journal de sécurité", () => {
      const c = controlesEnDirect({ ...etatSain, ecritureDirecteJournal: true }).find((x) =>
        x.libelle.includes("Journal"),
      );
      expect(c?.ok).toBe(false);
      expect(controlesEnDirect(etatSain).find((x) => x.libelle.includes("Journal"))?.ok).toBe(true);
    });

    it("signale un trigger d'immuabilité manquant", () => {
      const c = controlesEnDirect({ ...etatSain, triggersImmuabilitePresents: 7 }).find((x) =>
        x.codes.includes("T-09"),
      );
      expect(c?.ok).toBe(false);
      expect(c?.detail).toBe("7 / 8 triggers");
    });

    it("signale une écriture anonyme", () => {
      const c = controlesEnDirect({ ...etatSain, tablesAnonEcriture: ["tentatives"] }).find((x) =>
        x.libelle.includes("anonyme"),
      );
      expect(c?.ok).toBe(false);
      expect(c?.detail).toContain("tentatives");
    });

    it("ne vérifie en direct que des codes existant dans la matrice T-01..T-14", () => {
      const codesMatrice = getSecurityTestsMatrix().map((t) => t.code);
      for (const c of controlesEnDirect(etatSain)) {
        for (const code of c.codes) expect(codesMatrice).toContain(code);
      }
    });
  });

  describe("latence et horloge", () => {
    it("mesure la latence et l'écart entre le navigateur et le serveur", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-21T12:00:00Z"));
      rpc.mockImplementation(async () => {
        vi.advanceTimersByTime(40);
        // Le serveur est 120 s en avance sur ce navigateur.
        return { data: "2026-10-21T12:02:00Z", error: null };
      });

      const mesure = await mesurerLatenceEtHorloge(3);

      expect(rpc).toHaveBeenCalledTimes(3);
      expect(rpc).toHaveBeenCalledWith("obtenir_horloge_serveur");
      expect(mesure.ecartHorlogeSecondes).toBeGreaterThan(110);
      expect(mesure.ecartHorlogeSecondes).toBeLessThan(130);
      expect(mesure.horlogeServeur).toBe("2026-10-21T12:02:00Z");
      expect(mesure.latenceMs).toBeGreaterThanOrEqual(0);
    });

    it("propage l'erreur du serveur", async () => {
      rpc.mockResolvedValue({ data: null, error: { message: "indisponible" } });
      await expect(mesurerLatenceEtHorloge(1)).rejects.toThrow("indisponible");
    });
  });
});
