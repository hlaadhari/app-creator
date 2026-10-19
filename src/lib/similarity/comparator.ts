/**
 * Comparateur de Copies d'Examen Multi-Fichiers (PRD Section 16, F-65)
 *
 * Compare deux copies d'élèves fichier par fichier et calcule l'indice global de similarité.
 * Fournit l'analyse matricielle croisée pour l'ensemble d'une classe.
 */

import { tokeniserCode } from "./normalizer";
import { calculerScoreSimilariteTokens } from "./shingling";
import type {
  StudentCopyData,
  SimilarityPairResult,
  SimilarityMatrixResult,
  FileSimilarityDetail,
  SimilaritySeverity,
} from "./types";

/**
 * Détermine l'extension d'un chemin de fichier
 */
function extraireExtension(chemin: string): string {
  const parts = chemin.split(".");
  return parts.length > 1 ? (parts[parts.length - 1] ?? "txt") : "txt";
}

/**
 * Compare deux copies complètes multi-fichiers
 */
export function comparerDeuxCopies(
  copyA: StudentCopyData,
  copyB: StudentCopyData,
  seuilAlerte: number = 80,
): SimilarityPairResult {
  const pairId = `${copyA.eleveId}_${copyB.eleveId}`;

  // Récupérer la liste unifiée des chemins de fichiers présents dans au moins l'une des deux copies
  const allPaths = Array.from(
    new Set([...copyA.fichiers.map((f) => f.chemin), ...copyB.fichiers.map((f) => f.chemin)]),
  );

  const fileDetails: FileSimilarityDetail[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const chemin of allPaths) {
    const fileA = copyA.fichiers.find((f) => f.chemin === chemin);
    const fileB = copyB.fichiers.find((f) => f.chemin === chemin);
    const ext = extraireExtension(chemin);

    if (fileA && fileB) {
      const tokensA = tokeniserCode(fileA.contenu, ext);
      const tokensB = tokeniserCode(fileB.contenu, ext);

      const sim = calculerScoreSimilariteTokens(tokensA, tokensB);

      // Poids basé sur le nombre moyen de tokens du fichier
      const weight = Math.max(1, (tokensA.length + tokensB.length) / 2);

      fileDetails.push({
        chemin,
        similarity: sim.score,
        matchingTokensCount: sim.commonTokensCount,
        totalTokensA: tokensA.length,
        totalTokensB: tokensB.length,
        suspectSegmentsCount: sim.score >= seuilAlerte ? 1 : 0,
      });

      totalWeightedScore += sim.score * weight;
      totalWeight += weight;
    } else if (fileA || fileB) {
      // Fichier présent chez l'un mais absent chez l'autre -> 0% de similarité
      const presentFile = (fileA || fileB)!;
      const tokens = tokeniserCode(presentFile.contenu, ext);
      const weight = Math.max(1, tokens.length / 2);

      fileDetails.push({
        chemin,
        similarity: 0,
        matchingTokensCount: 0,
        totalTokensA: fileA ? tokens.length : 0,
        totalTokensB: fileB ? tokens.length : 0,
        suspectSegmentsCount: 0,
      });

      totalWeight += weight;
    }
  }

  const overallSimilarity =
    totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 10) / 10 : 0;

  let severity: SimilaritySeverity = "normal";
  if (overallSimilarity >= 85) {
    severity = "plagiat_probable";
  } else if (overallSimilarity >= seuilAlerte || overallSimilarity >= 70) {
    severity = "suspect";
  }

  return {
    id: pairId,
    studentA: {
      id: copyA.eleveId,
      nom: copyA.nom,
      prenom: copyA.prenom,
    },
    studentB: {
      id: copyB.eleveId,
      nom: copyB.nom,
      prenom: copyB.prenom,
    },
    overallSimilarity,
    severity,
    fileDetails,
    verdictProf: "en_attente",
  };
}

/**
 * Analyse matricielle croisée de toutes les copies d'une classe (N * (N-1) / 2 paires)
 */
export function analyserSimilariteClasse(
  copies: StudentCopyData[],
  seuilAlerte: number = 80,
  context?: { classId?: string | undefined; sujetId?: string | undefined },
): SimilarityMatrixResult {
  const n = copies.length;
  const pairs: SimilarityPairResult[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const copyA = copies[i];
      const copyB = copies[j];
      if (copyA && copyB) {
        const pairResult = comparerDeuxCopies(copyA, copyB, seuilAlerte);
        pairs.push(pairResult);
      }
    }
  }

  // Trier les paires de la plus similaire à la moins similaire
  pairs.sort((a, b) => b.overallSimilarity - a.overallSimilarity);

  return {
    classId: context?.classId,
    sujetId: context?.sujetId,
    totalCopies: n,
    totalPaires: pairs.length,
    pairs,
    analyzedAt: new Date().toISOString(),
    seuilAlerte,
  };
}
