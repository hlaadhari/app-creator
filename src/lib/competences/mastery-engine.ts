/**
 * Moteur Déterministe de Calcul de Maîtrise (v1.0) et Détection de Progression (PRD F-57 à F-60)
 */

import { OFFICIAL_COMPETENCES, OFFICIAL_BADGES, CATEGORY_LABELS } from "./referentiel";
import type {
  CompetenceCategory,
  MasteryLevelClassification,
  MaitriseRecord,
  CompetenceMasteryView,
  CategoryMasteryScore,
  BadgeEleve,
  StudentProgressionReport,
} from "./types";

/**
 * Formule transparente de calcul du score de maîtrise (0.000 à 1.000)
 * Version : v1.0
 *
 * Composantes :
 * - Taux de succès brut (taux = succes / tentatives)
 * - Bonus de réussite immédiate (+0.15 si premier_coup_succes)
 * - Facteur de régularité (jusqu'à +0.15 pour validation répétée)
 * - Facteur de récence (pondération temporelle douce)
 */
export function calculerMaitriseScore(
  succes: number,
  tentatives: number,
  premierCoup: boolean,
  derniereDate?: string | number | Date | null,
): number {
  if (tentatives <= 0 || succes <= 0) {
    return 0.0;
  }

  const nbTentatives = Math.max(tentatives, 1);
  const nbSucces = Math.min(succes, nbTentatives);

  // 1. Taux de succès brut (0.0 à 1.0)
  const tauxSucces = nbSucces / nbTentatives;

  // 2. Bonus premier coup (réussite directe)
  const bonusPremier = premierCoup ? 0.15 : 0.0;

  // 3. Facteur de régularité (atteint son max à partir de 3 succès)
  const regularite = Math.min(1.0, nbSucces / 3.0) * 0.15;

  // 4. Facteur de récence (si plus de 30 jours, légère atténuation de 10%)
  let facteurRecence = 1.0;
  if (derniereDate) {
    const dateMs =
      typeof derniereDate === "number" ? derniereDate : new Date(derniereDate).getTime();
    if (!isNaN(dateMs)) {
      const joursEcoules = (Date.now() - dateMs) / (1000 * 60 * 60 * 24);
      if (joursEcoules > 30) {
        facteurRecence = 0.9;
      }
    }
  }

  // Formule combinée v1.0
  const scoreBrut = (0.7 * tauxSucces + bonusPremier + regularite) * facteurRecence;
  const scoreBorne = Math.min(1.0, Math.max(0.0, scoreBrut));

  // Arrondi à 3 décimales
  return Math.round(scoreBorne * 1000) / 1000;
}

/**
 * Classification didactique du score
 */
export function classifyMasteryLevel(score: number): MasteryLevelClassification {
  if (score >= 0.85) return "maitrise";
  if (score >= 0.7) return "acquis";
  if (score >= 0.4) return "en_cours";
  return "non_acquis";
}

/**
 * Construit le rapport complet de progression d'un élève
 */
export function buildStudentProgressionReport(
  eleveId: string,
  records: MaitriseRecord[],
  badges: BadgeEleve[],
  totalTentatives: number = 0,
  totalSucces: number = 0,
): StudentProgressionReport {
  const recordsMap = new Map<string, MaitriseRecord>();
  for (const r of records) {
    recordsMap.set(r.competenceId, r);
  }

  const competencesView: CompetenceMasteryView[] = OFFICIAL_COMPETENCES.map((comp) => {
    const record = recordsMap.get(comp.id);
    const niveau = record ? record.niveau : 0.0;
    const nbTentatives = record ? record.nbTentatives : 0;
    const nbSucces = record ? record.nbSucces : 0;
    const premierCoupSucces = record ? record.premierCoupSucces : false;
    const dernierSucces = record ? record.dernierSucces : null;

    const classification = classifyMasteryLevel(niveau);
    const percentage = Math.round(niveau * 100);

    const estPointFort = niveau >= 0.75;
    const estAxePrioritaire =
      (nbTentatives > 0 && niveau < 0.5) || (nbTentatives === 0 && comp.ordre <= 30);

    return {
      competence: comp,
      niveau,
      percentage,
      classification,
      nbTentatives,
      nbSucces,
      premierCoupSucces,
      dernierSucces,
      estPointFort,
      estAxePrioritaire,
    };
  });

  // Calcul par catégorie
  const categoriesList: CompetenceCategory[] = [
    "HTML",
    "CSS",
    "JAVASCRIPT",
    "PHP",
    "SQL",
    "ALGO_ARCHI",
  ];

  const categoryScores: CategoryMasteryScore[] = categoriesList.map((cat) => {
    const compsOfCat = competencesView.filter((c) => c.competence.categorie === cat);
    const total = compsOfCat.length;
    const sumNiveaux = compsOfCat.reduce((acc, c) => acc + c.niveau, 0);
    const scoreMoyen = total > 0 ? Math.round((sumNiveaux / total) * 1000) / 1000 : 0.0;
    const competencesAcquises = compsOfCat.filter(
      (c) => c.classification === "acquis" || c.classification === "maitrise",
    ).length;

    return {
      categorie: cat,
      label: CATEGORY_LABELS[cat] || cat,
      score: scoreMoyen,
      percentage: Math.round(scoreMoyen * 100),
      totalCompetences: total,
      competencesAcquises,
    };
  });

  // Score global (moyenne pondérée des compétences travaillées)
  const totalScoreComps = competencesView.reduce((acc, c) => acc + c.niveau, 0);
  const scoreGlobal =
    competencesView.length > 0
      ? Math.round((totalScoreComps / competencesView.length) * 1000) / 1000
      : 0.0;

  // Points forts (triés par score décroissant)
  const pointsForts = competencesView
    .filter((c) => c.estPointFort)
    .sort((a, b) => b.niveau - a.niveau);

  // Axes prioritaires (ceux qui ont un score bas ou n'ont pas encore été abordés)
  const axesPrioritaires = competencesView
    .filter((c) => c.estAxePrioritaire)
    .sort((a, b) => a.niveau - b.niveau);

  return {
    eleveId,
    scoreGlobal,
    scoreGlobalPercentage: Math.round(scoreGlobal * 100),
    categories: categoryScores,
    competences: competencesView,
    pointsForts,
    axesPrioritaires,
    badges,
    badgesDisponiblesCount: OFFICIAL_BADGES.length,
    badgesObtenusCount: badges.length,
    totalTentatives,
    totalSucces,
  };
}

/**
 * Analyse l'éligibilité aux badges pédagogiques (PRD §6, §11)
 */
export function evaluateBadgesEligibility(
  report: StudentProgressionReport,
  existingBadgeIds: string[],
  context?: {
    noteExamen?: number | undefined;
    consecutiveAttemptsOnSameCriterion?: number | undefined;
  },
): string[] {
  const ownedSet = new Set(existingBadgeIds);
  const newBadgeIds: string[] = [];

  // 1. PREMIERS_PAS : premier succès
  if (!ownedSet.has("PREMIERS_PAS") && report.totalSucces >= 1) {
    newBadgeIds.push("PREMIERS_PAS");
  }

  // 2. ARCHITECTE_HTML : >= 70% en HTML
  const catHtml = report.categories.find((c) => c.categorie === "HTML");
  if (!ownedSet.has("ARCHITECTE_HTML") && catHtml && catHtml.percentage >= 70) {
    newBadgeIds.push("ARCHITECTE_HTML");
  }

  // 3. STYLISTE_CSS : >= 70% en CSS
  const catCss = report.categories.find((c) => c.categorie === "CSS");
  if (!ownedSet.has("STYLISTE_CSS") && catCss && catCss.percentage >= 70) {
    newBadgeIds.push("STYLISTE_CSS");
  }

  // 4. DOM_MASTER : >= 70% en JS
  const catJs = report.categories.find((c) => c.categorie === "JAVASCRIPT");
  if (!ownedSet.has("DOM_MASTER") && catJs && catJs.percentage >= 70) {
    newBadgeIds.push("DOM_MASTER");
  }

  // 5. ARTISAN_PHP : au moins 1 succès sur PHP.SUPERGLOBALS_POST ou score PHP >= 60%
  const catPhp = report.categories.find((c) => c.categorie === "PHP");
  const phpPost = report.competences.find((c) => c.competence.id === "PHP.SUPERGLOBALS_POST");
  if (
    !ownedSet.has("ARTISAN_PHP") &&
    ((phpPost && phpPost.nbSucces >= 1) || (catPhp && catPhp.percentage >= 60))
  ) {
    newBadgeIds.push("ARTISAN_PHP");
  }

  // 6. EXPLORATEUR_SQL : au moins 1 succès SQL
  const catSql = report.categories.find((c) => c.categorie === "SQL");
  if (!ownedSet.has("EXPLORATEUR_SQL") && catSql && catSql.percentage >= 50) {
    newBadgeIds.push("EXPLORATEUR_SQL");
  }

  // 7. MAJOR_BAC_BLANC : note >= 16/20 en examen
  if (
    !ownedSet.has("MAJOR_BAC_BLANC") &&
    context?.noteExamen !== undefined &&
    context.noteExamen >= 16
  ) {
    newBadgeIds.push("MAJOR_BAC_BLANC");
  }

  // 8. PERSEVERANT : déblocage après >= 3 tentatives sur un critère
  if (
    !ownedSet.has("PERSEVERANT") &&
    context?.consecutiveAttemptsOnSameCriterion !== undefined &&
    context.consecutiveAttemptsOnSameCriterion >= 3
  ) {
    newBadgeIds.push("PERSEVERANT");
  }

  return newBadgeIds;
}
