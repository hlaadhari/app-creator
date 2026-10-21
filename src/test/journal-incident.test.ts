import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc, from },
}));

import { consulterSolutionReference } from "@/lib/pedagogy/solutions-client";

describe("Journal de sécurité : signalement contrôlé (issue #73)", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("signale l'accès au corrigé en examen par la fonction SQL, sans écrire dans la table", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    const res = await consulterSolutionReference({
      sujetId: "tp-fs-01",
      estEnExamen: true,
      motif: "Bouton corrigé cliqué",
    });

    expect(res.success).toBe(false);
    expect(rpc).toHaveBeenCalledWith("journaliser_incident", {
      _type: "TENTATIVE_ACCES_CORRIGE_EN_EXAMEN",
      _meta: { sujet_id: "tp-fs-01", motif: "Bouton corrigé cliqué" },
    });
    // Aucune écriture directe, aucun acteur ni horodatage fournis par le navigateur.
    expect(from).not.toHaveBeenCalled();
    const meta = (rpc.mock.calls[0]?.[1] as { _meta: Record<string, unknown> })._meta;
    expect(meta).not.toHaveProperty("acteur_id");
    expect(meta).not.toHaveProperty("client_timestamp");
  });

  it("bloque toujours l'accès même si le journal refuse le signalement", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "trop_de_signalements" } });

    const res = await consulterSolutionReference({ sujetId: "tp-fs-01", estEnExamen: true });

    expect(res.success).toBe(false);
    expect(res.error).toContain("strictement interdit");
  });

  it("bloque toujours l'accès si l'appel au journal échoue", async () => {
    rpc.mockRejectedValue(new Error("réseau"));

    const res = await consulterSolutionReference({ sujetId: "tp-fs-01", estEnExamen: true });

    expect(res.success).toBe(false);
  });

  it("ne signale rien hors examen", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await consulterSolutionReference({ sujetId: "inconnu", estEnExamen: false });

    expect(rpc).not.toHaveBeenCalledWith("journaliser_incident", expect.anything());
  });
});
