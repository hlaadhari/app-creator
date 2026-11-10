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
  Info,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EvaluationSummary } from "@/lib/evaluation/probe-runner";
import { supabase } from "@/integrations/supabase/client";
import { ContestationModal } from "@/components/pedagogy/ContestationModal";
import { AttemptsTimelineDrawer } from "@/components/pedagogy/AttemptsTimelineDrawer";
import { ReferenceSolutionModal } from "@/components/pedagogy/ReferenceSolutionModal";
import {
  listerContestationsEleve,
  getContestationPourCritere,
} from "@/lib/pedagogy/contestations-client";
import { listerHistoriqueAvecDeltas, type AttemptWithDelta } from "@/lib/pedagogy/attempts-service";
import type { ContestationRecord } from "@/lib/subjects/contestations-service";
import { genererIndicesProgressifs } from "@/lib/evaluation/progressive-hints";

interface EvaluationResultsPaneProps {
  summary: EvaluationSummary | null;
  onVerify: () => void;
  verifying?: boolean | undefined;
  sujetId?: string | undefined;
  sujetTitle?: string | undefined;
  sujetVersionId?: string | null | undefined;
  examMode?: boolean | undefined;
  examLocked?: boolean | undefined;
  examCadre?: "entrainement" | "officiel" | undefined;
  onRestartExam?: (() => void) | undefined;
  restartingExam?: boolean | undefined;
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
  examLocked = false,
  examCadre = "entrainement",
  onRestartExam,
  restartingExam = false,
  eleveId: eleveIdProp,
  eleveNom,
  projetId,
}: EvaluationResultsPaneProps) {
  const isSolutionBlockedByActiveExam = Boolean(examMode && !examLocked);
  const isOfficialExam = examCadre === "officiel";
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  useEffect(() => {
    let actif = true;
    supabase.auth
      .getUser()
      .then(({ data }) => actif && setAuthUserId(data.user?.id ?? null))
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, []);
  // Identifiant réel de l'élève connecté ; « invite » n'est jamais envoyé au serveur (#185).
  const eleveId = eleveIdProp ?? authUserId ?? "invite";
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
  const [unlockedHints, setUnlockedHints] = useState<Record<string, number>>({});

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
    void summary;
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
        <div
          className={`p-4 rounded-full border ${
            examLocked
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
              : "bg-primary/10 border-primary/20 text-primary"
          }`}
        >
          {examLocked ? <Lock className="h-8 w-8" /> : <Sparkles className="h-8 w-8" />}
        </div>
        <div>
          <h3 className="font-semibold text-base text-foreground">
            {examLocked
              ? isOfficialExam
                ? "Épreuve Officielle Clôturée"
                : "Temps d'Entraînement Écoulé"
              : "Évaluation Formative Instantanée"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            {examLocked
              ? isOfficialExam
                ? "L'échéance officielle du serveur (echeance_serveur) est atteinte : votre copie est scellée en lecture seule. La vérification et la modification sont verrouillées afin de préserver l'intégrité de votre copie, mais le corrigé de référence est désormais accessible."
                : "Le chronomètre de votre simulation d'examen est arrivé à 00:00 : la vérification du code et l'édition sont suspendues tant que le chronomètre n'est pas relancé."
              : "Testez votre code directement dans le bac à sable pour obtenir votre score sur 20 et des retours critère par critère."}
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {examLocked && !isOfficialExam && onRestartExam && (
            <Button
              onClick={onRestartExam}
              disabled={restartingExam}
              className="gap-2 text-xs font-medium w-full"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>
                {restartingExam
                  ? "Relance du chronomètre..."
                  : "Nouvelle tentative / Relancer le chrono"}
              </span>
            </Button>
          )}

          <Button
            onClick={onVerify}
            disabled={verifying || examLocked}
            variant={examLocked ? "secondary" : "default"}
            className="gap-2 text-xs font-medium w-full"
          >
            {examLocked ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>Vérification verrouillée (échéance atteinte)</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Lancer la vérification</span>
              </>
            )}
          </Button>

          {sujetId && (!isSolutionBlockedByActiveExam || examLocked) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSolutionOpen(true)}
              className="gap-2 text-xs w-full text-primary hover:text-primary/90"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Accéder au corrigé de référence</span>
            </Button>
          )}

          {sujetId && latestAttempts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="gap-2 text-xs w-full"
            >
              <History className="h-3.5 w-3.5" />
              <span>
                Historique ({latestAttempts.length} tentative{latestAttempts.length > 1 ? "s" : ""})
              </span>
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

        {sujetId && (
          <ReferenceSolutionModal
            isOpen={solutionOpen}
            onClose={() => setSolutionOpen(false)}
            sujetId={sujetId}
            sujetTitle={sujetTitle}
            sujetVersionId={sujetVersionId}
            examMode={isSolutionBlockedByActiveExam}
          />
        )}
      </div>
    );
  }

  const { note20, earnedPoints, totalPoints, results, totalDurationMs } = summary;
  const pointsNonVerifiables = summary.pointsNonVerifiables ?? 0;
  // Aucun critère vérifiable : il n'existe aucune note, on n'affiche donc pas « 0 / 20 ».
  const aucuneVerification = results.length > 0 && results.every((r) => r.automatique === false);

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
          variant={isSolutionBlockedByActiveExam ? "secondary" : "outline"}
          size="sm"
          onClick={() => setSolutionOpen(true)}
          className={`h-7 text-xs gap-1.5 ${
            isSolutionBlockedByActiveExam
              ? "opacity-60 cursor-not-allowed text-muted-foreground"
              : "text-primary hover:text-primary/90"
          }`}
        >
          {isSolutionBlockedByActiveExam ? (
            <Lock className="h-3 w-3" />
          ) : (
            <BookOpen className="h-3 w-3" />
          )}
          <span>{isSolutionBlockedByActiveExam ? "Corrigé (Examen)" : "Corrigé de référence"}</span>
        </Button>
      </div>

      {/* Explication explicite du verrouillage post-échéance (#188) */}
      {examLocked && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-rose-400">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {isOfficialExam
                ? "Examen officiel clôturé (copie scellée)"
                : "Temps d'entraînement écoulé (vérification en pause)"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isOfficialExam
              ? "L'échéance serveur (echeance_serveur) est dépassée : la réévaluation et l'édition sont désactivées. Vous pouvez consulter le corrigé de référence ci-dessus."
              : "La vérification ne s'exécute pas tant que le chronomètre d'entraînement est expiré. Relancez le chronomètre pour continuer à tester votre code."}
          </p>
          {!isOfficialExam && onRestartExam && (
            <Button
              size="sm"
              onClick={onRestartExam}
              disabled={restartingExam}
              className="h-7 text-xs gap-1.5 w-full"
            >
              <RotateCcw className="h-3 w-3" />
              <span>
                {restartingExam ? "Relance en cours..." : "Nouvelle tentative / Relancer le chrono"}
              </span>
            </Button>
          )}
        </div>
      )}

      {/* En-tête Score & Jauge */}
      <div className="rounded-xl border bg-card/60 p-4 text-center shadow-xs space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Note formative indicative</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {totalDurationMs} ms (&lt; 3s)
          </span>
        </div>

        {aucuneVerification ? (
          <div className="my-2 space-y-1">
            <span className="text-4xl font-mono font-bold text-muted-foreground">—</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Aucun critère de ce sujet n'est vérifiable automatiquement. Votre travail sera évalué
              par votre enseignant ; aucune note n'est enregistrée.
            </p>
          </div>
        ) : (
          <div className="flex items-baseline justify-center gap-1 my-1">
            <span
              className={`text-4xl font-mono font-bold ${
                note20 >= 16 ? "text-emerald-400" : note20 >= 10 ? "text-primary" : "text-amber-400"
              }`}
            >
              {note20}
            </span>
            <span className="text-sm font-mono text-muted-foreground">/20</span>
          </div>
        )}

        {/* Delta didactique par rapport à la tentative précédente */}
        {latestDelta && latestDelta.formattedNoteDelta !== "1re tentative" && (
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium">
            {latestDelta.progression === "amelioration" && (
              <span className="flex items-center gap-1 text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{latestDelta.formattedNoteDelta} depuis la dernière vérification</span>
              </span>
            )}
            {latestDelta.progression === "regression" && (
              <span className="flex items-center gap-1 text-rose-400">
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

        {!aucuneVerification && (
          <div className="text-xs text-muted-foreground font-mono">
            {earnedPoints} / {totalPoints} points • {results.filter((r) => r.passed).length} sur{" "}
            {results.filter((r) => r.automatique !== false).length} critères vérifiables validés
          </div>
        )}
        {pointsNonVerifiables > 0 && !aucuneVerification && (
          <p className="text-[11px] leading-relaxed text-amber-400">
            {pointsNonVerifiables} point{pointsNonVerifiables > 1 ? "s" : ""} sur {totalPoints} ne
            sont pas vérifiables automatiquement : ils ne sont pas gagnés dans cette note et seront
            évalués par votre enseignant.
          </p>
        )}
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
            disabled={verifying || examLocked}
            className="h-7 text-xs gap-1 text-primary hover:text-primary/80"
          >
            {examLocked ? <Lock className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" />}
            {examLocked ? "Verrouillé" : "Re-vérifier"}
          </Button>
        </div>

        <div className="space-y-2">
          {results.map((r, i) => {
            const contestation = getContestationPourCritere(r.id, contestations);
            const automatique = r.automatique !== false;

            return (
              <div
                key={r.id || i}
                className={`rounded-lg border p-3 transition-colors ${
                  !automatique
                    ? "border-border bg-muted/30"
                    : r.passed
                      ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10"
                      : "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {!automatique ? (
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    ) : r.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">{r.label}</span>
                        {!r.passed && automatique && r.cause && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-4 font-normal ${
                              r.cause === "absent"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : r.cause === "syntaxe"
                                  ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                  : r.cause === "execution"
                                    ? "bg-destructive/10 text-destructive border-destructive/30"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {r.cause === "absent" && "Élément absent"}
                            {r.cause === "syntaxe" && "Erreur de syntaxe"}
                            {r.cause === "execution" && "Erreur d'exécution JS"}
                            {r.cause === "valeur" && "Valeur incorrecte"}
                          </Badge>
                        )}
                      </div>
                      <p
                        className={`text-[11px] mt-0.5 leading-relaxed ${
                          !automatique
                            ? "text-muted-foreground"
                            : r.passed
                              ? "text-emerald-400"
                              : "text-amber-400"
                        }`}
                      >
                        {r.message}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border shrink-0 ${
                      r.passed
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {automatique ? `+${r.points} / ${r.maxPoints} pts` : `${r.maxPoints} pts`}
                  </span>
                </div>

                {/* Indices progressifs 3 niveaux (Issue #133 / PED-06) */}
                {!r.passed && automatique && (
                  <div className="mt-2.5 pt-2 border-t border-border/50">
                    {examMode ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground/75">
                        <Lock className="h-3 w-3" />
                        <span>Indices progressifs désactivés en mode examen (T-04 / T-06)</span>
                      </div>
                    ) : (
                      (() => {
                        const critHints =
                          r.hints && r.hints.length >= 3
                            ? r.hints
                            : genererIndicesProgressifs(
                                r as unknown as Parameters<typeof genererIndicesProgressifs>[0],
                              );
                        const currentLvl = unlockedHints[r.id] ?? 0;

                        return (
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] text-amber-400 font-medium flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                <span>Indices progressifs ({currentLvl}/3)</span>
                              </span>
                              {currentLvl < 3 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setUnlockedHints((prev) => ({
                                      ...prev,
                                      [r.id]: (prev[r.id] ?? 0) + 1,
                                    }))
                                  }
                                  className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer transition-colors"
                                >
                                  Débloquer niveau {currentLvl + 1}
                                </button>
                              ) : (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  3/3 débloqués
                                </span>
                              )}
                            </div>

                            {currentLvl >= 1 && (
                              <div className="rounded bg-muted/60 border border-border p-2 text-[11px] leading-relaxed">
                                <div className="font-semibold text-foreground text-[10px] uppercase font-mono tracking-wider text-amber-400 mb-0.5">
                                  Niveau 1 — Conceptuel
                                </div>
                                <p className="text-foreground/90">{critHints[0]}</p>
                              </div>
                            )}

                            {currentLvl >= 2 && (
                              <div className="rounded bg-muted/60 border border-border p-2 text-[11px] leading-relaxed">
                                <div className="font-semibold text-foreground text-[10px] uppercase font-mono tracking-wider text-blue-400 mb-0.5">
                                  Niveau 2 — Piste Syntaxique
                                </div>
                                <p className="text-foreground/90">{critHints[1]}</p>
                              </div>
                            )}

                            {currentLvl >= 3 && (
                              <div className="rounded bg-muted/60 border border-border p-2 text-[11px] leading-relaxed">
                                <div className="font-semibold text-foreground text-[10px] uppercase font-mono tracking-wider text-purple-400 mb-0.5">
                                  Niveau 3 — Extrait d'Illustration
                                </div>
                                <pre className="font-mono text-[10px] bg-background/80 border rounded p-1.5 overflow-x-auto text-foreground mt-1 whitespace-pre-wrap">
                                  {critHints[2]}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

                {/* Section Contestation pour les critères non validés */}
                {!r.passed && automatique && (
                  <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                    {contestation ? (
                      <div className="flex items-center gap-1.5">
                        {contestation.statut === "en_attente" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1 bg-amber-500/10 text-amber-400 border-amber-500/30 cursor-pointer"
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
                            className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span>Contestation acceptée (+ points validés)</span>
                          </Badge>
                        )}
                        {contestation.statut === "rejetee" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1 bg-rose-500/10 text-rose-400 border-rose-500/30 cursor-pointer"
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
          examMode={isSolutionBlockedByActiveExam}
        />
      )}

      {/* Modal Soumission / Suivi Contestation */}
      {contestationTarget && (
        <ContestationModal
          isOpen={!!contestationTarget}
          onClose={() => setContestationTarget(null)}
          critere={contestationTarget}
          sujetId={sujetId}
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
