import React from "react";
import type { SeatInfo, TpSession } from "@/lib/tp/tp-reservation-service";
import { Monitor, User, Clock, CheckCircle2 } from "lucide-react";

interface SeatGridAdminProps {
  session: TpSession;
  seats: SeatInfo[];
  onSelectSeat?: ((seat: SeatInfo) => void) | undefined;
  selectedSeatNumber?: number | null | undefined;
}

export function SeatGridAdmin({
  session,
  seats,
  onSelectSeat,
  selectedSeatNumber,
}: SeatGridAdminProps) {
  const getStatusColor = (status: SeatInfo["status"]) => {
    switch (status) {
      case "libre":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500";
      case "pending":
        return "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:border-amber-500 animate-pulse";
      case "approved":
        return "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300 hover:border-blue-500";
      case "live":
        return "bg-purple-500/20 border-purple-500/50 text-purple-700 dark:text-purple-300 hover:border-purple-500";
    }
  };

  const getStatusBadge = (status: SeatInfo["status"]) => {
    switch (status) {
      case "libre":
        return (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            Libre
          </span>
        );
      case "pending":
        return (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            En attente
          </span>
        );
      case "approved":
        return (
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Confirmé</span>
        );
      case "live":
        return (
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
            En session
          </span>
        );
    }
  };

  const countLibre = seats.filter((s) => s.status === "libre").length;
  const countPending = seats.filter((s) => s.status === "pending").length;
  const countApproved = seats.filter((s) => s.status === "approved").length;
  const countLive = seats.filter((s) => s.status === "live").length;

  return (
    <div className="rounded-lg border bg-card p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
        <div>
          <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" />
            <span>Plan de Salle & Occupation des Postes</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Surveillance en temps réel des {session.maxSeats} postes configurés.
          </p>
        </div>

        {/* Légende interactive */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Libre ({countLibre})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">En attente ({countPending})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Confirmé ({countApproved})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            <span className="text-muted-foreground">En session ({countLive})</span>
          </div>
        </div>
      </div>

      {/* Grille des postes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
        {seats.map((seat) => {
          const isSelected = selectedSeatNumber === seat.seatNumber;
          const studentName = seat.reservation?.studentName;

          return (
            <button
              key={seat.seatNumber}
              type="button"
              onClick={() => onSelectSeat?.(seat)}
              className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${getStatusColor(
                seat.status,
              )} ${isSelected ? "ring-2 ring-primary ring-offset-2" : ""}`}
              aria-label={`Poste ${seat.seatNumber} : statut ${seat.status}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold">
                  P-{String(seat.seatNumber).padStart(2, "0")}
                </span>
                {getStatusBadge(seat.status)}
              </div>

              <div className="mt-3 truncate">
                {studentName ? (
                  <div className="text-xs font-medium truncate flex items-center gap-1">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">{studentName}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground italic">Disponible</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
