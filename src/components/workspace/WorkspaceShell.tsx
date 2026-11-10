import { Info } from "lucide-react";
import type { Exercise } from "@/lib/exercises";
import type { WorkspaceState } from "@/hooks/useWorkspaceState";
import { MAIN_CONTENT_ID } from "@/components/layout/AppHeader";
import { CourseDrawer } from "@/components/course/CourseDrawer";
import { ReferenceSolutionModal } from "@/components/pedagogy/ReferenceSolutionModal";
import { ConflictModal } from "@/components/workspace/ConflictModal";
import { EditorPanel } from "@/components/workspace/EditorPanel";
import { RightPanel } from "@/components/workspace/RightPanel";
import { SidebarPanel } from "@/components/workspace/SidebarPanel";
import { SyncStatusBar } from "@/components/workspace/SyncStatusBar";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";

/** Mise en page du workspace : en-tête, trois panneaux, barre de statut et modales. */
export function WorkspaceShell({ ex, ws }: { ex: Exercise; ws: WorkspaceState }) {
  const id = ex.id;
  const {
    sidebarTab,
    setSidebarTab,
    syncStatus,
    rev,
    lastSavedAt,
    cursorPos,
    activeFileName,
    isLateSync,
    triggerManualSync,
    conflict,
    resolveConflict,
    accessibilityMessage,
    showCourseDrawer,
    setShowCourseDrawer,
    handleInsertCourseCode,
    showSolutionModal,
    setShowSolutionModal,
    examVersionId,
    isExamMode,
    isExamExpired,
  } = ws;
  return (
    <div className="flex h-screen flex-col bg-background text-foreground font-sans overflow-hidden">
      <WorkspaceHeader ex={ex} ws={ws} />

      {/* Bandeau consultation / révision sur écran < 1024px (WCAG 2.1 AA / UX-03) */}
      <div className="lg:hidden bg-amber-500/10 border-b border-amber-500/30 px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-amber-600 dark:text-amber-400">
        <div className="flex items-center gap-1.5 truncate">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            Mode consultation — Écran ≥ 1024 px recommandé pour l'éditeur VS Code.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSidebarTab((prev) => (prev === "enonce" ? "resultats" : "enonce"))}
          className="ml-2 text-[10px] underline font-semibold shrink-0 cursor-pointer text-amber-700 dark:text-amber-300"
          aria-label="Basculer entre l'énoncé et les résultats d'évaluation"
        >
          {sidebarTab === "enonce" ? "Résultats" : "Énoncé"}
        </button>
      </div>

      {/* Corps du Workspace en 3 Panneaux */}
      <main
        id={MAIN_CONTENT_ID}
        className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[320px_1fr_1fr] divide-x"
      >
        <SidebarPanel ex={ex} ws={ws} />
        <EditorPanel ws={ws} />
        <RightPanel ws={ws} />
      </main>

      {/* Annonce d'accessibilité en direct (WCAG 2.1 AA - PRD UX-03) */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {accessibilityMessage}
      </div>

      {/* Barre de Statut Résiliente */}
      <SyncStatusBar
        status={syncStatus}
        rev={rev}
        lastSavedAt={lastSavedAt}
        cursorPos={cursorPos}
        activeFileName={activeFileName}
        isLateSync={isLateSync}
        onManualSync={triggerManualSync}
      />

      {/* Modale d'arbitrage de conflit explicite (Inviolable #4) */}
      <ConflictModal open={Boolean(conflict)} conflict={conflict} onResolve={resolveConflict} />

      {/* Panneau Latéral Escamotable : Cours & Mémento Bac STI */}
      <CourseDrawer
        open={showCourseDrawer}
        onOpenChange={setShowCourseDrawer}
        onInsertCode={handleInsertCourseCode}
        activeFileName={activeFileName}
      />

      {/* Modale de consultation du corrigé officiel après clôture (#188) */}
      <ReferenceSolutionModal
        isOpen={showSolutionModal}
        onClose={() => setShowSolutionModal(false)}
        sujetId={id}
        sujetTitle={ex.title}
        sujetVersionId={examVersionId}
        examMode={Boolean(isExamMode && !isExamExpired)}
      />
    </div>
  );
}
