import { describe, expect, it } from "vitest";
import { score } from "@/lib/exercises";

describe("score", () => {
  it("convertit les points en note sur 20", () => {
    const r = [
      { id: "a", label: "", points: 3, ok: true, message: "" },
      { id: "b", label: "", points: 1, ok: false, message: "" },
    ];
    expect(score(r)).toEqual({ got: 3, total: 4, note20: 15 });
  });
});
