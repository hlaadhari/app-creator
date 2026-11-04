import React, { useState } from "react";
import type { SeatInfo, TpReservation, TpSession } from "@/lib/tp/tp-reservation-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Rocket,
  XCircle,
  HelpCircle,
  User,
} from "lucide-react";

interface SeatPickerProps {
  session: TpSession;
  seats: SeatInfo[];
  myReservation?: TpReservation | null | undefined;
  onRequestReservation: (seatNumber: number) => Promise<void> | void;
  onCancelReservation: (reservationId: string) => Promise<void> | void;
  onLaunchIde: () => void;
  isSubmitting?: boolean | undefined;
}

export function SeatPicker({
  session,
  seats,
  myReservation,
  onRequestReservation,
  onCancelReservation,
  onLaunchIde,
  isSubmitting = false,
}: SeatPickerProps) {
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<number | null>(null);

  const isApproved = myReservation?.status === "approved";
  const isPending = myReservation?.status === "pending";
  const isRejected = myReservation?.status === "rejected";

  const handleSeatClick = (seat: SeatInfo) => {
    // Si l'élève a déjà une réservation validée ou en attente, il ne peut pas en choisir un autre sans annuler
    if (isApproved || isPending) return;

    if (seat.status === "libre") {
      setSelectedSeatNumber(seat.seatNumber);
    }
  };

  const getSeatBadgeColor = (seat: SeatInfo) => {
    const isMySeat = myReservation && myReservation.seatNumber === seat.seatNumber;
    if (isMySeat) {
      if (isApproved) return "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400";
      if (isPending)
        return "bg-amber-500 text-white border-amber-500 ring-2 ring-amber-300 animate-pulse";
    }

    switch (seat.status) {
      case "libre":
        return "bg-background border-border hover:border-primary text-foreground";
      case "pending":
        return "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 cursor-not-allowed";
      case "approved":
        return "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300 cursor-not-allowed";
      case "live":
        return "bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300 cursor-not-allowed";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Bandeau de statut de ma réservation */}
      {myReservation && (
        <div className="rounded-lg border p-4 transition-all">
          {isApproved && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                    <span>
                      Poste {String(myReservation.seatNumber).padStart(2, "0")} confirmé par
                      l'enseignant
                    </span>
                    <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                      Accès autorisé
                    </Badge>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                    Votre poste est validé. Vous pouvez dès à présent entrer dans le bac à sable de
                    programmation pour réaliser votre TP.
                  </p>
                </div>
              </div>
              <Button
                onClick={onLaunchIde}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer shrink-0"
                aria-label="Rejoindre mon Poste (IDE)"
              >
                <Rocket className="h-4 w-4" />
                <span>🚀 Rejoindre mon Poste (IDE)</span>
              </Button>
            </div>
          )}

          {isPending && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-spin" />
                <div>
                  <div className="font-semibold text-sm text-amber-950 dark:text-amber-100 flex items-center gap-2">
                    <span>⏳ Réservation en attente de validation par l'enseignant</span>
                    <Badge
                      variant="outline"
                      className="border-amber-500 text-amber-600 dark:text-amber-300 font-mono text-[10px]"
                    >
                      Poste {String(myReservation.seatNumber).padStart(2, "0")}
                    </Badge>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                    L'attribution définitive et l'accès à l'IDE nécessitent la validation de votre
                    professeur. Veuillez patienter ou vérifier auprès de lui.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancelReservation(myReservation.id)}
                  disabled={isSubmitting}
                  className="text-xs border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/10 cursor-pointer"
                >
                  Annuler la demande
                </Button>
                {/* Bouton IDE STRICTEMENT désactivé tant que la demande est pending */}
                <Button
                  disabled
                  title="Accès verrouillé tant que la demande n'est pas validée par l'enseignant"
                  className="gap-2 opacity-50 cursor-not-allowed text-xs"
                >
                  <Rocket className="h-4 w-4" />
                  <span>🚀 Rejoindre mon Poste (Bloqué)</span>
                </Button>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-lg">
              <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-rose-950 dark:text-rose-100">
                  Demande refusée pour le Poste {String(myReservation.seatNumber).padStart(2, "0")}
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
                  L'enseignant a libéré ce poste. Veuillez choisir un autre siège disponible dans la
                  liste ci-dessous.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Grille de sélection des postes */}
      <div className="rounded-lg border bg-card p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
          <div>
            <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              <span>Choix de votre Poste de TP</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sélectionnez un siège libre (fond vert/blanc). Capacité de la salle :{" "}
              {session.maxSeats} postes.
            </p>
          </div>

          {/* Légende */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Libre</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">En attente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Occupé / Confirmé</span>
            </div>
          </div>
        </div>

        {/* Grille */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
          {seats.map((seat) => {
            const isSelected = selectedSeatNumber === seat.seatNumber;
            const isClickable = seat.status === "libre" && !isApproved && !isPending;

            return (
              <button
                key={seat.seatNumber}
                type="button"
                disabled={!isClickable}
                onClick={() => handleSeatClick(seat)}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  isClickable
                    ? "cursor-pointer hover:border-primary"
                    : "cursor-not-allowed opacity-80"
                } ${isSelected ? "ring-2 ring-primary border-primary bg-primary/10" : getSeatBadgeColor(seat)}`}
                aria-label={`Poste ${seat.seatNumber} : ${seat.status}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold">
                    Poste {String(seat.seatNumber).padStart(2, "0")}
                  </span>
                  {seat.status === "libre" ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Libre
                    </span>
                  ) : seat.status === "pending" ? (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      Attente
                    </span>
                  ) : (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      Occupé
                    </span>
                  )}
                </div>

                <div className="mt-2 text-[11px] text-muted-foreground">
                  {seat.status === "libre" ? (
                    <span>Cliquer pour choisir</span>
                  ) : (
                    <span className="italic">Non disponible</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bouton de confirmation de la demande de réservation */}
        {!isApproved && !isPending && (
          <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {selectedSeatNumber ? (
                <span className="font-medium text-foreground">
                  Poste sélectionné :{" "}
                  <span className="font-mono text-primary font-bold">
                    Poste {String(selectedSeatNumber).padStart(2, "0")}
                  </span>
                </span>
              ) : (
                <span>Veuillez cliquer sur un poste libre ci-dessus pour le sélectionner.</span>
              )}
            </div>

            <Button
              onClick={() => selectedSeatNumber && onRequestReservation(selectedSeatNumber)}
              disabled={isSubmitting || !selectedSeatNumber}
              className="gap-2 bg-primary text-primary-foreground cursor-pointer"
              aria-label="Demander la réservation"
            >
              <Clock className="h-4 w-4" />
              <span>Demander la réservation</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
