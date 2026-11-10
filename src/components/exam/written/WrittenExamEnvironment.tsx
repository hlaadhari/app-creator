import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BookOpen,
  CheckCircle2,
  Database,
  HelpCircle,
  Code2,
  Award,
  AlertCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type WrittenExamManifest,
  type WrittenExamEvaluationResult,
  type WrittenQcmQuestion,
  type WrittenModelingQuestion,
  type WrittenSqlQuestion,
  type WrittenCodeAnalysisQuestion,
} from "@/lib/evaluator/written/written-exam-evaluator";
import { masquerCorrigeManifestEcrit } from "@/lib/content/written-subjects";
import {
  demarrerOuRecupererCopieExamenEcrit,
  sauvegarderBrouillonExamenEcrit,
  remettreCopieExamenEcrit,
  purgerStockageLocalExamenEcritObsolète,
  type WrittenExamCopyState,
  type WrittenExamMotifCloture,
} from "@/lib/exam/written-exam-service";
import { creerSauvegardeBrouillon, remettreAvecReprise } from "@/lib/exam/written-exam-sync";
import { WrittenQCM } from "./WrittenQCM";
import { RelationalModelBox } from "./RelationalModelBox";
import { SQLExecutorConsole } from "./SQLExecutorConsole";
import { CodeAnalysisBox } from "./CodeAnalysisBox";
import { ExamSecurityManager } from "./ExamSecurityManager";

export interface WrittenExamEnvironmentProps {
  manifest: WrittenExamManifest;
  onEvaluationCompleted?: (result: WrittenExamEvaluationResult) => void;
  className?: string;
}

export const WrittenExamEnvironment: React.FC<WrittenExamEnvironmentProps> = ({
  manifest: rawManifest,
  onEvaluationCompleted,
  className = "",
}) => {
  // Neutralisation systématique des corrigés dans le manifeste client avant clôture (#197, T-01)
  const manifest = useMemo(() => masquerCorrigeManifestEcrit(rawManifest), [rawManifest]);

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  // Dernières réponses, lisibles sans attendre le prochain rendu (envoi différé et remise).
  const answersRef = useRef<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState<string>(manifest.sections[0]?.id || "section-0");
  const [isLocked, setIsLocked] = useState(false);
  const [motifCloture, setMotifCloture] = useState<WrittenExamMotifCloture>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<WrittenExamCopyState | null>(null);
  const [echeance, setEcheance] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + (manifest.duration || 120));
    return d.toISOString();
  });

  // Initialisation et récupération de la copie depuis le serveur (zéro localStorage #197)
  useEffect(() => {
    let cancelled = false;
    purgerStockageLocalExamenEcritObsolète(manifest.id);

    void demarrerOuRecupererCopieExamenEcrit(manifest.id, manifest.duration || 120).then(
      (state) => {
        if (cancelled) return;
        setCopyState(state);
        setEcheance(state.echeanceServeur);
        setIsLocked(state.isLocked);
        setMotifCloture(state.motifCloture);
        if (Object.keys(state.reponses).length > 0) {
          answersRef.current = state.reponses;
          setAnswers(state.reponses);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [manifest.id, manifest.duration]);

  // Brouillon envoyé en différé (#263) : une requête en vol au plus, toujours les dernières réponses.
  const brouillon = useMemo(
    () =>
      creerSauvegardeBrouillon({
        enregistrer: (reponses) => sauvegarderBrouillonExamenEcrit(manifest.id, reponses),
        onVerrou: () => setIsLocked(true),
      }),
    [manifest.id],
  );

  // Dès que l'onglet passe en arrière-plan ou se ferme, on n'attend plus la fin du délai.
  useEffect(() => {
    const viderSiMasque = () => {
      if (document.visibilityState === "hidden") void brouillon.vider();
    };
    document.addEventListener("visibilitychange", viderSiMasque);
    window.addEventListener("pagehide", viderSiMasque);
    return () => {
      document.removeEventListener("visibilitychange", viderSiMasque);
      window.removeEventListener("pagehide", viderSiMasque);
      void brouillon.vider();
    };
  }, [brouillon]);

  // Dénombrement des questions et réponses pour la progression
  const allQuestions = useMemo(() => {
    return manifest.sections.flatMap((s) => s.questions);
  }, [manifest.sections]);

  const totalQuestions = allQuestions.length;

  const answeredQuestionsCount = useMemo(() => {
    return allQuestions.filter((q) => {
      const val = answers[q.id];
      if (val === undefined || val === null || val === "") return false;
      if (Array.isArray(val) && val.length === 0) return false;
      if (typeof val === "string" && val.trim().length === 0) return false;
      return true;
    }).length;
  }, [allQuestions, answers]);

  const handleAnswerChange = useCallback(
    (questionId: string, value: unknown) => {
      if (isLocked) return;
      const next = { ...answersRef.current, [questionId]: value };
      answersRef.current = next;
      setAnswers(next);
      brouillon.planifier(next);
    },
    [isLocked, brouillon],
  );

  const handleFinalSubmit = useCallback(
    async (motif: "remise_volontaire" | "temps_ecoule" = "remise_volontaire") => {
      if (isSubmitting || isLocked) return;
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        // La remise embarque les dernières réponses ; un brouillon encore en route sera simplement
        // refusé par le serveur une fois la copie scellée.
        const sealedState = await remettreAvecReprise({
          examId: manifest.id,
          reponses: answersRef.current,
          motif,
          remettre: remettreCopieExamenEcrit,
          recuperer: demarrerOuRecupererCopieExamenEcrit,
          onNouvelEssai: () =>
            setSubmitError("Connexion instable : nouvelle tentative de remise en cours…"),
        });
        setSubmitError(null);
        setCopyState(sealedState);
        setIsLocked(true);
        setMotifCloture(sealedState.motifCloture ?? motif);
        setEcheance(sealedState.echeanceServeur);

        if (sealedState.evaluationDetail && onEvaluationCompleted) {
          onEvaluationCompleted(sealedState.evaluationDetail);
        }
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Impossible de sceller la copie sur le serveur.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [isLocked, isSubmitting, manifest.id, onEvaluationCompleted],
  );

  const evaluationResult = copyState?.evaluationDetail ?? null;

  // Résultats indexés par questionId pour le retour visuel après remise serveur
  const questionResultsMap = useMemo(() => {
    if (!evaluationResult) return undefined;
    const map: Record<string, { isCorrect: boolean; pointsEarned: number; feedback: string }> = {};
    for (const sec of evaluationResult.sections) {
      for (const item of sec.items) {
        map[item.questionId] = {
          isCorrect: item.isCorrect,
          pointsEarned: item.pointsEarned,
          feedback: item.feedback,
        };
      }
    }
    return map;
  }, [evaluationResult]);

  return (
    <div className={`space-y-6 max-w-5xl mx-auto p-4 md:p-6 ${className}`}>
      {/* En-tête officiel de l'épreuve */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs uppercase tracking-wide">
              {manifest.exam_type === "written" ? "Épreuve Écrite" : "Épreuve Théorique"}
            </Badge>
            {manifest.year && (
              <Badge variant="secondary" className="text-xs">
                Session {manifest.year} {manifest.session_type ? `(${manifest.session_type})` : ""}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs font-mono">
              Barème : {manifest.bareme_total || 20} points
            </Badge>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            {manifest.title}
          </h1>
        </div>

        {copyState && copyState.statut !== "en_cours" && (
          <div className="flex items-center gap-3 bg-muted/60 px-4 py-2.5 rounded-lg border">
            <Award className="h-6 w-6 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Note Finale Officielle</div>
              {copyState.noteFinale !== null ? (
                <div className="text-lg font-bold">
                  <span
                    className={
                      copyState.noteFinale >= copyState.baremeTotal / 2
                        ? "text-emerald-400"
                        : "text-destructive"
                    }
                  >
                    {copyState.noteFinale}
                  </span>{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    / {copyState.baremeTotal} (QCM : {copyState.scoreQcm ?? 0}/{copyState.maxQcm} •
                    Écrit : {copyState.scoreOuvert ?? 0}/{copyState.maxOuvert})
                  </span>
                </div>
              ) : (
                <div className="text-sm font-semibold text-foreground">
                  <span>
                    QCM corrigé par le serveur : {copyState.scoreQcm ?? 0} / {copyState.maxQcm} pts
                  </span>
                  <span className="block text-[11px] font-normal text-amber-400">
                    Questions ouvertes ({copyState.maxOuvert} pts) en attente de correction
                    enseignant
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Gestionnaire de sécurité, chronomètre serveur et remise */}
      <ExamSecurityManager
        examTitle={manifest.title}
        durationMinutes={manifest.duration || 120}
        echeance={echeance}
        isLocked={isLocked}
        motifCloture={motifCloture}
        onAutoSubmit={() => void handleFinalSubmit("temps_ecoule")}
        onSubmitManual={() => void handleFinalSubmit("remise_volontaire")}
        totalQuestions={totalQuestions}
        answeredQuestions={answeredQuestionsCount}
        isSubmitting={isSubmitting}
      />

      {submitError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Relevé de notes détaillé après remise serveur */}
      {copyState && copyState.statut !== "en_cours" && (
        <div className="rounded-lg border bg-card p-5 shadow-xs space-y-4 animate-in fade-in-50">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-semibold text-foreground">
                Relevé de Notes & Bilan par Exercice
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {copyState.hashSha256 && (
                <Badge variant="outline" className="text-[10px] font-mono gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  Empreinte : {copyState.hashSha256.slice(0, 12)}…
                </Badge>
              )}
              {copyState.noteFinale !== null ? (
                <Badge
                  variant={
                    copyState.noteFinale >= copyState.baremeTotal / 2 ? "secondary" : "destructive"
                  }
                  className="text-xs font-medium"
                >
                  {copyState.noteFinale >= copyState.baremeTotal / 2
                    ? "Admis / Validé"
                    : "Ajourné (< 10/20)"}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs gap-1 border-amber-500/40 text-amber-400"
                >
                  <Clock className="h-3 w-3" /> Correction enseignant en attente
                </Badge>
              )}
            </div>
          </div>

          {evaluationResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {evaluationResult.sections.map((sec) => {
                const isQcmSection = sec.sectionId.includes("qcm");
                const isPendingManual = !isQcmSection && copyState.statut !== "corrigee";
                return (
                  <div key={sec.sectionId} className="rounded-md border p-3 bg-muted/20">
                    <div className="text-xs text-muted-foreground truncate" title={sec.title}>
                      {sec.title}
                    </div>
                    <div className="mt-1 text-sm font-bold flex items-baseline justify-between">
                      {isPendingManual ? (
                        <span className="text-xs font-medium text-amber-400">
                          En attente ({sec.pointsMax} pts)
                        </span>
                      ) : (
                        <>
                          <span>
                            {sec.pointsEarned} / {sec.pointsMax} pts
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {sec.pointsMax > 0
                              ? `${Math.round((sec.pointsEarned / sec.pointsMax) * 100)}%`
                              : "0%"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {copyState.commentaireEnseignant && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <span className="font-semibold text-foreground">Appréciation de l'enseignant : </span>
              <span className="text-muted-foreground">{copyState.commentaireEnseignant}</span>
            </div>
          )}
        </div>
      )}

      {/* Onglets des sections de l'épreuve */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full flex-wrap justify-start gap-1 p-1 h-auto bg-muted/60">
          {manifest.sections.map((sec) => {
            const countAnswered = sec.questions.filter((q) => {
              const a = answers[q.id];
              return (
                a !== undefined &&
                a !== null &&
                a !== "" &&
                (!Array.isArray(a) || a.length > 0) &&
                (typeof a !== "string" || a.trim().length > 0)
              );
            }).length;

            return (
              <TabsTrigger
                key={sec.id}
                value={sec.id}
                data-testid={`tab-${sec.id}`}
                onClick={() => setActiveTab(sec.id)}
                className="text-xs px-3 py-1.5 flex items-center gap-2 cursor-pointer"
              >
                {sec.type === "qcm" && <HelpCircle className="h-3.5 w-3.5 text-blue-400" />}
                {sec.type === "modeling" && <Database className="h-3.5 w-3.5 text-emerald-400" />}
                {sec.type === "sql" && <Code2 className="h-3.5 w-3.5 text-amber-400" />}
                {sec.type === "code_analysis" && (
                  <BookOpen className="h-3.5 w-3.5 text-purple-400" />
                )}
                <span>{sec.title}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  ({countAnswered}/{sec.questions.length})
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {manifest.sections.map((section) => (
          <TabsContent key={section.id} value={section.id} className="focus:outline-hidden">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              {section.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
              )}
            </div>

            {section.type === "qcm" && (
              <WrittenQCM
                questions={section.questions as WrittenQcmQuestion[]}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                isLocked={isLocked}
                showFeedback={Boolean(evaluationResult)}
                questionResults={questionResultsMap}
              />
            )}

            {section.type === "modeling" && (
              <RelationalModelBox
                questions={section.questions as WrittenModelingQuestion[]}
                answers={answers}
                onAnswerChange={(qId, val) => handleAnswerChange(qId, val)}
                isLocked={isLocked}
                showFeedback={Boolean(evaluationResult && copyState?.statut === "corrigee")}
                questionResults={questionResultsMap}
              />
            )}

            {section.type === "sql" && (
              <SQLExecutorConsole
                questions={section.questions as WrittenSqlQuestion[]}
                answers={answers}
                onAnswerChange={(qId, val) => handleAnswerChange(qId, val)}
                initialSql={manifest.initialSql}
                isLocked={isLocked}
                showFeedback={Boolean(evaluationResult && copyState?.statut === "corrigee")}
                questionResults={questionResultsMap}
              />
            )}

            {section.type === "code_analysis" && (
              <CodeAnalysisBox
                questions={section.questions as WrittenCodeAnalysisQuestion[]}
                answers={answers}
                onAnswerChange={(qId, val) => handleAnswerChange(qId, val)}
                isLocked={isLocked}
                showFeedback={Boolean(evaluationResult && copyState?.statut === "corrigee")}
                questionResults={questionResultsMap}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
