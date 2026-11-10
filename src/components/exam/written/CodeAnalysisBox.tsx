import React from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Code2 } from "lucide-react";
import type { WrittenCodeAnalysisQuestion } from "@/lib/evaluator/written/written-exam-evaluator";

export interface CodeAnalysisBoxProps {
  questions: WrittenCodeAnalysisQuestion[];
  answers: Record<string, unknown>;
  onAnswerChange: (questionId: string, value: string) => void;
  isLocked?: boolean | undefined;
  showFeedback?: boolean | undefined;
  questionResults?:
    Record<string, { isCorrect: boolean; pointsEarned: number; feedback: string }> | undefined;
}

export const CodeAnalysisBox: React.FC<CodeAnalysisBoxProps> = ({
  questions,
  answers,
  onAnswerChange,
  isLocked = false,
  showFeedback = false,
  questionResults,
}) => {
  return (
    <div className="space-y-6">
      {questions.map((q, idx) => {
        const currentAns = (answers[q.id] as string) || "";
        const res = questionResults?.[q.id];
        const isAnswered = currentAns.trim().length > 0;

        return (
          <div
            key={q.id}
            data-testid={`code-analysis-question-${q.id}`}
            className="rounded-lg border bg-card p-5 shadow-xs transition-colors"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-xs font-semibold text-purple-400">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="text-sm font-medium text-foreground leading-snug whitespace-pre-line">
                    {q.prompt}
                  </h4>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Code2 className="h-3 w-3" />
                    {q.language
                      ? `Langage : ${q.language.toUpperCase()}`
                      : "Analyse de code & algorithmique"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">
                  {q.points} {q.points > 1 ? "pts" : "pt"}
                </Badge>
                {isAnswered && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Rempli
                  </Badge>
                )}
              </div>
            </div>

            {q.codeSnippet && (
              <div className="my-3 rounded-md border bg-muted/60 p-3.5 font-mono text-xs overflow-x-auto text-foreground">
                <pre className="whitespace-pre">{q.codeSnippet}</pre>
              </div>
            )}

            <div className="mt-3">
              <Textarea
                data-testid={`code-analysis-input-${q.id}`}
                value={currentAns}
                disabled={isLocked}
                onChange={(e) => onAnswerChange(q.id, e.target.value)}
                placeholder="Saisissez votre analyse, correction ou prédiction de code..."
                rows={3}
                className="font-mono text-xs"
              />
            </div>

            {showFeedback && res && (
              <div
                className={`mt-4 rounded-md p-3 text-xs border ${
                  res.isCorrect
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-destructive/10 border-destructive/20 text-destructive"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{res.isCorrect ? "✓ Réponse validée" : "✗ Réponse incorrecte"}</span>
                  <span>
                    {res.pointsEarned} / {q.points} pt{q.points > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="mt-1">{res.feedback}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
