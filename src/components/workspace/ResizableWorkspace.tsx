import { useDefaultLayout, type LayoutStorage } from "react-resizable-panels";
import type { Exercise } from "@/lib/exercises";
import type { WorkspaceState } from "@/hooks/useWorkspaceState";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { EditorPanel } from "@/components/workspace/EditorPanel";
import { RightPanel } from "@/components/workspace/RightPanel";
import { SidebarPanel } from "@/components/workspace/SidebarPanel";

export const WORKSPACE_LAYOUT_ID = "labo-sti-workspace-3col";

/** localStorage peut être absent ou refusé (navigation privée, quota) : on n'échoue jamais. */
export const stockageSecurise: LayoutStorage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Écriture impossible : la mise en page par défaut sera utilisée au prochain chargement.
    }
  },
};

const POIGNEE = "after:w-2 hover:bg-primary/40 data-[separator=active]:bg-primary/60";
const PANNEAU = "flex min-h-0 flex-col";

/**
 * Desktop (≥ 1280 px) : trois colonnes redimensionnables à la souris et au clavier
 * (flèches sur le séparateur), double-clic pour revenir aux tailles par défaut.
 * Aucune colonne ne descend sous 320 px ; les tailles sont mémorisées.
 */
export function ResizableWorkspace({ ex, ws }: { ex: Exercise; ws: WorkspaceState }) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: WORKSPACE_LAYOUT_ID,
    storage: stockageSecurise,
  });

  return (
    <ResizablePanelGroup
      id={WORKSPACE_LAYOUT_ID}
      orientation="horizontal"
      {...(defaultLayout ? { defaultLayout } : {})}
      onLayoutChanged={onLayoutChanged}
    >
      <ResizablePanel id="sidebar" defaultSize="25" minSize="320px" className={PANNEAU}>
        <SidebarPanel ex={ex} ws={ws} />
      </ResizablePanel>
      <ResizableHandle
        withHandle
        className={POIGNEE}
        aria-label="Redimensionner l'énoncé et l'éditeur"
      />
      <ResizablePanel id="editor" defaultSize="40" minSize="320px" className={PANNEAU}>
        <EditorPanel ws={ws} />
      </ResizablePanel>
      <ResizableHandle
        withHandle
        className={POIGNEE}
        aria-label="Redimensionner l'éditeur et l'aperçu"
      />
      <ResizablePanel id="preview" defaultSize="35" minSize="320px" className={PANNEAU}>
        <RightPanel ws={ws} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
