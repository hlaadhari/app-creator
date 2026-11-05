import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  CheckCircle2,
  Database,
  HelpCircle,
  Code2,
  FileText,
  Award,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  evaluerCopieEcrite,
  type WrittenExamManifest,
  type WrittenExamEvaluationResult,
  type WrittenQcmQuestion,
  type WrittenModelingQuestion,
  type WrittenSqlQuestion,
  type WrittenCodeAnalysisQuestion,
} from "@/lib/evaluator/written/written-exam-evaluator";
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
  manifest,
  onEvaluationCompleted,
  className = "",
}) => {
  const storageKey = `labo_sti_written_exam_${manifest.id}`;

  // Récupération des réponses sauvegardées localement
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignorer
    }
    return {};
  });

  const [activeTab, setActiveTab] = useState<string>(manifest.sections[0]?.id || "section-0");
  const [isLocked, setIsLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<WrittenExamEvaluationResult | null>(
    null,
  );

  // Sauvegarde automatique des réponses à chaque modification
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      // Ignorer si localStorage plein
    }
  }, [answers, storageKey]);

  // Calcul du temps serveur d'échéance (heure actuelle + durée en minutes)
  const echeance = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + (manifest.duration || 120));
    return d.toISOString();
  }, [manifest.duration]);

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

  const handleAnswerChange = (questionId: string, value: unknown) => {
    if (isLocked) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting || isLocked) return;
    setIsSubmitting(true);
    setIsLocked(true);

    try {
      const result = await evaluerCopieEcrite(manifest, answers);
      setEvaluationResult(result);
      if (onEvaluationCompleted) {
        onEvaluationCompleted(result);
      }
    } catch (err) {
      console.error("Erreur lors de l'évaluation de l'épreuve écrite :", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Résultats indexés par questionId pour le retour visuel
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

        {evaluationResult && (
          <div className="flex items-center gap-3 bg-muted/60 px-4 py-2.5 rounded-lg border">
            <Award className="h-6 w-6 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Note Finale Officielle</div>
              <div className="text-lg font-bold">
                <span
                  className={
                    evaluationResult.passed
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-destructive"
                  }
                >
                  {evaluationResult.totalScore}
                </span>{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  / {evaluationResult.baremeTotal} ({evaluationResult.percentage}%)
                </span>
              </div>
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
        onAutoSubmit={handleFinalSubmit}
        onSubmitManual={handleFinalSubmit}
        totalQuestions={totalQuestions}
        answeredQuestions={answeredQuestionsCount}
        isSubmitting={isSubmitting}
      />

      {/* Relevé de notes détaillé après remise */}
      {evaluationResult && (
        <div className="rounded-lg border bg-card p-5 shadow-xs space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-semibold text-foreground">
                Relevé de Notes & Bilan par Exercice
              </h3>
            </div>
            <Badge
              variant={evaluationResult.passed ? "secondary" : "destructive"}
              className="text-xs font-medium"
            >
              {evaluationResult.passed ? "Admis / Validé" : "Ajourné (< 10/20)"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {evaluationResult.sections.map((sec) => (
              <div key={sec.sectionId} className="rounded-md border p-3 bg-muted/20">
                <div className="text-xs text-muted-foreground truncate" title={sec.title}>
                  {sec.title}
                </div>
                <div className="mt-1 text-sm font-bold flex items-baseline justify-between">
                  <span>
                    {sec.pointsEarned} / {sec.pointsMax} pts
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {sec.pointsMax > 0
                      ? `${Math.round((sec.pointsEarned / sec.pointsMax) * 100)}%`
                      : "0%"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onglets des sections de l'épreuve */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full flex-wrap justify-start gap-1 p-1 h-auto bg-muted/60">
          {manifest.sections.map((sec, sIdx) => {
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
                {sec.type === "qcm" && <HelpCircle className="h-3.5 w-3.5 text-blue-500" />}
                {sec.type === "modeling" && <Database className="h-3.5 w-3.5 text-emerald-500" />}
                {sec.type === "sql" && <Code2 className="h-3.5 w-3.5 text-amber-500" />}
                {sec.type === "code_analysis" && (
                  <BookOpen className="h-3.5 w-3.5 text-purple-500" />
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
                showFeedback={Boolean(evaluationResult)}
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
                showFeedback={Boolean(evaluationResult)}
                questionResults={questionResultsMap}
              />
            )}

            {section.type === "code_analysis" && (
              <CodeAnalysisBox
                questions={section.questions as WrittenCodeAnalysisQuestion[]}
                answers={answers}
                onAnswerChange={(qId, val) => handleAnswerChange(qId, val)}
                isLocked={isLocked}
                showFeedback={Boolean(evaluationResult)}
                questionResults={questionResultsMap}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
