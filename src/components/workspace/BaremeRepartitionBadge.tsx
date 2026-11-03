import React from "react";
import { CheckCircle2, UserCheck } from "lucide-react";
import type { BaremeRepartition } from "@/lib/pedagogy/bareme-repartition";

interface BaremeRepartitionBadgeProps {
  repartition: BaremeRepartition;
  variant?: "compact" | "detailed";
  className?: string;
}

export function BaremeRepartitionBadge({
  repartition,
  variant = "compact",
  className = "",
}: BaremeRepartitionBadgeProps) {
  const { pointsAuto, pointsEnseignant, hasManuel } = repartition;

  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-1.5 text-[10px] font-mono ${className}`}>
        <span
          className="rounded px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          title="Points vérifiés automatiquement par les sondes du bac à sable"
        >
          {pointsAuto} pts auto
        </span>
        {hasManuel && (
          <span
            className="rounded px-1.5 py-0.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
            title="Points évalués par l'enseignant"
          >
            {pointsEnseignant} pts enseignant
          </span>
        )}
      </div>
    );
  }

  // Detailed mode pour l'en-tête de l'espace de travail
  return (
    <div className={`inline-flex items-center gap-2 text-xs font-mono ${className}`}>
      <span
        className="inline-flex items-center gap-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[11px]"
        title="Points vérifiés automatiquement par les sondes de test"
      >
        <CheckCircle2 className="h-3 w-3" />
        <span>Vérifié auto : {pointsAuto} pts</span>
      </span>
      {hasManuel && (
        <span
          className="inline-flex items-center gap-1 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 px-2 py-0.5 text-[11px]"
          title="Points évalués et validés par l'enseignant"
        >
          <UserCheck className="h-3 w-3" />
          <span>Évalué enseignant : {pointsEnseignant} pts</span>
        </span>
      )}
    </div>
  );
}
