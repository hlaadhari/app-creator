import React from "react";
import { CheckCircle2, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WrittenQcmQuestion } from "@/lib/evaluator/written/written-exam-evaluator";

export interface WrittenQCMProps {
  questions: WrittenQcmQuestion[];
  answers: Record<string, unknown>;
  onAnswerChange: (questionId: string, value: unknown) => void;
  isLocked?: boolean | undefined;
  showFeedback?: boolean | undefined;
  questionResults?:
    Record<string, { isCorrect: boolean; pointsEarned: number; feedback: string }> | undefined;
}

export const WrittenQCM: React.FC<WrittenQCMProps> = ({
  questions,
  answers,
  onAnswerChange,
  isLocked = false,
  showFeedback = false,
  questionResults,
}) => {
  const handleSingleSelect = (questionId: string, optionVal: string | number) => {
    if (isLocked) return;
    onAnswerChange(questionId, optionVal);
  };

  const handleMultipleToggle = (questionId: string, optionVal: string | number) => {
    if (isLocked) return;
    const current = Array.isArray(answers[questionId])
      ? (answers[questionId] as (string | number)[])
      : [];
    const strVal = String(optionVal);
    const exists = current.some((c) => String(c) === strVal);

    if (exists) {
      onAnswerChange(
        questionId,
        current.filter((c) => String(c) !== strVal),
      );
    } else {
      onAnswerChange(questionId, [...current, optionVal]);
    }
  };

  return (
    <div className="space-y-6">
      {questions.map((q, idx) => {
        const currentAns = answers[q.id];
        const res = questionResults?.[q.id];
        const isAnswered =
          currentAns !== undefined &&
          currentAns !== null &&
          currentAns !== "" &&
          (!Array.isArray(currentAns) || currentAns.length > 0);

        return (
          <div
            key={q.id}
            data-testid={`qcm-question-${q.id}`}
            className="rounded-lg border bg-card p-5 shadow-xs transition-colors"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="text-sm font-medium text-foreground leading-snug">{q.question}</h4>
                  {q.multiple && (
                    <span className="text-xs text-muted-foreground italic">
                      (Plusieurs réponses possibles)
                    </span>
                  )}
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
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Répondu
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {q.options.map((opt, oIdx) => {
                const optId = typeof opt === "string" ? String(oIdx) : opt.id;
                const optLabel = typeof opt === "string" ? opt : opt.label;
                const isChecked = q.multiple
                  ? Array.isArray(currentAns) && currentAns.some((a) => String(a) === String(optId))
                  : String(currentAns) === String(optId);

                return (
                  <label
                    key={optId}
                    data-testid={`qcm-option-${q.id}-${optId}`}
                    className={`flex items-center gap-3 rounded-md border p-3 text-sm cursor-pointer transition-all ${
                      isChecked
                        ? "border-primary bg-primary/5 font-medium shadow-xs"
                        : "border-border hover:bg-muted/50 text-foreground"
                    } ${isLocked ? "cursor-not-allowed opacity-80" : ""}`}
                  >
                    <input
                      type={q.multiple ? "checkbox" : "radio"}
                      name={`qcm-${q.id}`}
                      value={optId}
                      checked={isChecked}
                      disabled={isLocked}
                      onChange={() => {
                        if (q.multiple) {
                          handleMultipleToggle(q.id, optId);
                        } else {
                          handleSingleSelect(q.id, optId);
                        }
                      }}
                      className="h-4 w-4 rounded text-primary focus:ring-primary border-muted-foreground/30"
                    />
                    <span className="flex-1">{optLabel}</span>
                  </label>
                );
              })}
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
                  <span>{res.isCorrect ? "✓ Validé" : "✗ Incorrect"}</span>
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
