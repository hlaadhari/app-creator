import { useEffect, useRef, useState } from "react";
import type { Exercise } from "@/lib/exercises";
import type { WorkspaceState } from "@/hooks/useWorkspaceState";
import { useWorkspaceLayout } from "@/hooks/useWorkspaceLayout";
import { MAIN_CONTENT_ID } from "@/components/layout/AppHeader";
import { CourseDrawer } from "@/components/course/CourseDrawer";
import { ReferenceSolutionModal } from "@/components/pedagogy/ReferenceSolutionModal";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ConflictModal } from "@/components/workspace/ConflictModal";
import { EditorPanel } from "@/components/workspace/EditorPanel";
import { ExamCountdownBadge } from "@/components/workspace/ExamCountdownBadge";
import { MobileBottomNav, type MobileNavKey } from "@/components/workspace/MobileBottomNav";
import { MobileVerifyFab } from "@/components/workspace/MobileVerifyFab";
import { ResizableWorkspace } from "@/components/workspace/ResizableWorkspace";
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

  // Trois modes (#243, #244) : mobile (< 768 px) un panneau, tablette deux colonnes
  // avec énoncé en tiroir, desktop (≥ 1280 px) trois colonnes redimensionnables.
  const layout = useWorkspaceLayout();
  const isMobile = layout === "mobile";
  const [mobilePanel, setMobilePanel] = useState<"sidebar" | "code" | "preview">("sidebar");
  const [sidebarSheetOpen, setSidebarSheetOpen] = useState(false);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Après une vérification, l'élève voit directement le résultat.
  useEffect(() => {
    if (!evaluationSummary && !evaluationError) return;
    if (layoutRef.current === "mobile") setMobilePanel("sidebar");
    if (layoutRef.current === "tablet") setSidebarSheetOpen(true);
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

      {/* Mobile en examen : le chrono reste toujours visible sous l'en-tête */}
      {isMobile && isExamMode && countdown && (
        <div className="flex shrink-0 justify-center border-b bg-panel py-1">
          <ExamCountdownBadge countdown={countdown} />
        </div>
      )}

      {/* Corps du Workspace : un panneau (mobile), deux colonnes (tablette) ou trois (desktop) */}
      <main id={MAIN_CONTENT_ID} className="relative flex flex-1 min-h-0 flex-col">
        {layout === "desktop" && <ResizableWorkspace ex={ex} ws={ws} />}

        {layout === "tablet" && (
          <>
            <div className="grid flex-1 min-h-0 grid-cols-2 divide-x">
              <EditorPanel ws={ws} onOpenSidebar={() => setSidebarSheetOpen(true)} />
              <RightPanel ws={ws} />
            </div>
            <Sheet open={sidebarSheetOpen} onOpenChange={setSidebarSheetOpen}>
              <SheetContent side="left" className="w-[min(380px,90vw)] gap-0 p-0 sm:max-w-none">
                <SheetTitle className="sr-only">Sujet et fichiers</SheetTitle>
                <SheetDescription className="sr-only">
                  Énoncé, fichiers, résultats et tuteur du sujet.
                </SheetDescription>
                <div className="flex h-full min-h-0 flex-col pt-12">
                  <SidebarPanel ex={ex} ws={ws} />
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}

        {isMobile && (
          <>
            <SidebarPanel ex={ex} ws={ws} hidden={mobilePanel !== "sidebar"} />
            <EditorPanel ws={ws} mobile hidden={mobilePanel !== "code"} />
            <RightPanel ws={ws} hidden={mobilePanel !== "preview"} />
            {mobilePanel === "code" && <MobileVerifyFab ws={ws} />}
          </>
        )}
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
