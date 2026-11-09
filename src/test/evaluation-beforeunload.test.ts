import { describe, expect, it } from "vitest";
import {
  construireDocumentEvaluationSandbox,
  NEUTRALISEUR_BEFOREUNLOAD,
} from "@/lib/evaluation/document-evaluation";

describe("évaluation sandbox : beforeunload neutralisé (#196)", () => {
  it("injecte le neutraliseur avant tout script élève", () => {
    const doc = construireDocumentEvaluationSandbox(
      { "index.html": "<html><head></head><body></body></html>", "script.js": "x=1" },
      "index.html",
      [],
      "req-1",
    );
    expect(doc).toContain(NEUTRALISEUR_BEFOREUNLOAD);
    expect(doc.indexOf(NEUTRALISEUR_BEFOREUNLOAD)).toBeLessThan(doc.indexOf("x=1"));
  });
});
