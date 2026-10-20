import { supabase } from "@/integrations/supabase/client";

export interface ClassInfo {
  id: string;
  nom: string;
  annee: string;
  enseignantId: string;
  joinedAt: string;
  assignedSubjectsCount?: number;
}

export interface JoinClassResult {
  success: boolean;
  classId?: string;
  className?: string;
  error?: string;
  retryAfterSeconds?: number;
  alreadyMember?: boolean;
}

// Suivi client du rate-limiting anti brute-force (PRD T-05)
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 1 minute
const LOCKOUT_MS = 30 * 1000; // 30 secondes de blocage
const attemptsHistory: number[] = [];
let lockoutUntil = 0;

export function checkRateLimit(): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  if (now < lockoutUntil) {
    return { allowed: false, retryAfterSeconds: Math.ceil((lockoutUntil - now) / 1000) };
  }

  // Nettoyer les tentatives anciennes
  while (attemptsHistory.length > 0) {
    const oldest = attemptsHistory[0];
    if (oldest !== undefined && oldest < now - WINDOW_MS) {
      attemptsHistory.shift();
    } else {
      break;
    }
  }

  if (attemptsHistory.length >= MAX_ATTEMPTS) {
    lockoutUntil = now + LOCKOUT_MS;
    return { allowed: false, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedAttempt(): void {
  attemptsHistory.push(Date.now());
}

export function resetRateLimit(): void {
  attemptsHistory.length = 0;
  lockoutUntil = 0;
}

/**
 * Normalise un code d'invitation (PRD F-04 : 6 caractères ou format STI-XXXX, majuscules, sans espaces)
 */
export function normaliserCodeInvitation(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Valide la structure syntaxique d'un code d'invitation
 */
export function estCodeValide(code: string): boolean {
  const norm = normaliserCodeInvitation(code);
  // Doit comporter au moins 4 caractères alphanumériques avec tirets optionnels
  return /^[A-Z0-9-]{4,12}$/.test(norm);
}

/**
 * Permet à un élève de rejoindre une classe via son code d'invitation (PRD F-04, F-05, F-06, T-05)
 */
export async function rejoindreClasse(code: string): Promise<JoinClassResult> {
  // 1. Contrôle anti brute-force (T-05)
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Trop de tentatives consécutives. Veuillez patienter ${rateLimit.retryAfterSeconds}s pour réessayer.`,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    };
  }

  const cleanCode = normaliserCodeInvitation(code);
  if (!estCodeValide(cleanCode)) {
    recordFailedAttempt();
    return {
      success: false,
      error: "Format de code invalide (ex: STI-7842 ou 6 caractères alphanumériques).",
    };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: "Authentification requise. Connectez-vous avant de rejoindre une classe.",
      };
    }

    // 2. Appel de la procédure stockée sécurisée Supabase
    const { data, error } = await supabase.rpc("rejoindre_classe", {
      _code: cleanCode,
    });

    if (error) {
      recordFailedAttempt();
      const msg = error.message.toLowerCase();

      if (msg.includes("invalide") || msg.includes("expire") || msg.includes("complet")) {
        return {
          success: false,
          error:
            "Ce code d'invitation est invalide, expiré ou la classe a atteint son quota maximal.",
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    // Succès : réinitialisation du compteur de rate-limiting
    resetRateLimit();

    const classId = typeof data === "string" ? data : (data as { class_id?: string })?.class_id;

    if (!classId) {
      return { success: true };
    }

    // 3. Récupérer les informations de la classe rejointe
    const { data: classData } = await supabase
      .from("classes")
      .select("nom")
      .eq("id", classId)
      .maybeSingle();

    const className = classData?.nom || "Votre classe";

    // 4. Initialiser automatiquement les projets des sujets assignés à la classe (PRD F-08, F-35)
    await initialiserSujetsClasse(classId);

    return {
      success: true,
      classId,
      className,
    };
  } catch (err) {
    recordFailedAttempt();
    return {
      success: false,
      error: `Erreur inattendue : ${String(err)}`,
    };
  }
}

/**
 * Initialise automatiquement les projets de départ pour tous les sujets assignés à la classe
 */
async function initialiserSujetsClasse(classId: string): Promise<void> {
  try {
    // Récupérer les sujets assignés
    const { data: assignations } = await supabase
      .from("class_sujets")
      .select("version_id")
      .eq("class_id", classId)
      .eq("ouvert", true);

    if (!assignations || assignations.length === 0) return;

    for (const assign of assignations) {
      if (assign.version_id) {
        // Appeler la RPC initialiser_projet (idempotente)
        await supabase.rpc("initialiser_projet" as any, {
          _version_id: assign.version_id,
        });
      }
    }
  } catch (err) {
    console.warn("[Classes] Erreur lors de l'initialisation des sujets assignés :", err);
  }
}

/**
 * Récupère la liste des classes dont l'utilisateur connecté est membre actif
 */
export async function getMesClasses(): Promise<ClassInfo[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: memberships, error } = await supabase
      .from("class_members")
      .select(
        `
        class_id,
        joined_at,
        classes (
          id,
          nom,
          annee,
          enseignant_id
        )
      `,
      )
      .eq("eleve_id", user.id)
      .is("left_at", null);

    if (error || !memberships) return [];

    return memberships
      .filter((m) => m.classes !== null)
      .map((m) => {
        const c = m.classes as unknown as {
          id: string;
          nom: string;
          annee: string;
          enseignant_id: string;
        };
        return {
          id: c.id,
          nom: c.nom,
          annee: c.annee,
          enseignantId: c.enseignant_id,
          joinedAt: m.joined_at,
        };
      });
  } catch (err) {
    console.warn("[Classes] Impossible de récupérer mes classes :", err);
    return [];
  }
}
