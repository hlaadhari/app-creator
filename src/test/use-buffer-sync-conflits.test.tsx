import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Issue #201 : pas de faux conflit de révision avec un seul appareil ; un vrai conflit reste détecté.

const mocks = vi.hoisted(() => ({
  serveurRev: 1,
  conflitsServeur: 0,
  lots: [] as { chemin: string; expectedRev: number }[][],
  distants: [] as { chemin: string; contenu: string; rev: number; updated_at: string }[],
  local: null as unknown,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "u1" } }, error: null }),
      getSession: () => Promise.resolve({ data: { session: { user: { id: "u1" } } }, error: null }),
    },
  },
}));

vi.mock("@/lib/storage/indexeddb", () => ({
  getFromBuffer: () => Promise.resolve(mocks.local),
  saveToBuffer: () => Promise.resolve(),
}));

vi.mock("@/lib/supabase/projets", () => ({
  getOrCreateProjet: () => Promise.resolve("p1"),
  chargerFichiersDistants: () => Promise.resolve(mocks.distants),
  // Même contrat que sauvegarder_fichier : refuse si la révision attendue n'est pas la courante.
  // Même contrat que sauvegarder_fichiers : tout ou rien, conflit détecté avant l'écriture.
  sauvegarderFichiersDistants: async (
    _p: string,
    fichiers: { chemin: string; contenu: string; expectedRev: number }[],
  ) => {
    await new Promise((r) => setTimeout(r, 5));
    mocks.lots.push(fichiers.map(({ chemin, expectedRev }) => ({ chemin, expectedRev })));
    const enConflit = fichiers.find((f) => f.expectedRev !== mocks.serveurRev);
    if (enConflit) {
      mocks.conflitsServeur += 1;
      return {
        ok: false,
        conflict: {
          fileName: enConflit.chemin,
          remoteRev: mocks.serveurRev,
          remoteContent: "distant",
        },
      };
    }
    mocks.serveurRev += 1;
    const revs: Record<string, number> = {};
    for (const f of fichiers) revs[f.chemin] = mocks.serveurRev;
    return { ok: true, revs };
  },
  sauvegarderFichierDistant: async (_p: string, _c: string, _t: string, expected: number) => {
    await new Promise((r) => setTimeout(r, 5));
    if (expected !== mocks.serveurRev) {
      mocks.conflitsServeur += 1;
      return { ok: false, conflict: true, remoteRev: mocks.serveurRev, remoteContent: "distant" };
    }
    mocks.serveurRev += 1;
    return { ok: true, newRev: mocks.serveurRev };
  },
}));

import { useBufferSync } from "@/lib/storage/useBufferSync";

const STARTER = { "index.html": "<h1>départ</h1>" };

function monter() {
  return renderHook(() => useBufferSync({ exerciseId: "ex-test", starterFiles: STARTER }));
}

describe("useBufferSync : conflits de révision (#201)", () => {
  beforeEach(() => {
    mocks.serveurRev = 1;
    mocks.conflitsServeur = 0;
    mocks.lots = [];
    mocks.distants = [];
    mocks.local = null;
  });

  it("plusieurs synchronisations simultanées ne produisent aucun faux conflit", async () => {
    const { result } = monter();
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.updateFileContent("index.html", "<h1>v1</h1>"));
    await act(async () => {
      await Promise.all([
        result.current.triggerManualSync(),
        result.current.triggerManualSync(),
        result.current.triggerManualSync(),
      ]);
    });
    act(() => result.current.updateFileContent("index.html", "<h1>v2</h1>"));
    await act(async () => {
      await Promise.all([result.current.triggerManualSync(), result.current.triggerManualSync()]);
    });

    expect(mocks.conflitsServeur).toBe(0);
    expect(result.current.conflict).toBeNull();
    expect(result.current.syncStatus).toBe("synced");
  });

  it("n'envoie qu'un appel par synchronisation, avec seulement les fichiers modifiés (#255)", async () => {
    const { result } = monter();
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.updateFileContent("index.html", "<h1>v1</h1>"));
    await act(async () => {
      await result.current.triggerManualSync();
    });
    expect(mocks.lots).toHaveLength(1);
    expect(mocks.lots[0]?.map((f) => f.chemin)).toEqual(["index.html"]);

    // Rien n'a changé depuis : aucun appel réseau supplémentaire
    await act(async () => {
      await result.current.triggerManualSync();
    });
    expect(mocks.lots).toHaveLength(1);
    expect(result.current.syncStatus).toBe("synced");

    act(() => result.current.updateFileContent("index.html", "<h1>v2</h1>"));
    await act(async () => {
      await result.current.triggerManualSync();
    });
    expect(mocks.lots).toHaveLength(2);
    expect(mocks.conflitsServeur).toBe(0);
  });

  it("adopte sans conflit le travail distant quand le fichier local est encore le départ", async () => {
    mocks.distants = [
      { chemin: "index.html", contenu: "<h1>mon travail</h1>", rev: 10, updated_at: "2026-11-06" },
    ];
    const { result } = monter();
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    await waitFor(() => expect(result.current.syncStatus).toBe("synced"));

    expect(result.current.conflict).toBeNull();
    expect(result.current.files["index.html"]?.content).toBe("<h1>mon travail</h1>");
  });

  it("adopte la révision sans conflit quand le contenu distant est identique", async () => {
    mocks.local = {
      exerciseId: "ex-test",
      files: {
        "index.html": {
          name: "index.html",
          content: "<h1>mien</h1>",
          type: "text",
          language: "html",
          rev: 1,
          updatedAt: 1,
        },
      },
      rev: 1,
      syncStatus: "pending",
      lastLocalSaveAt: 1,
    };
    mocks.distants = [
      { chemin: "index.html", contenu: "<h1>mien</h1>", rev: 5, updated_at: "2026-11-06" },
    ];
    const { result } = monter();
    await waitFor(() => expect(result.current.syncStatus).toBe("synced"));
    expect(result.current.conflict).toBeNull();
    expect(result.current.files["index.html"]?.content).toBe("<h1>mien</h1>");
  });

  it("détecte un vrai conflit quand local et distant diffèrent, sans rien écraser", async () => {
    mocks.local = {
      exerciseId: "ex-test",
      files: {
        "index.html": {
          name: "index.html",
          content: "<h1>version locale</h1>",
          type: "text",
          language: "html",
          rev: 1,
          updatedAt: 1,
        },
      },
      rev: 1,
      syncStatus: "pending",
      lastLocalSaveAt: 1,
    };
    mocks.distants = [
      {
        chemin: "index.html",
        contenu: "<h1>version distante</h1>",
        rev: 2,
        updated_at: "2026-11-06",
      },
    ];
    const { result } = monter();
    await waitFor(() => expect(result.current.syncStatus).toBe("conflict"));
    expect(result.current.conflict?.localContent).toBe("<h1>version locale</h1>");
    expect(result.current.conflict?.remoteContent).toBe("<h1>version distante</h1>");
    expect(result.current.files["index.html"]?.content).toBe("<h1>version locale</h1>");
  });

  it("adopte les fichiers distants (rev 1) absents localement après réparation d'un projet vide (#212)", async () => {
    mocks.distants = [
      {
        chemin: "repare.html",
        contenu: "<h1>fichier de départ restauré</h1>",
        rev: 1,
        updated_at: "2026-11-07",
      },
    ];
    const { result } = monter();
    await waitFor(() => expect(result.current.syncStatus).toBe("synced"));
    expect(result.current.conflict).toBeNull();
    expect(result.current.files["repare.html"]?.content).toBe(
      "<h1>fichier de départ restauré</h1>",
    );
  });
});
