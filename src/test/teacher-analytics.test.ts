import { describe, expect, it } from "vitest";
import {
  calculerStatistiquesClasse,
  calculerMediane,
  calculerPercentile,
  calculerEcartType,
  scoreToNote20,
  detecterBlocagesEtAlertes,
  genererRecommandationsPedagogiques,
  type StudentAttemptHistory,
} from "@/lib/analytics/class-analytics";
import {
  exporterPronoteCsv,
  genererAppreciationPedagogique,
  formaterNombreFrancais,
} from "@/lib/export/pronote-export";
import type { TeacherClassMember } from "@/lib/supabase/teacher";

describe("Espace Enseignant — Analytique de Classe & Détection des Blocages (Issue #34, PRD F-61 à F-65)", () => {
  const mockStudents: TeacherClassMember[] = [
    {
      eleve_id: "s1",
      nom: "Dupont",
      prenom: "Lucas",
      score_formatif: 90, // 18/20
      projet_statut: "rendu",
      criteres_reussis: 5,
      total_criteres: 5,
      joined_at: "2026-10-01T08:00:00Z",
      derniere_activite: "2026-10-19T10:00:00Z",
      points_faibles: [],
    },
    {
      eleve_id: "s2",
      nom: "Martin",
      prenom: "Emma",
      score_formatif: 70, // 14/20
      projet_statut: "en_cours",
      criteres_reussis: 3,
      total_criteres: 5,
      joined_at: "2026-10-02T08:00:00Z",
      derniere_activite: "2026-10-19T10:10:00Z",
      points_faibles: ["JS.VALIDATION"],
    },
    {
      eleve_id: "s3",
      nom: "Moreau",
      prenom: "Camille",
      score_formatif: 40, // 8/20
      projet_statut: "en_cours",
      criteres_reussis: 2,
      total_criteres: 5,
      joined_at: "2026-10-03T08:00:00Z",
      derniere_activite: "2026-10-19T09:00:00Z", // Inactif depuis > 60 min
      points_faibles: ["SQL.JOIN", "JS.DOM"],
    },
    {
      eleve_id: "s4",
      nom: "Bernard",
      prenom: "Alex",
      score_formatif: 20, // 4/20
      projet_statut: "en_cours",
      criteres_reussis: 1,
      total_criteres: 5,
      joined_at: "2026-10-04T08:00:00Z",
      derniere_activite: "2026-10-19T10:05:00Z",
      points_faibles: ["HTML.FORM", "CSS.FLEX"],
    },
  ];

  describe("1. Calculs Statistiques & Distribution des Notes (PRD F-61)", () => {
    it("convertit correctement les pourcentages en notes sur 20", () => {
      expect(scoreToNote20(100)).toBe(20);
      expect(scoreToNote20(50)).toBe(10);
      expect(scoreToNote20(75)).toBe(15);
      expect(scoreToNote20(0)).toBe(0);
      expect(scoreToNote20(undefined)).toBe(0);
    });

    it("calcule la médiane correctement pour un nombre pair et impair de notes", () => {
      // Impair: [4, 8, 14, 18, 20] -> médiane = 14
      expect(calculerMediane([4, 8, 14, 18, 20])).toBe(14);
      // Pair: [4, 8, 14, 18] -> médiane = (8 + 14) / 2 = 11
      expect(calculerMediane([4, 8, 14, 18])).toBe(11);
      // Liste vide
      expect(calculerMediane([])).toBe(0);
    });

    it("calcule l'écart-type et les percentiles Q1 et Q3", () => {
      const notes = [4, 8, 14, 18];
      const moyenne = (4 + 8 + 14 + 18) / 4; // 11
      const ecartType = calculerEcartType(notes, moyenne);
      expect(ecartType).toBeGreaterThan(5);

      const q1 = calculerPercentile(notes, 0.25);
      const q3 = calculerPercentile(notes, 0.75);
      expect(q1).toBeLessThanOrEqual(11);
      expect(q3).toBeGreaterThanOrEqual(11);
    });

    it("calcule les statistiques complètes d'une classe", () => {
      const stats = calculerStatistiquesClasse(mockStudents);

      expect(stats.totalEleves).toBe(4);
      // Notes: 18, 14, 8, 4 -> Moyenne = (18+14+8+4)/4 = 11.00
      expect(stats.moyenne20).toBe(11);
      expect(stats.mediane20).toBe(11);
      expect(stats.noteMin20).toBe(4);
      expect(stats.noteMax20).toBe(18);

      // Taux de réussite (>= 10/20): 2 élèves sur 4 = 50%
      expect(stats.tauxReussite).toBe(50);
      // Copies rendues: 1 sur 4 = 25%
      expect(stats.tauxRendu).toBe(25);

      // Distribution par tranches (0-4: 1, 5-9: 1, 10-14: 1, 15-20: 1)
      expect(stats.distributionNotes).toHaveLength(4);
      const b0_4 = stats.distributionNotes.find((b) => b.tranche === "0 - 4");
      const b15_20 = stats.distributionNotes.find((b) => b.tranche === "15 - 20");
      expect(b0_4?.count).toBe(1);
      expect(b15_20?.count).toBe(1);
    });

    it("gère gracieusement le cas d'une classe sans aucun élève", () => {
      const stats = calculerStatistiquesClasse([]);
      expect(stats.totalEleves).toBe(0);
      expect(stats.moyenne20).toBe(0);
      expect(stats.mediane20).toBe(0);
      expect(stats.tauxReussite).toBe(0);
      expect(stats.distributionNotes.every((b) => b.count === 0)).toBe(true);
    });
  });

  describe("2. Algorithme de Détection des Blocages & Inactivité (PRD F-62)", () => {
    const fixedNow = new Date("2026-10-19T10:15:00Z");

    it("détecte les blocages sur échecs consécutifs (> 3 tentatives infructueuses)", () => {
      const historyWithStuckStudent: StudentAttemptHistory[] = [
        {
          eleveId: "s-stuck",
          nom: "Khelifi",
          prenom: "Inès",
          projetStatut: "en_cours",
          derniereActivite: "2026-10-19T10:10:00Z",
          attempts: [
            {
              score: 10,
              pointsTotal: 20,
              timestamp: "2026-10-19T09:30:00Z",
              criteres: [
                { critereCode: "JS.VALIDATION", critereTitre: "Validation CIN", valide: false },
              ],
            },
            {
              score: 10,
              pointsTotal: 20,
              timestamp: "2026-10-19T09:40:00Z",
              criteres: [
                { critereCode: "JS.VALIDATION", critereTitre: "Validation CIN", valide: false },
              ],
            },
            {
              score: 10,
              pointsTotal: 20,
              timestamp: "2026-10-19T09:50:00Z",
              criteres: [
                { critereCode: "JS.VALIDATION", critereTitre: "Validation CIN", valide: false },
              ],
            },
            {
              score: 10,
              pointsTotal: 20,
              timestamp: "2026-10-19T10:00:00Z",
              criteres: [
                { critereCode: "JS.VALIDATION", critereTitre: "Validation CIN", valide: false },
              ],
            },
          ],
        },
      ];

      const alerts = detecterBlocagesEtAlertes([], historyWithStuckStudent, { now: fixedNow });
      const failAlert = alerts.find((a) => a.critereCode === "JS.VALIDATION");

      expect(failAlert).toBeDefined();
      expect(failAlert?.severite).toBe("critique");
      expect(failAlert?.consecutiveFailures).toBe(4);
      expect(failAlert?.description).toContain("4 tentatives infructueuses consécutives");
    });

    it("ne déclenche pas d'alerte si le nombre d'échecs consécutifs est inférieur au seuil", () => {
      const historyWithFewFailures: StudentAttemptHistory[] = [
        {
          eleveId: "s-ok",
          nom: "Test",
          prenom: "Jean",
          projetStatut: "en_cours",
          derniereActivite: "2026-10-19T10:10:00Z",
          attempts: [
            {
              score: 10,
              pointsTotal: 20,
              timestamp: "2026-10-19T09:30:00Z",
              criteres: [{ critereCode: "JS.VALIDATION", valide: false }],
            },
            {
              score: 10,
              pointsTotal: 20,
              timestamp: "2026-10-19T09:40:00Z",
              criteres: [{ critereCode: "JS.VALIDATION", valide: false }],
            },
          ],
        },
      ];

      const alerts = detecterBlocagesEtAlertes([], historyWithFewFailures, { now: fixedNow });
      expect(alerts.filter((a) => a.type === "critere_echecs_repetes")).toHaveLength(0);
    });

    it("efface l'alerte de blocage si l'élève réussit le critère lors d'une tentative ultérieure", () => {
      const historyResolved: StudentAttemptHistory[] = [
        {
          eleveId: "s-resolved",
          nom: "Test",
          prenom: "Jean",
          projetStatut: "en_cours",
          derniereActivite: "2026-10-19T10:10:00Z",
          attempts: [
            {
              score: 5,
              pointsTotal: 20,
              timestamp: "2026-10-19T09:30:00Z",
              criteres: [{ critereCode: "JS.VALIDATION", valide: false }],
            },
            {
              score: 5,
              pointsTotal: 20,
              timestamp: "2026-10-19T09:40:00Z",
              criteres: [{ critereCode: "JS.VALIDATION", valide: false }],
            },
            {
              score: 5,
              pointsTotal: 20,
              timestamp: "2026-10-19T09:50:00Z",
              criteres: [{ critereCode: "JS.VALIDATION", valide: false }],
            },
            {
              score: 15,
              pointsTotal: 20,
              timestamp: "2026-10-19T10:00:00Z",
              criteres: [{ critereCode: "JS.VALIDATION", valide: true }],
            },
          ],
        },
      ];

      const alerts = detecterBlocagesEtAlertes([], historyResolved, { now: fixedNow });
      expect(alerts.filter((a) => a.critereCode === "JS.VALIDATION")).toHaveLength(0);
    });

    it("détecte l'inactivité prolongée (> 30 minutes sans activité sur un projet en cours)", () => {
      const historyInactive: StudentAttemptHistory[] = [
        {
          eleveId: "s-inactive",
          nom: "Moreau",
          prenom: "Camille",
          projetStatut: "en_cours",
          derniereActivite: "2026-10-19T09:00:00Z", // 75 minutes avant fixedNow
          attempts: [],
        },
      ];

      const alerts = detecterBlocagesEtAlertes([], historyInactive, { now: fixedNow });
      const inactAlert = alerts.find((a) => a.type === "inactivite_prolongee");

      expect(inactAlert).toBeDefined();
      expect(inactAlert?.severite).toBe("inactivite");
      expect(inactAlert?.inactivityMinutes).toBe(75);
    });

    it("ne signale pas d'inactivité pour un projet déjà rendu", () => {
      const historyRendu: StudentAttemptHistory[] = [
        {
          eleveId: "s-rendu",
          nom: "Bernard",
          prenom: "Lucas",
          projetStatut: "rendu",
          derniereActivite: "2026-10-19T08:00:00Z",
          attempts: [],
        },
      ];

      const alerts = detecterBlocagesEtAlertes([], historyRendu, { now: fixedNow });
      expect(alerts.filter((a) => a.type === "inactivite_prolongee")).toHaveLength(0);
    });
  });

  describe("3. Recommandations Pédagogiques Proactives (PRD F-64)", () => {
    it("génère une recommandation collective lorsqu'au moins 2 élèves butent sur le même critère", () => {
      const stats = calculerStatistiquesClasse(mockStudents);
      const alerts = [
        {
          id: "a1",
          eleveId: "s2",
          nom: "Martin",
          prenom: "Emma",
          type: "critere_echecs_repetes" as const,
          severite: "avertissement" as const,
          critereCode: "JS.VALIDATION",
          critereTitre: "Validation CIN",
          description: "3 échecs",
          actionConseillee: "Aide",
          timestamp: new Date().toISOString(),
        },
        {
          id: "a2",
          eleveId: "s3",
          nom: "Khelifi",
          prenom: "Inès",
          type: "critere_echecs_repetes" as const,
          severite: "critique" as const,
          critereCode: "JS.VALIDATION",
          critereTitre: "Validation CIN",
          description: "4 échecs",
          actionConseillee: "Aide",
          timestamp: new Date().toISOString(),
        },
      ];

      const recs = genererRecommandationsPedagogiques(alerts, stats);
      const collectiveRec = recs.find((r) => r.type === "rappel_cours");

      expect(collectiveRec).toBeDefined();
      expect(collectiveRec?.description).toContain("2 élèves rencontrent des blocages répétés");
      expect(collectiveRec?.cibles).toContain("Emma Martin");
      expect(collectiveRec?.cibles).toContain("Inès Khelifi");
    });
  });

  describe("4. Export Standardisé Pronote / ENT (PRD F-65)", () => {
    it("inclut le préfixe BOM UTF-8 (\\uFEFF) pour l'ouverture native dans Microsoft Excel", () => {
      const csv = exporterPronoteCsv(mockStudents);
      expect(csv.startsWith("\uFEFF")).toBe(true);
    });

    it("utilise le point-virgule comme délimiteur et la virgule pour les décimales", () => {
      const csv = exporterPronoteCsv(mockStudents);
      const lines = csv.replace("\uFEFF", "").split("\r\n");

      // Vérifier les entêtes
      expect(lines[0]).toContain("Identifiant Élève;Nom;Prénom;Statut;Note /20");
      expect(lines[0]).toContain("HTML & Structure;CSS & Design;JavaScript / DOM");
      expect(lines[0]).toContain("Appréciation Pédagogique");

      // Vérifier le formatage décimal (ex: 18,00 ou 14,00)
      expect(formaterNombreFrancais(14.5)).toBe("14,50");
      expect(csv).toContain("18,00");
      expect(csv).toContain("14,00");
    });

    it("génère des appréciations pédagogiques adaptées au niveau de note", () => {
      expect(genererAppreciationPedagogique(19)).toContain("Remarquable maîtrise");
      expect(genererAppreciationPedagogique(16.5)).toContain("Très bon travail");
      expect(genererAppreciationPedagogique(14)).toContain("Bon travail d'ensemble");
      expect(genererAppreciationPedagogique(12)).toContain("Travail satisfaisant");
      expect(genererAppreciationPedagogique(9, "en_cours", ["JS.VALIDATION"])).toContain(
        "En cours d'acquisition",
      );
      expect(genererAppreciationPedagogique(4, "en_cours", ["SQL.JOIN"])).toContain(
        "Difficultés persistantes",
      );
      expect(genererAppreciationPedagogique(0, "non_commence")).toContain(
        "Non évalué - travail non commencé",
      );
    });

    it("échappe rigoureusement les guillemets et caractères sensibles", () => {
      const eleveSpecial: TeacherClassMember[] = [
        {
          eleve_id: "s-special",
          nom: 'D"Alembert',
          prenom: 'Jean-Luc "Le Sage"',
          score_formatif: 80,
          projet_statut: "rendu",
          criteres_reussis: 4,
          total_criteres: 5,
          joined_at: "2026-10-01T08:00:00Z",
          derniere_activite: "2026-10-19T10:00:00Z",
          points_faibles: ['Sélecteur "header > nav" manquant'],
        },
      ];

      const csv = exporterPronoteCsv(eleveSpecial);
      expect(csv).toContain('"D""Alembert"');
      expect(csv).toContain('"Jean-Luc ""Le Sage"""');
      expect(csv).toContain('"Sélecteur ""header > nav"" manquant"');
    });
  });
});
