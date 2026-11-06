import { beforeEach, describe, expect, it, vi } from "vitest";

// Issue #185 : une contestation n'envoie jamais d'identifiant non UUID au serveur et
// passe par la RPC deposer_contestation ; un échec de transmission n'est jamais silencieux.

const ELEVE = "22222222-2222-4222-8222-222222222222";
const rpc = vi.fn();
const from = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...args),
  },
}));

import {
  estUuid,
  listerContestationsEleve,
  resetContestationsCache,
  soumettreContestation,
} from "@/lib/pedagogy/contestations-client";

const base = { sujetId: "ex-html-css-01", critereId: "h1", texte: "Mon titre est bien présent" };

describe("Contestations côté serveur (#185)", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    resetContestationsCache();
  });

  it("reconnaît les UUID et rejette les identifiants locaux", () => {
    expect(estUuid(ELEVE)).toBe(true);
    expect(estUuid("eleve-courant")).toBe(false);
    expect(estUuid("invite")).toBe(false);
    expect(estUuid(null)).toBe(false);
  });

  it("n'appelle pas le serveur pour un élève non connecté et le signale", async () => {
    const res = await soumettreContestation({ ...base, eleveId: "invite" });
    expect(res.success).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
    expect(res.syncError).toBeTruthy();
  });

  it("dépose via la RPC avec le sujet et le code du critère", async () => {
    rpc.mockResolvedValue({ data: "33333333-3333-4333-8333-333333333333", error: null });
    const res = await soumettreContestation({ ...base, eleveId: ELEVE });
    expect(rpc).toHaveBeenCalledWith("deposer_contestation", {
      p_sujet_id: "ex-html-css-01",
      p_critere_code: "h1",
      p_texte: "Mon titre est bien présent",
    });
    expect(res.syncError).toBeUndefined();
    expect(res.contestation?.id).toBe("33333333-3333-4333-8333-333333333333");
  });

  it("garde la contestation en local et signale l'erreur si le serveur refuse", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "critere_introuvable" } });
    const res = await soumettreContestation({ ...base, eleveId: ELEVE });
    expect(res.success).toBe(true);
    expect(res.syncError).toBe("critere_introuvable");
    const locales = await listerContestationsEleve("invite");
    expect(locales).toEqual([]);
  });

  it("ne requête pas `contestations` avec un identifiant non UUID", async () => {
    await listerContestationsEleve("eleve-courant");
    expect(from).not.toHaveBeenCalled();
  });
});
