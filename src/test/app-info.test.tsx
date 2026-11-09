import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { APP_INFO, formatBuildDate, formatRevision } from "@/lib/app-info";
import { routeTree } from "@/routeTree.gen";

describe("Identité de l'application (#237)", () => {
  it("expose licence, copyright et au moins un auteur", () => {
    expect(APP_INFO.licence.nom).toContain("MIT");
    expect(APP_INFO.copyright).toContain("Hatem Laadhari");
    expect(APP_INFO.auteurs.length).toBeGreaterThan(0);
  });

  it("formate la révision", () => {
    expect(formatRevision({ version: "3.1.0", revision: "abc1234" })).toBe("v3.1.0 · rév. abc1234");
  });

  it("formate la date de build et tolère les valeurs invalides", () => {
    expect(formatBuildDate("2026-11-09T10:00:00.000Z")).toMatch(/2026/);
    expect(formatBuildDate("pas-une-date")).toBeNull();
    expect(formatBuildDate(null)).toBeNull();
  });

  it("la route /a-propos existe", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/a-propos").at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
