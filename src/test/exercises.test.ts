import { describe, expect, it } from "vitest";
import { score } from "@/lib/exercises";

describe("score", () => {
  it("convertit les points en note sur 20", () => {
    const r = [
      { id: "a", label: "", points: 3, ok: true, automatique: true, message: "" },
      { id: "b", label: "", points: 1, ok: false, automatique: true, message: "" },
    ];
    expect(score(r)).toEqual({ got: 3, total: 4, verifiable: 4, nonVerifiable: 0, note20: 15 });
  });

  it("ne compte jamais les points d'un critère non vérifiable", () => {
    const r = [
      { id: "a", label: "", points: 2, ok: true, automatique: true, message: "" },
      { id: "b", label: "", points: 2, ok: false, automatique: false, message: "" },
    ];
    expect(score(r)).toEqual({ got: 2, total: 4, verifiable: 2, nonVerifiable: 2, note20: 10 });
  });
});
