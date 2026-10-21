import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc,
    from: () => ({ select: () => Promise.resolve({ count: 2, error: null }) }),
  },
}));

import {
  getSecurityTestsMatrix,
  MOCK_ADMIN_USERS,
  MOCK_ADMIN_METRICS,
  getAdminMetrics,
  getAdminUsers,
  validerCompteEnseignant,
  modifierRoleUtilisateur,
  anonymiserDonneesEleve,
  messageErreurAdmin,
} from "@/lib/supabase/admin";
import { anonymiserProfilEleve } from "@/lib/security/rgpd";

describe("Espace d'Administration Centrale & Sécurité (Issue #30 - PRD §4.1, §17, T-01..T-14)", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

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

    it("décrit chaque test avec des métadonnées complètes, sans statut de réussite écrit en dur", () => {
      const matrix = getSecurityTestsMatrix();
      for (const item of matrix) {
        expect(item).not.toHaveProperty("statut");
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

    it("getAdminUsers renvoie les comptes réels de la fonction SQL, sans données de secours", async () => {
      rpc.mockResolvedValueOnce({
        data: [
          {
            id: "u1",
            email: "prof@lycee.fr",
            nom: "Durand",
            prenom: "Paul",
            role: "enseignant",
            email_confirme: true,
            created_at: "2026-10-18T10:00:00Z",
            derniere_connexion: null,
            valide_par: "a1",
            valide_at: "2026-10-19T10:00:00Z",
            anonymise_at: null,
          },
          {
            id: "u2",
            email: "attente@lycee.fr",
            nom: "Petit",
            prenom: "Luc",
            role: "enseignant",
            email_confirme: false,
            created_at: "2026-10-20T10:00:00Z",
            derniere_connexion: null,
            valide_par: null,
            valide_at: null,
            anonymise_at: "2026-10-21T10:00:00Z",
          },
        ],
        error: null,
      });

      const users = await getAdminUsers();

      expect(rpc).toHaveBeenCalledWith("admin_lister_utilisateurs");
      expect(users).toHaveLength(2);
      expect(users[0]).toMatchObject({
        email: "prof@lycee.fr",
        statutValidation: "valide",
        emailConfirme: true,
        anonymise: false,
      });
      expect(users[1]).toMatchObject({ statutValidation: "en_attente", anonymise: true });
    });

    it("getAdminUsers lève une erreur lisible plutôt que d'inventer des comptes", async () => {
      rpc.mockResolvedValueOnce({ data: null, error: { message: "acces_refuse" } });
      await expect(getAdminUsers()).rejects.toThrow("réservée aux administrateurs");
    });

    it("getAdminMetrics calcule les compteurs à partir des comptes réels", async () => {
      rpc.mockResolvedValueOnce({
        data: [
          {
            id: "a",
            email: "a@x.fr",
            nom: "N",
            prenom: "P",
            role: "admin",
            email_confirme: true,
            created_at: "2026-10-18T10:00:00Z",
            derniere_connexion: null,
            valide_par: null,
            valide_at: null,
            anonymise_at: null,
          },
          {
            id: "e",
            email: "e@x.fr",
            nom: "N",
            prenom: "P",
            role: "eleve",
            email_confirme: true,
            created_at: "2026-10-18T10:00:00Z",
            derniere_connexion: null,
            valide_par: null,
            valide_at: null,
            anonymise_at: null,
          },
        ],
        error: null,
      });

      const metrics = await getAdminMetrics();

      expect(metrics.totalUsers).toBe(2);
      expect(metrics.totalAdmins).toBe(1);
      expect(metrics.totalEleves).toBe(1);
      expect(metrics.totalEnseignants).toBe(0);
      expect(metrics.totalClasses).toBe(2);
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

    it("anonymiserDonneesEleve appelle la fonction SQL réservée aux administrateurs", async () => {
      rpc.mockResolvedValueOnce({ error: null });
      const res = await anonymiserDonneesEleve("student-uuid-99");
      expect(rpc).toHaveBeenCalledWith("admin_anonymiser_eleve", { _user_id: "student-uuid-99" });
      expect(res).toEqual({ success: true });
    });

    it("anonymiserDonneesEleve traduit le refus d'un compte non élève", async () => {
      rpc.mockResolvedValueOnce({ error: { message: "role_non_eleve" } });
      const res = await anonymiserDonneesEleve("teacher-1");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Seuls les comptes élèves peuvent être anonymisés.");
    });
  });

  describe("Workflow de Validation et Changement de Rôle (T-03)", () => {
    it("validerCompteEnseignant passe par la fonction de changement de rôle", async () => {
      rpc.mockResolvedValueOnce({ error: null });
      const res = await validerCompteEnseignant("teacher-pending-id");
      expect(rpc).toHaveBeenCalledWith("admin_modifier_role", {
        _user_id: "teacher-pending-id",
        _role: "enseignant",
      });
      expect(res.success).toBe(true);
    });

    it("modifierRoleUtilisateur transmet le rôle demandé par la fonction SQL", async () => {
      rpc.mockResolvedValue({ error: null });
      const res = await modifierRoleUtilisateur("user-2", "admin");
      expect(rpc).toHaveBeenCalledWith("admin_modifier_role", {
        _user_id: "user-2",
        _role: "admin",
      });
      expect(res.success).toBe(true);
    });

    it("modifierRoleUtilisateur affiche un message clair si l'administrateur se rétrograde", async () => {
      rpc.mockResolvedValueOnce({ error: { message: "auto_retrogradation_interdite" } });
      const res = await modifierRoleUtilisateur("moi", "eleve");
      expect(res).toEqual({
        success: false,
        error: "Vous ne pouvez pas retirer vos propres droits d'administrateur.",
      });
    });

    it("messageErreurAdmin conserve les messages inconnus", () => {
      expect(messageErreurAdmin("boom")).toBe("boom");
      expect(messageErreurAdmin(undefined)).toBe("Erreur inattendue.");
    });
  });
});
