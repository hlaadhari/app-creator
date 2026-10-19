import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Copy,
  Check,
  ShieldAlert,
  FileCode,
  Sparkles,
  Lock,
} from "lucide-react";
import {
  consulterSolutionReference,
  type SolutionFile,
} from "@/lib/pedagogy/solutions-client";

interface ReferenceSolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sujetId: string;
  sujetTitle?: string | undefined;
  sujetVersionId?: string | null | undefined;
  examMode?: boolean | undefined;
}

export function ReferenceSolutionModal({
  isOpen,
  onClose,
  sujetId,
  sujetTitle,
  sujetVersionId,
  examMode = false,
}: ReferenceSolutionModalProps) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<SolutionFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Blocage immédiat si mode examen
    if (examMode) {
      setError(
        "Accès au corrigé strictement interdit : une session d'examen est active sur votre poste (T-04 / T-06).",
      );
      setFiles([]);
      return;
    }

    setLoading(true);
    setError(null);

    consulterSolutionReference({
      sujetId,
      versionId: sujetVersionId,
      estEnExamen: examMode,
    })
      .then((res) => {
        if (res.success && res.files && res.files.length > 0) {
          setFiles(res.files);
          setSelectedFile(res.files[0]?.path ?? "");
        } else {
          setError(res.error ?? "Aucun corrigé officiel trouvé.");
          setFiles([]);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erreur lors du chargement du corrigé.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, sujetId, sujetVersionId, examMode]);

  const activeContent = files.find((f) => f.path === selectedFile)?.content ?? "";

  const handleCopy = () => {
    if (!activeContent) return;
    navigator.clipboard.writeText(activeContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-5 w-5" />
              <DialogTitle className="text-base font-semibold">
                Corrigé officiel de référence
              </DialogTitle>
            </div>
            {!examMode && !error && files.length > 0 && (
              <Badge variant="outline" className="text-[11px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                <Sparkles className="h-3 w-3" />
                Validé par l'inspection STI
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {sujetTitle ? `Sujet : ${sujetTitle}` : "Solution canonique d'entraînement didactique"}
          </DialogDescription>
        </DialogHeader>

        {/* Alerte si mode examen actif */}
        {examMode || (error && error.includes("interdit")) ? (
          <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex flex-col items-center justify-center text-center space-y-3 my-4">
            <div className="p-3 rounded-full bg-destructive/20">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <div className="text-sm font-bold">Sécurité Examen Active (T-04 / T-06)</div>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
              Pour garantir l'intégrité et l'équité des épreuves pratiques officielles du Bac STI,
              aucun corrigé de référence ne peut être consulté pendant une session d'examen.
            </p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-xl border bg-muted/40 text-center space-y-2 my-4">
            <div className="text-xs font-semibold text-foreground">Corrigé non disponible</div>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Chargement sécurisé du corrigé didactique...
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col space-y-3 my-2">
            {/* Onglets des fichiers de la solution */}
            <div className="flex items-center justify-between border-b pb-1 overflow-x-auto gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {files.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => setSelectedFile(f.path)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded font-mono transition-colors ${
                      selectedFile === f.path
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    <span>{f.path}</span>
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!activeContent}
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </Button>
            </div>

            {/* Visualiseur de code syntaxique */}
            <div className="flex-1 min-h-[250px] max-h-[380px] overflow-auto rounded-lg border bg-zinc-950 p-4 text-xs font-mono text-zinc-100 dark:bg-zinc-900 shadow-inner">
              <pre className="whitespace-pre font-mono leading-relaxed">
                <code>{activeContent}</code>
              </pre>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
