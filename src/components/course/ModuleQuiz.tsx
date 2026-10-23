import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Award, RotateCcw, BookOpen, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NOTEBOOK_QUIZZES,
  type NotebookCategoryId,
  type NotebookQuizQuestion,
} from "@/content/notebook-sti";

interface ModuleQuizProps {
  moduleId: NotebookCategoryId;
  questions?: NotebookQuizQuestion[] | undefined;
}

export function ModuleQuiz({ moduleId, questions }: ModuleQuizProps) {
  const quizQuestions = questions ?? NOTEBOOK_QUIZZES[moduleId] ?? [];

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    setSelectedAnswers({});
  }, [moduleId]);

  if (quizQuestions.length === 0) return null;

  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = quizQuestions.filter((q) => selectedAnswers[q.id] === q.correctIndex).length;
  const allAnswered = answeredCount === quizQuestions.length;

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (selectedAnswers[questionId] !== undefined) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
  };

  return (
    <section
      className="rounded-xl border border-border bg-panel/80 p-5 space-y-5 shadow-xs"
      data-testid="module-quiz"
    >
      {/* En-tête du Quiz de Validation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-emerald-500/15 text-emerald-400">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Quiz d'Auto-Évaluation de Fin de Chapitre — STI-BAC INFO
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Validez vos acquis avant de passer aux Travaux Pratiques et sujets d'examen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 font-semibold">
            Score : {correctCount}/{quizQuestions.length}
          </span>
          {answeredCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetQuiz}
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Réinitialiser</span>
            </Button>
          )}
        </div>
      </div>

      {/* Liste des questions */}
      <div className="space-y-5">
        {quizQuestions.map((q, qIdx) => {
          const chosenIdx = selectedAnswers[q.id];
          const isAnswered = chosenIdx !== undefined;
          const isCorrect = chosenIdx === q.correctIndex;

          return (
            <div
              key={q.id}
              className="rounded-lg border border-border/80 bg-background/60 p-4 space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-mono font-bold shrink-0 mt-0.5">
                  {qIdx + 1}
                </span>
                <p className="text-xs sm:text-sm font-semibold text-foreground leading-relaxed">
                  {q.question}
                </p>
              </div>

              {q.codeContext && (
                <pre className="p-2.5 rounded bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto">
                  <code>{q.codeContext}</code>
                </pre>
              )}

              <div className="grid grid-cols-1 gap-2 pt-1">
                {q.options.map((opt, optIdx) => {
                  const isThisSelected = chosenIdx === optIdx;
                  const isThisRight = optIdx === q.correctIndex;

                  let btnStyle = "bg-panel/60 hover:bg-accent/60 border-border text-foreground/90";
                  if (isAnswered) {
                    if (isThisRight) {
                      btnStyle =
                        "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold";
                    } else if (isThisSelected && !isThisRight) {
                      btnStyle = "bg-rose-500/15 border-rose-500/50 text-rose-300";
                    } else {
                      btnStyle =
                        "bg-background/30 border-border/40 text-muted-foreground opacity-70";
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(q.id, optIdx)}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border text-left text-xs font-mono transition-all cursor-pointer ${btnStyle}`}
                    >
                      <span className="break-all sm:break-normal">{opt}</span>
                      {isAnswered && isThisRight && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      {isAnswered && isThisSelected && !isThisRight && (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback pédagogique immédiat issu du Carnet STI-BAC INFO */}
              {isAnswered && (
                <div
                  className={`mt-2 p-3 rounded-lg border text-xs space-y-1 animate-in fade-in duration-150 ${
                    isCorrect
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-200"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Exact !</span>
                      </>
                    ) : (
                      <>
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>À retenir pour l'examen :</span>
                      </>
                    )}
                  </div>
                  <p className="leading-relaxed text-foreground/90">{q.explanation}</p>
                  <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 pt-1">
                    <BookOpen className="w-3 h-3 text-primary" />
                    <span>{q.notebookSource}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bilan de fin de quiz */}
      {allAnswered && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-foreground">
              {correctCount === quizQuestions.length
                ? "🎉 Félicitations ! Chapitre 100 % validé."
                : `Vous avez obtenu ${correctCount}/${quizQuestions.length} bonnes réponses.`}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {correctCount === quizQuestions.length
                ? "Vous maîtrisez les notions essentielles de ce module pour le Bac STI."
                : "Relisez les explications du carnet STI-BAC INFO ci-dessus puis retentez le quiz."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleResetQuiz}
            className="h-8 gap-1.5 text-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recommencer le quiz</span>
          </Button>
        </div>
      )}
    </section>
  );
}
