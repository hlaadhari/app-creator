import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const versionPubliee = vi.hoisted(() => vi.fn());
const ordre = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc,
    from: (table: string) => ({
      select: () => ({
        eq: (colonne: string, valeur: unknown) => ({
          eq: (colonne2: string, valeur2: unknown) => ({
            order: (...args: unknown[]) => {
              ordre(table, colonne, valeur, colonne2, valeur2, ...args);
              return { limit: () => ({ maybeSingle: versionPubliee }) };
            },
          }),
        }),
      }),
    }),
  },
}));

import { consulterSolutionReference } from "@/lib/pedagogy/solutions-client";

const VERSION = "11111111-0000-0000-0000-000000000001";

describe("Corrigés servis uniquement par le serveur (issue #75, T-04 / T-06)", () => {
  beforeEach(() => {
    rpc.mockReset();
    versionPubliee.mockReset();
    ordre.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("n'embarque plus aucun corrigé dans le code du navigateur", () => {
    const source = readFileSync("src/lib/pedagogy/solutions-client.ts", "utf-8");
    expect(source).not.toContain("CATALOGUE_SOLUTIONS");
    expect(source).not.toMatch(/document\.getElementById/);
    expect(source.split("\n").length).toBeLessThan(150);
  });

  it("lit le corrigé par la fonction serveur debloquer_solution", async () => {
    rpc.mockResolvedValue({
      data: [{ id: "s1", chemin: "index.html", contenu: "<h1>Corrigé</h1>" }],
      error: null,
    });

    const res = await consulterSolutionReference({
      sujetId: "carte-profil",
      versionId: VERSION,
      motif: "revision",
    });

    expect(rpc).toHaveBeenCalledWith("debloquer_solution", {
      p_version_id: VERSION,
      p_motif: "revision",
    });
    expect(res.success).toBe(true);
    expect(res.mode).toBe("distant");
    expect(res.files).toEqual([{ path: "index.html", content: "<h1>Corrigé</h1>" }]);
  });

  it("retrouve la dernière version publiée du sujet quand l'écran n'en transmet pas", async () => {
    versionPubliee.mockResolvedValue({ data: { id: VERSION }, error: null });
    rpc.mockResolvedValue({
      data: [{ id: "s1", chemin: "index.html", contenu: "<h1>Corrigé</h1>" }],
      error: null,
    });

    const res = await consulterSolutionReference({ sujetId: "carte-profil" });

    expect(ordre).toHaveBeenCalledWith(
      "sujet_versions",
      "sujet_id",
      "carte-profil",
      "publiee",
      true,
      "numero",
      { ascending: false },
    );
    expect(rpc).toHaveBeenCalledWith("debloquer_solution", {
      p_version_id: VERSION,
      p_motif: "consultation_eleve",
    });
    expect(res.success).toBe(true);
    expect(res.files).toHaveLength(1);
  });

  it("n'interroge pas la base des versions quand la version est déjà connue", async () => {
    rpc.mockResolvedValue({
      data: [{ id: "s1", chemin: "a.js", contenu: "x" }],
      error: null,
    });

    await consulterSolutionReference({ sujetId: "carte-profil", versionId: VERSION });

    expect(ordre).not.toHaveBeenCalled();
  });

  it("indique « pas encore publié » et n'appelle pas debloquer_solution si le sujet n'a aucune version publiée", async () => {
    versionPubliee.mockResolvedValue({ data: null, error: null });

    const res = await consulterSolutionReference({ sujetId: "ex-js-01" });

    expect(rpc).not.toHaveBeenCalled();
    expect(res).toEqual({
      success: false,
      error: "Le corrigé de ce sujet n'est pas encore publié.",
    });
  });

  it("refuse par défaut si la version du sujet ne peut pas être lue", async () => {
    versionPubliee.mockResolvedValue({ data: null, error: { message: "indisponible" } });

    const res = await consulterSolutionReference({ sujetId: "carte-profil" });

    expect(rpc).not.toHaveBeenCalled();
    expect(res.success).toBe(false);
    expect(res.error).toContain("momentanément indisponible");
  });

  it("n'appelle pas le serveur quand le poste signale un examen, et signale l'incident", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    const res = await consulterSolutionReference({
      sujetId: "exam-bac2023-location-habits",
      versionId: VERSION,
      estEnExamen: true,
    });

    expect(res.success).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "journaliser_incident",
      expect.objectContaining({ _type: "TENTATIVE_ACCES_CORRIGE_EN_EXAMEN" }),
    );
  });

  it("même si le navigateur affirme « hors examen », le refus du serveur s'applique et l'incident est signalé", async () => {
    rpc.mockImplementation(async (fonction: string) => {
      if (fonction === "debloquer_solution") {
        return {
          data: null,
          error: {
            message:
              "Accès au corrigé strictement interdit en session d examen active (T-04 / T-06)",
          },
        };
      }
      return { data: null, error: null };
    });

    const res = await consulterSolutionReference({
      sujetId: "exam-bac2023-location-habits",
      versionId: VERSION,
      estEnExamen: false,
    });

    expect(res.success).toBe(false);
    expect(res.files).toBeUndefined();
    expect(res.error).toContain("T-04 / T-06");
    expect(rpc).toHaveBeenCalledWith(
      "journaliser_incident",
      expect.objectContaining({ _type: "TENTATIVE_ACCES_CORRIGE_EN_EXAMEN" }),
    );
  });

  it("refuse par défaut si le serveur est injoignable (aucun repli sur un corrigé local)", async () => {
    rpc.mockRejectedValue(new Error("réseau"));

    const res = await consulterSolutionReference({
      sujetId: "carte-profil",
      versionId: VERSION,
    });

    expect(res.success).toBe(false);
    expect(res.files).toBeUndefined();
    expect(res.error).toContain("momentanément indisponible");
  });

  it("refuse par défaut sur une erreur serveur inattendue", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom interne" } });

    const res = await consulterSolutionReference({ sujetId: "carte-profil", versionId: VERSION });

    expect(res.success).toBe(false);
    expect(res.error).toContain("momentanément indisponible");
    expect(res.error).not.toContain("boom");
  });

  it("indique qu'aucun corrigé n'est publié quand le serveur ne renvoie aucun fichier", async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    const res = await consulterSolutionReference({ sujetId: "carte-profil", versionId: VERSION });

    expect(res.success).toBe(false);
    expect(res.error).toContain("pas encore publié");
  });
});
