import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { delaiReprise } from "@/lib/storage/useBufferSync";

// Issue #255 : réduction du trafic d'écriture (audit de capacité).

describe("délai de reprise après erreur de synchronisation (#255)", () => {
  it("croît de façon exponentielle et reste plafonné à 60 s", () => {
    const sansGigue = () => 1;
    expect(delaiReprise(1, sansGigue)).toBe(2000);
    expect(delaiReprise(2, sansGigue)).toBe(4000);
    expect(delaiReprise(3, sansGigue)).toBe(8000);
    expect(delaiReprise(20, sansGigue)).toBe(60000);
  });

  it("applique une gigue : deux clients ne reprennent pas au même instant", () => {
    expect(delaiReprise(3, () => 0)).toBe(4000);
    expect(delaiReprise(3, () => 1)).toBe(8000);
    expect(delaiReprise(3, () => 0.5)).toBeGreaterThan(4000);
  });
});

describe("migration 0038 : sauvegarde en lot (#255)", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20261110120000_0038_sauvegarde_fichiers_lot.sql"),
    "utf8",
  );

  it("définit sauvegarder_fichiers réservée aux élèves connectés", () => {
    expect(sql).toContain("create or replace function public.sauvegarder_fichiers(");
    expect(sql).toContain(
      "revoke execute on function public.sauvegarder_fichiers(uuid, jsonb) from public, anon;",
    );
    expect(sql).toContain(
      "grant execute on function public.sauvegarder_fichiers(uuid, jsonb) to authenticated;",
    );
  });

  it("impose des limites de taille côté serveur", () => {
    expect(sql).toContain("FICHIER_TROP_VOLUMINEUX");
    expect(sql).toContain("LOT_TROP_VOLUMINEUX");
    expect(sql).toContain("LOT_TROP_GRAND");
  });
});
