import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Database, Hash, Key } from "lucide-react";
import type { WrittenModelingQuestion } from "@/lib/evaluator/written/written-exam-evaluator";

export interface RelationalModelBoxProps {
  questions: WrittenModelingQuestion[];
  answers: Record<string, unknown>;
  onAnswerChange: (questionId: string, value: string) => void;
  isLocked?: boolean | undefined;
  showFeedback?: boolean | undefined;
  questionResults?:
    Record<string, { isCorrect: boolean; pointsEarned: number; feedback: string }> | undefined;
}

export const RelationalModelBox: React.FC<RelationalModelBoxProps> = ({
  questions,
  answers,
  onAnswerChange,
  isLocked = false,
  showFeedback = false,
  questionResults,
}) => {
  const insertToken = (questionId: string, token: string) => {
    if (isLocked) return;
    const current = (answers[questionId] as string) || "";
    onAnswerChange(questionId, current + token);
  };

  return (
    <div className="space-y-6">
      {questions.map((q, idx) => {
        const currentAns = (answers[q.id] as string) || "";
        const res = questionResults?.[q.id];
        const isAnswered = currentAns.trim().length > 0;

        return (
          <div
            key={q.id}
            data-testid={`modeling-question-${q.id}`}
            className="rounded-lg border bg-card p-5 shadow-xs transition-colors"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="text-sm font-medium text-foreground leading-snug whitespace-pre-line">
                    {q.prompt}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {q.type === "representation"
                      ? "Représentation textuelle normalisée"
                      : q.type === "ddl"
                        ? "Instruction SQL LDD (Data Definition Language)"
                        : "Réponse rédigée"}
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
                    className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Saisi
                  </Badge>
                )}
              </div>
            </div>

            {q.type === "representation" && (
              <div className="my-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Raccourcis notation :</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLocked}
                  onClick={() => insertToken(q.id, "#")}
                  className="h-7 text-xs font-mono px-2"
                >
                  <Hash className="mr-1 h-3 w-3 text-primary" /> Clé Primaire (#)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLocked}
                  onClick={() => insertToken(q.id, "#")}
                  className="h-7 text-xs font-mono px-2"
                >
                  <Key className="mr-1 h-3 w-3 text-amber-500" /> Clé Étrangère (#)
                </Button>
              </div>
            )}

            <div className="mt-3">
              <Textarea
                data-testid={`modeling-input-${q.id}`}
                value={currentAns}
                disabled={isLocked}
                onChange={(e) => onAnswerChange(q.id, e.target.value)}
                placeholder={
                  q.type === "ddl"
                    ? "Ex: CREATE TABLE Candidat (NumCandidat INT PRIMARY KEY, Nom VARCHAR(30) NOT NULL)..."
                    : q.type === "representation"
                      ? "Ex: Evaluation (#NumCandidat, #CodeEpreuve, Note)"
                      : "Saisissez votre réponse..."
                }
                rows={q.type === "ddl" ? 4 : 3}
                className="font-mono text-xs"
              />
            </div>

            {showFeedback && res && (
              <div
                className={`mt-4 rounded-md p-3 text-xs border ${
                  res.isCorrect
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                    : "bg-destructive/10 border-destructive/20 text-destructive"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>
                    {res.isCorrect ? "✓ Modélisation conforme" : "✗ Modélisation non conforme"}
                  </span>
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
