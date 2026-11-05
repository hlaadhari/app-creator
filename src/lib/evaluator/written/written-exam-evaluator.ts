/**
 * Labo STI - Évaluateur et Schéma pour Épreuves Écrites Théoriques (Bac STI)
 * PRD §8, §10, Issue #165 & #163.
 *
 * Supporte :
 * - QCM concepts théoriques (choix unique ou multiple)
 * - Modélisation & DDL (schémas relationnels, clés primaires/étrangères, contraintes)
 * - Console SQL interactive (exécute sur moteur relationnel, valide SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER)
 * - Analyse de Code (HTML5/CSS3/JS/PHP : prédiction, débogage, complétion)
 * - Bilan sur 20 points
 */

import { RelationalDatabaseEngine } from "@/lib/sql/relational-engine";
import { SqliteEngine } from "@/lib/sql/sqlite-engine";

export type WrittenSectionType = "qcm" | "modeling" | "sql" | "code_analysis";

export interface WrittenQcmOption {
  id: string;
  label: string;
}

export interface WrittenQcmQuestion {
  id: string;
  question: string;
  options: string[] | WrittenQcmOption[];
  points: number;
  multiple?: boolean;
  correctAnswers: (number | string)[];
  explanation?: string;
}

export interface WrittenModelingQuestion {
  id: string;
  prompt: string;
  points: number;
  type: "representation" | "ddl" | "text";
  initialSql?: string;
  expectedDdl?: string;
  expectedKeywords?: string[];
  expectedPattern?: string;
  forbiddenKeywords?: string[];
  explanation?: string;
}

export interface WrittenSqlQuestion {
  id: string;
  prompt: string;
  points: number;
  type: "query" | "ddl" | "dml";
  initialSql?: string;
  expectedQuery?: string;
  expectedOutput?: Record<string, unknown>[];
  expectedTableRows?: {
    table: string;
    where?: Record<string, unknown>;
    minCount?: number;
    maxCount?: number;
    exactCount?: number;
  };
  verificationSql?: string;
  explanation?: string;
}

export interface WrittenCodeAnalysisQuestion {
  id: string;
  prompt: string;
  codeSnippet?: string;
  language?: "html" | "css" | "javascript" | "php";
  points: number;
  expectedAnswer?: string;
  expectedRegex?: string;
  keywords?: string[];
  forbiddenKeywords?: string[];
  explanation?: string;
}

export type WrittenQuestion =
  | ({ sectionType: "qcm" } & WrittenQcmQuestion)
  | ({ sectionType: "modeling" } & WrittenModelingQuestion)
  | ({ sectionType: "sql" } & WrittenSqlQuestion)
  | ({ sectionType: "code_analysis" } & WrittenCodeAnalysisQuestion);

export interface WrittenExamSection {
  id: string;
  title: string;
  type: WrittenSectionType;
  description?: string;
  points?: number;
  questions: (
    WrittenQcmQuestion | WrittenModelingQuestion | WrittenSqlQuestion | WrittenCodeAnalysisQuestion
  )[];
}

export interface WrittenExamManifest {
  id: string;
  title: string;
  exam_type: "written" | "theoretical";
  session_type?: "principale" | "controle" | "blanc";
  year?: number;
  duration: number; // en minutes
  exam_mode: boolean;
  bareme_total: number;
  initialSql?: string;
  category?: string;
  level?: string;
  tags?: string[];
  sections: WrittenExamSection[];
}

export interface WrittenItemResult {
  questionId: string;
  sectionId: string;
  pointsEarned: number;
  pointsMax: number;
  isCorrect: boolean;
  feedback: string;
  studentAnswer: unknown;
  expectedSummary?: string;
}

export interface WrittenSectionResult {
  sectionId: string;
  title: string;
  type: WrittenSectionType;
  pointsEarned: number;
  pointsMax: number;
  items: WrittenItemResult[];
}

export interface WrittenExamEvaluationResult {
  examId: string;
  totalScore: number;
  baremeTotal: number;
  percentage: number;
  passed: boolean; // >= 10/20
  sections: WrittenSectionResult[];
}

/**
 * Normalise une chaîne pour comparaison souple (espaces multiples, casse)
 */
export function normaliserTexte(txt: string): string {
  return txt
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[;,\s]+$/, "");
}

/**
 * Normalise une ligne de résultat SQL en extrayant les noms de colonnes projetées
 * sans préfixe de table interne (ex: "j.codejeu" -> "codejeu").
 */
export function normaliserLigneSql(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const bareKey = k.includes(".") ? k.split(".").pop()!.toLowerCase() : k.toLowerCase();
    if (!(bareKey in normalized)) {
      normalized[bareKey] = v;
    }
  }
  return normalized;
}

/**
 * Compare deux listes d'enregistrements indépendamment de l'ordre des colonnes ou lignes
 */
export function comparerLignesResultats(
  actual: Record<string, unknown>[],
  expected: Record<string, unknown>[],
): boolean {
  if (actual.length !== expected.length) return false;
  if (actual.length === 0) return true;

  const actualNorm = actual.map(normaliserLigneSql);
  const expectedNorm = expected.map(normaliserLigneSql);

  // Comparaison par valeur pour chaque ligne
  const actualSorted = [...actualNorm].sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b)),
  );
  const expectedSorted = [...expectedNorm].sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b)),
  );

  for (let i = 0; i < actualSorted.length; i++) {
    const rowAct = actualSorted[i]!;
    const rowExp = expectedSorted[i]!;

    const keysAct = Object.keys(rowAct).sort();
    const keysExp = Object.keys(rowExp).sort();

    if (keysAct.length !== keysExp.length) return false;

    for (const k of keysExp) {
      if (!(k in rowAct)) return false;
      if (String(rowAct[k]) !== String(rowExp[k])) return false;
    }
  }

  return true;
}

/**
 * Évalue une question QCM
 */
export function evaluerQcm(
  question: WrittenQcmQuestion,
  reponse: unknown,
  sectionId: string,
): WrittenItemResult {
  const pointsMax = question.points;
  if (reponse === undefined || reponse === null || reponse === "") {
    return {
      questionId: question.id,
      sectionId,
      pointsEarned: 0,
      pointsMax,
      isCorrect: false,
      feedback: "Aucune réponse fournie.",
      studentAnswer: reponse,
    };
  }

  const attendus = question.correctAnswers.map((a) => String(a).trim().toLowerCase());

  if (question.multiple) {
    const repArr = Array.isArray(reponse)
      ? reponse.map((a) => String(a).trim().toLowerCase())
      : [String(reponse).trim().toLowerCase()];

    // Choix multiples : concordance exacte des sélections
    const tousPresents = attendus.every((a) => repArr.includes(a));
    const aucunIntrus = repArr.every((r) => attendus.includes(r));
    const correct = tousPresents && aucunIntrus;

    return {
      questionId: question.id,
      sectionId,
      pointsEarned: correct ? pointsMax : 0,
      pointsMax,
      isCorrect: correct,
      feedback: correct
        ? "Réponse exacte."
        : `Réponse incorrecte.${question.explanation ? ` ${question.explanation}` : ""}`,
      studentAnswer: reponse,
    };
  } else {
    const repStr = String(reponse).trim().toLowerCase();
    const correct = attendus.includes(repStr);

    return {
      questionId: question.id,
      sectionId,
      pointsEarned: correct ? pointsMax : 0,
      pointsMax,
      isCorrect: correct,
      feedback: correct
        ? "Bonne réponse."
        : `Réponse incorrecte.${question.explanation ? ` ${question.explanation}` : ""}`,
      studentAnswer: reponse,
    };
  }
}

/**
 * Évalue une question de modélisation / DDL
 */
export function evaluerModeling(
  question: WrittenModelingQuestion,
  reponse: unknown,
  sectionId: string,
  engine?: RelationalDatabaseEngine,
): WrittenItemResult {
  const pointsMax = question.points;
  const repStr = typeof reponse === "string" ? reponse.trim() : "";

  if (!repStr) {
    return {
      questionId: question.id,
      sectionId,
      pointsEarned: 0,
      pointsMax,
      isCorrect: false,
      feedback: "Aucune réponse saisie.",
      studentAnswer: reponse,
    };
  }

  // Si c'est du DDL, essayer d'exécuter la commande
  if (question.type === "ddl") {
    try {
      const ddlEngine = engine ?? new RelationalDatabaseEngine();
      if (!engine && question.initialSql) {
        ddlEngine.executeScript(question.initialSql);
      }
      const execRes = ddlEngine.executeScript(repStr);
      if (!execRes.success || execRes.errors.length > 0) {
        return {
          questionId: question.id,
          sectionId,
          pointsEarned: 0,
          pointsMax,
          isCorrect: false,
          feedback: `Erreur d'exécution SQL DDL : ${execRes.errors[0] || ddlEngine.getLastError()}`,
          studentAnswer: reponse,
        };
      }
    } catch (err) {
      return {
        questionId: question.id,
        sectionId,
        pointsEarned: 0,
        pointsMax,
        isCorrect: false,
        feedback: `Erreur DDL : ${err instanceof Error ? err.message : String(err)}`,
        studentAnswer: reponse,
      };
    }
  }

  // Vérification de mots-clés obligatoires
  if (question.expectedKeywords && question.expectedKeywords.length > 0) {
    const manque = question.expectedKeywords.find((kw) => !new RegExp(kw, "i").test(repStr));
    if (manque) {
      return {
        questionId: question.id,
        sectionId,
        pointsEarned: 0,
        pointsMax,
        isCorrect: false,
        feedback: `Mot-clé ou clause attendue manquante : "${manque}".`,
        studentAnswer: reponse,
      };
    }
  }

  // Vérification de mots-clés interdits
  if (question.forbiddenKeywords && question.forbiddenKeywords.length > 0) {
    const interdit = question.forbiddenKeywords.find((kw) => new RegExp(kw, "i").test(repStr));
    if (interdit) {
      return {
        questionId: question.id,
        sectionId,
        pointsEarned: 0,
        pointsMax,
        isCorrect: false,
        feedback: `Syntaxe non permise détectée : "${interdit}".`,
        studentAnswer: reponse,
      };
    }
  }

  // Vérification de pattern regex
  if (question.expectedPattern) {
    const re = new RegExp(question.expectedPattern, "i");
    if (!re.test(repStr)) {
      return {
        questionId: question.id,
        sectionId,
        pointsEarned: 0,
        pointsMax,
        isCorrect: false,
        feedback: `La structure de la réponse ne respecte pas le modèle attendu.`,
        studentAnswer: reponse,
      };
    }
  }

  return {
    questionId: question.id,
    sectionId,
    pointsEarned: pointsMax,
    pointsMax,
    isCorrect: true,
    feedback: "Modélisation conforme.",
    studentAnswer: reponse,
  };
}

/**
 * Évalue une question SQL
 */
export function evaluerSql(
  question: WrittenSqlQuestion,
  reponse: unknown,
  sectionId: string,
  initialSql: string = "",
): WrittenItemResult {
  const pointsMax = question.points;
  const sqlQuery = typeof reponse === "string" ? reponse.trim() : "";

  if (!sqlQuery) {
    return {
      questionId: question.id,
      sectionId,
      pointsEarned: 0,
      pointsMax,
      isCorrect: false,
      feedback: "Aucune requête SQL rédigée.",
      studentAnswer: reponse,
    };
  }

  const engine = new RelationalDatabaseEngine();
  const baseSql = (question.initialSql || initialSql).trim();
  if (baseSql) {
    const initRes = engine.executeScript(baseSql);
    if (!initRes.success || initRes.errors.length > 0) {
      return {
        questionId: question.id,
        sectionId,
        pointsEarned: 0,
        pointsMax,
        isCorrect: false,
        feedback: `Erreur d'initialisation de la base : ${initRes.errors[0] || engine.getLastError()}`,
        studentAnswer: reponse,
      };
    }
  }

  if (question.type === "query") {
    // Exécution de la requête de l'élève
    const res = engine.query(sqlQuery);
    if (res.error) {
      return {
        questionId: question.id,
        sectionId,
        pointsEarned: 0,
        pointsMax,
        isCorrect: false,
        feedback: `Erreur SQL : ${res.error}`,
        studentAnswer: reponse,
      };
    }

    // Si on a un résultat attendu statique
    if (question.expectedOutput) {
      const match = comparerLignesResultats(res.rows, question.expectedOutput);
      if (!match) {
        return {
          questionId: question.id,
          sectionId,
          pointsEarned: 0,
          pointsMax,
          isCorrect: false,
          feedback: `Le résultat retourné (${res.rows.length} ligne(s)) ne correspond pas au jeu attendu.`,
          studentAnswer: reponse,
        };
      }
    } else if (question.expectedQuery) {
      // Exécution de la requête officielle de référence sur un moteur miroir
      const refEngine = new RelationalDatabaseEngine();
      if (baseSql) refEngine.executeScript(baseSql);
      const refRes = refEngine.query(question.expectedQuery);
      if (refRes.error) {
        return {
          questionId: question.id,
          sectionId,
          pointsEarned: 0,
          pointsMax,
          isCorrect: false,
          feedback: `Erreur dans la requête de référence du sujet : ${refRes.error}`,
          studentAnswer: reponse,
        };
      }
      const match = comparerLignesResultats(res.rows, refRes.rows);
      if (!match) {
        return {
          questionId: question.id,
          sectionId,
          pointsEarned: 0,
          pointsMax,
          isCorrect: false,
          feedback: `La requête ne produit pas les données attendues (${res.rows.length} ligne(s) retournée(s)).`,
          studentAnswer: reponse,
        };
      }
    }
  } else {
    // DDL ou DML (INSERT, UPDATE, DELETE, CREATE, ALTER)
    try {
      const exec = engine.executeScript(sqlQuery);
      if (!exec.success || exec.errors.length > 0) {
        return {
          questionId: question.id,
          sectionId,
          pointsEarned: 0,
          pointsMax,
          isCorrect: false,
          feedback: `Erreur d'exécution de la requête DDL/DML : ${exec.errors[0] || engine.getLastError()}`,
          studentAnswer: reponse,
        };
      }
    } catch (err) {
      return {
        questionId: question.id,
        sectionId,
        pointsEarned: 0,
        pointsMax,
        isCorrect: false,
        feedback: `Erreur d'exécution : ${err instanceof Error ? err.message : String(err)}`,
        studentAnswer: reponse,
      };
    }

    // Vérification de l'état des tables
    if (question.expectedTableRows) {
      const exp = question.expectedTableRows;
      const rows = engine.getTableRows(exp.table);
      if (exp.minCount !== undefined && rows.length < exp.minCount) {
        return {
          questionId: question.id,
          sectionId,
          pointsEarned: 0,
          pointsMax,
          isCorrect: false,
          feedback: `La table '${exp.table}' contient ${rows.length} ligne(s), attendu au moins ${exp.minCount}.`,
          studentAnswer: reponse,
        };
      }
      if (exp.maxCount !== undefined && rows.length > exp.maxCount) {
        return {
          questionId: question.id,
          sectionId,
          pointsEarned: 0,
          pointsMax,
          isCorrect: false,
          feedback: `La table '${exp.table}' contient ${rows.length} ligne(s), attendu au plus ${exp.maxCount}.`,
          studentAnswer: reponse,
        };
      }
      if (exp.exactCount !== undefined && rows.length !== exp.exactCount) {
        return {
          questionId: question.id,
          sectionId,
          pointsEarned: 0,
          pointsMax,
          isCorrect: false,
          feedback: `La table '${exp.table}' contient ${rows.length} ligne(s), attendu exactement ${exp.exactCount}.`,
          studentAnswer: reponse,
        };
      }
      if (exp.where) {
        const match = rows.some((r) =>
          Object.entries(exp.where!).every(([k, v]) => {
            const actualKey =
              Object.keys(r).find((rk) => rk.toLowerCase() === k.toLowerCase()) ?? k;
            return String(r[actualKey]) === String(v);
          }),
        );
        if (!match) {
          return {
            questionId: question.id,
            sectionId,
            pointsEarned: 0,
            pointsMax,
            isCorrect: false,
            feedback: `L'opération n'a pas produit les modifications attendues dans la table '${exp.table}'.`,
            studentAnswer: reponse,
          };
        }
      }
    }

    // Exécution d'une requête de contrôle personnalisée si spécifiée
    if (question.verificationSql) {
      const verifRes = engine.query(question.verificationSql);
      if (verifRes.error) {
        return {
          questionId: question.id,
          sectionId,
          pointsEarned: 0,
          pointsMax,
          isCorrect: false,
          feedback: `Erreur lors de la vérification SQL : ${verifRes.error}`,
          studentAnswer: reponse,
        };
      }
    }
  }

  return {
    questionId: question.id,
    sectionId,
    pointsEarned: pointsMax,
    pointsMax,
    isCorrect: true,
    feedback: "Requête SQL valide et vérifiée avec succès.",
    studentAnswer: reponse,
  };
}

/**
 * Évalue une question d'analyse de code (Web / Algorithmique)
 */
export function evaluerCodeAnalysis(
  question: WrittenCodeAnalysisQuestion,
  reponse: unknown,
  sectionId: string,
): WrittenItemResult {
  const pointsMax = question.points;
  const repStr = typeof reponse === "string" ? reponse.trim() : "";

  if (!repStr) {
    return {
      questionId: question.id,
      sectionId,
      pointsEarned: 0,
      pointsMax,
      isCorrect: false,
      feedback: "Aucune réponse saisie.",
      studentAnswer: reponse,
    };
  }

  // Vérification exacte normalisée
  if (question.expectedAnswer) {
    if (normaliserTexte(repStr) === normaliserTexte(question.expectedAnswer)) {
      return {
        questionId: question.id,
        sectionId,
        pointsEarned: pointsMax,
        pointsMax,
        isCorrect: true,
        feedback: "Réponse exacte.",
        studentAnswer: reponse,
      };
    }
  }

  // Vérification par expression régulière
  if (question.expectedRegex) {
    const re = new RegExp(question.expectedRegex, "i");
    if (!re.test(repStr)) {
      return {
        questionId: question.id,
        sectionId,
        pointsEarned: 0,
        pointsMax,
        isCorrect: false,
        feedback: `Réponse non conforme aux attentes.${question.explanation ? ` ${question.explanation}` : ""}`,
        studentAnswer: reponse,
      };
    }
  }

  // Mots-clés obligatoires
  if (question.keywords && question.keywords.length > 0) {
    const manque = question.keywords.find((kw) => !new RegExp(kw, "i").test(repStr));
    if (manque) {
      return {
        questionId: question.id,
        sectionId,
        pointsEarned: 0,
        pointsMax,
        isCorrect: false,
        feedback: `Élément ou mot-clé manquant : "${manque}".`,
        studentAnswer: reponse,
      };
    }
  }

  // Mots-clés interdits
  if (question.forbiddenKeywords && question.forbiddenKeywords.length > 0) {
    const interdit = question.forbiddenKeywords.find((kw) => new RegExp(kw, "i").test(repStr));
    if (interdit) {
      return {
        questionId: question.id,
        sectionId,
        pointsEarned: 0,
        pointsMax,
        isCorrect: false,
        feedback: `Élément non autorisé détecté : "${interdit}".`,
        studentAnswer: reponse,
      };
    }
  }

  return {
    questionId: question.id,
    sectionId,
    pointsEarned: pointsMax,
    pointsMax,
    isCorrect: true,
    feedback: "Analyse de code exacte et validée.",
    studentAnswer: reponse,
  };
}

/**
 * Évalue une copie complète d'épreuve écrite théorique
 */
export async function evaluerCopieEcrite(
  manifest: WrittenExamManifest,
  reponses: Record<string, unknown>,
  initSqlOverride?: string,
): Promise<WrittenExamEvaluationResult> {
  const sectionsResults: WrittenSectionResult[] = [];
  let totalPointsEarned = 0;
  let totalPointsMax = 0;

  const baseSql = initSqlOverride ?? manifest.initialSql;

  // Création du moteur pour l'ensemble des validations SQL si un schéma de base existe
  const sharedEngine = new RelationalDatabaseEngine();
  if (baseSql) {
    sharedEngine.executeScript(baseSql);
  }

  for (const section of manifest.sections) {
    const itemResults: WrittenItemResult[] = [];
    let sectionPointsEarned = 0;
    let sectionPointsMax = 0;

    for (const q of section.questions) {
      const ans = reponses[q.id];
      let itemRes: WrittenItemResult;

      switch (section.type) {
        case "qcm":
          itemRes = evaluerQcm(q as WrittenQcmQuestion, ans, section.id);
          break;
        case "modeling":
          itemRes = evaluerModeling(q as WrittenModelingQuestion, ans, section.id, sharedEngine);
          break;
        case "sql":
          itemRes = evaluerSql(q as WrittenSqlQuestion, ans, section.id, baseSql || "");
          break;
        case "code_analysis":
          itemRes = evaluerCodeAnalysis(q as WrittenCodeAnalysisQuestion, ans, section.id);
          break;
        default:
          itemRes = {
            questionId: q.id,
            sectionId: section.id,
            pointsEarned: 0,
            pointsMax: q.points,
            isCorrect: false,
            feedback: "Type de section non supporté.",
            studentAnswer: ans,
          };
      }

      itemResults.push(itemRes);
      sectionPointsEarned += itemRes.pointsEarned;
      sectionPointsMax += itemRes.pointsMax;
    }

    sectionsResults.push({
      sectionId: section.id,
      title: section.title,
      type: section.type,
      pointsEarned: sectionPointsEarned,
      pointsMax: sectionPointsMax,
      items: itemResults,
    });

    totalPointsEarned += sectionPointsEarned;
    totalPointsMax += sectionPointsMax;
  }

  // Normalisation sur baremeTotal si nécessaire (par défaut 20 pts)
  const baremeTotal = manifest.bareme_total || 20;
  const noteFinale = totalPointsMax > 0 ? (totalPointsEarned / totalPointsMax) * baremeTotal : 0;
  const noteArrondie = Math.round(noteFinale * 100) / 100;

  return {
    examId: manifest.id,
    totalScore: noteArrondie,
    baremeTotal,
    percentage: totalPointsMax > 0 ? Math.round((totalPointsEarned / totalPointsMax) * 100) : 0,
    passed: noteArrondie >= baremeTotal / 2,
    sections: sectionsResults,
  };
}
