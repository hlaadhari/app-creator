/**
 * Service de persistance et de synchronisation des compétences et badges élèves (PRD Jalon M7)
 * Gère le mode connecté (Supabase Postgres) avec fallback local résilient (localStorage / IndexedDB).
 */

import { supabase } from "@/integrations/supabase/client";
import { OFFICIAL_BADGES, inferCompetenceForCriterion } from "./referentiel";
import {
  calculerMaitriseScore,
  buildStudentProgressionReport,
  evaluateBadgesEligibility,
} from "./mastery-engine";
import type {
  MaitriseRecord,
  BadgeEleve,
  BadgeDefinition,
  StudentProgressionReport,
} from "./types";

interface MaitriseDbRow {
  eleve_id: string;
  competence_id: string;
  niveau: number;
  nb_tentatives: number;
  nb_succes: number;
  premier_coup_succes: boolean;
  dernier_succes: string | null;
  version_formule: string;
  updated_at: string;
}

interface BadgeDbRow {
  id: string;
  eleve_id: string;
  badge_id: string;
  obtenu_le: string;
  meta?: unknown;
}

const LOCAL_MAITRISE_KEY = "labo_sti_maitrise_records";
const LOCAL_BADGES_KEY = "labo_sti_badges_eleve";

// Cache mémoire
let cachedRecords: MaitriseRecord[] | null = null;
let cachedBadges: BadgeEleve[] | null = null;

function getLocalRecords(): MaitriseRecord[] {
  if (cachedRecords) return cachedRecords;
  try {
    const raw = localStorage.getItem(LOCAL_MAITRISE_KEY);
    cachedRecords = raw ? (JSON.parse(raw) as MaitriseRecord[]) : [];
    return cachedRecords;
  } catch {
    return [];
  }
}

function saveLocalRecords(records: MaitriseRecord[]): void {
  cachedRecords = records;
  try {
    localStorage.setItem(LOCAL_MAITRISE_KEY, JSON.stringify(records));
  } catch {
    // Silencieux si indisponible
  }
}

function getLocalBadges(): BadgeEleve[] {
  if (cachedBadges) return cachedBadges;
  try {
    const raw = localStorage.getItem(LOCAL_BADGES_KEY);
    cachedBadges = raw ? (JSON.parse(raw) as BadgeEleve[]) : [];
    return cachedBadges;
  } catch {
    return [];
  }
}

function saveLocalBadges(badges: BadgeEleve[]): void {
  cachedBadges = badges;
  try {
    localStorage.setItem(LOCAL_BADGES_KEY, JSON.stringify(badges));
  } catch {
    // Silencieux si indisponible
  }
}

interface DbQueryBuilder {
  select: (cols?: string) => DbQueryBuilder;
  eq: (col: string, val: unknown) => Promise<{ data: unknown[] | null; error: unknown }>;
  insert: (data: unknown) => Promise<{ data: unknown; error: unknown }>;
  upsert: (data: unknown, opts?: unknown) => Promise<{ data: unknown; error: unknown }>;
}

interface DynamicSupabaseClient {
  from: (table: string) => DbQueryBuilder;
}

const dbClient = supabase as unknown as DynamicSupabaseClient;

/**
 * Récupère les données de maîtrise d'un élève (depuis Supabase si connecté, sinon local)
 */
export async function getStudentMasteryRecords(
  eleveId?: string | null | undefined,
): Promise<MaitriseRecord[]> {
  const localList = getLocalRecords();

  if (!eleveId) {
    return localList;
  }

  try {
    const { data, error } = await dbClient.from("maitrise").select("*").eq("eleve_id", eleveId);

    if (error || !data || data.length === 0) {
      return localList.filter((r) => !r.eleveId || r.eleveId === eleveId);
    }

    // Mapper les colonnes Supabase vers le modèle TypeScript
    const remoteRecords: MaitriseRecord[] = (data as MaitriseDbRow[]).map((row) => ({
      eleveId: row.eleve_id,
      competenceId: row.competence_id,
      niveau: Number(row.niveau),
      nbTentatives: row.nb_tentatives,
      nbSucces: row.nb_succes,
      premierCoupSucces: row.premier_coup_succes,
      dernierSucces: row.dernier_succes,
      versionFormule: row.version_formule || "v1.0",
      updatedAt: row.updated_at,
    }));

    // Synchronisation vers le cache local
    saveLocalRecords(remoteRecords);
    return remoteRecords;
  } catch {
    return localList;
  }
}

/**
 * Récupère les badges obtenus par l'élève
 */
export async function getStudentBadges(eleveId?: string | null | undefined): Promise<BadgeEleve[]> {
  const localBadges = getLocalBadges();

  if (!eleveId) {
    return localBadges;
  }

  try {
    const { data, error } = await dbClient.from("badges").select("*").eq("eleve_id", eleveId);

    if (error || !data || data.length === 0) {
      return localBadges.filter((b) => !b.eleveId || b.eleveId === eleveId);
    }

    const badgeDefMap = new Map<string, BadgeDefinition>();
    for (const b of OFFICIAL_BADGES) {
      badgeDefMap.set(b.id, b);
    }

    const remoteBadges: BadgeEleve[] = (data as BadgeDbRow[]).map((row) => {
      const def = badgeDefMap.get(row.badge_id) || {
        id: row.badge_id,
        titre: row.badge_id,
        description: "Badge débloqué",
        icone: "Award",
        categorie: "Général",
      };

      return {
        id: row.id,
        eleveId: row.eleve_id,
        badgeId: row.badge_id,
        definition: def,
        obtenuLe: row.obtenu_le,
        meta: (row.meta as Record<string, unknown>) || {},
      };
    });

    saveLocalBadges(remoteBadges);
    return remoteBadges;
  } catch {
    return localBadges;
  }
}

/**
 * Met à jour les scores de maîtrise à partir des résultats d'une tentative d'évaluation
 */
export async function updateMasteryFromAttempt(params: {
  sujetId: string;
  criteres: Array<{
    id: string;
    label: string;
    ok: boolean;
    points?: number | undefined;
  }>;
  eleveId?: string | null | undefined;
  noteExamen?: number | undefined;
  consecutiveFailuresOnCriterion?: number | undefined;
}): Promise<{
  updatedRecords: MaitriseRecord[];
  newBadgesAwarded: BadgeEleve[];
  report: StudentProgressionReport;
}> {
  const { sujetId, criteres, eleveId, noteExamen, consecutiveFailuresOnCriterion } = params;
  const currentEleveId = eleveId || "invite-eleve";

  const existingRecords = await getStudentMasteryRecords(currentEleveId);
  const existingBadges = await getStudentBadges(currentEleveId);

  const recordsMap = new Map<string, MaitriseRecord>();
  for (const r of existingRecords) {
    recordsMap.set(r.competenceId, { ...r });
  }

  // Traiter chaque critère évalué
  for (const c of criteres) {
    const compId = inferCompetenceForCriterion(c.id, c.label, sujetId);
    const existing = recordsMap.get(compId);

    const isNew = !existing;
    const nbTentatives = (existing?.nbTentatives || 0) + 1;
    const nbSucces = (existing?.nbSucces || 0) + (c.ok ? 1 : 0);

    // Détection du premier coup réussi
    const premierCoupSucces = isNew
      ? c.ok
      : existing?.premierCoupSucces || (existing?.nbTentatives === 0 && c.ok);

    const dernierSucces = c.ok ? new Date().toISOString() : existing?.dernierSucces || null;

    const niveau = calculerMaitriseScore(nbSucces, nbTentatives, premierCoupSucces, dernierSucces);

    recordsMap.set(compId, {
      eleveId: currentEleveId,
      competenceId: compId,
      niveau,
      nbTentatives,
      nbSucces,
      premierCoupSucces,
      dernierSucces,
      versionFormule: "v1.0",
      updatedAt: new Date().toISOString(),
    });
  }

  const updatedRecords = Array.from(recordsMap.values());
  saveLocalRecords(updatedRecords);

  // Synchronisation distante Supabase si utilisateur connecté
  if (eleveId && eleveId !== "invite-eleve") {
    try {
      const rowsToUpsert = updatedRecords.map((r) => ({
        eleve_id: r.eleveId,
        competence_id: r.competenceId,
        niveau: r.niveau,
        nb_tentatives: r.nbTentatives,
        nb_succes: r.nbSucces,
        premier_coup_succes: r.premierCoupSucces,
        dernier_succes: r.dernierSucces,
        version_formule: r.versionFormule,
        updated_at: r.updatedAt,
      }));

      await dbClient.from("maitrise").upsert(rowsToUpsert, {
        onConflict: "eleve_id,competence_id",
      });
    } catch (err) {
      console.warn("Échec synchronisation Supabase maitrise (mode local actif) :", err);
    }
  }

  // Calcul du nouveau rapport de progression
  const totalTentatives = updatedRecords.reduce((acc, r) => acc + r.nbTentatives, 0);
  const totalSucces = updatedRecords.reduce((acc, r) => acc + r.nbSucces, 0);

  const initialReport = buildStudentProgressionReport(
    currentEleveId,
    updatedRecords,
    existingBadges,
    totalTentatives,
    totalSucces,
  );

  // Vérification de nouveaux badges éligibles
  const ownedBadgeIds = existingBadges.map((b) => b.badgeId);
  const newBadgeIds = evaluateBadgesEligibility(initialReport, ownedBadgeIds, {
    noteExamen,
    consecutiveAttemptsOnSameCriterion: consecutiveFailuresOnCriterion,
  });

  const badgeDefMap = new Map<string, BadgeDefinition>();
  for (const b of OFFICIAL_BADGES) {
    badgeDefMap.set(b.id, b);
  }

  const newlyAwarded: BadgeEleve[] = [];
  const allBadges = [...existingBadges];

  for (const bId of newBadgeIds) {
    const def = badgeDefMap.get(bId) || {
      id: bId,
      titre: bId,
      description: "Badge débloqué",
      icone: "Award",
      categorie: "Général",
    };

    const newBadge: BadgeEleve = {
      id: `local-badge-${bId}-${Date.now()}`,
      eleveId: currentEleveId,
      badgeId: bId,
      definition: def,
      obtenuLe: new Date().toISOString(),
    };

    newlyAwarded.push(newBadge);
    allBadges.push(newBadge);

    // Sync Supabase badge
    if (eleveId && eleveId !== "invite-eleve") {
      try {
        await dbClient.from("badges").insert({
          eleve_id: eleveId,
          badge_id: bId,
          obtenu_le: newBadge.obtenuLe,
        });
      } catch (err) {
        console.warn("Échec insertion Supabase badge :", err);
      }
    }
  }

  if (newlyAwarded.length > 0) {
    saveLocalBadges(allBadges);
  }

  const finalReport = buildStudentProgressionReport(
    currentEleveId,
    updatedRecords,
    allBadges,
    totalTentatives,
    totalSucces,
  );

  return {
    updatedRecords,
    newBadgesAwarded: newlyAwarded,
    report: finalReport,
  };
}

/**
 * Récupère le rapport complet de progression de l'élève
 */
export async function getStudentProgressionReport(
  eleveId?: string | null | undefined,
): Promise<StudentProgressionReport> {
  const currentEleveId = eleveId || "invite-eleve";
  const records = await getStudentMasteryRecords(currentEleveId);
  const badges = await getStudentBadges(currentEleveId);

  const totalTentatives = records.reduce((acc, r) => acc + r.nbTentatives, 0);
  const totalSucces = records.reduce((acc, r) => acc + r.nbSucces, 0);

  return buildStudentProgressionReport(
    currentEleveId,
    records,
    badges,
    totalTentatives,
    totalSucces,
  );
}

/**
 * Réinitialise les données locales de progression (pour tests ou démo)
 */
export function resetLocalProgression(): void {
  cachedRecords = null;
  cachedBadges = null;
  try {
    localStorage.removeItem(LOCAL_MAITRISE_KEY);
    localStorage.removeItem(LOCAL_BADGES_KEY);
  } catch {
    // Silencieux
  }
}
