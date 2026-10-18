/**
 * Labo STI - Moteur de Rejouage de Référence Officiel (PRD §10, F-54, F-55)
 *
 * Exécute une réévaluation reproductible et déterministe d'un snapshot certifié
 * avec les critères de notation versionnés.
 */

import {
  type CriterionDefinition,
  evaluateCriteria,
} from "@/lib/evaluation/probe-runner";
import {
  type SnapshotManifeste,
  type GrilleNotationOfficielle,
  type RubriqueCritereNote,
  type ReplayExecutionResult,
} from "./types";
import { verifierIntegriteSnapshot } from "./snapshot-engine";
import { SQLiteEngine } from "@/lib/sql/sqlite-engine";

export interface RejouerCorrectionOptions {
  snapshot: SnapshotManifeste;
  fichiers: Record<string, string | Uint8Array>;
  criteres: CriterionDefinition[];
  sqlDump?: string | null;
  baremeTotal?: number; // Par défaut 20 points
}

/**
 * Crée un environnement DOM synthétique à partir des fichiers HTML et CSS du snapshot
 */
function preparerDocumentSnapshot(
  fichiers: Record<string, string | Uint8Array>
): { doc: Document; win: Window } {
  // Recherche du fichier HTML principal (ex: index.html, location.html, Don.html ou premier .html)
  const chemHtml =
    Object.keys(fichiers).find((k) => k.toLowerCase() === "index.html") ||
    Object.keys(fichiers).find((k) => k.toLowerCase().endsWith(".html")) ||
    "index.html";

  const contenuHtmlBrut = fichiers[chemHtml] || "<html><head></head><body></body></html>";
  const decoder = new TextDecoder();
  const htmlStr =
    typeof contenuHtmlBrut === "string" ? contenuHtmlBrut : decoder.decode(contenuHtmlBrut);

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlStr, "text/html");

  // Injection des feuilles de style CSS locales
  for (const [nom, contenu] of Object.entries(fichiers)) {
    if (nom.toLowerCase().endsWith(".css")) {
      const cssStr = typeof contenu === "string" ? contenu : decoder.decode(contenu);
      const styleEl = doc.createElement("style");
      styleEl.setAttribute("data-source", nom);
      styleEl.textContent = cssStr;
      doc.head.appendChild(styleEl);
    }
  }

  // Window mock pour les styles calculés si non présent
  const win = (doc.defaultView || globalThis.window || {
    getComputedStyle: (el: Element) => {
      const inline = (el as HTMLElement).style;
      return {
        getPropertyValue: (prop: string) => inline?.getPropertyValue(prop) || "",
      };
    },
  }) as unknown as Window;

  return { doc, win };
}

/**
 * Exécute une passe d'évaluation complète sur le snapshot
 */
async function executerPasseEvaluation(
  fichiers: Record<string, string | Uint8Array>,
  criteres: CriterionDefinition[],
  sqlDump?: string | null,
  baremeTotal = 20
): Promise<{
  grille: GrilleNotationOfficielle;
  journal: string[];
}> {
  const journal: string[] = [];
  const { doc, win } = preparerDocumentSnapshot(fichiers);

  // 1. Évaluation des sondes DOM, CSS et JS
  journal.push(`Exécution de ${criteres.length} critère(s) de référence sur le DOM.`);
  const summary = evaluateCriteria(criteres, doc, win);

  // 2. Gestion éventuelle d'une validation SQL
  let sqliteEngine: SQLiteEngine | null = null;
  if (sqlDump && sqlDump.trim().length > 0) {
    try {
      sqliteEngine = new SQLiteEngine();
      await sqliteEngine.init();
      await sqliteEngine.chargerScript(sqlDump);
      const tables = await sqliteEngine.listerTables();
      journal.push(`Base SQLite initialisée avec succès pour le rejouage (${tables.length} table(s)).`);
    } catch (err) {
      journal.push(`Avertissement base SQL lors du rejouage : ${String(err)}`);
    } finally {
      if (sqliteEngine) {
        sqliteEngine.close();
      }
    }
  }

  // 3. Construction de la rubrique détaillée
  let totalPointsMax = 0;
  let totalPointsAuto = 0;

  const rubriqueCriteres: RubriqueCritereNote[] = summary.results.map((res) => {
    totalPointsMax += res.maxPoints;
    totalPointsAuto += res.points;

    return {
      critereId: res.id,
      code: res.code,
      label: res.label,
      pointsMax: res.maxPoints,
      pointsAuto: res.points,
      pointsAjustes: res.points, // Par défaut égal aux points auto
      valide: res.passed,
      message: res.message,
    };
  });

  const noteAuto20 =
    totalPointsMax > 0
      ? Math.round((totalPointsAuto / totalPointsMax) * baremeTotal * 100) / 100
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
  options: RejouerCorrectionOptions
): Promise<ReplayExecutionResult> {
  const debut = performance.now();
  const journalComplet: string[] = [];

  // 1. Vérification de l'intégrité cryptographique SHA-256
  journalComplet.push("Vérification du sceau cryptographique SHA-256 du snapshot...");
  const integ = await verifierIntegriteSnapshot(
    options.snapshot,
    options.fichiers,
    options.sqlDump
  );

  if (!integ.valide) {
    journalComplet.push(
      `ALERTE INTÉGRITÉ : Sceau invalide ou altération détectée (${integ.erreurs.join(" ; ")})`
    );
  } else {
    journalComplet.push(
      `Sceau cryptographique certifié conforme (SHA-256: ${options.snapshot.rootHash}).`
    );
  }

  // 2. Première passe d'évaluation
  const passe1 = await executerPasseEvaluation(
    options.fichiers,
    options.criteres,
    options.sqlDump,
    options.baremeTotal ?? 20
  );
  journalComplet.push(...passe1.journal);

  // 3. Seconde passe pour attester du déterminisme absolu (rejouabilité reproductible)
  const passe2 = await executerPasseEvaluation(
    options.fichiers,
    options.criteres,
    options.sqlDump,
    options.baremeTotal ?? 20
  );

  const reproductible =
    passe1.grille.noteAuto20 === passe2.grille.noteAuto20 &&
    passe1.grille.totalPointsAuto === passe2.grille.totalPointsAuto &&
    passe1.grille.criteres.every(
      (c, i) =>
        c.valide === passe2.grille.criteres[i]?.valide &&
        c.pointsAuto === passe2.grille.criteres[i]?.pointsAuto
    );

  if (reproductible) {
    journalComplet.push("Déterminisme vérifié : Rejouages successifs 100% identiques.");
  } else {
    journalComplet.push(
      "ALERTE REPRODUCTIBILITÉ : Divergence observée entre deux exécutions consécutives."
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
