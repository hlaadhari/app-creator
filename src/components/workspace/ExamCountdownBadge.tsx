import { Clock } from "lucide-react";
import type { WorkspaceState } from "@/hooks/useWorkspaceState";

type Countdown = NonNullable<WorkspaceState["countdown"]>;

/** Chrono d'examen synchronisé avec l'horloge serveur (PRD F-50, T-06). */
export function ExamCountdownBadge({ countdown }: { countdown: Countdown }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-mono ${
        countdown.isExpired
          ? "border-rose-500/40 bg-rose-500/15 text-rose-500 font-bold animate-pulse"
          : countdown.isCritical
            ? "border-amber-500/40 bg-amber-500/15 text-amber-500 font-bold"
            : "border-border bg-background/50 text-foreground"
      }`}
      title="Temps d'épreuve officiel synchronisé avec l'horloge serveur (PRD F-50, T-06)"
      data-testid="exam-countdown"
    >
      <Clock className="h-3.5 w-3.5" />
      <span>{countdown.isExpired ? "00:00 (Échéance échue)" : countdown.formatted}</span>
    </div>
  );
}
