import { beforeEach, describe, expect, it, vi } from "vitest";

const { toastMock } = vi.hoisted(() => ({
  toastMock: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

import { notify } from "@/lib/notify";

describe("notify (#238)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("success : 4 s par défaut, avec description et id", () => {
    notify.success("OK", { description: "détail", id: "x" });
    expect(toastMock.success).toHaveBeenCalledWith("OK", {
      duration: 4000,
      description: "détail",
      id: "x",
    });
  });

  it("error : 8 s par défaut", () => {
    notify.error("KO");
    expect(toastMock.error).toHaveBeenCalledWith("KO", { duration: 8000 });
  });

  it("info : durée personnalisable", () => {
    notify.info("i", { duration: 1000 });
    expect(toastMock.info).toHaveBeenCalledWith("i", { duration: 1000 });
  });

  it("dismiss transmet l'id", () => {
    notify.dismiss("x");
    expect(toastMock.dismiss).toHaveBeenCalledWith("x");
  });
});
