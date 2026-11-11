import { describe, expect, it } from "vitest";

/**
 * Couverture du mémento par rapport à docs/REFERENTIEL.md (audit #278) :
 * chaque notion listée doit apparaître dans un extrait de la bonne fiche.
 */
const NOTIONS_REFERENTIEL: Record<"html5" | "css3" | "js" | "php" | "sql", string[]> = {
  html5: ["<form", "onsubmit", "<select", "<textarea"],
  css3: [":focus", ":hover", "transition"],
  js: ["querySelector", "getElementById", ".test("],
  php: [
    "$_SESSION",
    "session_start",
    "$_SERVER",
    "$_GET",
    "mysqli_prepare",
    "mysqli_stmt_bind_param",
    "mysqli_real_escape_string",
    "mysqli_fetch_assoc",
  ],
  sql: ["DATETIME", "DISTINCT", "LEFT JOIN", "GROUP BY", "HAVING", "ALTER TABLE"],
};

describe("Mémento : couverture du référentiel (#278)", () => {
  it("chaque notion du référentiel a un extrait dans sa fiche", async () => {
    const { MEMENTO_CARDS } = await import("@/content/mementos");
    for (const [id, notions] of Object.entries(NOTIONS_REFERENTIEL)) {
      const carte = MEMENTO_CARDS.find((c) => c.id === id)!;
      const code = carte.sections.flatMap((s) => s.snippets.map((sn) => sn.code)).join("\n");
      for (const n of notions) expect(code, `${id} : ${n}`).toContain(n);
    }
  });

  it("aucune section n'est numérotée en double et chaque section a un piège", async () => {
    const { MEMENTO_CARDS } = await import("@/content/mementos");
    for (const carte of MEMENTO_CARDS) {
      const ids = carte.sections.map((s) => s.id);
      expect(new Set(ids).size, carte.id).toBe(ids.length);
    }
    for (const id of [
      "php-requete-session",
      "php-securite-prepare",
      "js-regex",
      "css-pseudo-classes",
      "sql-types-distinct",
    ]) {
      const sec = MEMENTO_CARDS.flatMap((c) => c.sections).find((s) => s.id === id)!;
      expect(sec, id).toBeDefined();
      expect(
        (sec.keyPoints ?? []).some((p) => p.startsWith("Piège")),
        id,
      ).toBe(true);
    }
  });

  it("l'extension PDO ou mysql_* n'est jamais enseignée", async () => {
    const { MEMENTO_CARDS } = await import("@/content/mementos");
    const code = MEMENTO_CARDS.flatMap((c) =>
      c.sections.flatMap((s) => s.snippets.map((sn) => sn.code)),
    ).join("\n");
    expect(code).not.toMatch(/new PDO|mysql_connect|mysql_query/);
  });
});
