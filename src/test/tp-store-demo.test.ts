import { describe, expect, it } from "vitest";
import { creerStoreInitial } from "@/lib/tp/tp-reservation-service";

// Issue #187 : aucune donnée fictive hors environnement de test.
describe("Store TP initial (#187)", () => {
  it("est vide en production : pas de séance ni d'élève fictifs", () => {
    const store = creerStoreInitial(false);
    expect(store.sessions).toEqual([]);
    expect(store.reservations).toEqual([]);
  });

  it("fournit des données d'exemple uniquement en mode test", () => {
    const store = creerStoreInitial(true);
    expect(store.sessions.length).toBeGreaterThan(0);
    expect(store.reservations.length).toBeGreaterThan(0);
  });

  it("renvoie à chaque appel des copies indépendantes", () => {
    const a = creerStoreInitial(true);
    a.sessions.pop();
    expect(creerStoreInitial(true).sessions.length).toBeGreaterThan(a.sessions.length);
  });
});
