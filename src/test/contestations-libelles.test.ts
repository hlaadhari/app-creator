import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const requeteContestations = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc,
    from: (table: string) => {
      if (table === "class_members") {
        return {
          select: () => ({
            eq: () => ({
              is: () =>
                Promise.resolve({
                  data: [
                    {
                      eleve_id: "e1",
                      joined_at: "2026-10-19T10:00:00Z",
                      profiles: { id: "e1", nom: "Martin", prenom: "Clara" },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }
      return {
        select: (colonnes: string) => ({
          in: () => ({ order: () => requeteContestations(table, colonnes) }),
        }),
      };
    },
  },
}));

import { getClassContestations } from "@/lib/supabase/teacher";

const contestation = (critereId: string) => ({
  id: `c-${critereId}`,
  critere_id: critereId,
  eleve_id: "e1",
  texte: "Mon code respecte pourtant ce critère.",
  statut: "en_attente",
  created_at: "2026-10-20T10:00:00Z",
});

describe("Contestations enseignant : libellés des critères (issue #70)", () => {
  beforeEach(() => {
    rpc.mockReset();
    requeteContestations.mockReset();
  });

  it("ne lit jamais la table criteres (correction) en jointure", async () => {
    requeteContestations.mockResolvedValue({ data: [contestation("k1")], error: null });
    rpc.mockResolvedValue({
      data: [{ id: "k1", code: "C1", label: "Le titre est visible" }],
      error: null,
    });

    await getClassContestations("cls1", "Terminale");

    const [table, colonnes] = requeteContestations.mock.calls[0] as [string, string];
    expect(table).toBe("contestations");
    expect(colonnes).toBe("*");
    expect(colonnes).not.toContain("criteres");
  });

  it("récupère code et libellé par la fonction SQL, une seule fois par critère", async () => {
    requeteContestations.mockResolvedValue({
      data: [contestation("k1"), contestation("k1"), contestation("k2")],
      error: null,
    });
    rpc.mockResolvedValue({
      data: [
        { id: "k1", code: "C1", label: "Le titre est visible" },
        { id: "k2", code: "C2", label: "Le bouton réagit au clic" },
      ],
      error: null,
    });

    const liste = await getClassContestations("cls1", "Terminale");

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("critere_libelles", { _ids: ["k1", "k2"] });
    expect(liste).toHaveLength(3);
    expect(liste[0]).toMatchObject({
      critere_code: "C1",
      critere_label: "Le titre est visible",
      eleve_nom: "Clara Martin",
    });
    expect(liste[2]).toMatchObject({ critere_code: "C2" });
  });

  it("garde la liste avec des libellés génériques si les libellés sont indisponibles", async () => {
    requeteContestations.mockResolvedValue({ data: [contestation("k1")], error: null });
    rpc.mockResolvedValue({ data: null, error: { message: "acces_refuse" } });

    const liste = await getClassContestations("cls1", "Terminale");

    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({
      critere_code: "CRIT",
      critere_label: "Critère d'évaluation",
    });
  });

  it("n'appelle pas la fonction sans contestation", async () => {
    requeteContestations.mockResolvedValue({ data: [], error: null });
    const liste = await getClassContestations("cls1", "Terminale");
    expect(liste).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });
});
