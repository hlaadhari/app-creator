import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SeatPicker } from "@/components/tp/SeatPicker";
import { ApprovalList } from "@/components/tp/ApprovalList";
import { SeatGridAdmin } from "@/components/tp/SeatGridAdmin";
import { TpSessionManager } from "@/components/tp/TpSessionManager";
import {
  getTpSessions,
  resetTpStoreForTesting,
  type TpSession,
  type SeatInfo,
  type TpReservation,
} from "@/lib/tp/tp-reservation-service";

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

    it("affiche clairement le nom de l'élève qui occupe ou a demandé chaque poste", () => {
      render(
        <SeatPicker
          session={dummySession}
          seats={dummySeats}
          onRequestReservation={vi.fn()}
          onCancelReservation={vi.fn()}
          onLaunchIde={vi.fn()}
        />,
      );

      expect(screen.getByText("Camille Dupont")).toBeInTheDocument();
      expect(screen.getByText("Lucas Bernard")).toBeInTheDocument();
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

    it("permet de valider, refuser ou libérer un poste directement depuis la carte du poste", () => {
      const handleApproveSeat = vi.fn();
      const handleRejectSeat = vi.fn();

      render(
        <SeatGridAdmin
          session={dummySession}
          seats={dummySeats}
          onApproveSeat={handleApproveSeat}
          onRejectSeat={handleRejectSeat}
        />,
      );

      const validerPoste2 = screen.getByRole("button", {
        name: /Valider directement le poste 2/i,
      });
      fireEvent.click(validerPoste2);
      expect(handleApproveSeat).toHaveBeenCalledWith("res-2");

      const libererPoste3 = screen.getByRole("button", {
        name: /Libérer le poste 3/i,
      });
      fireEvent.click(libererPoste3);
      expect(handleRejectSeat).toHaveBeenCalledWith("res-3");
    });
  });

  describe("TpSessionManager (Créneau TP daté et rattaché à une classe, #195)", () => {
    it("n'affiche aucune séance ni élève de démo pour une classe vide et permet de créer un créneau daté lié à la classe", async () => {
      resetTpStoreForTesting();

      render(
        <TpSessionManager
          currentClassId="cls-vide-195"
          classes={[
            { id: "cls-vide-195", nom: "4ème SI - Groupe B" },
            { id: "cls-autre-195", nom: "4ème SI - Groupe C" },
          ]}
          teacherId="prof-1"
        />,
      );

      expect(
        await screen.findByText(/Aucune séance de TP configurée pour cette classe/i),
      ).toBeInTheDocument();
      expect(screen.queryByText("Bernard Lucas")).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: /Créer un créneau TP/i }));

      const titleInput = screen.getByLabelText(/Titre de la séance TP/i);
      const classSelect = screen.getByLabelText(/Classe concernée/i) as HTMLSelectElement;
      const startInput = screen.getByLabelText(/Date et heure de début/i);
      const durationInput = screen.getByLabelText(/Durée \(minutes\)/i);

      expect(classSelect.value).toBe("cls-vide-195");

      fireEvent.change(titleInput, { target: { value: "TP Bac 2025 - Salle B12" } });
      fireEvent.change(startInput, { target: { value: "2026-11-15T09:00" } });
      fireEvent.change(durationInput, { target: { value: "90" } });

      fireEvent.click(screen.getByRole("button", { name: /^Créer la séance$/i }));

      await waitFor(() => {
        expect(screen.queryByText(/Aucune séance de TP configurée pour cette classe/i)).toBeNull();
      });

      const classSessions = await getTpSessions("cls-vide-195");
      expect(classSessions).toHaveLength(1);
      expect(classSessions[0]?.title).toBe("TP Bac 2025 - Salle B12");
      expect(classSessions[0]?.classId).toBe("cls-vide-195");
      const diffMinutes =
        (new Date(classSessions[0]!.endTime).getTime() -
          new Date(classSessions[0]!.startTime).getTime()) /
        60_000;
      expect(diffMinutes).toBe(90);
    });
  });
});
