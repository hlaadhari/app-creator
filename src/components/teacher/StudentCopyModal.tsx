import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { ensureMonacoConfigured } from "@/lib/editor/monaco-setup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCode, Shield, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { TeacherClassMember, StudentFile } from "@/lib/supabase/teacher";
import { getLibelleSourceTentative } from "@/lib/supabase/tentative-details";

interface StudentCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  eleve: TeacherClassMember | null;
  files: StudentFile[];
  loading: boolean;
}

export function StudentCopyModal({
  isOpen,
  onClose,
  eleve,
  files,
  loading,
}: StudentCopyModalProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      void ensureMonacoConfigured();
    }
  }, [isOpen]);

  if (!eleve) return null;

  const activeFile = files[selectedFileIndex] || null;

  const getLanguage = (path: string) => {
    if (path.endsWith(".html")) return "html";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".js") || path.endsWith(".ts")) return "javascript";
    if (path.endsWith(".php")) return "php";
    if (path.endsWith(".sql")) return "sql";
    if (path.endsWith(".json")) return "json";
    return "plaintext";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground">
        <DialogHeader className="p-4 border-b bg-muted/40 flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg font-semibold">
                Copie de {eleve.prenom} {eleve.nom}
              </DialogTitle>
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-500 border-amber-500/30 flex items-center gap-1"
              >
                <Shield className="w-3 h-3" />
                Lecture seule
              </Badge>
              <Badge variant={eleve.projet_statut === "rendu" ? "default" : "secondary"}>
                {eleve.projet_statut === "rendu" ? "Rendu scellé" : "En cours d'édition"}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
              <span>
                Dernière activité :{" "}
                {new Date(eleve.derniere_activite || eleve.joined_at).toLocaleString("fr-FR")}
              </span>
              <span>
                Score formatif : {eleve.score_formatif ?? 0}% ({eleve.criteres_reussis}/
                {eleve.total_criteres} validés) — {getLibelleSourceTentative(eleve.score_source)}
              </span>
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Corps principal : Arborescence à gauche, Monaco Editor au centre */}
        <div className="flex-1 flex overflow-hidden">
          {/* Explorateur de fichiers élève */}
          <div className="w-64 border-r bg-muted/20 flex flex-col overflow-y-auto p-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              Fichiers du projet ({files.length})
            </span>

            {loading ? (
              <div className="p-4 text-xs text-muted-foreground animate-pulse">
                Chargement des fichiers...
              </div>
            ) : files.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground italic">
                Aucun fichier trouvé pour cet élève.
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                {files.map((file, idx) => (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${
                      selectedFileIndex === idx
                        ? "bg-primary/15 text-primary font-medium"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    <span className="truncate">{file.chemin}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">r{file.rev}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Section Points de blocage / Critères */}
            {eleve.points_faibles && eleve.points_faibles.length > 0 && (
              <div className="mt-auto border-t pt-2 p-2">
                <span className="text-[11px] font-semibold text-red-500 flex items-center gap-1 mb-1">
                  <XCircle className="w-3.5 h-3.5" />
                  Difficultés détectées
                </span>
                <ul className="space-y-1">
                  {eleve.points_faibles.map((pf, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground leading-tight">
                      • {pf}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Éditeur Monaco en lecture seule */}
          <div className="flex-1 flex flex-col bg-background">
            {activeFile ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10 text-xs text-muted-foreground">
                  <span className="font-mono text-foreground font-medium">{activeFile.chemin}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]">Révision #{activeFile.rev}</span>
                    <span>•</span>
                    <span className="text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(activeFile.updated_at).toLocaleTimeString("fr-FR")}
                    </span>
                  </div>
                </div>

                <div className="flex-1 relative">
                  <Editor
                    height="100%"
                    language={getLanguage(activeFile.chemin)}
                    theme="vs-dark"
                    value={activeFile.contenu}
                    options={{
                      readOnly: true,
                      domReadOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Sélectionnez un fichier pour prévisualiser le code de l'élève.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            L'enseignant dispose d'un accès strictement consultatif. Aucune altération du code élève
            n'est permise (T-02).
          </span>
          <Button size="sm" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
