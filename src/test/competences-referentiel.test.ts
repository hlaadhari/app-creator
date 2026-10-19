/**
 * Tests Unitaires & d'Intégration : Référentiel des Compétences Officielles du Bac STI,
 * Calcul de Maîtrise (v1.0) et Déblocage des Badges (Issue #33, PRD F-57 à F-60, Jalon M7)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  OFFICIAL_COMPETENCES,
  OFFICIAL_BADGES,
  inferCompetenceForCriterion,
  getCompetencesForSubject,
} from "@/lib/competences/referentiel";
import {
  calculerMaitriseScore,
  classifyMasteryLevel,
  buildStudentProgressionReport,
  evaluateBadgesEligibility,
} from "@/lib/competences/mastery-engine";
import {
  updateMasteryFromAttempt,
  getStudentProgressionReport,
  resetLocalProgression,
} from "@/lib/competences/competences-service";
import type { MaitriseRecord, BadgeEleve } from "@/lib/competences/types";

describe("Référentiel des Compétences Officielles Bac STI (Issue #33)", () => {
  it("contient au moins 20 compétences officielles réparties sur les domaines clés", () => {
    expect(OFFICIAL_COMPETENCES.length).toBeGreaterThanOrEqual(20);

    const categories = new Set(OFFICIAL_COMPETENCES.map((c) => c.categorie));
    expect(categories.has("HTML")).toBe(true);
    expect(categories.has("CSS")).toBe(true);
    expect(categories.has("JAVASCRIPT")).toBe(true);
    expect(categories.has("PHP")).toBe(true);
    expect(categories.has("SQL")).toBe(true);
    expect(categories.has("ALGO_ARCHI")).toBe(true);
  });

  it("garantit l'unicité absolue des identifiants et des codes de compétences", () => {
    const ids = OFFICIAL_COMPETENCES.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    const codes = OFFICIAL_COMPETENCES.map((c) => c.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("inclut les compétences clés exigées par le programme et l'énoncé de l'issue", () => {
    const codeList = OFFICIAL_COMPETENCES.map((c) => c.code);

    // Compétences HTML
    expect(codeList).toContain("HTML.STRUCT");
    expect(codeList).toContain("HTML.SEMANTIC");
    expect(codeList).toContain("HTML.FORM");

    // Compétences CSS
    expect(codeList).toContain("CSS.FLEX");
    expect(codeList).toContain("CSS.RESPONSIVE");
    expect(codeList).toContain("CSS.BOXMODEL");

    // Compétences JavaScript
    expect(codeList).toContain("JS.DOM");
    expect(codeList).toContain("JS.EVENTS");
    expect(codeList).toContain("JS.VALIDATION");

    // Compétences PHP
    expect(codeList).toContain("PHP.SUPERGLOBALS_POST");
    expect(codeList).toContain("PHP.SESSIONS");

    // Compétences SQL
    expect(codeList).toContain("SQL.DDL");
    expect(codeList).toContain("SQL.DML_INSERT");
    expect(codeList).toContain("SQL.AGGREGATE");
  });

  it("fournit au moins 8 badges officiels avec conditions et icônes valides", () => {
    expect(OFFICIAL_BADGES.length).toBeGreaterThanOrEqual(8);
    const badgeIds = OFFICIAL_BADGES.map((b) => b.id);

    expect(badgeIds).toContain("PREMIERS_PAS");
    expect(badgeIds).toContain("ARCHITECTE_HTML");
    expect(badgeIds).toContain("STYLISTE_CSS");
    expect(badgeIds).toContain("DOM_MASTER");
    expect(badgeIds).toContain("ARTISAN_PHP");
    expect(badgeIds).toContain("EXPLORATEUR_SQL");
    expect(badgeIds).toContain("MAJOR_BAC_BLANC");
    expect(badgeIds).toContain("PERSEVERANT");
  });
});

describe("Moteur Déterministe de Calcul de Maîtrise v1.0", () => {
  it("renvoie 0.000 lorsqu'il n'y a aucun succès ou aucune tentative", () => {
    expect(calculerMaitriseScore(0, 0, false)).toBe(0.0);
    expect(calculerMaitriseScore(0, 5, false)).toBe(0.0);
  });

  it("applique le bonus de premier essai lors d'une validation immédiate", () => {
    // 1 succès sur 1 tentative avec premier essai
    const scorePremierEssai = calculerMaitriseScore(1, 1, true);
    // 1 succès sur 1 tentative SANS premier essai
    const scoreSansBonus = calculerMaitriseScore(1, 1, false);

    expect(scorePremierEssai).toBeGreaterThan(scoreSansBonus);
    expect(scorePremierEssai).toBeGreaterThanOrEqual(0.85); // Maîtrisé
  });

  it("valorise la régularité pour des réussites répétées", () => {
    const score1Succes = calculerMaitriseScore(1, 2, false);
    const score3Succes = calculerMaitriseScore(3, 4, false);

    expect(score3Succes).toBeGreaterThan(score1Succes);
  });

  it("applique une pondération de récence pour une activité antérieure à 30 jours", () => {
    const dateRecente = new Date();
    const dateAncienne = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 jours

    const scoreRecent = calculerMaitriseScore(3, 3, false, dateRecente);
    const scoreAncien = calculerMaitriseScore(3, 3, false, dateAncienne);

    expect(scoreRecent).toBeGreaterThan(scoreAncien);
    expect(scoreAncien).toBeCloseTo(scoreRecent * 0.9, 2);
  });

  it("classe rigoureusement les niveaux didactiques", () => {
    expect(classifyMasteryLevel(0.95)).toBe("maitrise");
    expect(classifyMasteryLevel(0.85)).toBe("maitrise");
    expect(classifyMasteryLevel(0.78)).toBe("acquis");
    expect(classifyMasteryLevel(0.7)).toBe("acquis");
    expect(classifyMasteryLevel(0.55)).toBe("en_cours");
    expect(classifyMasteryLevel(0.4)).toBe("en_cours");
    expect(classifyMasteryLevel(0.25)).toBe("non_acquis");
    expect(classifyMasteryLevel(0.0)).toBe("non_acquis");
  });
});

describe("Construction du Rapport de Progression & Identification des Points Forts", () => {
  it("identifie les points forts (score >= 75%) et les axes de révision prioritaires", () => {
    const records: MaitriseRecord[] = [
      {
        eleveId: "eleve-1",
        competenceId: "HTML.STRUCT",
        niveau: 0.9,
        nbTentatives: 2,
        nbSucces: 2,
        premierCoupSucces: true,
        versionFormule: "v1.0",
        updatedAt: new Date().toISOString(),
      },
      {
        eleveId: "eleve-1",
        competenceId: "CSS.FLEX",
        niveau: 0.8,
        nbTentatives: 3,
        nbSucces: 2,
        premierCoupSucces: false,
        versionFormule: "v1.0",
        updatedAt: new Date().toISOString(),
      },
      {
        eleveId: "eleve-1",
        competenceId: "JS.VALIDATION",
        niveau: 0.35,
        nbTentatives: 4,
        nbSucces: 1,
        premierCoupSucces: false,
        versionFormule: "v1.0",
        updatedAt: new Date().toISOString(),
      },
    ];

    const report = buildStudentProgressionReport("eleve-1", records, [], 9, 5);

    expect(report.eleveId).toBe("eleve-1");
    expect(report.totalTentatives).toBe(9);
    expect(report.totalSucces).toBe(5);

    // Points forts : HTML.STRUCT (90%) et CSS.FLEX (80%)
    expect(report.pointsForts.map((p) => p.competence.id)).toContain("HTML.STRUCT");
    expect(report.pointsForts.map((p) => p.competence.id)).toContain("CSS.FLEX");

    // Axe prioritaire : JS.VALIDATION (35% < 50%)
    expect(report.axesPrioritaires.map((p) => p.competence.id)).toContain("JS.VALIDATION");
  });

  it("calcule correctement les moyennes par catégorie", () => {
    const records: MaitriseRecord[] = [
      {
        eleveId: "eleve-1",
        competenceId: "HTML.STRUCT",
        niveau: 1.0,
        nbTentatives: 1,
        nbSucces: 1,
        premierCoupSucces: true,
        versionFormule: "v1.0",
        updatedAt: new Date().toISOString(),
      },
      {
        eleveId: "eleve-1",
        competenceId: "HTML.SEMANTIC",
        niveau: 0.6,
        nbTentatives: 2,
        nbSucces: 1,
        premierCoupSucces: false,
        versionFormule: "v1.0",
        updatedAt: new Date().toISOString(),
      },
    ];

    const report = buildStudentProgressionReport("eleve-1", records, []);
    const catHtml = report.categories.find((c) => c.categorie === "HTML");

    expect(catHtml).toBeDefined();
    expect(catHtml!.totalCompetences).toBe(4);
    // (1.0 + 0.6 + 0 + 0) / 4 = 0.400 = 40%
    expect(catHtml!.score).toBe(0.4);
    expect(catHtml!.percentage).toBe(40);
  });
});

describe("Attribution Automatique des Badges Pédagogiques", () => {
  it("débloque PREMIERS_PAS dès le premier succès enregistré", () => {
    const report = buildStudentProgressionReport("eleve-1", [], [], 1, 1);
    const newBadges = evaluateBadgesEligibility(report, []);

    expect(newBadges).toContain("PREMIERS_PAS");
  });

  it("débloque MAJOR_BAC_BLANC si la note d'examen blanc atteint 16/20", () => {
    const report = buildStudentProgressionReport("eleve-1", [], [], 5, 4);

    const badgesPasEncore = evaluateBadgesEligibility(report, [], { noteExamen: 14 });
    expect(badgesPasEncore).not.toContain("MAJOR_BAC_BLANC");

    const badgesEligible = evaluateBadgesEligibility(report, [], { noteExamen: 17 });
    expect(badgesEligible).toContain("MAJOR_BAC_BLANC");
  });

  it("débloque PERSEVERANT après 3 échecs consécutifs suivis d'un succès", () => {
    const report = buildStudentProgressionReport("eleve-1", [], [], 4, 1);

    const newBadges = evaluateBadgesEligibility(report, [], {
      consecutiveAttemptsOnSameCriterion: 3,
    });
    expect(newBadges).toContain("PERSEVERANT");
  });

  it("ne redébloque pas un badge déjà possédé", () => {
    const report = buildStudentProgressionReport("eleve-1", [], [], 5, 5);
    const existing = ["PREMIERS_PAS", "ARCHITECTE_HTML"];

    const newBadges = evaluateBadgesEligibility(report, existing);
    expect(newBadges).not.toContain("PREMIERS_PAS");
    expect(newBadges).not.toContain("ARCHITECTE_HTML");
  });
});

describe("Inférence Heuristique des Compétences depuis les Critères", () => {
  it("associe correctement les critères de formulaire et HTML", () => {
    expect(inferCompetenceForCriterion("form", "Formulaire avec input et bouton")).toBe("HTML.FORM");
    expect(inferCompetenceForCriterion("art", "Un élément article existe")).toBe("HTML.SEMANTIC");
    expect(inferCompetenceForCriterion("lien", "Lien vers la documentation")).toBe("HTML.MEDIA");
  });

  it("associe correctement les critères CSS", () => {
    expect(inferCompetenceForCriterion("btn", "Mise en page flexible avec display flex")).toBe("CSS.FLEX");
    expect(inferCompetenceForCriterion("bg", "Couleur de fond et padding")).toBe("CSS.BOXMODEL");
    expect(inferCompetenceForCriterion("mob", "Media queries responsive mobile")).toBe("CSS.RESPONSIVE");
  });

  it("associe correctement les critères JS, PHP et SQL", () => {
    expect(inferCompetenceForCriterion("btn", "Écouteur click sur bouton")).toBe("JS.EVENTS");
    expect(inferCompetenceForCriterion("cin", "Validation du format du numéro CIN")).toBe("JS.VALIDATION");
    expect(inferCompetenceForCriterion("php", "Traitement des paramètres POST")).toBe("PHP.SUPERGLOBALS_POST");
    expect(inferCompetenceForCriterion("sess", "Initialisation de session PHP")).toBe("PHP.SESSIONS");
    expect(inferCompetenceForCriterion("ddl", "Création de la table avec clé primaire")).toBe("SQL.DDL");
    expect(inferCompetenceForCriterion("join", "Requête SELECT avec jointure")).toBe("SQL.JOIN");
    expect(inferCompetenceForCriterion("count", "Calcul avec fonction d'agrégation COUNT")).toBe("SQL.AGGREGATE");
  });

  it("extrait les compétences ciblées pour un sujet complet", () => {
    const criteres = [
      { id: "article", label: "Élément article sémantique" },
      { id: "bg", label: "Fond et padding CSS" },
      { id: "click", label: "Événement clic en JavaScript" },
    ];

    const targets = getCompetencesForSubject("carte-profil", criteres);
    const targetCodes = targets.map((t) => t.code);

    expect(targetCodes).toContain("HTML.SEMANTIC");
    expect(targetCodes).toContain("CSS.BOXMODEL");
    expect(targetCodes).toContain("JS.EVENTS");
  });
});

describe("Cycle de Vie Complet : Tentative -> Mise à jour Maîtrise -> Badges", () => {
  beforeEach(() => {
    resetLocalProgression();
  });

  it("met à jour automatiquement les niveaux de maîtrise lors d'une tentative", async () => {
    const res = await updateMasteryFromAttempt({
      sujetId: "carte-profil",
      eleveId: "eleve-test-42",
      criteres: [
        { id: "article", label: "Article sémantique", ok: true, points: 2 },
        { id: "h1", label: "Titre h1 non vide", ok: true, points: 2 },
        { id: "mail", label: "Lien mailto", ok: false, points: 2 },
      ],
    });

    expect(res.updatedRecords.length).toBeGreaterThan(0);
    expect(res.report.totalSucces).toBe(2);
    expect(res.report.totalTentatives).toBe(3);

    // Vérifie qu'au moins le badge PREMIERS_PAS a été décerné
    expect(res.newBadgesAwarded.map((b) => b.badgeId)).toContain("PREMIERS_PAS");

    // Vérifie que le rapport de progression est persistant
    const reportReloaded = await getStudentProgressionReport("eleve-test-42");
    expect(reportReloaded.totalSucces).toBe(2);
    expect(reportReloaded.badgesObtenusCount).toBeGreaterThanOrEqual(1);
  });
});
