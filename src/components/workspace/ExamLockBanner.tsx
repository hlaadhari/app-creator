import { BookOpen, Lock, RotateCcw } from "lucide-react";
import type { WorkspaceState } from "@/hooks/useWorkspaceState";

/** Bannière de verrouillage à l'échéance d'examen (PRD F-50, T-06, #188). */
export function ExamLockBanner({ ws }: { ws: WorkspaceState }) {
  const {
    isExamExpired,
    examCadre,
    restartExam: handleRestartExam,
    restartingExam,
    setShowSolutionModal,
  } = ws;
  return isExamExpired ? (
    <div className="bg-rose-500/15 border-b border-rose-500/30 px-3 py-2 text-xs text-rose-500 font-medium flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>
          {examCadre === "officiel"
            ? "Examen officiel clôturé (echeance_serveur) : copie scellée en lecture seule (T-06). La vérification et la réinitialisation sont verrouillées."
            : "Temps réglementaire d'entraînement écoulé : l'édition et la vérification sont mises en pause tant que le chronomètre n'est pas relancé."}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {examCadre !== "officiel" && (
          <button
            type="button"
            onClick={handleRestartExam}
            disabled={restartingExam}
            className="inline-flex items-center gap-1.5 rounded bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{restartingExam ? "Relance..." : "Nouvelle tentative / Relancer le chrono"}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowSolutionModal(true)}
          className="inline-flex items-center gap-1.5 rounded border border-rose-500/40 bg-background/80 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
        >
          <BookOpen className="h-3 w-3 text-primary" />
          <span>Accéder au corrigé de référence</span>
        </button>
      </div>
    </div>
  ) : null;
}
