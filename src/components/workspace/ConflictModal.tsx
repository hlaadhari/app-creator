import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Check, HardDrive, Cloud, Copy } from "lucide-react";
import type { ConflictData } from "@/lib/storage/types";

interface ConflictModalProps {
  open: boolean;
  conflict: ConflictData | null;
  onResolve: (action: "keep_local" | "keep_remote") => void;
}

export function ConflictModal({ open, conflict, onResolve }: ConflictModalProps) {
  const [activeTab, setActiveTab] = React.useState<"side_by_side" | "local" | "remote">(
    "side_by_side",
  );

  if (!conflict) return null;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-lg">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Conflit de révision détecté ({conflict.fileName})</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Une version concurrente plus récente existe sur le serveur (révision distante v
            {conflict.remoteRev} vs locale v{conflict.localRev}). Conformément à la règle
            d'intégrité pédagogique, <strong>aucun écrasement automatique n'est effectué</strong>.
            Veuillez choisir quelle version conserver.
          </DialogDescription>
        </DialogHeader>

        {/* Barre d'outils d'affichage */}
        <div className="flex items-center justify-between py-2 text-xs">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
            <button
              type="button"
              onClick={() => setActiveTab("side_by_side")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === "side_by_side"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Côte à côte
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("local")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === "local"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tampon local seul
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("remote")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === "remote"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Version serveur seule
            </button>
          </div>
          <span className="text-muted-foreground">
            Fichier :{" "}
            <code className="text-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
              {conflict.fileName}
            </code>
          </span>
        </div>

        {/* Visualisation Diff / Code */}
        <div className="flex-1 overflow-auto border rounded-md min-h-[300px] max-h-[450px] font-mono text-xs bg-muted/20">
          {activeTab === "side_by_side" ? (
            <div className="grid grid-cols-2 divide-x h-full">
              <div className="flex flex-col h-full overflow-hidden">
                <div className="bg-amber-500/10 px-3 py-1.5 font-sans font-medium text-amber-700 dark:text-amber-300 border-b flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5" />
                    Votre version locale (rev {conflict.localRev})
                  </span>
                  <span className="text-[11px] font-normal opacity-80">Sur cet appareil</span>
                </div>
                <pre className="p-3 overflow-auto flex-1 whitespace-pre-wrap text-foreground">
                  {conflict.localContent}
                </pre>
              </div>

              <div className="flex flex-col h-full overflow-hidden">
                <div className="bg-blue-500/10 px-3 py-1.5 font-sans font-medium text-blue-700 dark:text-blue-300 border-b flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cloud className="h-3.5 w-3.5" />
                    Version serveur (rev {conflict.remoteRev})
                  </span>
                  <span className="text-[11px] font-normal opacity-80">Enregistrée à distance</span>
                </div>
                <pre className="p-3 overflow-auto flex-1 whitespace-pre-wrap text-foreground">
                  {conflict.remoteContent}
                </pre>
              </div>
            </div>
          ) : activeTab === "local" ? (
            <div className="p-3">
              <div className="text-xs font-semibold text-amber-600 mb-2">
                Tampon local (rev {conflict.localRev}) :
              </div>
              <pre className="whitespace-pre-wrap">{conflict.localContent}</pre>
            </div>
          ) : (
            <div className="p-3">
              <div className="text-xs font-semibold text-blue-600 mb-2">
                Version distante (rev {conflict.remoteRev}) :
              </div>
              <pre className="whitespace-pre-wrap">{conflict.remoteContent}</pre>
            </div>
          )}
        </div>

        {/* Actions d'arbitrage explicites (Inviolable #4) */}
        <div className="pt-4 mt-2 border-t flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            L'arbitrage mettra à jour la révision et débloquera la synchronisation continue.
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onResolve("keep_remote")}
              className="gap-1.5 border-blue-500/40 hover:bg-blue-500/10 text-xs"
            >
              <Cloud className="h-3.5 w-3.5 text-blue-500" />
              Adopter la version du serveur (v{conflict.remoteRev})
            </Button>
            <Button
              type="button"
              onClick={() => onResolve("keep_local")}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs"
            >
              <HardDrive className="h-3.5 w-3.5" />
              Conserver ma version locale (prioritaire)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
