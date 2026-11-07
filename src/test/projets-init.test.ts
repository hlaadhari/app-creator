import { beforeEach, describe, expect, it, vi } from "vitest";

// Issue #186 & #212 :
// - si initialiser_projet échoue, on ne crée jamais un projet vide en direct (#186) ;
// - si un projet existe déjà mais n'a aucun fichier dans projet_fichiers, on rappelle
//   initialiser_projet (idempotente) pour copier les fichiers de départ (#212).

const VERSION = "11111111-1111-4111-8111-111111111111";
const rpc = vi.fn();
const inserts: string[] = [];

const dbState = {
  projet: null as { id: string } | null,
  fichier: null as { chemin: string } | null,
};

vi.mock("@/integrations/supabase/client", () => {
  const makeChain = (resolver: () => unknown) => {
    const chain = {
      eq: () => chain,
      limit: () => chain,
      maybeSingle: () => Promise.resolve({ data: resolver(), error: null }),
    };
    return chain;
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
        select: () => {
          if (table === "sujet_versions") return makeChain(() => ({ id: VERSION }));
          if (table === "projets") return makeChain(() => dbState.projet);
          if (table === "projet_fichiers") return makeChain(() => dbState.fichier);
          return makeChain(() => null);
        },
        insert: () => {
          inserts.push(table);
          return { select: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) };
        },
      }),
    },
  };
});

import { getOrCreateProjet } from "@/lib/supabase/projets";

describe("getOrCreateProjet (#186, #212)", () => {
  beforeEach(() => {
    rpc.mockReset();
    inserts.length = 0;
    dbState.projet = null;
    dbState.fichier = null;
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

  it("renvoie le projet existant sans rappeler la RPC s'il contient déjà au moins un fichier (#212)", async () => {
    dbState.projet = { id: "p-existant" };
    dbState.fichier = { chemin: "index.html" };
    expect(await getOrCreateProjet("ex-html-css-01")).toBe("p-existant");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rappelle initialiser_projet si le projet existe mais n'a aucun fichier (#212)", async () => {
    dbState.projet = { id: "p-vide" };
    dbState.fichier = null;
    rpc.mockResolvedValue({ data: "p-vide", error: null });
    expect(await getOrCreateProjet("ex-html-css-01")).toBe("p-vide");
    expect(rpc).toHaveBeenCalledWith("initialiser_projet", { _version_id: VERSION });
  });
});
