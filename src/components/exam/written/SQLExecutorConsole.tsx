import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Play, AlertTriangle, Table, RefreshCw } from "lucide-react";
import { RelationalDatabaseEngine } from "@/lib/sql/relational-engine";
import type { WrittenSqlQuestion } from "@/lib/evaluator/written/written-exam-evaluator";

export interface SqlExecutionOutput {
  rows?: Record<string, unknown>[] | undefined;
  affected?: number | undefined;
  error?: string | undefined;
  successMsg?: string | undefined;
}

export interface SQLExecutorConsoleProps {
  questions: WrittenSqlQuestion[];
  answers: Record<string, unknown>;
  onAnswerChange: (questionId: string, value: string) => void;
  initialSql?: string | undefined;
  isLocked?: boolean | undefined;
  showFeedback?: boolean | undefined;
  questionResults?:
    Record<string, { isCorrect: boolean; pointsEarned: number; feedback: string }> | undefined;
}

export const SQLExecutorConsole: React.FC<SQLExecutorConsoleProps> = ({
  questions,
  answers,
  onAnswerChange,
  initialSql = "",
  isLocked = false,
  showFeedback = false,
  questionResults,
}) => {
  const [executionOutputs, setExecutionOutputs] = useState<Record<string, SqlExecutionOutput>>({});

  const handleExecute = (question: WrittenSqlQuestion) => {
    const userSql = (answers[question.id] as string) || "";
    if (!userSql.trim()) {
      setExecutionOutputs((prev) => ({
        ...prev,
        [question.id]: { error: "Veuillez saisir une requête SQL avant d'exécuter." },
      }));
      return;
    }

    try {
      const engine = new RelationalDatabaseEngine();
      const baseSql = (question.initialSql || initialSql || "").trim();
      if (baseSql) {
        engine.executeScript(baseSql);
      }

      if (question.type === "query") {
        const res = engine.query(userSql);
        if (res.error) {
          setExecutionOutputs((prev) => ({
            ...prev,
            [question.id]: { error: res.error },
          }));
        } else {
          setExecutionOutputs((prev) => ({
            ...prev,
            [question.id]: {
              rows: res.rows,
              successMsg: `${res.rows.length} ligne(s) retournée(s).`,
            },
          }));
        }
      } else {
        // DDL ou DML
        const execRes = engine.executeScript(userSql);
        if (!execRes.success || execRes.errors.length > 0) {
          setExecutionOutputs((prev) => ({
            ...prev,
            [question.id]: { error: execRes.errors[0] || engine.getLastError() },
          }));
        } else {
          // Afficher les lignes de la table ciblée si spécifiée
          const targetTable = question.expectedTableRows?.table;
          const rows = targetTable ? engine.getTableRows(targetTable) : undefined;
          setExecutionOutputs((prev) => ({
            ...prev,
            [question.id]: {
              rows: rows ?? [],
              successMsg: "Instruction SQL exécutée avec succès.",
            },
          }));
        }
      }
    } catch (err) {
      setExecutionOutputs((prev) => ({
        ...prev,
        [question.id]: {
          error: err instanceof Error ? err.message : String(err),
        },
      }));
    }
  };

  return (
    <div className="space-y-6">
      {questions.map((q, idx) => {
        const currentAns = (answers[q.id] as string) || "";
        const res = questionResults?.[q.id];
        const output = executionOutputs[q.id];
        const isAnswered = currentAns.trim().length > 0;

        return (
          <div
            key={q.id}
            data-testid={`sql-question-${q.id}`}
            className="rounded-lg border bg-card p-5 shadow-xs transition-colors"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-semibold text-amber-400">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="text-sm font-medium text-foreground leading-snug whitespace-pre-line">
                    {q.prompt}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {q.type === "query"
                      ? "Requête d'interrogation LID (SELECT)"
                      : q.type === "dml"
                        ? "Mise à jour LMD (INSERT, UPDATE, DELETE)"
                        : "Définition LDD (CREATE, ALTER, DROP)"}
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
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Rédigé
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="relative">
                <Textarea
                  data-testid={`sql-input-${q.id}`}
                  value={currentAns}
                  disabled={isLocked}
                  onChange={(e) => onAnswerChange(q.id, e.target.value)}
                  placeholder={
                    q.type === "query"
                      ? "SELECT ... FROM ... WHERE ...;"
                      : q.type === "dml"
                        ? "UPDATE ... SET ... WHERE ...;"
                        : "ALTER TABLE ... ADD ...;"
                  }
                  rows={4}
                  className="font-mono text-xs bg-muted/30 resize-y"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Console SQLite / dialecte MySQL interactif
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isLocked || !currentAns.trim()}
                  onClick={() => handleExecute(q)}
                  className="h-8 text-xs font-medium"
                >
                  <Play className="mr-1.5 h-3.5 w-3.5 text-primary fill-primary" /> Tester la
                  Requête
                </Button>
              </div>
            </div>

            {/* Sortie d'exécution en temps réel */}
            {output && (
              <div className="mt-4 rounded-md border bg-muted/40 p-3 text-xs">
                {output.error ? (
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="font-mono font-medium">{output.error}</span>
                  </div>
                ) : (
                  <div>
                    {output.successMsg && (
                      <div className="mb-2 text-emerald-400 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {output.successMsg}
                      </div>
                    )}
                    {output.rows && output.rows.length > 0 && (
                      <div className="overflow-x-auto max-h-48 border rounded bg-background">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-muted text-muted-foreground border-b sticky top-0">
                            <tr>
                              {Object.keys(output.rows[0]!).map((col) => (
                                <th key={col} className="px-3 py-1.5 font-mono">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {output.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="border-b last:border-0 hover:bg-muted/30">
                                {Object.values(row).map((val, cIdx) => (
                                  <td key={cIdx} className="px-3 py-1.5 font-mono">
                                    {val === null || val === undefined ? (
                                      <span className="text-muted-foreground italic">NULL</span>
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {showFeedback && res && (
              <div
                className={`mt-4 rounded-md p-3 text-xs border ${
                  res.isCorrect
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-destructive/10 border-destructive/20 text-destructive"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{res.isCorrect ? "✓ Requête validée" : "✗ Requête non validée"}</span>
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
