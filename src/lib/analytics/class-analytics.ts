/**
 * Moteur d'Analyse Statistique de Classe & Détection des Décrochages / Blocages (PRD F-61, F-62, F-63, F-64, Jalon M7)
 * Conforme aux exigences du Bac STI2D / NSI et au format académique standard.
 */

import type { TeacherClassMember } from "@/lib/supabase/teacher";

export type BlockageSeverity = "critique" | "avertissement" | "inactivite";

export interface StudentAttemptDetail {
  critereCode: string;
  critereTitre?: string;
  valide: boolean;
  timestamp?: string;
}

export interface StudentAttemptRecord {
  id?: string;
  eleveId: string;
  score: number;
  pointsTotal: number;
  timestamp: string;
  criteres: StudentAttemptDetail[];
}

export interface StudentAttemptHistory {
  eleveId: string;
  nom: string;
  prenom: string;
  attempts: {
    id?: string;
    score: number;
    pointsTotal: number;
    timestamp: string;
    criteres: StudentAttemptDetail[];
  }[];
  projetStatut: "non_commence" | "en_cours" | "rendu";
  derniereActivite: string;
}

export interface NoteDistributionBucket {
  tranche: string; // "0 - 4", "5 - 9", "10 - 14", "15 - 20"
  min: number;
  max: number;
  count: number;
  pourcentage: number;
}

export interface CompetenceStat {
  categorie: string;
  label: string;
  tauxReussite: number; // 0 à 100
  nbCriteresEvalues: number;
  nbCriteresValides: number;
}

export interface ClassStatistics {
  totalEleves: number;
  moyenne20: number;
  mediane20: number;
  ecartType: number;
  q1_20: number;
  q3_20: number;
  noteMin20: number;
  noteMax20: number;
  tauxReussite: number; // % avec score >= 10/20 (50%)
  tauxRendu: number; // % copies rendues
  distributionNotes: NoteDistributionBucket[];
  competenceStats: CompetenceStat[];
}

export interface StudentBlockageAlert {
  id: string;
  eleveId: string;
  nom: string;
  prenom: string;
  type: "critere_echecs_repetes" | "inactivite_prolongee" | "decrochage_global";
  severite: BlockageSeverity;
  critereCode?: string;
  critereTitre?: string;
  consecutiveFailures?: number;
  inactivityMinutes?: number;
  description: string;
  actionConseillee: string;
  timestamp: string;
}

export interface PedagogicalRecommendation {
  id: string;
  type: "rappel_cours" | "deblocage_indice" | "intervention_individuelle" | "felicitations";
  titre: string;
  description: string;
  cibles: string[];
  urgence: "haute" | "moyenne" | "faible";
  critereConcerne?: string;
}

/**
 * Normalise un score en note sur 20
 */
export function scoreToNote20(scoreFormatif?: number): number {
  if (scoreFormatif === undefined || scoreFormatif === null || isNaN(scoreFormatif)) {
    return 0;
  }
  const note = (scoreFormatif * 20) / 100;
  return Math.round(note * 100) / 100;
}

/**
 * Calcule la médiane d'une liste de nombres
 */
export function calculerMediane(valeurs: number[]): number {
  if (valeurs.length === 0) return 0;
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);

  if (triees.length % 2 === 0) {
    const valGauche = triees[milieu - 1] ?? 0;
    const valDroite = triees[milieu] ?? 0;
    return Math.round(((valGauche + valDroite) / 2) * 100) / 100;
  }
  return Math.round((triees[milieu] ?? 0) * 100) / 100;
}

/**
 * Calcule un percentile (ex: Q1 = 0.25, Q3 = 0.75)
 */
export function calculerPercentile(valeurs: number[], p: number): number {
  if (valeurs.length === 0) return 0;
  const triees = [...valeurs].sort((a, b) => a - b);
  const index = (triees.length - 1) * p;
  const bas = Math.floor(index);
  const haut = Math.ceil(index);

  const valBas = triees[bas] ?? 0;
  const valHaut = triees[haut] ?? 0;

  if (bas === haut) return Math.round(valBas * 100) / 100;
  const interpolation = valBas + (valHaut - valBas) * (index - bas);
  return Math.round(interpolation * 100) / 100;
}

/**
 * Calcule l'écart-type d'une série de valeurs
 */
export function calculerEcartType(valeurs: number[], moyenne: number): number {
  if (valeurs.length === 0) return 0;
  const sommeCarres = valeurs.reduce((acc, v) => acc + Math.pow(v - moyenne, 2), 0);
  const variance = sommeCarres / valeurs.length;
  return Math.round(Math.sqrt(variance) * 100) / 100;
}

/**
 * Catégorise un critère par domaine technique d'après son code ou son libellé
 */
export function devinerCategorieCritere(critereCodeOrTitre: string): string {
  const code = critereCodeOrTitre.toUpperCase();
  if (code.startsWith("HTML") || code.includes("BALISE") || code.includes("FORMULAIRE")) {
    return "HTML";
  }
  if (
    code.startsWith("CSS") ||
    code.includes("STYLE") ||
    code.includes("FLEX") ||
    code.includes("GRID") ||
    code.includes("RESPONSIVE")
  ) {
    return "CSS";
  }
  if (
    code.startsWith("JS") ||
    code.includes("DOM") ||
    code.includes("EVENT") ||
    code.includes("VALIDATION") ||
    code.includes("SCRIPT")
  ) {
    return "JAVASCRIPT";
  }
  if (
    code.startsWith("PHP") ||
    code.includes("SERVEUR") ||
    code.includes("POST") ||
    code.includes("SESSION")
  ) {
    return "PHP";
  }
  if (
    code.startsWith("SQL") ||
    code.includes("BASE") ||
    code.includes("JOIN") ||
    code.includes("SELECT") ||
    code.includes("INSERT")
  ) {
    return "SQL";
  }
  return "ALGO_ARCHI";
}

const CATEGORY_NAMES: Record<string, string> = {
  HTML: "HTML & Balisage Sémantique",
  CSS: "CSS & Design Adaptatif",
  JAVASCRIPT: "JavaScript & DOM Client",
  PHP: "PHP & Traitement Serveur",
  SQL: "SQL & Bases Relationnelles",
  ALGO_ARCHI: "Algorithmique & Logique",
};

/**
 * Calcule l'ensemble des statistiques de la classe (moyenne, médiane, quartiles, distribution, taux)
 */
export function calculerStatistiquesClasse(
  eleves: TeacherClassMember[],
  attemptHistories?: StudentAttemptHistory[],
): ClassStatistics {
  const totalEleves = eleves.length;

  if (totalEleves === 0) {
    return {
      totalEleves: 0,
      moyenne20: 0,
      mediane20: 0,
      ecartType: 0,
      q1_20: 0,
      q3_20: 0,
      noteMin20: 0,
      noteMax20: 0,
      tauxReussite: 0,
      tauxRendu: 0,
      distributionNotes: [
        { tranche: "0 - 4", min: 0, max: 4, count: 0, pourcentage: 0 },
        { tranche: "5 - 9", min: 5, max: 9, count: 0, pourcentage: 0 },
        { tranche: "10 - 14", min: 10, max: 14, count: 0, pourcentage: 0 },
        { tranche: "15 - 20", min: 15, max: 20, count: 0, pourcentage: 0 },
      ],
      competenceStats: [],
    };
  }

  // Notes sur 20
  const notes20 = eleves.map((e) => scoreToNote20(e.score_formatif));
  const sommeNotes = notes20.reduce((acc, curr) => acc + curr, 0);
  const moyenne20 = Math.round((sommeNotes / totalEleves) * 100) / 100;
  const mediane20 = calculerMediane(notes20);
  const ecartType = calculerEcartType(notes20, moyenne20);
  const q1_20 = calculerPercentile(notes20, 0.25);
  const q3_20 = calculerPercentile(notes20, 0.75);
  const noteMin20 = Math.min(...notes20);
  const noteMax20 = Math.max(...notes20);

  // Taux de réussite (>= 10/20) et taux de rendu
  const elevesReussite = notes20.filter((n) => n >= 10).length;
  const tauxReussite = Math.round((elevesReussite / totalEleves) * 100);
  const elevesRendu = eleves.filter((e) => e.projet_statut === "rendu").length;
  const tauxRendu = Math.round((elevesRendu / totalEleves) * 100);

  // Distribution des notes en tranches
  const b0_4 = notes20.filter((n) => n < 5).length;
  const b5_9 = notes20.filter((n) => n >= 5 && n < 10).length;
  const b10_14 = notes20.filter((n) => n >= 10 && n < 15).length;
  const b15_20 = notes20.filter((n) => n >= 15).length;

  const distributionNotes: NoteDistributionBucket[] = [
    {
      tranche: "0 - 4",
      min: 0,
      max: 4,
      count: b0_4,
      pourcentage: Math.round((b0_4 / totalEleves) * 100),
    },
    {
      tranche: "5 - 9",
      min: 5,
      max: 9,
      count: b5_9,
      pourcentage: Math.round((b5_9 / totalEleves) * 100),
    },
    {
      tranche: "10 - 14",
      min: 10,
      max: 14,
      count: b10_14,
      pourcentage: Math.round((b10_14 / totalEleves) * 100),
    },
    {
      tranche: "15 - 20",
      min: 15,
      max: 20,
      count: b15_20,
      pourcentage: Math.round((b15_20 / totalEleves) * 100),
    },
  ];

  // Calcul du taux de réussite par domaine de compétences
  const domainCounters: Record<string, { total: number; reussis: number }> = {
    HTML: { total: 0, reussis: 0 },
    CSS: { total: 0, reussis: 0 },
    JAVASCRIPT: { total: 0, reussis: 0 },
    PHP: { total: 0, reussis: 0 },
    SQL: { total: 0, reussis: 0 },
  };

  // Si nous avons l'historique détaillé des critères, nous l'utilisons pour une granularité maximale
  if (attemptHistories && attemptHistories.length > 0) {
    attemptHistories.forEach((hist) => {
      const latestAttempt = hist.attempts[hist.attempts.length - 1];
      if (latestAttempt && latestAttempt.criteres) {
        latestAttempt.criteres.forEach((crit) => {
          const cat = devinerCategorieCritere(crit.critereCode);
          let current = domainCounters[cat];
          if (!current) {
            current = { total: 0, reussis: 0 };
            domainCounters[cat] = current;
          }
          current.total += 1;
          if (crit.valide) {
            current.reussis += 1;
          }
        });
      }
    });
  } else {
    // Estimation d'après les critères réussis des élèves et les points faibles déclarés
    eleves.forEach((e) => {
      const totalCriteres = e.total_criteres || 5;
      const reussis = e.criteres_reussis ?? Math.round((e.score_formatif || 0) / 20);

      // Attribution par défaut répartie sur les compétences STI2D
      const domains = ["HTML", "CSS", "JAVASCRIPT", "PHP", "SQL"];
      domains.forEach((dom) => {
        let current = domainCounters[dom];
        if (!current) {
          current = { total: 0, reussis: 0 };
          domainCounters[dom] = current;
        }
        current.total += 1;
        const hasWeaknessInDomain = (e.points_faibles || []).some(
          (pf) => devinerCategorieCritere(pf) === dom,
        );
        if (!hasWeaknessInDomain && reussis / totalCriteres >= 0.5) {
          current.reussis += 1;
        }
      });
    });
  }

  const competenceStats: CompetenceStat[] = Object.keys(domainCounters)
    .filter((cat) => {
      const c = domainCounters[cat];
      return c !== undefined && c.total > 0;
    })
    .map((cat) => {
      const c = domainCounters[cat]!;
      const taux = c.total > 0 ? Math.round((c.reussis / c.total) * 100) : 0;
      return {
        categorie: cat,
        label: CATEGORY_NAMES[cat] || cat,
        tauxReussite: taux,
        nbCriteresEvalues: c.total,
        nbCriteresValides: c.reussis,
      };
    });

  return {
    totalEleves,
    moyenne20,
    mediane20,
    ecartType,
    q1_20,
    q3_20,
    noteMin20,
    noteMax20,
    tauxReussite,
    tauxRendu,
    distributionNotes,
    competenceStats,
  };
}

/**
 * Algorithme de détection automatique des blocages et décrochages (PRD F-62)
 * Règle 1: > 3 tentatives infructueuses consécutives sur le même critère (>= 4 échecs = critique, 3 = avertissement)
 * Règle 2: Inactivité prolongée (> 30 min en projet en cours)
 * Règle 3: Décrochage global (score < 40% avec plusieurs points faibles non résolus)
 */
export function detecterBlocagesEtAlertes(
  eleves: TeacherClassMember[],
  attemptHistories?: StudentAttemptHistory[],
  options?: {
    now?: Date;
    inactivityThresholdMinutes?: number;
    consecutiveFailureThreshold?: number;
  },
): StudentBlockageAlert[] {
  const alerts: StudentBlockageAlert[] = [];
  const now = options?.now || new Date();
  const inactivityThresholdMin = options?.inactivityThresholdMinutes ?? 30;
  const failureThreshold = options?.consecutiveFailureThreshold ?? 3;

  // 1. Détection via l'historique détaillé des tentatives chronologiques
  if (attemptHistories && attemptHistories.length > 0) {
    attemptHistories.forEach((hist) => {
      // Regrouper les tentatives par critère pour analyser les échecs consécutifs
      const criteriaFailureStreaks: Record<string, { count: number; titre?: string | undefined }> =
        {};

      hist.attempts.forEach((att) => {
        att.criteres.forEach((crit) => {
          const key = crit.critereCode;
          let streak = criteriaFailureStreaks[key];
          if (!streak) {
            streak = { count: 0, titre: crit.critereTitre };
            criteriaFailureStreaks[key] = streak;
          }
          if (crit.valide) {
            // Un succès efface la série d'échecs consécutifs
            streak.count = 0;
          } else {
            streak.count += 1;
            if (crit.critereTitre) {
              streak.titre = crit.critereTitre;
            }
          }
        });
      });

      // Vérifier les critères bloquants
      Object.entries(criteriaFailureStreaks).forEach(([code, data]) => {
        if (data.count >= failureThreshold) {
          const isCritical = data.count > failureThreshold;
          alerts.push({
            id: `alert-fail-${hist.eleveId}-${code}`,
            eleveId: hist.eleveId,
            nom: hist.nom,
            prenom: hist.prenom,
            type: "critere_echecs_repetes",
            severite: isCritical ? "critique" : "avertissement",
            critereCode: code,
            critereTitre: data.titre || code,
            consecutiveFailures: data.count,
            description: `${data.count} tentatives infructueuses consécutives sur "${data.titre || code}".`,
            actionConseillee: `Suggérer le déblocage de l'indice ou proposer une intervention guidée sur ${code}.`,
            timestamp: now.toISOString(),
          });
        }
      });

      // Vérifier l'inactivité anormale
      if (hist.projetStatut === "en_cours") {
        const lastAct = new Date(hist.derniereActivite).getTime();
        const diffMinutes = Math.floor((now.getTime() - lastAct) / 60000);

        if (diffMinutes >= inactivityThresholdMin) {
          alerts.push({
            id: `alert-inact-${hist.eleveId}`,
            eleveId: hist.eleveId,
            nom: hist.nom,
            prenom: hist.prenom,
            type: "inactivite_prolongee",
            severite: "inactivite",
            inactivityMinutes: diffMinutes,
            description: `Aucune modification ni vérification depuis ${diffMinutes} minutes.`,
            actionConseillee:
              "Vérifier si l'élève rencontre un problème technique ou a besoin d'aide pour démarrer.",
            timestamp: now.toISOString(),
          });
        }
      }
    });

    return alerts;
  }

  // 2. Détection d'après les membres de classe (données de synthèse)
  eleves.forEach((e) => {
    // Si l'élève a des points faibles signalés
    if (e.points_faibles && e.points_faibles.length > 0) {
      e.points_faibles.forEach((pf, idx) => {
        alerts.push({
          id: `alert-pf-${e.eleve_id}-${idx}`,
          eleveId: e.eleve_id,
          nom: e.nom,
          prenom: e.prenom,
          type: "critere_echecs_repetes",
          severite: e.score_formatif && e.score_formatif < 50 ? "critique" : "avertissement",
          critereTitre: pf,
          critereCode: pf,
          consecutiveFailures: 3, // Seuil standard
          description: `Blocage détecté sur le critère "${pf}".`,
          actionConseillee: `Proposer le déblocage de l'indice associé ou une aide méthodologique.`,
          timestamp: now.toISOString(),
        });
      });
    }

    // Détection d'inactivité
    if (e.projet_statut === "en_cours" && e.derniere_activite) {
      const lastAct = new Date(e.derniere_activite).getTime();
      const diffMinutes = Math.floor((now.getTime() - lastAct) / 60000);

      if (diffMinutes >= inactivityThresholdMin) {
        alerts.push({
          id: `alert-inact-${e.eleve_id}`,
          eleveId: e.eleve_id,
          nom: e.nom,
          prenom: e.prenom,
          type: "inactivite_prolongee",
          severite: "inactivite",
          inactivityMinutes: diffMinutes,
          description: `Aucune activité constatée depuis ${diffMinutes} minutes.`,
          actionConseillee: "Solliciter l'élève en TP ou vérifier l'avancement dans l'éditeur.",
          timestamp: now.toISOString(),
        });
      }
    }

    // Décrochage global (score très faible après démarrage)
    if (
      e.projet_statut === "en_cours" &&
      (e.score_formatif ?? 0) < 40 &&
      (e.total_criteres ?? 0) > 0
    ) {
      alerts.push({
        id: `alert-decrochage-${e.eleve_id}`,
        eleveId: e.eleve_id,
        nom: e.nom,
        prenom: e.prenom,
        type: "decrochage_global",
        severite: "critique",
        description: `Score de ${e.score_formatif}% avec ${e.points_faibles?.length || 0} critères non validés.`,
        actionConseillee: "Planifier une remédiation individuelle avec accompagnement pas-à-pas.",
        timestamp: now.toISOString(),
      });
    }
  });

  return alerts;
}

/**
 * Génère des recommandations pédagogiques ciblées pour la classe (PRD F-64)
 */
export function genererRecommandationsPedagogiques(
  alerts: StudentBlockageAlert[],
  stats: ClassStatistics,
): PedagogicalRecommendation[] {
  const recommendations: PedagogicalRecommendation[] = [];

  // 1. Regrouper les blocages par critère / titre pour identifier les difficultés récurrentes
  const commonFailureCriteria: Record<string, string[]> = {};

  alerts
    .filter((a) => a.type === "critere_echecs_repetes")
    .forEach((a) => {
      const crit = a.critereTitre || a.critereCode || "Général";
      if (!commonFailureCriteria[crit]) {
        commonFailureCriteria[crit] = [];
      }
      const fullName = `${a.prenom} ${a.nom}`;
      if (!commonFailureCriteria[crit].includes(fullName)) {
        commonFailureCriteria[crit].push(fullName);
      }
    });

  // Recommandation collective si 2 élèves ou plus butent sur le même critère
  Object.entries(commonFailureCriteria).forEach(([crit, cibles]) => {
    if (cibles.length >= 2) {
      recommendations.push({
        id: `rec-group-${crit.replace(/[^a-zA-Z0-9]/g, "-")}`,
        type: "rappel_cours",
        titre: `Difficulté collective : ${crit}`,
        description: `${cibles.length} élèves rencontrent des blocages répétés sur ce critère (${cibles.join(", ")}). Un rappel méthodologique de 5 minutes ou le déblocage collectif de l'indice 2 est recommandé.`,
        cibles,
        urgence: cibles.length >= 3 ? "haute" : "moyenne",
        critereConcerne: crit,
      });
    }
  });

  // 2. Alertes d'inactivité prolongée
  const inactiveStudents = alerts
    .filter((a) => a.type === "inactivite_prolongee")
    .map((a) => `${a.prenom} ${a.nom}`);

  if (inactiveStudents.length > 0) {
    recommendations.push({
      id: "rec-inactivity",
      type: "intervention_individuelle",
      titre: `Élèves en inactivité prolongée (${inactiveStudents.length})`,
      description: `Les élèves ${inactiveStudents.join(", ")} n'ont pas enregistré de progression récente. Une vérification au poste de travail est préconisée.`,
      cibles: inactiveStudents,
      urgence: inactiveStudents.length >= 2 ? "haute" : "moyenne",
    });
  }

  // 3. Recommandation globale si la moyenne de la classe est élevée
  if (stats.totalEleves > 0 && stats.moyenne20 >= 16) {
    recommendations.push({
      id: "rec-high-perf",
      type: "felicitations",
      titre: "Excellente dynamique de classe",
      description: `Moyenne de classe supérieure à 16/20 (${stats.moyenne20}/20). Vous pouvez proposer un sujet d'approfondissement ou un bonus d'algorithmique.`,
      cibles: ["Ensemble de la classe"],
      urgence: "faible",
    });
  }

  return recommendations;
}
