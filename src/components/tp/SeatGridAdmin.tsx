import React from "react";
import type { SeatInfo, TpSession } from "@/lib/tp/tp-reservation-service";
import { Monitor, User, Check, X, RotateCcw } from "lucide-react";

interface SeatGridAdminProps {
  session: TpSession;
  seats: SeatInfo[];
  onSelectSeat?: ((seat: SeatInfo) => void) | undefined;
  selectedSeatNumber?: number | null | undefined;
  onApproveSeat?: ((reservationId: string) => Promise<void> | void) | undefined;
  onRejectSeat?: ((reservationId: string) => Promise<void> | void) | undefined;
  isProcessing?: boolean | undefined;
}

export function SeatGridAdmin({
  session,
  seats,
  onSelectSeat,
  selectedSeatNumber,
  onApproveSeat,
  onRejectSeat,
  isProcessing = false,
}: SeatGridAdminProps) {
  const getStatusColor = (status: SeatInfo["status"]) => {
    switch (status) {
      case "libre":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:border-emerald-500";
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
        return <span className="text-[10px] text-emerald-400 font-medium">Libre</span>;
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
          const studentName =
            seat.reservation?.studentName ||
            (seat.reservation ? `Élève (${seat.reservation.studentId.slice(0, 6)})` : undefined);
          const reservationId = seat.reservation?.id;

          return (
            <div
              key={seat.seatNumber}
              onClick={() => onSelectSeat?.(seat)}
              className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${getStatusColor(
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

              <div className="mt-2.5 truncate">
                {studentName ? (
                  <div
                    className="text-xs font-semibold truncate flex items-center gap-1 text-foreground"
                    title={studentName}
                  >
                    <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{studentName}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground italic">Disponible</div>
                )}
              </div>

              {/* Actions rapides Enseignant directement sur la carte du poste */}
              {seat.status === "pending" && reservationId && (onApproveSeat || onRejectSeat) && (
                <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex items-center gap-1.5">
                  {onApproveSeat && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={(e) => {
                        e.stopPropagation();
                        void onApproveSeat(reservationId);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white py-1 px-1.5 text-[10px] font-semibold cursor-pointer disabled:opacity-50"
                      aria-label={`Valider directement le poste ${seat.seatNumber}`}
                    >
                      <Check className="h-3 w-3" />
                      <span>Valider</span>
                    </button>
                  )}
                  {onRejectSeat && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={(e) => {
                        e.stopPropagation();
                        void onRejectSeat(reservationId);
                      }}
                      className="inline-flex items-center justify-center rounded border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 py-1 px-1.5 text-[10px] font-semibold cursor-pointer disabled:opacity-50"
                      title="Refuser et libérer le poste"
                      aria-label={`Refuser directement le poste ${seat.seatNumber}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              {(seat.status === "approved" || seat.status === "live") &&
                reservationId &&
                onRejectSeat && (
                  <div className="mt-2.5 pt-2 border-t border-blue-500/20 flex items-center justify-end">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={(e) => {
                        e.stopPropagation();
                        void onRejectSeat(reservationId);
                      }}
                      className="w-full inline-flex items-center justify-center gap-1 rounded border border-border/80 bg-background/70 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 text-muted-foreground py-1 px-1.5 text-[10px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                      aria-label={`Libérer le poste ${seat.seatNumber}`}
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      <span>Libérer</span>
                    </button>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
