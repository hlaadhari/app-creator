import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CriteriaListSchema, CriterionJsonSchema } from "@/lib/evaluation/criteria-schema";

const CONTENT_DIR = path.resolve(process.cwd(), "content");

describe("Validation Zod Strict des Fichiers criteria.json (TEC-06 / Issue #128)", () => {
  const subjects = fs
    .readdirSync(CONTENT_DIR)
    .filter((dir) => fs.existsSync(path.join(CONTENT_DIR, dir, "criteria.json")));

  it("vérifie que les 10 sujets du catalogue possèdent un criteria.json", () => {
    expect(subjects.length).toBe(10);
  });

  it.each(subjects)("sujet %s : criteria.json est 100% conforme au schéma strict", (sujetDir) => {
    const filePath = path.join(CONTENT_DIR, sujetDir, "criteria.json");
    const rawContent = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(rawContent);

    const parseResult = CriteriaListSchema.safeParse(json);
    if (!parseResult.success) {
      console.error(
        `Erreurs de validation dans ${sujetDir}/criteria.json:`,
        parseResult.error.format(),
      );
    }
    expect(parseResult.success).toBe(true);
  });

  it("rejette formellement tout critère comportant une propriété inconnue (.strict())", () => {
    const invalidCriterion = {
      id: "crit-bad",
      titre: "Critère avec propriété inconnue",
      points: 2,
      propriete_interdite_ou_inconnue: "test",
    };

    const result = CriterionJsonSchema.safeParse(invalidCriterion);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(
        issues.some(
          (issue) =>
            issue.code === "unrecognized_keys" &&
            (issue as unknown as { keys: string[] }).keys.includes(
              "propriete_interdite_ou_inconnue",
            ),
        ),
      ).toBe(true);
    }
  });

  it("rejette un critère sans aucun libellé ou titre", () => {
    const invalidCriterion = {
      id: "crit-no-title",
      points: 2,
    };

    const result = CriterionJsonSchema.safeParse(invalidCriterion);
    expect(result.success).toBe(false);
  });
});
