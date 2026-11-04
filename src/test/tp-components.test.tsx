import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SeatPicker } from "@/components/tp/SeatPicker";
import { ApprovalList } from "@/components/tp/ApprovalList";
import { SeatGridAdmin } from "@/components/tp/SeatGridAdmin";
import type { TpSession, SeatInfo, TpReservation } from "@/lib/tp/tp-reservation-service";

describe("TP UI Components Rendering and Interactions (Issue #161)", () => {
  const dummySession: TpSession = {
    id: "session-ui-1",
    title: "Séance TP B12",
    maxSeats: 6,
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };

  const dummySeats: SeatInfo[] = [
    { seatNumber: 1, status: "libre" },
    {
      seatNumber: 2,
      status: "pending",
      reservation: {
        id: "res-2",
        sessionId: "session-ui-1",
        studentId: "s2",
        seatNumber: 2,
        status: "pending",
        studentName: "Camille Dupont",
        createdAt: new Date().toISOString(),
      },
    },
    {
      seatNumber: 3,
      status: "approved",
      reservation: {
        id: "res-3",
        sessionId: "session-ui-1",
        studentId: "s3",
        seatNumber: 3,
        status: "approved",
        studentName: "Lucas Bernard",
        createdAt: new Date().toISOString(),
      },
    },
    { seatNumber: 4, status: "libre" },
    { seatNumber: 5, status: "libre" },
    { seatNumber: 6, status: "libre" },
  ];

  describe("SeatPicker (Élève)", () => {
    it("affiche l'alerte d'attente et bloque l'accès à l'IDE lorsque la réservation est en 'pending'", () => {
      const pendingRes: TpReservation = {
        id: "res-my-pending",
        sessionId: "session-ui-1",
        studentId: "my-id",
        seatNumber: 2,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      const handleLaunch = vi.fn();
      render(
        <SeatPicker
          session={dummySession}
          seats={dummySeats}
          myReservation={pendingRes}
          onRequestReservation={vi.fn()}
          onCancelReservation={vi.fn()}
          onLaunchIde={handleLaunch}
        />,
      );

      expect(screen.getByText(/Réservation en attente de validation/i)).toBeInTheDocument();
      // Le bouton IDE doit être bloqué/désactivé
      const ideButton = screen.getByText(/Rejoindre mon Poste \(Bloqué\)/i).closest("button");
      expect(ideButton).toBeDisabled();
    });

    it("débloque le bouton 'Rejoindre mon Poste (IDE)' lorsque la réservation est 'approved'", () => {
      const approvedRes: TpReservation = {
        id: "res-my-approved",
        sessionId: "session-ui-1",
        studentId: "my-id",
        seatNumber: 3,
        status: "approved",
        createdAt: new Date().toISOString(),
      };

      const handleLaunch = vi.fn();
      render(
        <SeatPicker
          session={dummySession}
          seats={dummySeats}
          myReservation={approvedRes}
          onRequestReservation={vi.fn()}
          onCancelReservation={vi.fn()}
          onLaunchIde={handleLaunch}
        />,
      );

      const launchButton = screen.getByRole("button", { name: /Rejoindre mon Poste \(IDE\)/i });
      expect(launchButton).toBeEnabled();

      fireEvent.click(launchButton);
      expect(handleLaunch).toHaveBeenCalledTimes(1);
    });

    it("permet de sélectionner un poste libre et de formuler une demande", () => {
      const handleRequest = vi.fn();
      render(
        <SeatPicker
          session={dummySession}
          seats={dummySeats}
          onRequestReservation={handleRequest}
          onCancelReservation={vi.fn()}
          onLaunchIde={vi.fn()}
        />,
      );

      // Cliquer sur le poste 4 (libre)
      const seat4 = screen.getByLabelText(/Poste 4 : libre/i);
      fireEvent.click(seat4);

      // Le bouton "Demander la réservation" doit maintenant être actif
      const requestButton = screen.getByRole("button", { name: /Demander la réservation/i });
      expect(requestButton).toBeEnabled();

      fireEvent.click(requestButton);
      expect(handleRequest).toHaveBeenCalledWith(4);
    });
  });

  describe("ApprovalList (Enseignant)", () => {
    const dummyReservations: TpReservation[] = [
      {
        id: "res-pending-1",
        sessionId: "session-ui-1",
        studentId: "s2",
        studentName: "Camille Dupont",
        seatNumber: 2,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
      {
        id: "res-approved-1",
        sessionId: "session-ui-1",
        studentId: "s3",
        studentName: "Lucas Bernard",
        seatNumber: 3,
        status: "approved",
        createdAt: new Date().toISOString(),
      },
    ];

    it("liste les demandes en attente avec boutons 'Valider' et 'Refuser'", () => {
      const handleApprove = vi.fn();
      const handleReject = vi.fn();
      const handleBatch = vi.fn();

      render(
        <ApprovalList
          reservations={dummyReservations}
          maxSeats={6}
          approvedCount={1}
          onApprove={handleApprove}
          onReject={handleReject}
          onBatchApprove={handleBatch}
        />,
      );

      expect(screen.getByText("Camille Dupont")).toBeInTheDocument();
      expect(screen.getByText("Poste 02")).toBeInTheDocument();

      const validerBtn = screen.getByRole("button", { name: /Valider la demande du poste 2/i });
      const refuserBtn = screen.getByRole("button", { name: /Refuser la demande du poste 2/i });

      fireEvent.click(validerBtn);
      expect(handleApprove).toHaveBeenCalledWith("res-pending-1");

      fireEvent.click(refuserBtn);
      expect(handleReject).toHaveBeenCalledWith("res-pending-1");
    });

    it("affiche le quota de capacité et déclenche 'Tout valider'", () => {
      const handleBatch = vi.fn();
      render(
        <ApprovalList
          reservations={dummyReservations}
          maxSeats={6}
          approvedCount={1}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onBatchApprove={handleBatch}
        />,
      );

      expect(screen.getByText(/5 place\(s\) restante\(s\)/i)).toBeInTheDocument();

      const batchBtn = screen.getByRole("button", { name: /Tout valider les demandes/i });
      fireEvent.click(batchBtn);
      expect(handleBatch).toHaveBeenCalledTimes(1);
    });
  });

  describe("SeatGridAdmin (Enseignant)", () => {
    it("affiche les 4 états de postes et les noms des élèves", () => {
      render(<SeatGridAdmin session={dummySession} seats={dummySeats} />);

      expect(screen.getByText("Plan de Salle & Occupation des Postes")).toBeInTheDocument();
      expect(screen.getByText("Camille Dupont")).toBeInTheDocument();
      expect(screen.getByText("Lucas Bernard")).toBeInTheDocument();
      expect(screen.getByText(/Libre \(4\)/i)).toBeInTheDocument();
    });
  });
});
