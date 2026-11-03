/**
 * Labo STI - Moteur de Rejouage de Référence Officiel (PRD §10, F-54, F-55)
 *
 * Exécute une réévaluation reproductible et déterministe d'un snapshot certifié
 * avec les critères de notation versionnés.
 *
 * Moteur unique (TEC-05 / issue #127) : le rejouage évalue la copie exactement comme la
 * vérification formative de l'élève et le banc didactique du Studio (`evaluerCopie` :
 * critères évalués page par page, scripts exécutés, même calcul de note). Une même copie
 * obtient donc le même score dans les trois contextes.
 */

import type { Criterion } from "@/lib/exercises";
import { evaluerCopie, type FabriqueEvaluateur } from "@/lib/evaluation/evaluation-par-page";
import type { FichiersEvaluation } from "@/lib/evaluation/document-evaluation";
import { evaluateurFrame } from "@/lib/evaluation/iframe-evaluation";
import {
  type SnapshotManifeste,
  type GrilleNotationOfficielle,
  type RubriqueCritereNote,
  type ReplayExecutionResult,
} from "./types";
import { verifierIntegriteSnapshot } from "./snapshot-engine";
import { SqliteEngine } from "@/lib/sql/sqlite-engine";

export interface RejouerCorrectionOptions {
  snapshot: SnapshotManifeste;
  fichiers: Record<string, string | Uint8Array>;
  criteres: Criterion[];
  sqlDump?: string | null | undefined;
  baremeTotal?: number; // Par défaut 20 points
  /** Évaluateur de page : frame sandboxée du navigateur par défaut, JSDOM dans les tests. */
  evaluateurPour?: FabriqueEvaluateur;
}

/** Fichiers texte du snapshot, tels qu'évalués côté élève (les binaires sont décodés en UTF-8). */
function fichiersTexteSnapshot(fichiers: Record<string, string | Uint8Array>): FichiersEvaluation {
  const decoder = new TextDecoder();
  return Object.fromEntries(
    Object.entries(fichiers).map(([nom, contenu]) => [
      nom,
      typeof contenu === "string" ? contenu : decoder.decode(contenu),
    ]),
  );
}

/**
 * Exécute une passe d'évaluation complète sur le snapshot
 */
async function executerPasseEvaluation(
  fichiers: Record<string, string | Uint8Array>,
  criteres: Criterion[],
  evaluateurPour: FabriqueEvaluateur,
  sqlDump?: string | null,
  baremeTotal = 20,
): Promise<{
  grille: GrilleNotationOfficielle;
  journal: string[];
}> {
  const journal: string[] = [];
  const fichiersTexte = fichiersTexteSnapshot(fichiers);

  // 1. Évaluation par le moteur unique (mêmes critères, mêmes pages, même calcul que l'élève)
  journal.push(`Exécution de ${criteres.length} critère(s) de référence (moteur unique).`);
  const { resultats, bilan } = await evaluerCopie(
    criteres,
    fichiersTexte,
    evaluateurPour(fichiersTexte),
  );

  // 2. Gestion éventuelle d'une validation SQL
  let sqliteEngine: SqliteEngine | null = null;
  if (sqlDump && sqlDump.trim().length > 0) {
    try {
      sqliteEngine = new SqliteEngine();
      await sqliteEngine.init(sqlDump);
      const tables = await sqliteEngine.getTables();
      journal.push(
        `Base SQLite initialisée avec succès pour le rejouage (${tables.length} table(s)).`,
      );
    } catch (err) {
      journal.push(`Avertissement base SQL lors du rejouage : ${String(err)}`);
    }
  }

  // 3. Construction de la rubrique détaillée (mêmes résultats par critère que l'élève)
  const rubriqueCriteres: RubriqueCritereNote[] = resultats.map((res) => {
    const pointsAuto = res.ok ? res.points : 0;
    const critere = criteres.find((c) => c.id === res.id);
    const code = typeof critere?.raw?.["code"] === "string" ? critere.raw["code"] : res.id;
    return {
      critereId: res.id,
      code: code.toUpperCase(),
      label: res.label,
      pointsMax: res.points,
      pointsAuto,
      pointsAjustes: pointsAuto, // Par défaut égal aux points auto
      valide: res.ok,
      message: res.message,
    };
  });

  const totalPointsMax = bilan.total;
  const totalPointsAuto = bilan.got;
  // Même note que l'élève (`score`) si baremeTotal === 20, sinon mise à l'échelle
  const noteAuto20 =
    baremeTotal === 20
      ? bilan.note20
      : totalPointsMax > 0
        ? Math.round((totalPointsAuto / totalPointsMax) * baremeTotal * 10) / 10
        : 0;

  const grille: GrilleNotationOfficielle = {
    criteres: rubriqueCriteres,
    totalPointsMax,
    totalPointsAuto,
    totalPointsAjustes: totalPointsAuto,
    noteAuto20,
    noteFinale20: noteAuto20,
  };

  return { grille, journal };
}

/**
 * Rejoue la correction de référence sur un snapshot scellé
 * Effectue un double passage pour attester de la stricte reproductibilité dans le temps.
 */
export async function rejouerCorrectionReference(
  options: RejouerCorrectionOptions,
): Promise<ReplayExecutionResult> {
  const debut = performance.now();
  const journalComplet: string[] = [];

  // 1. Vérification de l'intégrité cryptographique SHA-256
  journalComplet.push("Vérification du sceau cryptographique SHA-256 du snapshot...");
  const integ = await verifierIntegriteSnapshot(
    options.snapshot,
    options.fichiers,
    options.sqlDump,
  );

  if (!integ.valide) {
    journalComplet.push(
      `ALERTE INTÉGRITÉ : Sceau invalide ou altération détectée (${integ.erreurs.join(" ; ")})`,
    );
  } else {
    journalComplet.push(
      `Sceau cryptographique certifié conforme (SHA-256: ${options.snapshot.rootHash}).`,
    );
  }

  const evaluateurPour = options.evaluateurPour ?? evaluateurFrame;

  // 2. Première passe d'évaluation
  const passe1 = await executerPasseEvaluation(
    options.fichiers,
    options.criteres,
    evaluateurPour,
    options.sqlDump,
    options.baremeTotal ?? 20,
  );
  journalComplet.push(...passe1.journal);

  // 3. Seconde passe pour attester du déterminisme absolu (rejouabilité reproductible)
  const passe2 = await executerPasseEvaluation(
    options.fichiers,
    options.criteres,
    evaluateurPour,
    options.sqlDump,
    options.baremeTotal ?? 20,
  );

  const reproductible =
    passe1.grille.noteAuto20 === passe2.grille.noteAuto20 &&
    passe1.grille.totalPointsAuto === passe2.grille.totalPointsAuto &&
    passe1.grille.criteres.every(
      (c, i) =>
        c.valide === passe2.grille.criteres[i]?.valide &&
        c.pointsAuto === passe2.grille.criteres[i]?.pointsAuto,
    );

  if (reproductible) {
    journalComplet.push("Déterminisme vérifié : Rejouages successifs 100% identiques.");
  } else {
    journalComplet.push(
      "ALERTE REPRODUCTIBILITÉ : Divergence observée entre deux exécutions consécutives.",
    );
  }

  const dureeMs = Math.round(performance.now() - debut);

  return {
    snapshotId: options.snapshot.projetId,
    rootHash: options.snapshot.rootHash,
    grille: passe1.grille,
    reproductible,
    dureeMs,
    rejoueLe: new Date().toISOString(),
    journal: journalComplet,
  };
}
