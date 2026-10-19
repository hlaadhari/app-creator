import { describe, expect, it, beforeEach } from "vitest";
import {
  soumettreContestation,
  listerContestationsEleve,
  getContestationPourCritere,
  resetContestationsCache,
} from "@/lib/pedagogy/contestations-client";
import {
  calculerDeltaTentative,
  enregistrerNouvelleTentative,
  listerHistoriqueAvecDeltas,
  resetAttemptsCache,
  type AttemptRecord,
} from "@/lib/pedagogy/attempts-service";
import {
  consulterSolutionReference,
} from "@/lib/pedagogy/solutions-client";
import {
  arbitrerContestation,
  recalculerNotesClasseApresDesactivation,
  type ContestationRecord,
  type StudentAttemptRecord,
} from "@/lib/subjects/contestations-service";

describe("Pédagogie & Résilience Élève (Issue #32 - PRD F-44, F-45, T-04, T-06, Jalon M5)", () => {
  beforeEach(() => {
    resetContestationsCache();
    resetAttemptsCache();
  });

  // =========================================================================
  // 1. Interface & Validation des Contestations Élèves (PRD F-44, F-45)
  // =========================================================================
  describe("Interface et Soumission de Contestation de Critère Élève", () => {
    it("rejette formellement une contestation dont le motif compte moins de 10 caractères", async () => {
      const res = await soumettreContestation({
        critereId: "crit-dom-1",
        eleveId: "eleve-001",
        texte: "Trop dur", // 8 caractères
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("au moins 10 caractères");
      expect(res.contestation).toBeUndefined();
    });

    it("rejette les chaînes de texte contenant uniquement des espaces (< 10 caractères effectifs)", async () => {
      const res = await soumettreContestation({
        critereId: "crit-dom-1",
        eleveId: "eleve-001",
        texte: "   court   ", // 5 caractères une fois trimé
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("au moins 10 caractères");
    });

    it("enregistre avec succès une contestation valide (>= 10 caractères) avec statut initial 'en_attente'", async () => {
      const motifValide = "J'ai utilisé une balise <section> au lieu de <article>, ce qui est sémantiquement recevable.";
      const res = await soumettreContestation({
        critereId: "crit-dom-1",
        critereCode: "DOM-01",
        critereLabel: "Structure sémantique",
        eleveId: "eleve-001",
        eleveNom: "Amira T.",
        texte: motifValide,
        projetId: "proj-123",
      });

      expect(res.success).toBe(true);
      expect(res.contestation).toBeDefined();
      expect(res.contestation?.statut).toBe("en_attente");
      expect(res.contestation?.critere_id).toBe("crit-dom-1");
      expect(res.contestation?.texte).toBe(motifValide);
    });

    it("retrouve la contestation déposée par critère et liste l'ensemble des contestations de l'élève", async () => {
      await soumettreContestation({
        critereId: "crit-dom-1",
        eleveId: "eleve-001",
        texte: "Mon sélecteur CSS cible l'attribut data au lieu de la classe.",
      });

      await soumettreContestation({
        critereId: "crit-dom-2",
        eleveId: "eleve-001",
        texte: "L'attribut action de mon formulaire pointe vers un chemin relatif valide.",
      });

      const list = await listerContestationsEleve("eleve-001");
      expect(list.length).toBe(2);

      const target1 = getContestationPourCritere("crit-dom-1", list);
      expect(target1).toBeDefined();
      expect(target1?.critere_id).toBe("crit-dom-1");

      const targetInconnu = getContestationPourCritere("crit-inconnu", list);
      expect(targetInconnu).toBeUndefined();
    });

    it("relie l'arbitrage enseignant à la contestation avec neutralisation et recalcul de classe", () => {
      const contestationInitiale: ContestationRecord = {
        id: "cont-01",
        critere_id: "c3",
        critere_code: "DOM-03",
        critere_label: "Liste de 3 centres d'intérêt minimum",
        eleve_id: "eleve-101",
        eleve_nom: "Amira Trabelsi",
        classe_id: "classe-sti",
        classe_nom: "Terminale STI2D",
        texte: "La consigne disait 3 centres minimum, j'en ai mis 4 et la sonde a échoué.",
        statut: "en_attente",
        created_at: new Date().toISOString(),
      };

      const tentativesClasse: StudentAttemptRecord[] = [
        {
          id: "att-1",
          eleve_id: "eleve-101",
          eleve_nom: "Amira",
          note20: 10,
          points_obtenus: 5,
          points_total: 10,
          criteres: [
            { id: "c1", code: "C1", label: "C1", points: 5, valide: true },
            { id: "c3", code: "C3", label: "C3", points: 5, valide: false },
          ],
        },
      ];

      // Arbitrage avec décision d'acceptation
      const arbitrage = arbitrerContestation(contestationInitiale, "accepter", tentativesClasse);
      expect(arbitrage.contestation.statut).toBe("acceptee");
      expect(arbitrage.contestation.traitee_le).toBeDefined();
      expect(arbitrage.recalcul).toBeDefined();
      // Note recalculée : c3 retiré du barème (total 5 pts obtenus sur 5 total => 20/20)
      expect(arbitrage.recalcul?.copies_recalculees[0]?.note20).toBe(20);
    });

    it("arbitre un rejet avec consignation du motif didactique enseignant", () => {
      const contestationInitiale: ContestationRecord = {
        id: "cont-02",
        critere_id: "c4",
        critere_code: "JS-01",
        critere_label: "Validation regex CIN",
        eleve_id: "eleve-102",
        eleve_nom: "Sami",
        classe_id: "classe-sti",
        classe_nom: "Terminale STI2D",
        texte: "Mon script marche dans la console Chrome.",
        statut: "en_attente",
        created_at: new Date().toISOString(),
      };

      const arbitrage = arbitrerContestation(
        contestationInitiale,
        "rejeter",
        [],
        "L'expression régulière autorisait des lettres, non conforme à la spécification CIN.",
      );

      expect(arbitrage.contestation.statut).toBe("rejetee");
      expect(arbitrage.contestation.motif_rejet).toContain("non conforme à la spécification CIN");
      expect(arbitrage.recalcul).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. Historique Chronologique & Calcul des Deltas (PRD Jalon M5)
  // =========================================================================
  describe("Calcul des Deltas Didactiques & Historique Chronologique", () => {
    it("identifie une progression positive (+2.5 pts) et les critères nouvellement validés", () => {
      const att1: AttemptRecord = {
        id: "att-1",
        sujetId: "ex-01",
        numeroTentative: 1,
        date: "2026-10-19T00:00:00.000Z",
        note20: 10,
        pointsObtenus: 5,
        pointsTotal: 10,
        criteres: [
          { id: "crit-1", label: "C1", ok: true, points: 5, maxPoints: 5 },
          { id: "crit-2", label: "C2", ok: false, points: 0, maxPoints: 5 },
        ],
      };

      const att2: AttemptRecord = {
        id: "att-2",
        sujetId: "ex-01",
        numeroTentative: 2,
        date: "2026-10-19T00:05:00.000Z",
        note20: 15,
        pointsObtenus: 7.5,
        pointsTotal: 10,
        criteres: [
          { id: "crit-1", label: "C1", ok: true, points: 5, maxPoints: 5 },
          { id: "crit-2", label: "C2", ok: true, points: 2.5, maxPoints: 5 },
        ],
      };

      const delta = calculerDeltaTentative(att2, att1);
      expect(delta.noteDelta).toBe(5);
      expect(delta.formattedNoteDelta).toBe("+5 pts");
      expect(delta.progression).toBe("amelioration");
      expect(delta.nouveauxValides).toEqual(["crit-2"]);
      expect(delta.nouveauxEchecs).toEqual([]);
    });

    it("identifie une régression (-2 pts) si un critère précédemment validé échoue", () => {
      const att1: AttemptRecord = {
        id: "att-1",
        sujetId: "ex-01",
        numeroTentative: 1,
        date: "2026-10-19T00:00:00.000Z",
        note20: 16,
        pointsObtenus: 8,
        pointsTotal: 10,
        criteres: [
          { id: "crit-1", label: "C1", ok: true, points: 4, maxPoints: 5 },
          { id: "crit-2", label: "C2", ok: true, points: 4, maxPoints: 5 },
        ],
      };

      const att2: AttemptRecord = {
        id: "att-2",
        sujetId: "ex-01",
        numeroTentative: 2,
        date: "2026-10-19T00:05:00.000Z",
        note20: 14,
        pointsObtenus: 7,
        pointsTotal: 10,
        criteres: [
          { id: "crit-1", label: "C1", ok: true, points: 4, maxPoints: 5 },
          { id: "crit-2", label: "C2", ok: false, points: 0, maxPoints: 5 },
        ],
      };

      const delta = calculerDeltaTentative(att2, att1);
      expect(delta.noteDelta).toBe(-2);
      expect(delta.formattedNoteDelta).toBe("-2 pts");
      expect(delta.progression).toBe("regression");
      expect(delta.nouveauxEchecs).toEqual(["crit-2"]);
      expect(delta.nouveauxValides).toEqual([]);
    });

    it("indique '1re tentative' lorsqu'aucune tentative antérieure n'existe", () => {
      const att1: AttemptRecord = {
        id: "att-1",
        sujetId: "ex-01",
        numeroTentative: 1,
        date: "2026-10-19T00:00:00.000Z",
        note20: 12,
        pointsObtenus: 6,
        pointsTotal: 10,
        criteres: [{ id: "crit-1", label: "C1", ok: true, points: 6, maxPoints: 10 }],
      };

      const delta = calculerDeltaTentative(att1, null);
      expect(delta.noteDelta).toBe(0);
      expect(delta.formattedNoteDelta).toBe("1re tentative");
      expect(delta.progression).toBe("constant");
    });

    it("persiste les tentatives successives et renvoie l'historique antichronologique avec deltas", async () => {
      await enregistrerNouvelleTentative({
        sujetId: "ex-html-css-01",
        note20: 10,
        pointsObtenus: 10,
        pointsTotal: 20,
        criteres: [
          { id: "c1", label: "Blocs L1", ok: true, points: 10, maxPoints: 10 },
          { id: "c2", label: "Transition titre", ok: false, points: 0, maxPoints: 10 },
        ],
      });

      await enregistrerNouvelleTentative({
        sujetId: "ex-html-css-01",
        note20: 20,
        pointsObtenus: 20,
        pointsTotal: 20,
        criteres: [
          { id: "c1", label: "Blocs L1", ok: true, points: 10, maxPoints: 10 },
          { id: "c2", label: "Transition titre", ok: true, points: 10, maxPoints: 10 },
        ],
      });

      const history = listerHistoriqueAvecDeltas("ex-html-css-01");
      expect(history.length).toBe(2);

      // Le plus récent en premier
      expect(history[0]?.attempt.numeroTentative).toBe(2);
      expect(history[0]?.attempt.note20).toBe(20);
      expect(history[0]?.delta?.noteDelta).toBe(10);
      expect(history[0]?.delta?.progression).toBe("amelioration");
      expect(history[0]?.delta?.nouveauxValides).toEqual(["c2"]);

      // Le plus ancien en second
      expect(history[1]?.attempt.numeroTentative).toBe(1);
      expect(history[1]?.delta?.formattedNoteDelta).toBe("1re tentative");
    });
  });

  // =========================================================================
  // 3. Déblocage Sécurisé des Solutions & Anti-Triche Examen (T-04 / T-06)
  // =========================================================================
  describe("Déblocage Tracé des Corrigés & Anti-Triche Examen (T-04 / T-06)", () => {
    it("bloque catégoriquement l'accès au corrigé si l'élève est en mode examen actif (T-04 / T-06)", async () => {
      const res = await consulterSolutionReference({
        sujetId: "exam-bac2023-location-habits",
        estEnExamen: true, // Flag actif de session d'examen
        motif: "Tentative d'ouverture corrigé pendant l'épreuve",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("T-04 / T-06");
      expect(res.error).toContain("session d'examen est active");
      expect(res.files).toBeUndefined();
    });

    it("autorise l'accès aux corrigés de référence en mode entraînement normal hors examen", async () => {
      const res = await consulterSolutionReference({
        sujetId: "carte-profil",
        estEnExamen: false,
      });

      expect(res.success).toBe(true);
      expect(res.files).toBeDefined();
      expect(res.files?.length).toBeGreaterThan(0);
      expect(res.files?.some((f) => f.path === "index.html")).toBe(true);
      expect(res.dateDeblocage).toBeDefined();
    });

    it("donne accès au corrigé officiel des exercices formatifs Module A hors examen", async () => {
      const res = await consulterSolutionReference({
        sujetId: "ex-html-css-01",
        estEnExamen: false,
      });

      expect(res.success).toBe(true);
      expect(res.files?.some((f) => f.path === "style.css")).toBe(true);
    });

    it("renvoie une erreur propre si aucun corrigé n'existe pour un sujet non répertorié", async () => {
      const res = await consulterSolutionReference({
        sujetId: "sujet-inexistant-404",
        estEnExamen: false,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Aucun corrigé de référence officiel");
    });
  });
});
