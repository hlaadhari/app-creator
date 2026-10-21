/**
 * Labo STI - État réel du système pour /admin (SECURITY.md T-01..T-14, PRD §4.1).
 * Les valeurs sont mesurées dans la base à l'affichage ; rien n'est écrit en dur.
 */

import { supabase } from "@/integrations/supabase/client";
import { messageErreurAdmin } from "@/lib/supabase/admin";

export interface EtatSysteme {
  horlogeServeur: string;
  tables: number;
  tablesSansRls: string[];
  politiques: number;
  droitsClientsCorriges: number;
  tablesAnonEcriture: string[];
  ecritureDirecteUserRoles: boolean;
  triggersImmuabiliteAttendus: number;
  triggersImmuabilitePresents: number;
}

export interface ControleDirect {
  /** Codes de la matrice T-01..T-14 que ce contrôle vérifie. */
  codes: string[];
  libelle: string;
  ok: boolean;
  detail: string;
}

export interface MesureLatence {
  /** Médiane de l'aller-retour navigateur → base, en millisecondes. */
  latenceMs: number;
  /** Écart entre l'horloge de ce navigateur et celle du serveur, en secondes (signé). */
  ecartHorlogeSecondes: number;
  horlogeServeur: string;
}

/** Tolérance d'écart d'horloge navigateur / serveur affichée comme alerte (PRD §10, T-08). */
export const TOLERANCE_HORLOGE_SECONDES = 30;

function enNombre(valeur: unknown): number {
  return typeof valeur === "number" ? valeur : Number(valeur ?? 0);
}

function enListe(valeur: unknown): string[] {
  return Array.isArray(valeur) ? valeur.map(String) : [];
}

/**
 * Lit l'état réel de la base (RLS, droits clients, triggers d'immuabilité). Admins uniquement.
 */
export async function getEtatSysteme(): Promise<EtatSysteme> {
  const { data, error } = await supabase.rpc("admin_etat_systeme");
  if (error) {
    throw new Error(messageErreurAdmin(error.message));
  }
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    horlogeServeur: String(d["horloge_serveur"] ?? ""),
    tables: enNombre(d["tables"]),
    tablesSansRls: enListe(d["tables_sans_rls"]),
    politiques: enNombre(d["politiques"]),
    droitsClientsCorriges: enNombre(d["droits_clients_corriges"]),
    tablesAnonEcriture: enListe(d["tables_anon_ecriture"]),
    ecritureDirecteUserRoles: d["ecriture_directe_user_roles"] === true,
    triggersImmuabiliteAttendus: enNombre(d["triggers_immuabilite_attendus"]),
    triggersImmuabilitePresents: enNombre(d["triggers_immuabilite_presents"]),
  };
}

/**
 * Contrôles de sécurité vérifiables en direct dans la base. Les autres tests de la matrice
 * (bac à sable, PHP, horloge d'examen…) ne sont pas vérifiables ici : ils sont couverts par la CI.
 */
export function controlesEnDirect(etat: EtatSysteme): ControleDirect[] {
  const sansRls = etat.tablesSansRls;
  return [
    {
      codes: ["T-01", "T-02"],
      libelle: "RLS active sur toutes les tables",
      ok: sansRls.length === 0,
      detail:
        sansRls.length === 0
          ? `${etat.tables} tables protégées, ${etat.politiques} politiques`
          : `Sans RLS : ${sansRls.join(", ")}`,
    },
    {
      codes: ["T-03"],
      libelle: "Rôles non modifiables directement",
      ok: !etat.ecritureDirecteUserRoles,
      detail: etat.ecritureDirecteUserRoles
        ? "Un utilisateur connecté peut écrire dans user_roles"
        : "Changements de rôle réservés aux fonctions admin",
    },
    {
      codes: ["T-04"],
      libelle: "Aucun droit client sur solutions et criteres",
      ok: etat.droitsClientsCorriges === 0,
      detail:
        etat.droitsClientsCorriges === 0
          ? "0 droit accordé à anon ou authenticated"
          : `${etat.droitsClientsCorriges} droit(s) accordé(s) à anon ou authenticated`,
    },
    {
      codes: ["T-09", "T-13"],
      libelle: "Triggers d'immuabilité présents",
      ok: etat.triggersImmuabilitePresents === etat.triggersImmuabiliteAttendus,
      detail: `${etat.triggersImmuabilitePresents} / ${etat.triggersImmuabiliteAttendus} triggers`,
    },
    {
      codes: ["T-03", "T-04"],
      libelle: "Aucune écriture anonyme",
      ok: etat.tablesAnonEcriture.length === 0,
      detail:
        etat.tablesAnonEcriture.length === 0
          ? "anon n'a aucun droit d'écriture"
          : `anon peut écrire dans : ${etat.tablesAnonEcriture.join(", ")}`,
    },
  ];
}

function mediane(valeurs: number[]): number {
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);
  return triees.length % 2 === 0
    ? ((triees[milieu - 1] ?? 0) + (triees[milieu] ?? 0)) / 2
    : (triees[milieu] ?? 0);
}

/**
 * Mesure la latence navigateur → base (médiane de plusieurs appels) et l'écart d'horloge
 * entre ce navigateur et le serveur, avec l'horloge officielle du serveur (obtenir_horloge_serveur).
 */
export async function mesurerLatenceEtHorloge(essais = 3): Promise<MesureLatence> {
  const latences: number[] = [];
  let ecart = 0;
  let horloge = "";

  for (let i = 0; i < essais; i++) {
    const debut = Date.now();
    const t0 = performance.now();
    const { data, error } = await supabase.rpc("obtenir_horloge_serveur");
    const duree = performance.now() - t0;
    if (error) {
      throw new Error(error.message);
    }
    latences.push(duree);
    horloge = String(data);
    // Le serveur répond au milieu de l'aller-retour : on compare à l'instant médian côté navigateur.
    ecart = (new Date(horloge).getTime() - (debut + duree / 2)) / 1000;
  }

  return {
    latenceMs: Math.round(mediane(latences)),
    ecartHorlogeSecondes: Math.round(ecart * 10) / 10,
    horlogeServeur: horloge,
  };
}
