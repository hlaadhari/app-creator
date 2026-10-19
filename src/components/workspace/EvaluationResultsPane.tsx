import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Play,
  History,
  BookOpen,
  MessageSquare,
  Lock,
  TrendingUp,
  TrendingDown,
  Equal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EvaluationSummary } from "@/lib/evaluation/probe-runner";
import { ContestationModal } from "@/components/pedagogy/ContestationModal";
import { AttemptsTimelineDrawer } from "@/components/pedagogy/AttemptsTimelineDrawer";
import { ReferenceSolutionModal } from "@/components/pedagogy/ReferenceSolutionModal";
import {
  listerContestationsEleve,
  getContestationPourCritere,
} from "@/lib/pedagogy/contestations-client";
import {
  listerHistoriqueAvecDeltas,
  type AttemptWithDelta,
} from "@/lib/pedagogy/attempts-service";
import type { ContestationRecord } from "@/lib/subjects/contestations-service";

interface EvaluationResultsPaneProps {
  summary: EvaluationSummary | null;
  onVerify: () => void;
  verifying?: boolean | undefined;
  sujetId?: string | undefined;
  sujetTitle?: string | undefined;
  sujetVersionId?: string | null | undefined;
  examMode?: boolean | undefined;
  eleveId?: string | undefined;
  eleveNom?: string | undefined;
  projetId?: string | null | undefined;
}

export function EvaluationResultsPane({
  summary,
  onVerify,
  verifying = false,
  sujetId,
  sujetTitle,
  sujetVersionId,
  examMode = false,
  eleveId = "eleve-courant",
  eleveNom,
  projetId,
}: EvaluationResultsPaneProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [contestationTarget, setContestationTarget] = useState<{
    id: string;
    code?: string;
    label: string;
    maxPoints: number;
    message?: string;
  } | null>(null);

  const [contestations, setContestations] = useState<ContestationRecord[]>([]);

  // Chargement des contestations de l'élève pour ce sujet
  useEffect(() => {
    if (!sujetId) return;
    listerContestationsEleve(eleveId, sujetVersionId ?? undefined).then((records) => {
      setContestations(records);
    });
  }, [sujetId, eleveId, sujetVersionId]);

  // Récupération de l'historique et du delta de la dernière tentative
  const latestAttempts = useMemo<AttemptWithDelta[]>(() => {
    if (!sujetId) return [];
    return listerHistoriqueAvecDeltas(sujetId);
  }, [sujetId, summary]);

  const latestDelta = latestAttempts[0]?.delta ?? null;

  const handleContestationSubmitted = (contestation: ContestationRecord) => {
    setContestations((prev) => {
      const filtered = prev.filter((c) => c.critere_id !== contestation.critere_id);
      return [...filtered, contestation];
    });
  };

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
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button onClick={onVerify} disabled={verifying} className="gap-2 text-xs font-medium w-full">
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Lancer la vérification</span>
          </Button>

          {sujetId && latestAttempts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="gap-2 text-xs w-full"
            >
              <History className="h-3.5 w-3.5" />
              <span>Historique ({latestAttempts.length} tentative{latestAttempts.length > 1 ? "s" : ""})</span>
            </Button>
          )}
        </div>

        {sujetId && (
          <AttemptsTimelineDrawer
            isOpen={historyOpen}
            onClose={() => setHistoryOpen(false)}
            sujetId={sujetId}
            sujetTitle={sujetTitle}
          />
        )}
      </div>
    );
  }

  const { note20, earnedPoints, totalPoints, results, totalDurationMs } = summary;

  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      {/* Barre d'actions pédagogiques supérieures */}
      <div className="flex items-center justify-between gap-2 border-b pb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setHistoryOpen(true)}
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <History className="h-3 w-3" />
          <span>Historique ({latestAttempts.length})</span>
        </Button>

        <Button
          variant={examMode ? "secondary" : "outline"}
          size="sm"
          onClick={() => setSolutionOpen(true)}
          className={`h-7 text-xs gap-1.5 ${
            examMode
              ? "opacity-60 cursor-not-allowed text-muted-foreground"
              : "text-primary hover:text-primary/90"
          }`}
        >
          {examMode ? <Lock className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
          <span>{examMode ? "Corrigé (Examen)" : "Corrigé de référence"}</span>
        </Button>
      </div>

      {/* En-tête Score & Jauge */}
      <div className="rounded-xl border bg-card/60 p-4 text-center shadow-xs space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Note formative indicative</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {totalDurationMs} ms (&lt; 3s)
          </span>
        </div>

        <div className="flex items-baseline justify-center gap-1 my-1">
          <span
            className={`text-4xl font-mono font-bold ${
              note20 >= 16 ? "text-emerald-500" : note20 >= 10 ? "text-primary" : "text-amber-500"
            }`}
          >
            {note20}
          </span>
          <span className="text-sm font-mono text-muted-foreground">/20</span>
        </div>

        {/* Delta didactique par rapport à la tentative précédente */}
        {latestDelta && latestDelta.formattedNoteDelta !== "1re tentative" && (
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium">
            {latestDelta.progression === "amelioration" && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{latestDelta.formattedNoteDelta} depuis la dernière vérification</span>
              </span>
            )}
            {latestDelta.progression === "regression" && (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>{latestDelta.formattedNoteDelta} depuis la dernière vérification</span>
              </span>
            )}
            {latestDelta.progression === "constant" && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Equal className="h-3.5 w-3.5" />
                <span>Score identique à la vérification précédente</span>
              </span>
            )}
          </div>
        )}

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
          {results.map((r, i) => {
            const contestation = getContestationPourCritere(r.id, contestations);

            return (
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
                        className={`text-[11px] mt-0.5 leading-relaxed ${
                          r.passed
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-amber-700 dark:text-amber-300"
                        }`}
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

                {/* Section Contestation pour les critères non validés */}
                {!r.passed && (
                  <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                    {contestation ? (
                      <div className="flex items-center gap-1.5">
                        {contestation.statut === "en_attente" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30 cursor-pointer"
                            onClick={() =>
                              setContestationTarget({
                                id: r.id,
                                code: r.code,
                                label: r.label,
                                maxPoints: r.maxPoints,
                                message: r.message,
                              })
                            }
                          >
                            <Clock className="h-2.5 w-2.5" />
                            <span>Contestation en attente d'arbitrage</span>
                          </Badge>
                        )}
                        {contestation.statut === "acceptee" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span>Contestation acceptée (+ points validés)</span>
                          </Badge>
                        )}
                        {contestation.statut === "rejetee" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1 bg-rose-500/10 text-rose-600 border-rose-500/30 cursor-pointer"
                            onClick={() =>
                              setContestationTarget({
                                id: r.id,
                                code: r.code,
                                label: r.label,
                                maxPoints: r.maxPoints,
                                message: r.message,
                              })
                            }
                          >
                            <AlertCircle className="h-2.5 w-2.5" />
                            <span>Contestation rejetée (cliquez pour motif)</span>
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setContestationTarget({
                            id: r.id,
                            code: r.code,
                            label: r.label,
                            maxPoints: r.maxPoints,
                            message: r.message,
                          })
                        }
                        className="text-[11px] font-medium text-primary/80 hover:text-primary flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>Contester ce critère</span>
                      </button>
                    )}

                    <span className="text-[10px] text-muted-foreground font-mono">
                      Code : {r.code ?? r.id.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tiroir Historique des Tentatives */}
      {sujetId && (
        <AttemptsTimelineDrawer
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          sujetId={sujetId}
          sujetTitle={sujetTitle}
        />
      )}

      {/* Modal Consultation Corrigé de Référence */}
      {sujetId && (
        <ReferenceSolutionModal
          isOpen={solutionOpen}
          onClose={() => setSolutionOpen(false)}
          sujetId={sujetId}
          sujetTitle={sujetTitle}
          sujetVersionId={sujetVersionId}
          examMode={examMode}
        />
      )}

      {/* Modal Soumission / Suivi Contestation */}
      {contestationTarget && (
        <ContestationModal
          isOpen={!!contestationTarget}
          onClose={() => setContestationTarget(null)}
          critere={contestationTarget}
          eleveId={eleveId}
          eleveNom={eleveNom}
          projetId={projetId}
          sujetVersionId={sujetVersionId}
          existingContestation={getContestationPourCritere(contestationTarget.id, contestations)}
          onContestationSubmitted={handleContestationSubmitted}
        />
      )}
    </div>
  );
}
