import { beforeEach, describe, expect, it, vi } from "vitest";

// Issue #184 : une vérification ne doit produire qu'UNE insertion dans `tentatives`,
// avec la vraie version publiée du sujet, jamais un UUID nul de secours (409 FK).

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const inserts: Record<string, unknown>[] = [];
let versionPubliee: { id: string } | null = { id: "11111111-1111-4111-8111-111111111111" };

vi.mock("@/integrations/supabase/client", () => {
  const selectChain = {
    eq: () => selectChain,
    limit: () => selectChain,
    maybeSingle: () => Promise.resolve({ data: versionPubliee, error: null }),
  };
  return {
    supabase: {
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: "22222222-2222-4222-8222-222222222222" } },
            error: null,
          }),
      },
      from: (table: string) => ({
        select: () => selectChain,
        insert: (row: Record<string, unknown>) => {
          if (table === "tentatives") inserts.push(row);
          return Promise.resolve({ data: null, error: null });
        },
      }),
      rpc: () => Promise.resolve({ data: null, error: null }),
    },
  };
});

import { enregistrerNouvelleTentative, resetAttemptsCache } from "@/lib/pedagogy/attempts-service";

const params = {
  sujetId: "ex-html-css-01",
  note20: 10,
  pointsObtenus: 10,
  pointsTotal: 20,
  criteres: [{ id: "c1", label: "C1", ok: true, points: 10, maxPoints: 10 }],
};

describe("Tentatives : insertion unique (#184)", () => {
  beforeEach(() => {
    inserts.length = 0;
    versionPubliee = { id: "11111111-1111-4111-8111-111111111111" };
    resetAttemptsCache();
  });

  it("insère exactement une ligne avec la version publiée du sujet", async () => {
    await enregistrerNouvelleTentative(params);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.["sujet_version_id"]).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("n'utilise jamais l'UUID nul et n'insère rien sans version publiée", async () => {
    versionPubliee = null;
    await enregistrerNouvelleTentative(params);
    expect(inserts).toHaveLength(0);
    expect(JSON.stringify(inserts)).not.toContain(NIL_UUID);
  });

  it("conserve la tentative en local même sans version distante", async () => {
    versionPubliee = null;
    const rec = await enregistrerNouvelleTentative(params);
    expect(rec.numeroTentative).toBe(1);
  });
});
