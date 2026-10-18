import React from "react";
import { CheckCircle2, XCircle, Clock, Sparkles, AlertCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EvaluationSummary } from "@/lib/evaluation/probe-runner";

interface EvaluationResultsPaneProps {
  summary: EvaluationSummary | null;
  onVerify: () => void;
  verifying?: boolean;
}

export function EvaluationResultsPane({
  summary,
  onVerify,
  verifying = false,
}: EvaluationResultsPaneProps) {
  if (!summary) {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center h-full space-y-4">
        <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-base text-foreground">
            Évaluation Formative Instantanée
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Testez votre code directement dans le bac à sable pour obtenir votre score sur 20 et des
            retours critère par critère.
          </p>
        </div>
        <Button onClick={onVerify} disabled={verifying} className="gap-2 text-xs font-medium">
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Lancer la vérification</span>
        </Button>
      </div>
    );
  }

  const { note20, earnedPoints, totalPoints, results, totalDurationMs } = summary;

  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      {/* En-tête Score & Jauge */}
      <div className="rounded-xl border bg-card/60 p-4 text-center shadow-xs">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-1">
          <span>Note formative indicative</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {totalDurationMs} ms (&lt; 3s)
          </span>
        </div>

        <div className="flex items-baseline justify-center gap-1 my-2">
          <span
            className={`text-4xl font-mono font-bold ${
              note20 >= 16 ? "text-emerald-500" : note20 >= 10 ? "text-primary" : "text-amber-500"
            }`}
          >
            {note20}
          </span>
          <span className="text-sm font-mono text-muted-foreground">/20</span>
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          {earnedPoints} / {totalPoints} points • {results.filter((r) => r.passed).length} sur{" "}
          {results.length} critères validés
        </div>
      </div>

      {/* Liste des critères */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Détail des critères d'évaluation
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={onVerify}
            disabled={verifying}
            className="h-7 text-xs gap-1 text-primary hover:text-primary/80"
          >
            <Play className="h-3 w-3 fill-current" />
            Re-vérifier
          </Button>
        </div>

        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={r.id || i}
              className={`rounded-lg border p-3 transition-colors ${
                r.passed
                  ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10"
                  : "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {r.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-foreground">{r.label}</div>
                    <p
                      className={`text-[11px] mt-0.5 leading-relaxed ${r.passed ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}
                    >
                      {r.message}
                    </p>
                  </div>
                </div>

                <span
                  className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border shrink-0 ${
                    r.passed
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  +{r.points} / {r.maxPoints} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
