import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import {
  sampleWrittenExam,
  getWrittenExam,
  getAllWrittenExams,
} from "@/lib/content/written-subjects";

describe("Examen Écrit Route & Catalog Support (Issue #165)", () => {
  it("fournit le sujet démo et enregistre les épreuves écrites", () => {
    expect(sampleWrittenExam.id).toBe("written-bac-demo");
    expect(sampleWrittenExam.sections).toHaveLength(4);

    const found = getWrittenExam("written-bac-demo");
    expect(found).toBeDefined();
    expect(found?.title).toBe(sampleWrittenExam.title);

    const all = getAllWrittenExams();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });
});
