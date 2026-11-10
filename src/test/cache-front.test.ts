import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

import { getRouter } from "@/router";
import { chargerSujetPublie, viderMemoireSujetsPublies } from "@/lib/supabase/sujets-publies";

const lire = (chemin: string) => readFileSync(resolve(process.cwd(), chemin), "utf-8");

interface RegleEntetes {
  source: string;
  headers: { key: string; value: string }[];
}

const serveur = {
  sujet_id: "tp-menu-01",
  version_id: "v1",
  numero: 1,
  titre: "Menu",
  niveau: "Facile",
  competence: "HTML",
  duree_min: 30,
  enonce_md: "# Menu",
  fichiers: { "index.html": "<body></body>" },
  criteres: [{ id: "c1", titre: "Titre", points: 1, sonde: { type: "element", selecteur: "nav" } }],
};

describe("Cache du front pour une classe entière (#261)", () => {
  describe("service worker", () => {
    const sw = lire("public/sw.js");

    it("sert /assets/ depuis le cache sans requête réseau quand le fichier est présent", () => {
      const debut = sw.indexOf('url.pathname.startsWith("/assets/")');
      expect(debut).toBeGreaterThan(-1);
      const bloc = sw.slice(debut, sw.indexOf("// Autres ressources statiques"));
      expect(bloc).toContain("if (cached) return cached;");
      // Pas de revalidation en arrière-plan : le fetch n'a lieu que si le cache est vide.
      expect(bloc.indexOf("if (cached) return cached;")).toBeLessThan(
        bloc.indexOf("fetch(request)"),
      );
    });

    it("garde la revalidation pour les fichiers sans hash et le repli hors ligne des pages", () => {
      expect(sw).toContain("Stale-While-Revalidate");
      expect(sw).toContain('request.mode === "navigate"');
    });
  });

  describe("en-têtes Vercel", () => {
    const regles = (JSON.parse(lire("vercel.json")) as { headers: RegleEntetes[] }).headers;
    const cache = (source: string) =>
      regles.find((r) => r.source === source)?.headers.find((h) => h.key === "Cache-Control")
        ?.value;

    it("met en cache CDN les pages publiques, avec revalidation en arrière-plan", () => {
      for (const source of ["/", "/(cours|a-propos)", "/sujet/(.*)"]) {
        const valeur = cache(source);
        expect(valeur, source).toBeDefined();
        expect(valeur).toContain("public");
        expect(valeur).toMatch(/s-maxage=\d+/);
        expect(valeur).toContain("stale-while-revalidate");
        // Le navigateur revalide toujours : seule la copie du CDN est partagée.
        expect(valeur).toContain("max-age=0");
      }
    });

    it("ne met jamais en cache partagé les espaces réservés", () => {
      const sources = regles.filter((r) => r.headers.some((h) => h.key === "Cache-Control"));
      for (const prive of ["/admin", "/enseignant", "/examen-ecrit", "/calendrier"]) {
        const concernee = sources.filter(
          (r) => r.source !== "/assets/(.*)" && new RegExp(`^${r.source}$`).test(prive),
        );
        expect(concernee, prive).toEqual([]);
      }
    });

    it("garde les assets à hash immuables", () => {
      expect(cache("/assets/(.*)")).toBe("public, max-age=31536000, immutable");
    });
  });

  describe("QueryClient", () => {
    it("ne relance pas les requêtes à chaque montage ni au simple retour sur l'onglet", () => {
      const options = getRouter().options.context.queryClient.getDefaultOptions().queries;
      expect(options?.staleTime).toBe(60_000);
      expect(options?.refetchOnWindowFocus).toBe(false);
      expect(options?.retry).toBe(1);
    });
  });

  describe("chargerSujetPublie", () => {
    beforeEach(() => {
      rpc.mockReset();
      viderMemoireSujetsPublies();
    });

    it("partage l'appel en cours et garde le résultat : un seul appel serveur", async () => {
      rpc.mockResolvedValue({ data: serveur, error: null });
      const [a, b] = await Promise.all([
        chargerSujetPublie("tp-menu-01"),
        chargerSujetPublie("tp-menu-01"),
      ]);
      const c = await chargerSujetPublie("tp-menu-01");
      expect(rpc).toHaveBeenCalledTimes(1);
      expect(a?.title).toBe("Menu");
      expect(b).toBe(a);
      expect(c).toBe(a);
    });

    it("garde une mémoire distincte par sujet", async () => {
      rpc.mockResolvedValue({ data: serveur, error: null });
      await chargerSujetPublie("tp-menu-01");
      await chargerSujetPublie("tp-autre-01");
      expect(rpc).toHaveBeenCalledTimes(2);
    });

    it("oublie une erreur réseau et un sujet absent pour les redemander", async () => {
      rpc.mockResolvedValueOnce({ data: null, error: { message: "timeout" } });
      await expect(chargerSujetPublie("tp-menu-01")).rejects.toThrow("timeout");
      rpc.mockResolvedValueOnce({ data: null, error: null });
      expect(await chargerSujetPublie("tp-menu-01")).toBeNull();
      rpc.mockResolvedValueOnce({ data: serveur, error: null });
      expect((await chargerSujetPublie("tp-menu-01"))?.title).toBe("Menu");
      expect(rpc).toHaveBeenCalledTimes(3);
    });

    it("redemande le sujet une fois la mémoire expirée (60 s)", async () => {
      vi.useFakeTimers();
      try {
        rpc.mockResolvedValue({ data: serveur, error: null });
        await chargerSujetPublie("tp-menu-01");
        vi.advanceTimersByTime(59_000);
        await chargerSujetPublie("tp-menu-01");
        expect(rpc).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(2_000);
        await chargerSujetPublie("tp-menu-01");
        expect(rpc).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
