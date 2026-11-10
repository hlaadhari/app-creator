import type { WorkspaceState } from "@/hooks/useWorkspaceState";
import { DatabasePanel } from "@/components/sql/DatabasePanel";
import { PhpRunnerPanel } from "@/components/php/PhpRunnerPanel";
import { PreviewSandbox } from "@/components/workspace/PreviewSandbox";

/** Panneau droit : aperçu en bac à sable, base SQL et console PHP. */
export function RightPanel({ ws, hidden = false }: { ws: WorkspaceState; hidden?: boolean }) {
  const { files, activeFileName, hasSql, hasPhp, rightPanelTab, setRightPanelTab } = ws;
  return (
    <section className={`${hidden ? "hidden" : "flex"} min-h-0 flex-1 flex-col bg-background`}>
      {(hasSql || hasPhp) && (
        <div className="flex border-b bg-panel text-xs font-mono shrink-0 select-none">
          <button
            onClick={() => setRightPanelTab("preview")}
            aria-label="Afficher l'aperçu Web"
            className={`flex-1 py-2 text-center transition-colors border-b-2 ${
              rightPanelTab === "preview"
                ? "border-b-primary font-semibold text-foreground bg-background/50"
                : "border-b-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Aperçu Web
          </button>
          {hasSql && (
            <button
              onClick={() => setRightPanelTab("sql")}
              aria-label="Afficher la base de données SQL"
              className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                rightPanelTab === "sql"
                  ? "border-b-primary font-semibold text-foreground bg-background/50"
                  : "border-b-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Base de Données (MySQLi)
            </button>
          )}
          {hasPhp && (
            <button
              onClick={() => setRightPanelTab("php")}
              aria-label="Afficher la console d'exécution PHP"
              className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                rightPanelTab === "php"
                  ? "border-b-primary font-semibold text-foreground bg-background/50"
                  : "border-b-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Console PHP 8.2
            </button>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {rightPanelTab === "preview" && <PreviewSandbox files={files} />}
        {rightPanelTab === "sql" && (
          <DatabasePanel
            initialSql={files["db/init.sql"]?.content || files["schema.sql"]?.content || ""}
            projectFiles={Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.content]))}
          />
        )}
        {rightPanelTab === "php" && (
          <PhpRunnerPanel files={files} activeFileName={activeFileName} />
        )}
      </div>
    </section>
  );
}
