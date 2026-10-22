import { analyserDetailsTentative } from "@/lib/supabase/tentative-details";
import { supabase } from "@/integrations/supabase/client";
import type {
  ContestationRecord,
  StudentAttemptRecord,
} from "@/lib/subjects/contestations-service";
import type { StudentCopyData } from "@/lib/similarity/types";

/**
 * Erreur de lecture des données enseignant : l'interface l'affiche au lieu de montrer
 * une liste vide trompeuse (« 0 élève »).
 */
export class ErreurChargementEnseignant extends Error {}

function erreurChargement(contexte: string, cause: unknown): ErreurChargementEnseignant {
  const detail =
    cause instanceof Error
      ? cause.message
      : typeof cause === "object" && cause !== null && "message" in cause
        ? String((cause as { message: unknown }).message)
        : String(cause);
  console.error(`[Teacher] ${contexte}`, cause);
  return new ErreurChargementEnseignant(`${contexte} : ${detail}`);
}

function relancer(contexte: string, err: unknown): never {
  if (err instanceof ErreurChargementEnseignant) throw err;
  throw erreurChargement(contexte, err);
}

export interface TeacherClass {
  id: string;
  nom: string;
  annee: string;
  archivee: boolean;
  created_at: string;
  members_count: number;
  assigned_subjects_count: number;
}

export interface TeacherClassMember {
  eleve_id: string;
  nom: string;
  prenom: string;
  joined_at: string;
  projet_statut?: "non_commence" | "en_cours" | "rendu";
  score_formatif?: number;
  total_criteres?: number;
  criteres_reussis?: number;
  derniere_activite?: string;
  points_faibles?: string[];
}

export interface ClassInvitationRecord {
  id: string;
  class_id: string;
  code: string;
  expire_le: string;
  revoque: boolean;
  utilisations_max: number;
  nb_utilisations: number;
  created_at: string;
}

export interface StudentFile {
  id: string;
  chemin: string;
  contenu: string;
  rev: number;
  updated_at: string;
}

/**
 * Récupère les classes créées par l'enseignant connecté (PRD F-01, F-61, T-02)
 */
export async function getTeacherClasses(teacherId: string): Promise<TeacherClass[]> {
  try {
    const { data: classesData, error: classesError } = await supabase
      .from("classes")
      .select("id, nom, annee, archivee, created_at")
      .eq("enseignant_id", teacherId)
      .eq("archivee", false)
      .order("created_at", { ascending: false });

    if (classesError) throw erreurChargement("Chargement des classes impossible", classesError);
    if (!classesData) return [];

    // Enrichir avec le décompte des membres et des sujets
    const classesWithCounts: TeacherClass[] = await Promise.all(
      classesData.map(async (c) => {
        const { count: membersCount } = await supabase
          .from("class_members")
          .select("*", { count: "exact", head: true })
          .eq("class_id", c.id)
          .is("left_at", null);

        const { count: subjectsCount } = await supabase
          .from("class_sujets")
          .select("*", { count: "exact", head: true })
          .eq("class_id", c.id)
          .eq("ouvert", true);

        return {
          id: c.id,
          nom: c.nom,
          annee: c.annee,
          archivee: c.archivee,
          created_at: c.created_at,
          members_count: membersCount || 0,
          assigned_subjects_count: subjectsCount || 0,
        };
      }),
    );

    return classesWithCounts;
  } catch (err) {
    return relancer("Chargement des classes impossible", err);
  }
}

/**
 * Crée une nouvelle classe d'enseignement (PRD F-01)
 */
export async function createTeacherClass(
  teacherId: string,
  nom: string,
  annee: string = "2026-2027",
): Promise<{ success: boolean; classId?: string; error?: string }> {
  try {
    const cleanNom = nom.trim();
    if (!cleanNom || cleanNom.length < 2) {
      return { success: false, error: "Le nom de la classe doit comporter au moins 2 caractères." };
    }

    const { data, error } = await supabase
      .from("classes")
      .insert({
        nom: cleanNom,
        annee,
        enseignant_id: teacherId,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Impossible de créer la classe." };
    }

    return { success: true, classId: data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Récupère les codes d'invitation d'une classe (PRD F-04, F-61)
 */
export async function getClassInvitations(classId: string): Promise<ClassInvitationRecord[]> {
  try {
    const { data, error } = await supabase
      .from("class_invitations")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: false });

    if (error) throw erreurChargement("Chargement des codes d'invitation impossible", error);
    return (data ?? []) as ClassInvitationRecord[];
  } catch (err) {
    return relancer("Chargement des codes d'invitation impossible", err);
  }
}

/**
 * Génère un nouveau code d'invitation avec quota et date d'expiration (PRD F-04, F-05, T-05)
 */
export function genererCodeInvitationFormat(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `STI-${randomPart}`;
}

export async function createClassInvitation(
  classId: string,
  options: {
    codePersonnalise?: string | undefined;
    expireInDays?: number | undefined;
    quotaMax?: number | undefined;
  } = {},
): Promise<{ success: boolean; invitation?: ClassInvitationRecord; error?: string }> {
  try {
    const expireDays = options.expireInDays ?? 30;
    const quota = options.quotaMax ?? 35;
    const code = options.codePersonnalise
      ? options.codePersonnalise.trim().toUpperCase()
      : genererCodeInvitationFormat();

    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + expireDays);

    const { data, error } = await supabase
      .from("class_invitations")
      .insert({
        class_id: classId,
        code,
        expire_le: expireDate.toISOString(),
        utilisations_max: quota,
        nb_utilisations: 0,
        revoque: false,
      })
      .select("*")
      .single();

    if (error || !data) {
      return {
        success: false,
        error: error?.message || "Impossible de créer le code d'invitation.",
      };
    }

    return { success: true, invitation: data as ClassInvitationRecord };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Révocation instantanée d'un code d'invitation (PRD F-06, T-05)
 */
export async function revokeClassInvitation(invitationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("class_invitations")
      .update({ revoque: true })
      .eq("id", invitationId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Récupère le suivi en temps réel des élèves d'une classe (PRD F-61, F-62, F-63)
 */
export async function getClassStudentsProgress(classId: string): Promise<TeacherClassMember[]> {
  try {
    // 1. Récupérer les membres actifs
    const { data: members, error: membersError } = await supabase
      .from("class_members")
      .select(
        `
        eleve_id,
        joined_at,
        profiles (
          id,
          nom,
          prenom
        )
      `,
      )
      .eq("class_id", classId)
      .is("left_at", null);

    if (membersError) throw erreurChargement("Chargement des élèves impossible", membersError);
    if (!members) return [];

    // 2. Pour chaque élève, calculer l'avancement et la dernière activité
    const results: TeacherClassMember[] = await Promise.all(
      members.map(async (m) => {
        const prof = m.profiles as unknown as { id: string; nom: string; prenom: string } | null;
        const eleveId = m.eleve_id;

        // Récupérer le projet le plus récent
        const { data: proj } = await supabase
          .from("projets")
          .select("id, statut, updated_at")
          .eq("eleve_id", eleveId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Récupérer les tentatives d'évaluation récentes
        let scoreFormatif = 0;
        let criteresReussis = 0;
        let totalCriteres = 0;
        const pointsFaibles: string[] = [];

        // Les tentatives sont rattachées à l'élève : toutes celles de l'élève comptent,
        // qu'elles aient ou non un projet associé.
        const { data: tentative } = await supabase
          .from("tentatives")
          .select("note20, points_obtenus, points_total, details, date")
          .eq("eleve_id", eleveId)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (tentative) {
          const total = tentative.points_total || 20;
          const note20Val = tentative.note20 ?? 0;
          const obtenus = tentative.points_obtenus ?? Math.round((note20Val * total) / 20);
          scoreFormatif = Math.min(100, Math.round((obtenus / total) * 100));

          const bilan = analyserDetailsTentative(tentative.details);
          totalCriteres = bilan.total;
          criteresReussis = bilan.reussis;
          pointsFaibles.push(...bilan.pointsFaibles);
        }

        return {
          eleve_id: eleveId,
          nom: prof?.nom || "Élève",
          prenom: prof?.prenom || "Inconnu",
          joined_at: m.joined_at,
          projet_statut:
            (proj?.statut as "non_commence" | "en_cours" | "rendu") ||
            (tentative ? "en_cours" : "non_commence"),
          score_formatif: scoreFormatif,
          total_criteres: totalCriteres,
          criteres_reussis: criteresReussis,
          derniere_activite: [proj?.updated_at, tentative?.date, m.joined_at]
            .filter((d): d is string => !!d)
            .sort()
            .at(-1)!,
          points_faibles: pointsFaibles.slice(0, 3), // Top 3 points bloquants
        };
      }),
    );

    return results;
  } catch (err) {
    return relancer("Chargement des élèves impossible", err);
  }
}

/**
 * Récupère les fichiers de la copie d'un élève en lecture seule (PRD F-63, T-02)
 */
export async function getStudentCopyFiles(eleveId: string): Promise<StudentFile[]> {
  try {
    // 1. Trouver le projet de l'élève
    const { data: proj, error: projErr } = await supabase
      .from("projets")
      .select("id")
      .eq("eleve_id", eleveId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (projErr || !proj) return [];

    // 2. Récupérer les fichiers du projet
    const { data: fichiers, error: fErr } = await supabase
      .from("projet_fichiers")
      .select("id, chemin, contenu, rev, updated_at")
      .eq("projet_id", proj.id)
      .order("chemin", { ascending: true });

    if (fErr || !fichiers) return [];

    return fichiers.map((f) => ({
      id: f.id,
      chemin: f.chemin,
      contenu: f.contenu || "",
      rev: f.rev || 1,
      updated_at: f.updated_at,
    }));
  } catch (err) {
    console.error("[Teacher] Erreur lors de la lecture des fichiers élève :", err);
    return [];
  }
}

/**
 * Récupère les contestations d'une classe depuis Supabase (PRD F-44, F-45)
 */
export async function getClassContestations(
  classId: string,
  className: string = "Classe",
): Promise<ContestationRecord[]> {
  try {
    // 1. Récupérer les membres de la classe
    const { data: members, error: membersError } = await supabase
      .from("class_members")
      .select("eleve_id, profiles(id, nom, prenom)")
      .eq("class_id", classId)
      .is("left_at", null);

    if (membersError)
      throw erreurChargement("Chargement des contestations impossible", membersError);
    if (!members || members.length === 0) return [];

    const memberIds = members.map((m) => m.eleve_id);
    const profileMap = new Map<string, { nom: string; prenom: string }>();
    members.forEach((m) => {
      const prof = m.profiles as unknown as { id: string; nom: string; prenom: string } | null;
      if (prof) {
        profileMap.set(m.eleve_id, { nom: prof.nom || "Élève", prenom: prof.prenom || "" });
      }
    });

    // 2. Récupérer les contestations des élèves de la classe
    const { data: contestationsData, error: contError } = await supabase
      .from("contestations")
      .select("*")
      .in("eleve_id", memberIds)
      .order("created_at", { ascending: false });

    if (contError) throw erreurChargement("Chargement des contestations impossible", contError);
    if (!contestationsData) return [];

    // Libellés des critères : la table criteres (correction) n'est jamais lue directement.
    const libelles = new Map<string, { code: string; label: string }>();
    const critereIds = [...new Set(contestationsData.map((c) => c.critere_id))];
    if (critereIds.length > 0) {
      const { data: crits, error: critError } = await supabase.rpc("critere_libelles", {
        _ids: critereIds,
      });
      if (critError) {
        console.warn("[Teacher] Libellés de critères indisponibles :", critError);
      }
      (crits ?? []).forEach((cr) => libelles.set(cr.id, { code: cr.code, label: cr.label }));
    }

    return contestationsData.map((c) => {
      const crit = libelles.get(c.critere_id) ?? null;
      const prof = profileMap.get(c.eleve_id);
      const studentName = prof ? `${prof.prenom} ${prof.nom}`.trim() : "Élève STI";

      return {
        id: c.id,
        critere_id: c.critere_id,
        critere_code: crit?.code || "CRIT",
        critere_label: crit?.label || "Critère d'évaluation",
        eleve_id: c.eleve_id,
        eleve_nom: studentName,
        classe_id: classId,
        classe_nom: className,
        texte: c.texte,
        statut: (c.statut as "en_attente" | "acceptee" | "rejetee") || "en_attente",
        created_at: c.created_at,
        traitee_le: c.traitee_le,
        motif_rejet: c.motif_rejet,
      };
    });
  } catch (err) {
    return relancer("Chargement des contestations impossible", err);
  }
}

/**
 * Récupère les copies d'élèves complètes avec leurs fichiers pour analyse de similarité (PRD §16, F-65)
 */
export async function getClassStudentCopies(classId: string): Promise<StudentCopyData[]> {
  try {
    const { data: members, error: mError } = await supabase
      .from("class_members")
      .select("eleve_id, profiles(id, nom, prenom)")
      .eq("class_id", classId)
      .is("left_at", null);

    if (mError) throw erreurChargement("Chargement des copies impossible", mError);
    if (!members || members.length === 0) return [];

    const copies: StudentCopyData[] = [];

    for (const m of members) {
      const prof = m.profiles as unknown as { id: string; nom: string; prenom: string } | null;
      const eleveId = m.eleve_id;

      // Dernier projet
      const { data: proj } = await supabase
        .from("projets")
        .select("id, statut, updated_at")
        .eq("eleve_id", eleveId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!proj) continue;

      // Fichiers du projet
      const { data: files } = await supabase
        .from("projet_fichiers")
        .select("chemin, contenu")
        .eq("projet_id", proj.id)
        .eq("supprime", false);

      if (files && files.length > 0) {
        copies.push({
          eleveId,
          nom: prof?.nom || "Élève",
          prenom: prof?.prenom || "STI",
          statut: proj.statut as "rendu" | "en_cours" | "non_commence" | undefined,
          derniereActivite: proj.updated_at,
          fichiers: files.map((f) => ({ chemin: f.chemin, contenu: f.contenu || "" })),
        });
      }
    }

    return copies;
  } catch (err) {
    return relancer("Chargement des copies impossible", err);
  }
}

/**
 * Récupère les tentatives d'évaluation récentes pour l'arbitrage des contestations de classe
 */
export async function getClassStudentAttempts(classId: string): Promise<StudentAttemptRecord[]> {
  try {
    const { data: members, error: mError } = await supabase
      .from("class_members")
      .select("eleve_id, profiles(id, nom, prenom)")
      .eq("class_id", classId)
      .is("left_at", null);

    if (mError) throw erreurChargement("Chargement des tentatives impossible", mError);
    if (!members || members.length === 0) return [];

    const records: StudentAttemptRecord[] = [];

    for (const m of members) {
      const prof = m.profiles as unknown as { id: string; nom: string; prenom: string } | null;
      const eleveId = m.eleve_id;
      const eleveNom = prof ? `${prof.prenom} ${prof.nom}`.trim() : "Élève";

      const { data: proj } = await supabase
        .from("projets")
        .select("id")
        .eq("eleve_id", eleveId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!proj) continue;

      const { data: tentative } = await supabase
        .from("tentatives")
        .select("id, note20, points_obtenus, points_total, details, date")
        .eq("projet_id", proj.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tentative) {
        const rawDetails = tentative.details as {
          criteres?: Array<{
            id?: string;
            code?: string;
            label?: string;
            titre?: string;
            points?: number;
            valide?: boolean;
          }>;
        } | null;
        const criteresList = (rawDetails?.criteres || []).map((c, idx) => ({
          id: c.id || `c-${idx}`,
          code: c.code || `C-${idx + 1}`,
          label: c.label || c.titre || "Critère",
          points: c.points ?? 1,
          valide: c.valide === true,
        }));

        records.push({
          id: tentative.id,
          eleve_id: eleveId,
          eleve_nom: eleveNom,
          note20: tentative.note20 ?? 0,
          points_obtenus: tentative.points_obtenus ?? 0,
          points_total: tentative.points_total ?? 20,
          criteres: criteresList,
        });
      }
    }

    return records;
  } catch (err) {
    return relancer("Chargement des tentatives impossible", err);
  }
}

/**
 * Exporte les résultats d'une classe en CSV (PRD F-65)
 */
export function exporterResultatsCsv(eleves: TeacherClassMember[], nomClasse: string): string {
  const headers = [
    "Nom",
    "Prénom",
    "Statut Projet",
    "Score (%)",
    "Critères Validés",
    "Total Critères",
    "Dernière Activité",
    "Points de Blocage",
  ];

  const rows = eleves.map((e) => [
    `"${e.nom.replace(/"/g, '""')}"`,
    `"${e.prenom.replace(/"/g, '""')}"`,
    `"${e.projet_statut || "non_commence"}"`,
    e.score_formatif ?? 0,
    e.criteres_reussis ?? 0,
    e.total_criteres ?? 0,
    `"${new Date(e.derniere_activite || e.joined_at).toLocaleString("fr-FR")}"`,
    `"${(e.points_faibles || []).join("; ").replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  return csvContent;
}
