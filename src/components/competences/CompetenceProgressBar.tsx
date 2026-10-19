import React from "react";
import type { CompetenceMasteryView } from "@/lib/competences/types";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

interface CompetenceProgressBarProps {
  item: CompetenceMasteryView;
  compact?: boolean;
}

export const CompetenceProgressBar: React.FC<CompetenceProgressBarProps> = ({
  item,
  compact = false,
}) => {
  const { competence, percentage, classification, nbTentatives, nbSucces, premierCoupSucces } =
    item;

  const colorStyles = {
    maitrise: {
      bar: "bg-emerald-500",
      text: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      label: "Maîtrisé",
    },
    acquis: {
      bar: "bg-blue-500",
      text: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      label: "Acquis",
    },
    en_cours: {
      bar: "bg-amber-500",
      text: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      label: "En cours",
    },
    non_acquis: {
      bar: "bg-rose-500/80",
      text: "text-rose-500",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      label: "À travailler",
    },
  }[classification];

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 text-xs py-1">
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          <span className="font-mono text-[10px] text-muted-foreground shrink-0">
            {competence.code}
          </span>
          <span className="truncate text-foreground font-medium">{competence.libelle}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${colorStyles.bar} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span
            className={`font-mono text-[11px] font-semibold ${colorStyles.text} w-8 text-right`}
          >
            {percentage}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
              {competence.code}
            </span>
            <span className="font-medium text-sm text-foreground">{competence.libelle}</span>
            {premierCoupSucces && (
              <span
                className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-medium px-1.5 py-0.5 rounded bg-amber-500/10"
                title="Critère validé dès la première tentative sans aide"
              >
                <Sparkles className="w-3 h-3" />
                1er essai
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {competence.description}
          </p>
        </div>

        <div className="text-right shrink-0">
          <span
            className={`inline-block text-[11px] font-mono px-2 py-0.5 rounded border font-semibold ${colorStyles.bg} ${colorStyles.text} ${colorStyles.border}`}
          >
            {colorStyles.label} ({percentage}%)
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${colorStyles.bar} transition-all duration-500 rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mt-1.5">
          <span>
            {nbSucces > 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                {nbSucces} succès sur {nbTentatives} essai{nbTentatives > 1 ? "s" : ""}
              </span>
            ) : nbTentatives > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-500">
                <AlertCircle className="w-3 h-3" />
                {nbTentatives} essai{nbTentatives > 1 ? "s" : ""} (non validé)
              </span>
            ) : (
              <span className="text-muted-foreground/60">Non encore testé</span>
            )}
          </span>
          <span>Formule v1.0</span>
        </div>
      </div>
    </div>
  );
};
