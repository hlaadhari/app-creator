import type { WorkspaceState } from "@/hooks/useWorkspaceState";
import { EditorToolbar } from "@/components/workspace/EditorToolbar";
import { ExamLockBanner } from "@/components/workspace/ExamLockBanner";
import { FileTabs } from "@/components/workspace/FileTabs";
import { MonacoEditorPane } from "@/components/workspace/MonacoEditorPane";

/** Panneau central : onglets de fichiers, actions, éditeur Monaco ou visionneuse d'asset. */
export function EditorPanel({ ws }: { ws: WorkspaceState }) {
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
  return (
    <section className="flex min-h-0 flex-col bg-editor">
      {/* Barre d'onglets de fichiers et actions d'évaluation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b bg-panel text-xs font-mono shrink-0 select-none px-1 gap-1">
        <FileTabs ws={ws} />
        <EditorToolbar ws={ws} />
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
