/**
 * Service d'Export Standardisé des Résultats pour Systèmes Académiques Français (Pronote, ENT, Épargne Scolaire)
 * Conforme aux spécifications académiques (séparateur point-virgule, virgule décimale, encodage UTF-8 avec BOM).
 * (PRD F-65, Issue #34, Jalon M7)
 */

import type { TeacherClassMember } from "@/lib/supabase/teacher";
import { scoreToNote20 } from "@/lib/analytics/class-analytics";

export interface PronoteExportOptions {
  nomClasse?: string;
  nomEpreuve?: string;
  delimiteur?: ";" | ",";
  inclureCompetences?: boolean;
  inclureAppreciations?: boolean;
  inclureBomUtf8?: boolean;
}

/**
 * Génère une appréciation pédagogique automatique basée sur la note et le statut
 */
export function genererAppreciationPedagogique(
  note20: number,
  statut?: string,
  pointsFaibles?: string[],
): string {
  if (statut === "non_commence") {
    return "Non évalué - travail non commencé.";
  }

  const aDesPointsFaibles = pointsFaibles && pointsFaibles.length > 0;

  if (note20 >= 18) {
    return "Remarquable maîtrise technique et rigueur sur l'ensemble des critères.";
  }
  if (note20 >= 16) {
    return "Très bon travail. Notions du programme solidement acquises et restituées.";
  }
  if (note20 >= 14) {
    return "Bon travail d'ensemble. Objectifs pédagogiques atteints avec autonomie.";
  }
  if (note20 >= 12) {
    return "Travail satisfaisant. Les bases sont acquises, poursuivre l'approfondissement.";
  }
  if (note20 >= 10) {
    return aDesPointsFaibles
      ? `Ensemble moyen. Notions assimilées mais vigilance sur : ${pointsFaibles[0]}.`
      : "Résultats convenables. Des progrès notables à consolider.";
  }
  if (note20 >= 8) {
    return aDesPointsFaibles
      ? `En cours d'acquisition. Consolider les fondamentaux, notamment : ${pointsFaibles.slice(0, 2).join(", ")}.`
      : "Résultats fragiles. Réviser la méthodologie et les consignes du sujet.";
  }
  return aDesPointsFaibles
    ? `Difficultés persistantes sur les notions clés (${pointsFaibles.slice(0, 2).join(", ")}). Séances de remédiation conseillées.`
    : "Difficultés d'acquisition. Travail insuffisant ou incomplet.";
}

/**
 * Formate un nombre décimal au standard académique français (ex: 14.5 -> "14,50")
 */
export function formaterNombreFrancais(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

/**
 * Échappe une chaîne de caractères pour le format CSV (RFC 4180)
 */
export function echapperChampCsv(champ: string | number | undefined | null): string {
  if (champ === undefined || champ === null) return '""';
  const str = String(champ).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exporte les résultats d'une classe au format officiel Pronote / ENT
 */
export function exporterPronoteCsv(
  eleves: TeacherClassMember[],
  options: PronoteExportOptions = {},
): string {
  const delim = options.delimiteur ?? ";";
  const inclureCompetences = options.inclureCompetences ?? true;
  const inclureAppreciations = options.inclureAppreciations ?? true;
  const inclureBom = options.inclureBomUtf8 ?? true;

  // En-têtes standards académiques Pronote / ENT
  const headers = [
    "Identifiant Élève",
    "Nom",
    "Prénom",
    "Statut",
    "Note /20",
    "Taux Réussite (%)",
    "Critères Validés",
    "Total Critères",
  ];

  if (inclureCompetences) {
    headers.push(
      "HTML & Structure",
      "CSS & Design",
      "JavaScript / DOM",
      "PHP / Serveur",
      "SQL / Données",
    );
  }

  if (inclureAppreciations) {
    headers.push("Appréciation Pédagogique");
  }

  headers.push("Dernière Activité", "Points de Blocage");

  // Construction des lignes élèves
  const rows = eleves.map((eleve) => {
    const note20 = scoreToNote20(eleve.score_formatif);
    const scorePct = eleve.score_formatif ?? 0;
    const statutLibelle =
      eleve.projet_statut === "rendu"
        ? "Rendu"
        : eleve.projet_statut === "en_cours"
          ? "En cours"
          : "Non commencé";

    const line: string[] = [
      echapperChampCsv(eleve.eleve_id),
      echapperChampCsv(eleve.nom),
      echapperChampCsv(eleve.prenom),
      echapperChampCsv(statutLibelle),
      formaterNombreFrancais(note20),
      `${scorePct}%`,
      String(eleve.criteres_reussis ?? 0),
      String(eleve.total_criteres ?? 0),
    ];

    if (inclureCompetences) {
      // Estimation des compétences par domaine sur /20
      const calcCompetenceNote = (domainName: string) => {
        const hasBlockage = (eleve.points_faibles || []).some((pf) =>
          pf.toUpperCase().includes(domainName.toUpperCase()),
        );
        if (hasBlockage) {
          return formaterNombreFrancais(Math.max(0, note20 - 4));
        }
        return formaterNombreFrancais(note20);
      };

      line.push(
        calcCompetenceNote("HTML"),
        calcCompetenceNote("CSS"),
        calcCompetenceNote("JS"),
        calcCompetenceNote("PHP"),
        calcCompetenceNote("SQL"),
      );
    }

    if (inclureAppreciations) {
      const appreciation = genererAppreciationPedagogique(
        note20,
        eleve.projet_statut,
        eleve.points_faibles,
      );
      line.push(echapperChampCsv(appreciation));
    }

    const derniereAct = eleve.derniere_activite || eleve.joined_at;
    const dateStr = derniereAct ? new Date(derniereAct).toLocaleString("fr-FR") : "-";
    line.push(
      echapperChampCsv(dateStr),
      echapperChampCsv((eleve.points_faibles || []).join(", ") || "Aucun"),
    );

    return line.join(delim);
  });

  const headerRow = headers.join(delim);
  const csvBody = [headerRow, ...rows].join("\r\n");

  // BOM UTF-8 (\uFEFF) garantissant l'ouverture propre dans Excel sans corruption d'accents
  return inclureBom ? `\uFEFF${csvBody}` : csvBody;
}

/**
 * Déclenche le téléchargement côté navigateur du fichier d'export
 */
export function telechargerExportPronote(
  eleves: TeacherClassMember[],
  nomClasse: string = "classe",
  options: PronoteExportOptions = {},
): void {
  const content = exporterPronoteCsv(eleves, { nomClasse, ...options });
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const cleanName = nomClasse.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const dateSuffix = new Date().toISOString().slice(0, 10);

  link.setAttribute("href", url);
  link.setAttribute("download", `pronote_${cleanName}_${dateSuffix}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
