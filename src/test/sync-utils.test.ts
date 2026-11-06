import { describe, expect, it } from "vitest";
import { arbitrerRevisionDistante, createCoalescingQueue } from "@/lib/storage/sync-utils";

// Issue #201 : pas de faux conflit de révision avec un seul appareil.

function simulerServeur() {
  let rev = 1;
  return {
    get rev() {
      return rev;
    },
    // Même contrat que sauvegarder_fichier : refuse si la révision attendue n'est pas la courante.
    async sauvegarder(expected: number): Promise<{ ok: boolean; conflit: boolean }> {
      await new Promise((r) => setTimeout(r, 5));
      if (expected !== rev) return { ok: false, conflit: true };
      rev += 1;
      return { ok: true, conflit: false };
    },
  };
}

describe("File d'écritures (#201)", () => {
  it("sans file, deux synchronisations simultanées créent un faux conflit (cas de référence)", async () => {
    const serveur = simulerServeur();
    let revLocale = 1;
    const sync = async () => {
      const attendue = revLocale;
      const res = await serveur.sauvegarder(attendue);
      if (res.ok) revLocale = attendue + 1;
      return res;
    };
    const [a, b] = await Promise.all([sync(), sync()]);
    expect([a.conflit, b.conflit]).toContain(true);
  });

  it("avec la file, des synchronisations simultanées ne produisent aucun conflit", async () => {
    const serveur = simulerServeur();
    let revLocale = 1;
    let conflits = 0;
    const sync = createCoalescingQueue(async () => {
      const attendue = revLocale;
      const res = await serveur.sauvegarder(attendue);
      if (res.conflit) conflits += 1;
      if (res.ok) revLocale = attendue + 1;
    });
    await Promise.all([sync(), sync(), sync(), sync(), sync()]);
    expect(conflits).toBe(0);
    expect(serveur.rev).toBe(revLocale);
  });

  it("n'exécute jamais deux tâches en parallèle et coalesce les appels en attente", async () => {
    let actives = 0;
    let maxActives = 0;
    let executions = 0;
    const sync = createCoalescingQueue(async () => {
      executions += 1;
      actives += 1;
      maxActives = Math.max(maxActives, actives);
      await new Promise((r) => setTimeout(r, 10));
      actives -= 1;
    });
    await Promise.all(Array.from({ length: 8 }, () => sync()));
    expect(maxActives).toBe(1);
    // 1 exécution en cours + 1 suivante partagée par les 7 autres appels
    expect(executions).toBe(2);
  });

  it("continue après l'échec d'une exécution", async () => {
    let n = 0;
    const sync = createCoalescingQueue(async () => {
      n += 1;
      if (n === 1) throw new Error("réseau");
    });
    const premier = sync();
    const second = sync();
    await expect(premier).rejects.toThrow("réseau");
    await expect(second).resolves.toBeUndefined();
    expect(n).toBe(2);
  });
});

describe("Arbitrage d'une révision distante plus récente (#201)", () => {
  it("adopte la révision sans conflit si le contenu est identique", () => {
    expect(arbitrerRevisionDistante({ localContent: "<p>a</p>", remoteContent: "<p>a</p>" })).toBe(
      "identique",
    );
  });

  it("adopte le distant si l'élève n'a pas touché au fichier de départ", () => {
    expect(
      arbitrerRevisionDistante({
        localContent: "départ",
        remoteContent: "travail déjà sauvegardé",
        starterContent: "départ",
      }),
    ).toBe("depart_intact");
  });

  it("garde un vrai conflit quand local et distant ont tous deux changé", () => {
    expect(
      arbitrerRevisionDistante({
        localContent: "version locale",
        remoteContent: "version distante",
        starterContent: "départ",
      }),
    ).toBe("conflit");
  });

  it("ne traite jamais comme sans risque un fichier sans contenu de départ connu", () => {
    expect(arbitrerRevisionDistante({ localContent: "mien", remoteContent: "autre" })).toBe(
      "conflit",
    );
  });
});
