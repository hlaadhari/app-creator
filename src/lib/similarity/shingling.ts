/**
 * Algorithmes de Comparaison de Tokens : Shingling n-grammes, Jaccard et LCS (PRD Section 16, F-65)
 */
import { tokeniserCode } from "./normalizer";

/**
 * Génère des k-shingles (n-grammes de tokens consécutifs)
 */
export function genererShingles(tokens: string[], k: number = 3): Set<string> {
  const shingles = new Set<string>();
  if (tokens.length < k) {
    if (tokens.length > 0) {
      shingles.add(tokens.join("_"));
    }
    return shingles;
  }

  for (let i = 0; i <= tokens.length - k; i++) {
    const shingle = tokens.slice(i, i + k).join("_");
    shingles.add(shingle);
  }

  return shingles;
}

/**
 * Calcule le coefficient de similarité de Jaccard entre deux ensembles de shingles :
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
export function calculerSimilariteJaccard(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0.0 : intersectionCount / unionCount;
}

/**
 * Calcule la plus longue sous-séquence commune (LCS) entre deux séquences de tokens
 */
export function calculerLcsRatio(tokensA: string[], tokensB: string[]): number {
  const m = tokensA.length;
  const n = tokensB.length;

  if (m === 0 && n === 0) return 1.0;
  if (m === 0 || n === 0) return 0.0;

  // Optimisation mémoire : utilisation de 2 lignes seulement pour la DP
  let previousRow = new Array<number>(n + 1).fill(0);
  const currentRow = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    const tokenA = tokensA[i - 1];
    for (let j = 1; j <= n; j++) {
      if (tokenA === tokensB[j - 1]) {
        currentRow[j] = (previousRow[j - 1] ?? 0) + 1;
      } else {
        currentRow[j] = Math.max(previousRow[j] ?? 0, currentRow[j - 1] ?? 0);
      }
    }
    // Permutation
    previousRow = [...currentRow];
  }

  const lcsLength = currentRow[n] ?? 0;
  return (2 * lcsLength) / (m + n);
}

/**
 * Calcule l'indice composite de similarité entre deux listes de tokens (0 à 100%)
 * Combine le coefficient de Jaccard sur 3-grammes (60%) et le ratio LCS (40%).
 */
export function calculerScoreSimilariteTokens(
  tokensA: string[],
  tokensB: string[],
  k: number = 3,
): {
  score: number;
  jaccard: number;
  lcs: number;
  commonTokensCount: number;
} {
  if (tokensA.length === 0 && tokensB.length === 0) {
    return { score: 100, jaccard: 1.0, lcs: 1.0, commonTokensCount: 0 };
  }
  if (tokensA.length === 0 || tokensB.length === 0) {
    return { score: 0, jaccard: 0.0, lcs: 0.0, commonTokensCount: 0 };
  }

  // Identité exacte
  if (tokensA.length === tokensB.length && tokensA.every((t, i) => t === tokensB[i])) {
    return { score: 100, jaccard: 1.0, lcs: 1.0, commonTokensCount: tokensA.length };
  }

  const shinglesA = genererShingles(tokensA, k);
  const shinglesB = genererShingles(tokensB, k);

  const jaccard = calculerSimilariteJaccard(shinglesA, shinglesB);
  const lcs = calculerLcsRatio(tokensA, tokensB);

  // Score pondéré (60% Jaccard shingling, 40% ordonnancement LCS)
  const compositeScore = jaccard * 0.6 + lcs * 0.4;
  const scorePourcentage = Math.round(compositeScore * 1000) / 10; // Arrondi à 1 décimale

  // Estimation du nombre de tokens communs
  let commonCount = 0;
  const countsB = new Map<string, number>();
  tokensB.forEach((t) => countsB.set(t, (countsB.get(t) || 0) + 1));

  tokensA.forEach((t) => {
    const c = countsB.get(t) || 0;
    if (c > 0) {
      commonCount++;
      countsB.set(t, c - 1);
    }
  });

  return {
    score: scorePourcentage,
    jaccard: Math.round(jaccard * 100) / 100,
    lcs: Math.round(lcs * 100) / 100,
    commonTokensCount: commonCount,
  };
}

/**
 * Compare directement deux chaînes de texte de code selon leur extension
 */
export function calculerSimilariteTexte(
  codeA: string,
  codeB: string,
  extension: string = "js",
  k: number = 3,
): {
  similarity: number;
  jaccard: number;
  lcs: number;
  suspectSegmentsCount: number;
} {
  const tokensA = tokeniserCode(codeA, extension);
  const tokensB = tokeniserCode(codeB, extension);
  const res = calculerScoreSimilariteTokens(tokensA, tokensB, k);
  return {
    similarity: res.score,
    jaccard: res.jaccard,
    lcs: res.lcs,
    suspectSegmentsCount: res.score >= 80 ? 1 : 0,
  };
}
