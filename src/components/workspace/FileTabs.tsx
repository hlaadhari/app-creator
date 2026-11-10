import type { WorkspaceState } from "@/hooks/useWorkspaceState";

/** Onglets des fichiers ouverts, avec défilement horizontal isolé. */
export function FileTabs({ ws }: { ws: WorkspaceState }) {
  const { files, activeFileName, setActiveFileName, syncStatus } = ws;
  return (
    <div className="flex items-center overflow-x-auto no-scrollbar flex-1 min-w-0">
      {Object.keys(files).map((fileName) => {
        const isActive = activeFileName === fileName;
        return (
          <button
            key={fileName}
            onClick={() => setActiveFileName(fileName)}
            aria-label={`Ouvrir le fichier ${fileName}`}
            className={`flex items-center gap-2 border-r px-3.5 py-2 transition-colors border-t-2 shrink-0 cursor-pointer ${
              isActive
                ? "bg-editor text-foreground border-t-primary font-medium"
                : "text-muted-foreground hover:bg-accent/40 border-t-transparent"
            }`}
          >
            <span
              className={
                fileName.endsWith(".html")
                  ? "text-orange-500 font-bold"
                  : fileName.endsWith(".css")
                    ? "text-sky-400 font-bold"
                    : fileName.endsWith(".js")
                      ? "text-amber-400 font-bold"
                      : "text-purple-400"
              }
            >
              ●
            </span>
            <span>{fileName}</span>
            {syncStatus === "pending" && isActive && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                title="Modifications locales enregistrées dans le tampon IndexedDB"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
