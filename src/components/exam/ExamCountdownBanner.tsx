import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Lock, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calculerCompteARebours, getTempsServeurSynchronise } from "@/lib/exam/server-clock";
import type { ExamCountdownState } from "@/lib/exam/types";

export interface ExamCountdownBannerProps {
  echeance: string | Date;
  titre?: string;
  isLocked?: boolean;
  motifCloture?: "remise_volontaire" | "temps_ecoule" | null;
  onExpired?: () => void;
  className?: string;
}

const COMPTE_A_REBOURS_INITIAL: ExamCountdownState = {
  remainingMs: 0,
  remainingSeconds: 0,
  formatted: "--:--",
  isExpired: false,
  isCritical: false,
  isWarning: false,
};

export function ExamCountdownBanner({
  echeance,
  titre = "Épreuve Pratique du Baccalauréat STI",
  isLocked = false,
  motifCloture = null,
  onExpired,
  className = "",
}: ExamCountdownBannerProps) {
  // Premier rendu identique côté serveur et navigateur (#196, erreur React #418) : le temps restant
  // dépend de l'horloge courante, il n'est donc calculé qu'après l'hydratation, dans l'effet.
  const [countdown, setCountdown] = useState<ExamCountdownState>(COMPTE_A_REBOURS_INITIAL);

  const isVoluntarySubmit = isLocked && motifCloture === "remise_volontaire";
  const isTimeExpired = countdown.isExpired || (isLocked && motifCloture !== "remise_volontaire");

  useEffect(() => {
    if (isLocked) return;

    const tick = () => {
      const current = calculerCompteARebours(echeance, getTempsServeurSynchronise());
      setCountdown(current);

      if (current.isExpired && onExpired) {
        onExpired();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [echeance, isLocked, onExpired]);

  // Styles visuels selon l'urgence ou le motif de clôture (#197)
  const getBannerColor = () => {
    if (isVoluntarySubmit) {
      return "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200";
    }
    if (isTimeExpired) {
      return "bg-destructive/15 border-destructive/40 text-destructive";
    }
    if (countdown.isCritical) {
      return "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 animate-pulse";
    }
    if (countdown.isWarning) {
      return "bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-200";
    }
    return "bg-primary/10 border-primary/30 text-foreground";
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-xs shadow-sm transition-colors ${getBannerColor()} ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 shadow-xs">
          {isVoluntarySubmit ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : isTimeExpired ? (
            <Lock className="h-4 w-4 text-destructive" />
          ) : countdown.isCritical ? (
            <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          ) : (
            <Clock className="h-4 w-4 text-primary" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight">{titre}</span>
            <Badge variant="outline" className="text-[10px] font-normal uppercase tracking-wider">
              Mode Examen Officiel
            </Badge>
          </div>
          <p className="text-[11px] opacity-80">
            {isVoluntarySubmit
              ? "Remise volontaire effectuée : votre copie est scellée sur le serveur et transmise pour correction."
              : isTimeExpired
                ? "Échéance serveur atteinte : dépôt verrouillé (T-06). Toute nouvelle écriture est refusée."
                : "Horloge serveur certifiée • Indices masqués • Corrigés inaccessibles"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">
            {isVoluntarySubmit ? "Statut de la copie" : "Temps Restant"}
          </div>
          <div className="text-lg font-mono font-bold tracking-tight">
            {isVoluntarySubmit ? "Copie remise" : isTimeExpired ? "00:00" : countdown.formatted}
          </div>
        </div>

        {countdown.isCritical && !countdown.isExpired && !isLocked && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Dernières minutes !</span>
          </div>
        )}
      </div>
    </div>
  );
}
