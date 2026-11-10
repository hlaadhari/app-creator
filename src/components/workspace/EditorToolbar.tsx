import { BookOpen, MoreHorizontal, Play, RotateCcw } from "lucide-react";
import type { WorkspaceState } from "@/hooks/useWorkspaceState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Action principale « Vérifier mon code » + menu secondaire (cours, réinitialisation). */
export function EditorToolbar({ ws, compact = false }: { ws: WorkspaceState; compact?: boolean }) {
  const {
    handleVerify,
    handleReset,
    verifying,
    isExamExpired,
    isExamMode,
    examCadre,
    setShowCourseDrawer,
  } = ws;
  return (
    <div className="flex items-center justify-end gap-1.5 px-2 py-1 shrink-0">
      {!compact && (
        <button
          onClick={handleVerify}
          disabled={verifying || isExamExpired}
          className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            isExamExpired
              ? examCadre === "officiel"
                ? "Vérification verrouillée : l'échéance serveur de l'examen officiel est dépassée"
                : "Vérification en pause : relancez le chronomètre d'entraînement pour vérifier votre code"
              : "Vérifier mon code (Ctrl + Entrée)"
          }
          aria-label="Vérifier mon code"
        >
          <Play className="h-3 w-3 fill-current" />
          <span>{verifying ? "Vérification..." : "Vérifier mon code"}</span>
          <kbd className="hidden sm:inline-block rounded bg-emerald-700/60 px-1 py-0.2 text-[9px] font-mono text-emerald-100 border border-emerald-500/40">
            Ctrl ↵
          </kbd>
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Autres actions de l'éditeur"
            title="Autres actions"
            className="flex h-7 w-7 max-md:h-11 max-md:w-11 items-center justify-center rounded border bg-background/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {!isExamMode && (
            <DropdownMenuItem
              onSelect={() => setShowCourseDrawer(true)}
              className="text-xs gap-2 cursor-pointer"
              aria-label="Ouvrir le cours et mémento"
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>Cours & Mémento STI</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => void handleReset()}
            disabled={isExamExpired && examCadre === "officiel"}
            className="text-xs gap-2 cursor-pointer"
            aria-label="Réinitialiser le fichier à l'état de départ"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>
              {isExamExpired && examCadre === "officiel"
                ? "Réinitialisation verrouillée (examen clôturé)"
                : "Réinitialiser aux fichiers de départ"}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
