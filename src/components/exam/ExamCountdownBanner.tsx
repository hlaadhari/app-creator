import React, { useEffect, useState } from "react";
import { AlertCircle, Clock, Lock, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calculerCompteARebours, getTempsServeurSynchronise } from "@/lib/exam/server-clock";
import type { ExamCountdownState } from "@/lib/exam/types";

export interface ExamCountdownBannerProps {
  echeance: string | Date;
  titre?: string;
  isLocked?: boolean;
  onExpired?: () => void;
  className?: string;
}

export function ExamCountdownBanner({
  echeance,
  titre = "Épreuve Pratique du Baccalauréat STI",
  isLocked = false,
  onExpired,
  className = "",
}: ExamCountdownBannerProps) {
  const [countdown, setCountdown] = useState<ExamCountdownState>(() =>
    calculerCompteARebours(echeance, getTempsServeurSynchronise()),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const current = calculerCompteARebours(echeance, getTempsServeurSynchronise());
      setCountdown(current);

      if (current.isExpired && onExpired) {
        onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [echeance, onExpired]);

  // Styles visuels selon l'urgence
  const getBannerColor = () => {
    if (isLocked || countdown.isExpired) {
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
          {isLocked || countdown.isExpired ? (
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
            {isLocked || countdown.isExpired
              ? "Échéance serveur atteinte : dépôt verrouillé (T-06). Toute nouvelle écriture est refusée."
              : "Horloge serveur certifiée • Indices masqués • Corrigés inaccessibles"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">
            Temps Restant
          </div>
          <div className="text-lg font-mono font-bold tracking-tight">
            {isLocked || countdown.isExpired ? "00:00" : countdown.formatted}
          </div>
        </div>

        {countdown.isCritical && !countdown.isExpired && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Dernières minutes !</span>
          </div>
        )}
      </div>
    </div>
  );
}
