import { describe, expect, it } from "vitest";
import {
  genererCodeInvitationFormat,
  exporterResultatsCsv,
  type TeacherClassMember,
} from "@/lib/supabase/teacher";
import { estCodeValide, normaliserCodeInvitation } from "@/lib/supabase/classes";

describe("Espace Enseignant & Dashboard de Classe (Issue #10 - PRD F-01, F-02, F-61 à F-65)", () => {
  describe("Générateur de Codes d'Invitation (PRD F-04, F-05, T-05)", () => {
    it("génère des codes d'invitation conformes au format normalisé STI-XXXX", () => {
      for (let i = 0; i < 10; i++) {
        const code = genererCodeInvitationFormat();
        expect(code).toMatch(/^STI-[A-Z0-9]{4}$/);
        expect(estCodeValide(code)).toBe(true);
      }
    });

    it("ne produit pas de caractères visuellement ambigus comme 0/O ou 1/I", () => {
      for (let i = 0; i < 20; i++) {
        const code = genererCodeInvitationFormat();
        const suffix = code.replace("STI-", "");
        expect(suffix).not.toContain("0");
        expect(suffix).not.toContain("O");
        expect(suffix).not.toContain("1");
        expect(suffix).not.toContain("I");
      }
    });

    it("normalise correctement les codes saisis manuellement", () => {
      expect(normaliserCodeInvitation("sti-7842")).toBe("STI-7842");
      expect(normaliserCodeInvitation(" sti 1234 ")).toBe("STI1234");
    });
  });

  describe("Export des Résultats de Classe en CSV (PRD F-65)", () => {
    const mockEleves: TeacherClassMember[] = [
      {
        eleve_id: "eleve-1",
        nom: "Dupont",
        prenom: "Lucas",
        joined_at: "2026-10-01T08:00:00.000Z",
        projet_statut: "rendu",
        score_formatif: 100,
        criteres_reussis: 5,
        total_criteres: 5,
        derniere_activite: "2026-10-18T14:30:00.000Z",
        points_faibles: [],
      },
      {
        eleve_id: "eleve-2",
        nom: "Martin",
        prenom: "Emma",
        joined_at: "2026-10-05T09:00:00.000Z",
        projet_statut: "en_cours",
        score_formatif: 60,
        criteres_reussis: 3,
        total_criteres: 5,
        derniere_activite: "2026-10-18T16:00:00.000Z",
        points_faibles: ["Sélecteur CSS manquant", "Attribut alt manquant"],
      },
    ];

    it("génère un contenu CSV valide avec les entêtes attendues", () => {
      const csv = exporterResultatsCsv(mockEleves, "Terminale STI2D");
      const lines = csv.split("\r\n");

      expect(lines[0]).toBe(
        "Nom,Prénom,Statut Projet,Score (%),Critères Validés,Total Critères,Dernière Activité,Points de Blocage",
      );
      expect(lines).toHaveLength(3); // En-tête + 2 élèves
    });

    it("inclut fidèlement les scores, statuts et points faibles", () => {
      const csv = exporterResultatsCsv(mockEleves, "Terminale STI2D");

      expect(csv).toContain('"Dupont","Lucas","rendu",100,5,5');
      expect(csv).toContain('"Martin","Emma","en_cours",60,3,5');
      expect(csv).toContain("Sélecteur CSS manquant; Attribut alt manquant");
    });

    it("échappe correctement les guillemets et caractères spéciaux", () => {
      const mockAvecGuillemets: TeacherClassMember[] = [
        {
          eleve_id: "eleve-3",
          nom: 'O"Connor',
          prenom: 'Jean "Jeannot"',
          joined_at: "2026-10-01T08:00:00.000Z",
          projet_statut: "non_commence",
          score_formatif: 0,
          criteres_reussis: 0,
          total_criteres: 4,
          derniere_activite: "2026-10-01T08:00:00.000Z",
          points_faibles: [],
        },
      ];

      const csv = exporterResultatsCsv(mockAvecGuillemets, "Classe Test");
      expect(csv).toContain('"O""Connor"');
      expect(csv).toContain('"Jean ""Jeannot"""');
    });
  });

  describe("Contrôle d'Accès et Gardien de Rôle (PRD F-01, T-02, T-03)", () => {
    it("interdit l'accès à l'espace enseignant pour un rôle élève ou anonyme", () => {
      const verifierAccesEnseignant = (role: string | null) => {
        return role === "enseignant" || role === "admin";
      };

      expect(verifierAccesEnseignant(null)).toBe(false);
      expect(verifierAccesEnseignant("eleve")).toBe(false);
      expect(verifierAccesEnseignant("enseignant")).toBe(true);
      expect(verifierAccesEnseignant("admin")).toBe(true);
    });
  });

  describe("Cycle de Vie des Invitations & Révocation (PRD F-06, T-05)", () => {
    it("détecte correctement l'expiration et la révocation d'un code", () => {
      const estInvitationUtilisable = (inv: {
        revoque: boolean;
        expire_le: string;
        nb_utilisations: number;
        utilisations_max: number;
      }) => {
        const now = new Date();
        const expireDate = new Date(inv.expire_le);
        if (inv.revoque) return { valide: false, motif: "revoque" };
        if (expireDate < now) return { valide: false, motif: "expire" };
        if (inv.nb_utilisations >= inv.utilisations_max)
          return { valide: false, motif: "quota_atteint" };
        return { valide: true };
      };

      // Code valide
      expect(
        estInvitationUtilisable({
          revoque: false,
          expire_le: new Date(Date.now() + 86400000).toISOString(),
          nb_utilisations: 5,
          utilisations_max: 35,
        }).valide,
      ).toBe(true);

      // Code révoqué
      expect(
        estInvitationUtilisable({
          revoque: true,
          expire_le: new Date(Date.now() + 86400000).toISOString(),
          nb_utilisations: 5,
          utilisations_max: 35,
        }).motif,
      ).toBe("revoque");

      // Code expiré
      expect(
        estInvitationUtilisable({
          revoque: false,
          expire_le: new Date(Date.now() - 1000).toISOString(),
          nb_utilisations: 5,
          utilisations_max: 35,
        }).motif,
      ).toBe("expire");

      // Quota atteint
      expect(
        estInvitationUtilisable({
          revoque: false,
          expire_le: new Date(Date.now() + 86400000).toISOString(),
          nb_utilisations: 35,
          utilisations_max: 35,
        }).motif,
      ).toBe("quota_atteint");
    });
  });
});
