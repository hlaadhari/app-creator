import { describe, it, expect, beforeEach } from "vitest";
import {
  getTpSessions,
  getTpSessionById,
  createTpSession,
  updateTpSessionCapacity,
  updateTpSessionStatus,
  getTpReservations,
  requestSeatReservation,
  approveReservation,
  rejectReservation,
  batchApproveReservations,
  cancelReservation,
  buildSeatGrid,
  canAccessIde,
  resetTpStoreForTesting,
  type TpSession,
} from "@/lib/tp/tp-reservation-service";

describe("TP Seat Reservation with Teacher Approval & Capacity Limit (Issue #161)", () => {
  beforeEach(() => {
    resetTpStoreForTesting();
  });

  describe("1. Capacité Limite Configurable par Session", () => {
    it("permet à l'enseignant de créer une session avec une capacité personnalisée", async () => {
      const session = await createTpSession({
        title: "Session Test 15 Postes",
        maxSeats: 15,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });

      expect(session).toBeDefined();
      expect(session.maxSeats).toBe(15);
      expect(session.status).toBe("scheduled");
    });

    it("permet de mettre à jour la capacité d'une séance existante", async () => {
      const session = await createTpSession({
        title: "Session Test Ajustement",
        maxSeats: 12,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });

      const updated = await updateTpSessionCapacity(session.id, 24);
      expect(updated.success).toBe(true);
      expect(updated.maxSeats).toBe(24);

      const refreshed = await getTpSessionById(session.id);
      expect(refreshed?.maxSeats).toBe(24);
    });

    it("bloque les réservations dont le numéro de poste dépasse la capacité maximale", async () => {
      const session = await createTpSession({
        title: "Petite Salle 10 Postes",
        maxSeats: 10,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });

      const res = await requestSeatReservation({
        sessionId: session.id,
        seatNumber: 11, // Dépasse la capacité
        studentId: "eleve-hors-limite",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("dépasse la capacité maximale");
    });
  });

  describe("2. Workflow d'Attribution Soumis à Validation Enseignant", () => {
    it("enregistre une demande élève au statut 'pending' sans réservation définitive", async () => {
      const session = await createTpSession({
        title: "Salle Examen",
        maxSeats: 20,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });

      const res = await requestSeatReservation({
        sessionId: session.id,
        seatNumber: 7,
        studentId: "eleve-test-1",
        studentName: "Lucas Bernard",
      });

      expect(res.success).toBe(true);
      expect(res.reservation).toBeDefined();
      expect(res.reservation?.status).toBe("pending");
      expect(res.reservation?.seatNumber).toBe(7);

      // L'accès à l'IDE doit être strictement bloqué
      expect(canAccessIde(res.reservation)).toBe(false);
    });

    it("interdit à un élève de réserver plusieurs postes dans une même séance", async () => {
      const session = await createTpSession({
        title: "Salle Examen Unique",
        maxSeats: 20,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });

      await requestSeatReservation({
        sessionId: session.id,
        seatNumber: 4,
        studentId: "eleve-gourmand",
      });

      const secondAttempt = await requestSeatReservation({
        sessionId: session.id,
        seatNumber: 8,
        studentId: "eleve-gourmand",
      });

      expect(secondAttempt.success).toBe(false);
      expect(secondAttempt.error).toContain("Vous avez déjà réservé le Poste 4");
    });

    it("interdit à un second élève de demander un poste déjà en attente ou approuvé", async () => {
      const session = await createTpSession({
        title: "Salle Examen Concurrence",
        maxSeats: 20,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });

      await requestSeatReservation({
        sessionId: session.id,
        seatNumber: 5,
        studentId: "eleve-1",
      });

      const resConflict = await requestSeatReservation({
        sessionId: session.id,
        seatNumber: 5,
        studentId: "eleve-2",
      });

      expect(resConflict.success).toBe(false);
      expect(resConflict.error).toContain("Le Poste 5 est déjà en cours de validation");
    });

    it("permet à l'enseignant de valider une demande, ce qui débloque l'IDE", async () => {
      const session = await createTpSession({
        title: "Validation Test",
        maxSeats: 10,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });

      const req = await requestSeatReservation({
        sessionId: session.id,
        seatNumber: 2,
        studentId: "eleve-valide",
      });

      expect(req.reservation).toBeDefined();
      const resId = req.reservation!.id;

      // Validation par l'enseignant
      const approval = await approveReservation(resId);
      expect(approval.success).toBe(true);

      const allRes = await getTpReservations(session.id);
      const validatedRes = allRes.find((r) => r.id === resId);
      expect(validatedRes?.status).toBe("approved");

      // Accès IDE désormais autorisé
      expect(canAccessIde(validatedRes)).toBe(true);
    });

    it("permet à l'enseignant de refuser une demande, ce qui libère le poste", async () => {
      const session = await createTpSession({
        title: "Refus Test",
        maxSeats: 10,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });

      const req = await requestSeatReservation({
        sessionId: session.id,
        seatNumber: 6,
        studentId: "eleve-refuse",
      });

      const resId = req.reservation!.id;
      const rejection = await rejectReservation(resId);
      expect(rejection.success).toBe(true);

      // Le poste 6 est désormais libre pour un autre élève
      const secondReq = await requestSeatReservation({
        sessionId: session.id,
        seatNumber: 6,
        studentId: "autre-eleve",
      });
      expect(secondReq.success).toBe(true);
      expect(secondReq.reservation?.status).toBe("pending");
    });

    it("Tout valider confirme automatiquement les demandes dans la limite des places restantes", async () => {
      // Session avec capacité 2
      const session = await createTpSession({
        title: "Salle 2 Places",
        maxSeats: 2,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      });

      // 3 demandes sur des postes différents (1, 2, et simuler 3 si maxSeats était 3)
      // Ajustons maxSeats à 3 initialement pour accepter les demandes, puis réduisons à 2
      await updateTpSessionCapacity(session.id, 3);
      await requestSeatReservation({ sessionId: session.id, seatNumber: 1, studentId: "e1" });
      await requestSeatReservation({ sessionId: session.id, seatNumber: 2, studentId: "e2" });
      await requestSeatReservation({ sessionId: session.id, seatNumber: 3, studentId: "e3" });

      // Réduire la capacité à 2
      await updateTpSessionCapacity(session.id, 2);

      // Tout valider
      const batchResult = await batchApproveReservations(session.id);
      expect(batchResult.approvedCount).toBe(2);
      expect(batchResult.errors.length).toBeGreaterThan(0);
      expect(batchResult.errors[0]).toContain("Capacité maximale atteinte (2 postes)");

      const reservations = await getTpReservations(session.id);
      const approved = reservations.filter((r) => r.status === "approved");
      expect(approved.length).toBe(2);
    });
  });

  describe("3. Grille de Salle (SeatGrid) et États des Postes", () => {
    it("calcule correctement les états 'libre', 'pending', 'approved' et 'live'", async () => {
      const session: TpSession = {
        id: "tp-grid-test",
        title: "Grid Test",
        maxSeats: 4,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        status: "scheduled",
        createdAt: new Date().toISOString(),
      };

      const reservations = [
        {
          id: "r1",
          sessionId: "tp-grid-test",
          studentId: "s1",
          seatNumber: 1,
          status: "pending" as const,
          createdAt: new Date().toISOString(),
        },
        {
          id: "r2",
          sessionId: "tp-grid-test",
          studentId: "s2",
          seatNumber: 2,
          status: "approved" as const,
          createdAt: new Date().toISOString(),
        },
      ];

      const gridScheduled = buildSeatGrid(session, reservations);
      expect(gridScheduled.length).toBe(4);
      expect(gridScheduled[0]!.status).toBe("pending"); // Poste 1
      expect(gridScheduled[1]!.status).toBe("approved"); // Poste 2
      expect(gridScheduled[2]!.status).toBe("libre"); // Poste 3
      expect(gridScheduled[3]!.status).toBe("libre"); // Poste 4

      // Quand la session passe en statut 'live' (en direct)
      session.status = "live";
      const gridLive = buildSeatGrid(session, reservations);
      expect(gridLive[1]!.status).toBe("live"); // Poste 2 passe en "live"
    });
  });
});
