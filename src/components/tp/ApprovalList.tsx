import React from "react";
import type { TpReservation } from "@/lib/tp/tp-reservation-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Zap, AlertCircle, Clock, User } from "lucide-react";

interface ApprovalListProps {
  reservations: TpReservation[];
  maxSeats: number;
  approvedCount: number;
  onApprove: (reservationId: string) => Promise<void> | void;
  onReject: (reservationId: string) => Promise<void> | void;
  onBatchApprove: () => Promise<void> | void;
  isProcessing?: boolean | undefined;
}

export function ApprovalList({
  reservations,
  maxSeats,
  approvedCount,
  onApprove,
  onReject,
  onBatchApprove,
  isProcessing = false,
}: ApprovalListProps) {
  const pendingReservations = reservations.filter((r) => r.status === "pending");
  const approvedReservations = reservations.filter((r) => r.status === "approved");
  const remainingCapacity = Math.max(0, maxSeats - approvedCount);
  const isFull = remainingCapacity <= 0;

  return (
    <div className="rounded-lg border bg-card p-5 shadow-xs">
      {/* En-tête avec indicateur de quota et bouton "Tout valider" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-foreground">
              Demandes de Sièges en Attente
            </h3>
            <Badge
              variant={pendingReservations.length > 0 ? "secondary" : "outline"}
              className="font-mono text-xs"
            >
              {pendingReservations.length} en attente
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Validez ou refusez les demandes d'attribution de postes des élèves avant le début du TP.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <div className="font-medium text-foreground">
              Capacité : <span className="font-mono">{approvedCount}</span> /{" "}
              <span className="font-mono">{maxSeats}</span> validés
            </div>
            <div
              className={`font-mono text-[11px] ${
                isFull ? "text-rose-500 font-semibold" : "text-muted-foreground"
              }`}
            >
              {isFull ? "Salle complète" : `${remainingCapacity} place(s) restante(s)`}
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => onBatchApprove()}
            disabled={isProcessing || pendingReservations.length === 0 || isFull}
            className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            aria-label="Tout valider les demandes"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Tout valider</span>
          </Button>
        </div>
      </div>

      {/* Alerte si capacité atteinte */}
      {isFull && pendingReservations.length > 0 && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            La capacité maximale du TP ({maxSeats} postes) est atteinte. Vous devez augmenter la
            limite ou refuser certaines demandes pour attribuer d'autres postes.
          </span>
        </div>
      )}

      {/* Liste des demandes */}
      {pendingReservations.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          Aucune demande en attente pour cette séance.
        </div>
      ) : (
        <div className="divide-y divide-border mt-3">
          {pendingReservations.map((demande) => {
            const formattedTime = new Date(demande.createdAt).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const formattedDate = new Date(demande.createdAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
            });

            return (
              <div
                key={demande.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-accent/30 px-2 rounded-md transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-semibold text-xs shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-foreground flex items-center gap-2">
                      <span>
                        {demande.studentName || `Élève (${demande.studentId.slice(0, 8)})`}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[11px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400"
                      >
                        Poste {String(demande.seatNumber).padStart(2, "0")}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>
                        Demandé le {formattedDate} à {formattedTime}
                      </span>
                      {demande.notes && <span className="italic">— {demande.notes}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReject(demande.id)}
                    disabled={isProcessing}
                    className="h-8 gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-300 dark:border-rose-800 cursor-pointer"
                    aria-label={`Refuser la demande du poste ${demande.seatNumber}`}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Refuser</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onApprove(demande.id)}
                    disabled={isProcessing || isFull}
                    className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    aria-label={`Valider la demande du poste ${demande.seatNumber}`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Valider</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Liste récapitulative des postes déjà confirmés / occupés */}
      {approvedReservations.length > 0 && (
        <div className="mt-5 pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Postes confirmés & occupés ({approvedReservations.length})
            </h4>
          </div>
          <div className="divide-y divide-border">
            {approvedReservations.map((conf) => (
              <div
                key={conf.id}
                className="py-2 flex items-center justify-between gap-3 text-xs px-2 rounded hover:bg-accent/20"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Badge className="bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-mono text-[11px] shrink-0">
                    Poste {String(conf.seatNumber).padStart(2, "0")}
                  </Badge>
                  <span className="font-medium text-foreground truncate">
                    {conf.studentName || `Élève (${conf.studentId.slice(0, 8)})`}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReject(conf.id)}
                  disabled={isProcessing}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-rose-600 cursor-pointer shrink-0"
                  aria-label={`Libérer le poste occupé ${conf.seatNumber}`}
                >
                  Libérer le poste
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
