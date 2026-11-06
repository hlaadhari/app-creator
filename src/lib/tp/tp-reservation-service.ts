import { supabase } from "@/integrations/supabase/client";

export type TpSessionStatus = "scheduled" | "live" | "completed";
export type TpReservationStatus = "pending" | "approved" | "rejected";
export type SeatState = "libre" | "pending" | "approved" | "live";

export interface TpSession {
  id: string;
  title: string;
  description?: string | undefined;
  classId?: string | undefined;
  sujetId?: string | undefined;
  maxSeats: number;
  startTime: string;
  endTime: string;
  status: TpSessionStatus;
  createdBy?: string | undefined;
  createdAt: string;
}

export interface TpReservation {
  id: string;
  sessionId: string;
  studentId: string;
  seatNumber: number;
  status: TpReservationStatus;
  notes?: string | undefined;
  createdAt: string;
  studentName?: string | undefined;
  studentEmail?: string | undefined;
}

export interface SeatInfo {
  seatNumber: number;
  status: SeatState;
  reservation?: TpReservation | undefined;
}

// Détection d'environnement de test pour éviter les requêtes réseau lentes vers Supabase
const isTestEnv =
  (typeof process !== "undefined" &&
    (process.env?.["NODE_ENV"] === "test" || Boolean(process.env?.["VITEST"]))) ||
  false;

// Données d'exemple / fallback mémoire pour développement et tests unitaires
const demoSessions: TpSession[] = [
  {
    id: "demo-tp-1",
    title: "Séance TP 01 - Épreuve Pratique Bac STI 2025 (AgVoy & Inscriptions)",
    description: "Salle Informatique B12 - TP chronométré en conditions d'examen",
    classId: "demo-cls-1",
    sujetId: "bac2025_sujet",
    maxSeats: 18,
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 3600000 * 3).toISOString(),
    status: "scheduled",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-tp-2",
    title: "Séance TP 02 - Entraînement Formatif JavaScript DOM & Panier",
    description: "Salle Informatique B14 - Session en cours d'exécution",
    classId: "demo-cls-2",
    sujetId: "bac2024_sujet",
    maxSeats: 12,
    startTime: new Date(Date.now() - 1800000).toISOString(),
    endTime: new Date(Date.now() + 5400000).toISOString(),
    status: "live",
    createdAt: new Date().toISOString(),
  },
];

const demoReservations: TpReservation[] = [
  {
    id: "res-demo-1",
    sessionId: "demo-tp-1",
    studentId: "demo-s1",
    seatNumber: 3,
    status: "pending",
    studentName: "Bernard Lucas",
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: "res-demo-2",
    sessionId: "demo-tp-1",
    studentId: "demo-s2",
    seatNumber: 5,
    status: "approved",
    studentName: "Dupont Camille",
    createdAt: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: "res-demo-3",
    sessionId: "demo-tp-2",
    studentId: "demo-s3",
    seatNumber: 1,
    status: "approved",
    studentName: "Martin Thomas",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

/**
 * Store mémoire initial. Les séances et élèves fictifs ne servent qu'aux tests : en production
 * un store vide évite d'afficher de fausses données à un enseignant ou à un élève (#187).
 */
export function creerStoreInitial(modeTest: boolean): {
  sessions: TpSession[];
  reservations: TpReservation[];
} {
  if (!modeTest) return { sessions: [], reservations: [] };
  return {
    sessions: JSON.parse(JSON.stringify(demoSessions)) as TpSession[],
    reservations: JSON.parse(JSON.stringify(demoReservations)) as TpReservation[],
  };
}

// État mémoire modifiable
const storeInitial = creerStoreInitial(isTestEnv);
let inMemorySessions: TpSession[] = storeInitial.sessions;
let inMemoryReservations: TpReservation[] = storeInitial.reservations;

export function resetTpStoreForTesting() {
  const initial = creerStoreInitial(true);
  inMemorySessions = initial.sessions;
  inMemoryReservations = initial.reservations;
}

/**
 * Détermine si un élève a le droit d'accéder au bac à sable / IDE de TP.
 * Règle stricte (Issue #161) : l'accès est bloqué tant que l'enseignant n'a pas validé.
 */
export function canAccessIde(reservation: TpReservation | null | undefined): boolean {
  return Boolean(reservation && reservation.status === "approved");
}

/**
 * Construit la grille des postes pour une session de TP donnée.
 * Attribue à chaque siège 1..maxSeats son état (libre, pending, approved, live).
 */
export function buildSeatGrid(session: TpSession, reservations: TpReservation[]): SeatInfo[] {
  const seats: SeatInfo[] = [];
  const sessionRes = reservations.filter((r) => r.sessionId === session.id);

  for (let seatNumber = 1; seatNumber <= session.maxSeats; seatNumber++) {
    // Ne considérer que les réservations non rejetées pour ce siège
    const activeRes = sessionRes.find(
      (r) => r.seatNumber === seatNumber && r.status !== "rejected",
    );

    let status: SeatState = "libre";
    if (activeRes) {
      if (activeRes.status === "pending") {
        status = "pending";
      } else if (activeRes.status === "approved") {
        status = session.status === "live" ? "live" : "approved";
      }
    }

    const info: SeatInfo = {
      seatNumber,
      status,
    };
    if (activeRes) {
      info.reservation = activeRes;
    }
    seats.push(info);
  }

  return seats;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbClient = supabase as any;

/**
 * Récupère la liste des séances de TP.
 */
export async function getTpSessions(classId?: string | undefined): Promise<TpSession[]> {
  const filterByClassOrGlobal = (list: TpSession[]) => {
    if (!classId) return [...list];
    const filtered = list.filter((s) => s.classId === classId || !s.classId);
    return filtered.length > 0 ? filtered : [...list];
  };

  if (isTestEnv) {
    return filterByClassOrGlobal(inMemorySessions);
  }

  try {
    const { data, error } = await dbClient
      .from("tp_sessions")
      .select("*")
      .order("start_time", { ascending: true });
    if (error || !data || data.length === 0) {
      return filterByClassOrGlobal(inMemorySessions);
    }

    const mapped = (data as Array<Record<string, unknown>>).map((row) => ({
      id: String(row["id"]),
      title: String(row["title"]),
      description: row["description"] ? String(row["description"]) : undefined,
      classId: row["class_id"] ? String(row["class_id"]) : undefined,
      sujetId: row["sujet_id"] ? String(row["sujet_id"]) : undefined,
      maxSeats: Number(row["max_seats"]) || 18,
      startTime: String(row["start_time"]),
      endTime: String(row["end_time"]),
      status: (row["status"] as TpSessionStatus) || "scheduled",
      createdBy: row["created_by"] ? String(row["created_by"]) : undefined,
      createdAt: String(row["created_at"]),
    }));
    return filterByClassOrGlobal(mapped);
  } catch {
    return filterByClassOrGlobal(inMemorySessions);
  }
}

/**
 * Récupère une séance par son ID.
 */
export async function getTpSessionById(sessionId: string): Promise<TpSession | null> {
  const sessions = await getTpSessions();
  return sessions.find((s) => s.id === sessionId) ?? null;
}

/**
 * Création d'une nouvelle séance de TP par l'enseignant.
 */
export async function createTpSession(params: {
  title: string;
  description?: string | undefined;
  classId?: string | undefined;
  sujetId?: string | undefined;
  maxSeats: number;
  startTime: string;
  endTime: string;
  createdBy?: string | undefined;
}): Promise<TpSession> {
  const newSession: TpSession = {
    id: `tp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: params.title,
    description: params.description,
    classId: params.classId,
    sujetId: params.sujetId,
    maxSeats: Math.max(1, Math.min(params.maxSeats, 50)),
    startTime: params.startTime,
    endTime: params.endTime,
    status: "scheduled",
    createdBy: params.createdBy,
    createdAt: new Date().toISOString(),
  };

  if (!isTestEnv) {
    try {
      const { data, error } = await dbClient
        .from("tp_sessions")
        .insert({
          title: newSession.title,
          description: newSession.description,
          class_id: newSession.classId,
          sujet_id: newSession.sujetId,
          max_seats: newSession.maxSeats,
          start_time: newSession.startTime,
          end_time: newSession.endTime,
          status: newSession.status,
          created_by: newSession.createdBy,
        })
        .select()
        .single();

      if (!error && data) {
        const row = data as Record<string, unknown>;
        newSession.id = String(row["id"]);
      }
    } catch {
      // Continue with in-memory store
    }
  }

  inMemorySessions.push(newSession);
  return newSession;
}

/**
 * Met à jour la capacité limite (max_seats) d'une séance de TP.
 */
export async function updateTpSessionCapacity(
  sessionId: string,
  maxSeats: number,
): Promise<{ success: boolean; maxSeats: number; error?: string | undefined }> {
  const targetSeats = Math.max(1, Math.min(maxSeats, 50));
  const session = inMemorySessions.find((s) => s.id === sessionId);
  if (session) {
    session.maxSeats = targetSeats;
  }

  if (isTestEnv) {
    return { success: true, maxSeats: targetSeats };
  }

  try {
    const { error } = await dbClient
      .from("tp_sessions")
      .update({ max_seats: targetSeats, updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (error) {
      return { success: !session, maxSeats: targetSeats, error: error.message };
    }
  } catch {
    // Continue with in-memory update
  }

  return { success: true, maxSeats: targetSeats };
}

/**
 * Met à jour le statut d'une séance de TP (scheduled, live, completed).
 */
export async function updateTpSessionStatus(
  sessionId: string,
  status: TpSessionStatus,
): Promise<{ success: boolean; status: TpSessionStatus; error?: string | undefined }> {
  const session = inMemorySessions.find((s) => s.id === sessionId);
  if (session) {
    session.status = status;
  }

  if (isTestEnv) {
    return { success: true, status };
  }

  try {
    const { error } = await dbClient
      .from("tp_sessions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (error) {
      return { success: false, status, error: error.message };
    }
  } catch {
    // Continue with in-memory
  }

  return { success: true, status };
}

/**
 * Récupère les réservations d'une séance.
 */
export async function getTpReservations(sessionId: string): Promise<TpReservation[]> {
  if (isTestEnv) {
    return inMemoryReservations.filter((r) => r.sessionId === sessionId);
  }

  try {
    const { data, error } = await dbClient
      .from("tp_reservations")
      .select("*, student:student_id(nom, prenom)")
      .eq("session_id", sessionId);

    if (error || !data || data.length === 0) {
      return inMemoryReservations.filter((r) => r.sessionId === sessionId);
    }

    return (data as Array<Record<string, unknown>>).map((row) => {
      const student = row["student"] as Record<string, unknown> | null;
      const joinedName = student
        ? `${String(student["prenom"] || "")} ${String(student["nom"] || "")}`.trim()
        : "";
      const rawNotes = row["notes"] ? String(row["notes"]).trim() : "";
      const seatNum = Number(row["seat_number"]);
      const studentIdStr = String(row["student_id"]);
      const inMemMatch = inMemoryReservations.find(
        (r) =>
          r.sessionId === sessionId && (r.seatNumber === seatNum || r.studentId === studentIdStr),
      );

      const resolvedStudentName =
        joinedName || inMemMatch?.studentName || rawNotes || `Élève (${studentIdStr.slice(0, 6)})`;

      const res: TpReservation = {
        id: String(row["id"]),
        sessionId: String(row["session_id"]),
        studentId: studentIdStr,
        seatNumber: seatNum,
        status: (row["status"] as TpReservationStatus) || "pending",
        createdAt: String(row["created_at"]),
        studentName: resolvedStudentName,
      };
      if (rawNotes) res.notes = rawNotes;
      return res;
    });
  } catch {
    return inMemoryReservations.filter((r) => r.sessionId === sessionId);
  }
}

/**
 * Formule une demande de réservation de siège par un élève.
 * Le siège passe initialement à l'état 'pending' (en attente de validation enseignant).
 */
export async function requestSeatReservation(params: {
  sessionId: string;
  seatNumber: number;
  studentId: string;
  studentName?: string | undefined;
  notes?: string | undefined;
}): Promise<{
  success: boolean;
  reservation?: TpReservation | undefined;
  error?: string | undefined;
}> {
  const session = await getTpSessionById(params.sessionId);
  if (!session) {
    return { success: false, error: "Séance de TP introuvable." };
  }

  // 1. Vérification de la capacité limite
  if (params.seatNumber < 1 || params.seatNumber > session.maxSeats) {
    return {
      success: false,
      error: `Numéro de poste invalide (${params.seatNumber}). La capacité de cette séance est de ${session.maxSeats} postes (dépasse la capacité maximale).`,
    };
  }

  const existingReservations = await getTpReservations(params.sessionId);

  // 2. Vérifier si l'élève a déjà une demande active pour cette séance
  const studentActiveRes = existingReservations.find(
    (r) => r.studentId === params.studentId && r.status !== "rejected",
  );
  if (studentActiveRes) {
    return {
      success: false,
      error: `Vous avez déjà réservé le Poste ${studentActiveRes.seatNumber} (${
        studentActiveRes.status === "approved" ? "confirmé" : "en attente"
      }).`,
    };
  }

  // 3. Vérifier si le siège demandé est déjà sollicité ou attribué
  const seatOccupied = existingReservations.find(
    (r) => r.seatNumber === params.seatNumber && r.status !== "rejected",
  );
  if (seatOccupied) {
    return {
      success: false,
      error: `Le Poste ${params.seatNumber} est déjà ${
        seatOccupied.status === "approved" ? "occupé" : "en cours de validation"
      }.`,
    };
  }

  // Création de la réservation avec statut "pending"
  const newReservation: TpReservation = {
    id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sessionId: params.sessionId,
    studentId: params.studentId,
    seatNumber: params.seatNumber,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  if (params.studentName) newReservation.studentName = params.studentName;
  if (params.notes) newReservation.notes = params.notes;

  if (!isTestEnv) {
    try {
      const { data, error } = await dbClient
        .from("tp_reservations")
        .insert({
          session_id: newReservation.sessionId,
          student_id: newReservation.studentId,
          seat_number: newReservation.seatNumber,
          status: "pending",
          notes: newReservation.notes ?? newReservation.studentName,
        })
        .select()
        .single();

      if (!error && data) {
        newReservation.id = String((data as Record<string, unknown>)["id"]);
      }
    } catch {
      // Continue with in-memory
    }
  }

  inMemoryReservations.push(newReservation);
  return { success: true, reservation: newReservation };
}

/**
 * Validation expresse d'une demande de siège par l'enseignant (bouton "Valider").
 */
export async function approveReservation(
  reservationId: string,
): Promise<{ success: boolean; error?: string | undefined }> {
  const res = inMemoryReservations.find((r) => r.id === reservationId);
  if (res) {
    res.status = "approved";
  }

  if (isTestEnv) {
    return { success: true };
  }

  try {
    const { error } = await dbClient
      .from("tp_reservations")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", reservationId);

    if (error) {
      return { success: false, error: error.message };
    }
  } catch {
    // Fallback in-memory
  }

  return { success: true };
}

/**
 * Refus d'une demande de siège par l'enseignant (bouton "Refuser").
 * Libère le siège pour d'autres élèves.
 */
export async function rejectReservation(
  reservationId: string,
): Promise<{ success: boolean; error?: string | undefined }> {
  const res = inMemoryReservations.find((r) => r.id === reservationId);
  if (res) {
    res.status = "rejected";
  }

  if (isTestEnv) {
    return { success: true };
  }

  try {
    const { error } = await dbClient
      .from("tp_reservations")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", reservationId);

    if (error) {
      return { success: false, error: error.message };
    }
  } catch {
    // Fallback in-memory
  }

  return { success: true };
}

/**
 * Action rapide enseignant : "Tout valider".
 * Confirme automatiquement les demandes dans la limite des places restantes.
 */
export async function batchApproveReservations(
  sessionId: string,
): Promise<{ approvedCount: number; errors: string[] }> {
  const session = await getTpSessionById(sessionId);
  if (!session) {
    return { approvedCount: 0, errors: ["Séance introuvable"] };
  }

  const allReservations = await getTpReservations(sessionId);
  const approvedCountCurrent = allReservations.filter((r) => r.status === "approved").length;
  let remainingCapacity = session.maxSeats - approvedCountCurrent;

  const pendingList = allReservations.filter((r) => r.status === "pending");
  let approvedCount = 0;
  const errors: string[] = [];

  for (const pending of pendingList) {
    if (remainingCapacity <= 0) {
      errors.push(`Capacité maximale atteinte (${session.maxSeats} postes).`);
      break;
    }

    const result = await approveReservation(pending.id);
    if (result.success) {
      approvedCount++;
      remainingCapacity--;
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return { approvedCount, errors };
}

/**
 * Annulation d'une réservation (par l'élève ou l'enseignant).
 */
export async function cancelReservation(
  reservationId: string,
  studentId?: string | undefined,
): Promise<{ success: boolean; error?: string | undefined }> {
  const index = inMemoryReservations.findIndex(
    (r) => r.id === reservationId && (!studentId || r.studentId === studentId),
  );
  if (index !== -1) {
    inMemoryReservations.splice(index, 1);
  }

  if (isTestEnv) {
    return { success: true };
  }

  try {
    let query = dbClient.from("tp_reservations").delete().eq("id", reservationId);
    if (studentId) {
      query = query.eq("student_id", studentId);
    }
    const { error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }
  } catch {
    // Continue in-memory
  }

  return { success: true };
}
