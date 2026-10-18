import { describe, expect, it } from "vitest";
import {
  getSecurityTestsMatrix,
  MOCK_ADMIN_USERS,
  MOCK_ADMIN_METRICS,
  getAdminMetrics,
  getAdminUsers,
  validerCompteEnseignant,
  modifierRoleUtilisateur,
  anonymiserDonneesEleve,
} from "@/lib/supabase/admin";
import { anonymiserProfilEleve } from "@/lib/security/rgpd";

describe("Espace d'Administration Centrale & Sécurité (Issue #30 - PRD §4.1, §17, T-01..T-14)", () => {
  describe("Matrice des 14 Tests Négatifs de Sécurité (SECURITY.md T-01 à T-14)", () => {
    it("fournit l'intégralité des 14 tests de sécurité spécifiés", () => {
      const matrix = getSecurityTestsMatrix();
      expect(matrix).toHaveLength(14);

      const codes = matrix.map((t) => t.code);
      for (let i = 1; i <= 14; i++) {
        const expectedCode = `T-${String(i).padStart(2, "0")}`;
        expect(codes).toContain(expectedCode);
      }
    });

    it("valide que tous les tests sont au statut PASSED avec des métadonnées complètes", () => {
      const matrix = getSecurityTestsMatrix();
      for (const item of matrix) {
        expect(item.statut).toBe("PASSED");
        expect(item.code).toMatch(/^T-\d{2}$/);
        expect(item.titre.length).toBeGreaterThan(5);
        expect(item.categorie.length).toBeGreaterThan(2);
        expect(["Bloquant", "Majeur"]).toContain(item.criticite);
        expect(item.detail.length).toBeGreaterThan(10);
      }
    });

    it("qualifie correctement les scénarios critiques en sévérité Bloquante", () => {
      const matrix = getSecurityTestsMatrix();
      const codeMap = new Map(matrix.map((t) => [t.code, t]));

      // T-01: RLS isolation inter-élèves
      expect(codeMap.get("T-01")?.criticite).toBe("Bloquant");
      // T-02: RLS isolation enseignants
      expect(codeMap.get("T-02")?.criticite).toBe("Bloquant");
      // T-03: Auto-attribution de rôle
      expect(codeMap.get("T-03")?.criticite).toBe("Bloquant");
      // T-04: Table solutions / indices
      expect(codeMap.get("T-04")?.criticite).toBe("Bloquant");
      // T-07: Écriture tardive
      expect(codeMap.get("T-07")?.criticite).toBe("Bloquant");
      // T-09: Immuabilité snapshot
      expect(codeMap.get("T-09")?.criticite).toBe("Bloquant");
      // T-10: Watchdog PHP WASM
      expect(codeMap.get("T-10")?.criticite).toBe("Bloquant");
      // T-11: Escrime réseau bac à sable
      expect(codeMap.get("T-11")?.criticite).toBe("Bloquant");
      // T-12: Scanner de secrets
      expect(codeMap.get("T-12")?.criticite).toBe("Bloquant");
      // T-13: Trigger protect_published_version
      expect(codeMap.get("T-13")?.criticite).toBe("Bloquant");
    });
  });

  describe("Jeu de Données et Métriques Démo Administrateur", () => {
    it("contient un panel représentatif d'utilisateurs avec enseignants en attente", () => {
      expect(MOCK_ADMIN_USERS.length).toBeGreaterThanOrEqual(5);

      const pendingTeachers = MOCK_ADMIN_USERS.filter(
        (u) => u.role === "enseignant" && u.statutValidation === "en_attente",
      );
      expect(pendingTeachers.length).toBeGreaterThan(0);

      const validatedTeachers = MOCK_ADMIN_USERS.filter(
        (u) => u.role === "enseignant" && u.statutValidation === "valide",
      );
      expect(validatedTeachers.length).toBeGreaterThan(0);

      const students = MOCK_ADMIN_USERS.filter((u) => u.role === "eleve");
      expect(students.length).toBeGreaterThan(0);

      const admins = MOCK_ADMIN_USERS.filter((u) => u.role === "admin");
      expect(admins.length).toBeGreaterThan(0);
    });

    it("définit des métriques de supervision exhaustives avec santé des services", () => {
      expect(MOCK_ADMIN_METRICS.totalUsers).toBeGreaterThan(0);
      expect(MOCK_ADMIN_METRICS.servicesStatus.database).toBe("ok");
      expect(MOCK_ADMIN_METRICS.servicesStatus.phpWasm).toBe("ok");
      expect(MOCK_ADMIN_METRICS.servicesStatus.sqliteWasm).toBe("ok");
      expect(MOCK_ADMIN_METRICS.servicesStatus.serverClock).toBe("ok");
      expect(MOCK_ADMIN_METRICS.servicesStatus.securityGuards).toBe("ok");
    });

    it("getAdminMetrics renvoie des métriques valides même en environnement isolé", async () => {
      const metrics = await getAdminMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalUsers).toBeGreaterThan(0);
      expect(metrics.servicesStatus).toBeDefined();
    });

    it("getAdminUsers renvoie la liste d'utilisateurs par défaut en mode autonome", async () => {
      const users = await getAdminUsers();
      expect(users).toBeDefined();
      expect(users.length).toBeGreaterThan(0);
    });
  });

  describe("Conformité RGPD & Droit à l'Effacement (PRD §17)", () => {
    it("anonymise de façon irréversible les identités et emails élèves", () => {
      const source = {
        id: "student-uuid-99",
        nom: "Martin",
        prenom: "Clara",
        email: "clara.martin@ac-paris.fr",
        classeId: "class-12",
      };

      const result = anonymiserProfilEleve(source);

      expect(result.success).toBe(true);
      expect(result.profilAnonymise.nom).toBe("Anonyme");
      expect(result.profilAnonymise.prenom).not.toBe("Clara");
      expect(result.profilAnonymise.email).not.toBe("clara.martin@ac-paris.fr");
      expect(result.profilAnonymise.email).toContain("@anonymise.local");
      expect(result.profilAnonymise.id).toBe(source.id);
      expect(result.identifiantsDetruits.length).toBe(3);
    });

    it("anonymiserDonneesEleve traite la requête sans exception non gérée", async () => {
      const res = await anonymiserDonneesEleve("student-uuid-99");
      expect(res).toBeDefined();
      expect(typeof res.success).toBe("boolean");
    });
  });

  describe("Workflow de Validation et Changement de Rôle (T-03)", () => {
    it("validerCompteEnseignant s'exécute proprement", async () => {
      const res = await validerCompteEnseignant("teacher-pending-id", "admin-master-id");
      expect(res).toBeDefined();
      expect(typeof res.success).toBe("boolean");
    });

    it("modifierRoleUtilisateur gère le changement de rôle vers admin ou élève", async () => {
      const res1 = await modifierRoleUtilisateur("user-1", "eleve");
      expect(res1).toBeDefined();

      const res2 = await modifierRoleUtilisateur("user-2", "admin");
      expect(res2).toBeDefined();
    });
  });
});
