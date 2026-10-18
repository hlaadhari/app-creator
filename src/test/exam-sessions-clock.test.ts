/**
 * Tests d'intégration et unitaires pour les sessions d'examen, l'horloge serveur stricte
 * et le verrouillage à l'échéance (Issue #15, PRD F-49 à F-53, F-56, T-06, T-07)
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  calculerCompteARebours,
  formaterDuree,
  getTempsServeurSynchronise,
  reinitialiserHorlogeServeur,
  setServerOffsetMs,
  synchroniserHorlogeServeur,
} from "../lib/exam/server-clock";
import {
  calculerEcheanceEleve,
  declencherCoupDenvoiLocal,
  validerChangementStatutPassage,
  verifierRestrictionsExamen,
} from "../lib/exam/exam-service";
import type { ExamPassage, ExamSession } from "../lib/exam/types";

describe("feat(exam): Sessions d'examen, horloge serveur stricte et verrouillage d'échéance (Issue #15)", () => {
  beforeEach(() => {
    reinitialiserHorlogeServeur();
  });

  // =========================================================================
  // 1. Horloge serveur stricte & Immunité au changement d'heure locale
  // =========================================================================
  describe("1. Synchronisation de l'horloge serveur et protection anti-triche", () => {
    it("calcule avec précision l'écart entre la machine cliente et le serveur", async () => {
      // Simule un serveur qui est 10 minutes en avance par rapport à la machine locale
      const fauxServeur = new Date(Date.now() + 10 * 60 * 1000);
      const sync = await synchroniserHorlogeServeur(async () => fauxServeur);

      expect(sync.offsetMs).toBeGreaterThanOrEqual(9.5 * 60 * 1000);
      expect(sync.offsetMs).toBeLessThanOrEqual(10.5 * 60 * 1000);
    });

    it("calcule le compte à rebours selon l'horloge serveur même si l'élève recule son horloge locale", () => {
      const serverNow = new Date("2026-10-19T10:00:00.000Z");
      const echeance = new Date("2026-10-19T11:30:00.000Z"); // 90 minutes plus tard

      // L'élève recule son horloge locale de 2 heures pour tenter de gagner du temps
      const clientShiftMs = -2 * 60 * 60 * 1000;
      setServerOffsetMs(-clientShiftMs); // Compense le décalage local

      const compteARebours = calculerCompteARebours(echeance, serverNow);

      expect(compteARebours.isExpired).toBe(false);
      expect(compteARebours.remainingSeconds).toBe(90 * 60); // Exactement 90 minutes
      expect(compteARebours.formatted).toBe("01:30:00");
    });

    it("formate correctement les durées en HH:MM:SS ou MM:SS", () => {
      expect(formaterDuree(0)).toBe("00:00");
      expect(formaterDuree(59)).toBe("00:59");
      expect(formaterDuree(65)).toBe("01:05");
      expect(formaterDuree(3600)).toBe("01:00:00");
      expect(formaterDuree(5400)).toBe("01:30:00");
    });
  });

  // =========================================================================
  // 2. Coupure stricte des aides pédagogiques en mode examen
  // =========================================================================
  describe("2. Coupure des aides pédagogiques (PRD F-51)", () => {
    it("masque les indices, désactive le tuteur IA et bloque l'accès aux corrigés", () => {
      const restrictions = verifierRestrictionsExamen({
        isExamMode: true,
        statutPassage: "en_cours",
        echeance: new Date(Date.now() + 60 * 60 * 1000), // expire dans 1h
      });

      expect(restrictions.isExamMode).toBe(true);
      expect(restrictions.aidesAutorisees).toBe(false);
      expect(restrictions.indicesAutorises).toBe(false);
      expect(restrictions.corrigesAutorises).toBe(false);
      expect(restrictions.editeurVerrouille).toBe(false);
    });

    it("verrouille l'éditeur si l'élève est encore dans la salle d'attente", () => {
      const restrictions = verifierRestrictionsExamen({
        isExamMode: true,
        statutPassage: "en_attente",
      });

      expect(restrictions.editeurVerrouille).toBe(true);
      expect(restrictions.motifVerrouillage).toContain("salle d'attente");
    });
  });

  // =========================================================================
  // 3. Coup d'envoi simultané & Salle d'attente (PRD F-49, F-50)
  // =========================================================================
  describe("3. Coup d'envoi simultané par l'enseignant", () => {
    const sessionInitiale: ExamSession = {
      id: "sess-1",
      classId: "class-1",
      versionId: "ver-1",
      titre: "Bac Blanc 2024 - STI",
      debutPrevu: "2026-10-19T08:00:00.000Z",
      dureeMin: 90,
      statut: "salle_attente",
      createdAt: "2026-10-19T07:30:00.000Z",
    };

    const passagesInitiaux: ExamPassage[] = [
      {
        id: "pass-1",
        sessionId: "sess-1",
        eleveId: "eleve-1",
        statut: "en_attente",
        tempsSuppMin: 0,
        evenements: [],
        createdAt: "2026-10-19T07:45:00.000Z",
      },
      {
        id: "pass-2",
        sessionId: "sess-1",
        eleveId: "eleve-2",
        statut: "en_attente",
        tempsSuppMin: 30, // Aménagement tiers-temps
        evenements: [],
        createdAt: "2026-10-19T07:50:00.000Z",
      },
    ];

    it("déclenche le coup d'envoi simultané pour tous les élèves connectés", () => {
      const topDepart = new Date("2026-10-19T08:00:00.000Z");
      const resultat = declencherCoupDenvoiLocal(sessionInitiale, passagesInitiaux, topDepart);

      expect(resultat.elevesDemarres).toBe(2);
      expect(resultat.sessionMiseAJour.statut).toBe("en_cours");
      expect(resultat.sessionMiseAJour.debutServeur).toBe(topDepart.toISOString());
      expect(resultat.sessionMiseAJour.echeanceServeur).toBe("2026-10-19T09:30:00.000Z");

      // Vérification élève standard (90 min)
      const p1 = resultat.passagesMisAJour.find((p) => p.id === "pass-1");
      expect(p1?.statut).toBe("en_cours");
      expect(p1?.echeanceEleve).toBe("2026-10-19T09:30:00.000Z");

      // Vérification élève avec tiers-temps (90 min + 30 min = 120 min)
      const p2 = resultat.passagesMisAJour.find((p) => p.id === "pass-2");
      expect(p2?.statut).toBe("en_cours");
      expect(p2?.echeanceEleve).toBe("2026-10-19T10:00:00.000Z");
    });
  });

  // =========================================================================
  // 4. Verrouillage automatique à l'échéance serveur (T-06)
  // =========================================================================
  describe("4. Verrouillage strict des écritures à l'échéance (T-06)", () => {
    it("bascule l'éditeur en lecture seule dès que l'échéance serveur est dépassée", () => {
      const echeance = new Date("2026-10-19T10:00:00.000Z");
      const apresEcheance = new Date("2026-10-19T10:00:01.000Z"); // 1 seconde après

      const restrictions = verifierRestrictionsExamen({
        isExamMode: true,
        statutPassage: "en_cours",
        echeance,
        horlogeServeur: apresEcheance,
      });

      expect(restrictions.editeurVerrouille).toBe(true);
      expect(restrictions.motifVerrouillage).toContain("Échéance d'examen dépassée");
      expect(restrictions.motifVerrouillage).toContain("T-06");
    });

    it("verrouille l'éditeur lorsque la copie a été rendue", () => {
      const restrictions = verifierRestrictionsExamen({
        isExamMode: true,
        statutPassage: "rendu",
        echeance: new Date(Date.now() + 60000),
      });

      expect(restrictions.editeurVerrouille).toBe(true);
      expect(restrictions.motifVerrouillage).toContain("finalisée (rendu)");
    });
  });

  // =========================================================================
  // 5. Machine à états des passages d'examen (T-07)
  // =========================================================================
  describe("5. Machine à états des examens (T-07)", () => {
    it("interdit formellement de repasser un passage 'rendu' à 'en_cours'", () => {
      const trans = validerChangementStatutPassage("rendu", "en_cours");
      expect(trans.valide).toBe(false);
      expect(trans.erreur).toContain("strictement interdite (T-07)");
    });

    it("interdit formellement de rouvrir un examen 'verrouille'", () => {
      const trans = validerChangementStatutPassage("verrouille", "en_cours");
      expect(trans.valide).toBe(false);
      expect(trans.erreur).toContain("T-07");
    });

    it("autorise la transition d'un examen 'en_attente' vers 'en_cours'", () => {
      const trans = validerChangementStatutPassage("en_attente", "en_cours");
      expect(trans.valide).toBe(true);
    });

    it("autorise la transition d'un examen 'en_cours' vers 'rendu'", () => {
      const trans = validerChangementStatutPassage("en_cours", "rendu");
      expect(trans.valide).toBe(true);
    });
  });
});
