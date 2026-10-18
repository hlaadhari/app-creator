import { describe, expect, it, beforeEach } from "vitest";
import {
  normaliserCodeInvitation,
  estCodeValide,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  rejoindreClasse,
} from "@/lib/supabase/classes";

describe("Gestion des Codes d'Invitation & Classes (Issue #7 - PRD F-04 à F-08, T-05)", () => {
  beforeEach(() => {
    resetRateLimit();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  describe("Normalisation et validation syntaxique des codes", () => {
    it("normalise correctement les codes en majuscules sans espaces", () => {
      expect(normaliserCodeInvitation("  sti-7842 ")).toBe("STI-7842");
      expect(normaliserCodeInvitation("abc-123")).toBe("ABC-123");
      expect(normaliserCodeInvitation(" sti 1234 ")).toBe("STI1234");
    });

    it("accepte les codes au format conforme (alphanumérique + tiret, 4 à 12 caractères)", () => {
      expect(estCodeValide("STI-7842")).toBe(true);
      expect(estCodeValide("ABCDEF")).toBe(true);
      expect(estCodeValide("CLASSE-12")).toBe(true);
      expect(estCodeValide("123456")).toBe(true);
    });

    it("rejette les codes trop courts ou contenant des caractères invalides", () => {
      expect(estCodeValide("")).toBe(false);
      expect(estCodeValide("A")).toBe(false);
      expect(estCodeValide("AB")).toBe(false);
      expect(estCodeValide("STI@7842")).toBe(false);
      expect(estCodeValide("STI#1234")).toBe(false);
    });
  });

  describe("Sécurité T-05 : Rate-limiting anti brute-force sur les codes d'invitation", () => {
    it("autorise jusqu'à 5 tentatives consécutives sans blocage", () => {
      for (let i = 0; i < 4; i++) {
        recordFailedAttempt();
        const rl = checkRateLimit();
        expect(rl.allowed).toBe(true);
      }
    });

    it("bloque strictement après 5 échecs consécutifs avec délai de temporisation", () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt();
      }

      const blocked = checkRateLimit();
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(30);
    });

    it("refuse immédiatement l'adhésion si le rate-limit est actif", async () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt();
      }

      const result = await rejoindreClasse("STI-9999");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Trop de tentatives");
      expect(result.retryAfterSeconds).toBeDefined();
    });

    it("réinitialise le compteur après déblocage ou succès", () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt();
      }
      expect(checkRateLimit().allowed).toBe(false);

      resetRateLimit();
      expect(checkRateLimit().allowed).toBe(true);
    });
  });

  describe("Protection contre l'adhésion sans compte utilisateur", () => {
    it("refuse avec un message explicite si l'élève n'est pas connecté", async () => {
      const res = await rejoindreClasse("STI-7842");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Authentification requise");
    });
  });
});
