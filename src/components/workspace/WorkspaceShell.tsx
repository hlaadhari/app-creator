import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import type { Exercise } from "@/lib/exercises";
import type { WorkspaceState } from "@/hooks/useWorkspaceState";
import { useIsMobile } from "@/hooks/use-mobile";
import { MAIN_CONTENT_ID } from "@/components/layout/AppHeader";
import { CourseDrawer } from "@/components/course/CourseDrawer";
import { ReferenceSolutionModal } from "@/components/pedagogy/ReferenceSolutionModal";
import { ConflictModal } from "@/components/workspace/ConflictModal";
import { EditorPanel } from "@/components/workspace/EditorPanel";
import { ExamCountdownBadge } from "@/components/workspace/ExamCountdownBadge";
import { MobileBottomNav, type MobileNavKey } from "@/components/workspace/MobileBottomNav";
import { MobileVerifyFab } from "@/components/workspace/MobileVerifyFab";
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
    countdown,
    evaluationSummary,
    evaluationError,
  } = ws;

  // Mobile (< 768 px) : un seul panneau à la fois, piloté par la navigation du bas (#243).
  const isMobile = useIsMobile();
  const [mobilePanel, setMobilePanel] = useState<"sidebar" | "code" | "preview">("sidebar");

  // Après une vérification, l'élève voit directement le résultat.
  useEffect(() => {
    if (evaluationSummary || evaluationError) setMobilePanel("sidebar");
  }, [evaluationSummary, evaluationError]);

  const navActive: MobileNavKey =
    mobilePanel === "sidebar"
      ? sidebarTab === "resultats"
        ? "resultats"
        : "sujet"
      : mobilePanel === "code"
        ? "code"
        : "apercu";

  const handleNavSelect = (key: MobileNavKey) => {
    if (key === "sujet") {
      setSidebarTab("enonce");
      setMobilePanel("sidebar");
    } else if (key === "resultats") {
      setSidebarTab("resultats");
      setMobilePanel("sidebar");
    } else {
      setMobilePanel(key === "code" ? "code" : "preview");
    }
  };

  const resultBadge =
    evaluationSummary && evaluationSummary.results.some((r) => r.automatique !== false)
      ? `${evaluationSummary.note20}/20`
      : null;

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground font-sans overflow-hidden">
      <WorkspaceHeader ex={ex} ws={ws} />

      {/* Bandeau consultation sur tablette (768–1023 px) ; remplacé par la mise en page 2 colonnes en #244 */}
      <div className="hidden md:flex lg:hidden bg-amber-500/10 border-b border-amber-500/30 px-3 py-1.5 items-center justify-between text-[11px] font-mono text-amber-600 dark:text-amber-400">
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

      {/* Mobile en examen : le chrono reste toujours visible sous l'en-tête */}
      {isMobile && isExamMode && countdown && (
        <div className="flex shrink-0 justify-center border-b bg-panel py-1">
          <ExamCountdownBadge countdown={countdown} />
        </div>
      )}

      {/* Corps du Workspace : 3 panneaux (≥ 768 px) ou un seul panneau (mobile) */}
      <main
        id={MAIN_CONTENT_ID}
        className="relative flex flex-1 min-h-0 flex-col md:grid md:grid-cols-1 lg:grid-cols-[320px_1fr_1fr] md:divide-x"
      >
        <SidebarPanel ex={ex} ws={ws} hidden={isMobile && mobilePanel !== "sidebar"} />
        <EditorPanel ws={ws} mobile={isMobile} hidden={isMobile && mobilePanel !== "code"} />
        <RightPanel ws={ws} hidden={isMobile && mobilePanel !== "preview"} />
        {isMobile && mobilePanel === "code" && <MobileVerifyFab ws={ws} />}
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

      {isMobile && (
        <MobileBottomNav active={navActive} onSelect={handleNavSelect} resultBadge={resultBadge} />
      )}

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
