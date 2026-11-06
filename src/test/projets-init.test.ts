import { beforeEach, describe, expect, it, vi } from "vitest";

// Issue #186 : si initialiser_projet échoue, on ne crée jamais un projet vide en direct.

const VERSION = "11111111-1111-4111-8111-111111111111";
const rpc = vi.fn();
const inserts: string[] = [];

vi.mock("@/integrations/supabase/client", () => {
  const chain = {
    eq: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  };
  const versionChain = {
    eq: () => versionChain,
    limit: () => versionChain,
    maybeSingle: () => Promise.resolve({ data: { id: VERSION }, error: null }),
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
      rpc: (...a: unknown[]) => rpc(...a),
      from: (table: string) => ({
        select: () => (table === "sujet_versions" ? versionChain : chain),
        insert: () => {
          inserts.push(table);
          return { select: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) };
        },
      }),
    },
  };
});

import { getOrCreateProjet } from "@/lib/supabase/projets";

describe("getOrCreateProjet (#186)", () => {
  beforeEach(() => {
    rpc.mockReset();
    inserts.length = 0;
  });

  it("renvoie l'identifiant du projet créé par la RPC", async () => {
    rpc.mockResolvedValue({ data: "p-1", error: null });
    expect(await getOrCreateProjet("ex-html-css-01")).toBe("p-1");
    expect(rpc).toHaveBeenCalledWith("initialiser_projet", { _version_id: VERSION });
  });

  it("n'insère jamais directement dans projets quand la RPC échoue", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await getOrCreateProjet("ex-html-css-01")).toBeNull();
    expect(inserts).not.toContain("projets");
  });
});
