import { BookOpen } from "lucide-react";
import type { WorkspaceState } from "@/hooks/useWorkspaceState";
import { EditorToolbar } from "@/components/workspace/EditorToolbar";
import { ExamLockBanner } from "@/components/workspace/ExamLockBanner";
import { FileTabs } from "@/components/workspace/FileTabs";
import { MonacoEditorPane } from "@/components/workspace/MonacoEditorPane";

/** Panneau central : onglets de fichiers, actions, éditeur Monaco ou visionneuse d'asset. */
export function EditorPanel({
  ws,
  hidden = false,
  mobile = false,
  onOpenSidebar,
}: {
  ws: WorkspaceState;
  hidden?: boolean;
  mobile?: boolean;
  /** Tablette : ouvre l'énoncé et les fichiers dans un tiroir latéral. */
  onOpenSidebar?: (() => void) | undefined;
}) {
  const {
    activeFileName,
    currentFile,
    editorLanguage,
    updateFileContent,
    isExamExpired,
    triggerManualSync,
    handleVerify,
    setCursorPos,
  } = ws;
  const stacked = Boolean(onOpenSidebar);
  const sujetButton = onOpenSidebar ? (
    <button
      type="button"
      onClick={onOpenSidebar}
      aria-label="Ouvrir l'énoncé et les fichiers"
      className="flex shrink-0 items-center gap-1.5  rounded border bg-background/60 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent cursor-pointer"
    >
      <BookOpen className="h-3.5 w-3.5 text-primary" />
      <span>Sujet</span>
    </button>
  ) : null;
  return (
    <section
      data-testid="workspace-editor"
      className={`${hidden ? "hidden" : "flex"} min-h-0 flex-1 flex-col bg-editor`}
    >
      {/* Barre d'onglets de fichiers et actions d'évaluation */}
      <div
        className={`flex flex-col justify-between border-b bg-panel text-xs font-mono shrink-0 select-none px-1 gap-1 ${
          stacked ? "" : "sm:flex-row sm:items-center"
        }`}
      >
        {stacked ? (
          <>
            {/* Tablette : bouton « Sujet » et actions sur une ligne, onglets de fichiers dessous */}
            <div className="flex items-center justify-between gap-1">
              {sujetButton}
              <EditorToolbar ws={ws} compact={mobile} />
            </div>
            <FileTabs ws={ws} />
          </>
        ) : (
          <>
            <FileTabs ws={ws} />
            <EditorToolbar ws={ws} compact={mobile} />
          </>
        )}
      </div>

      <ExamLockBanner ws={ws} />

      {/* Éditeur de code Monaco ou Visualiseur d'asset */}
      <div className="flex-1 min-h-0 relative">
        {currentFile.type === "asset" ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
            <img
              src={currentFile.content}
              alt={currentFile.name}
              className="max-h-64 max-w-full rounded border bg-card shadow-sm object-contain"
            />
            <span className="mt-3 font-mono text-xs text-foreground font-medium">
              {currentFile.name}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {currentFile.size ? `${Math.round(currentFile.size / 1024)} Ko` : "Ressource locale"}
            </span>
          </div>
        ) : (
          <MonacoEditorPane
            mobile={mobile}
            value={currentFile.content}
            onChange={(newContent) => updateFileContent(activeFileName, newContent)}
            language={editorLanguage}
            theme="vs-dark"
            readOnly={isExamExpired}
            onSave={triggerManualSync}
            onVerify={handleVerify}
            onCursorChange={(line, col) => setCursorPos({ line, col })}
          />
        )}
      </div>
    </section>
  );
}
