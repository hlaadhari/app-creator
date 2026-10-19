import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Scale,
  XCircle,
  HelpCircle,
} from "lucide-react";
import type {
  SimilarityPairResult,
  StudentCopyData,
  TeacherArbitrationVerdict,
} from "@/lib/similarity/types";

interface SimilarityDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  pair: SimilarityPairResult | null;
  copyA?: StudentCopyData | undefined;
  copyB?: StudentCopyData | undefined;
  onArbitrate: (
    pairId: string,
    verdict: TeacherArbitrationVerdict,
    notes?: string | undefined,
  ) => void;
}

export function SimilarityDiffModal({
  isOpen,
  onClose,
  pair,
  copyA,
  copyB,
  onArbitrate,
}: SimilarityDiffModalProps) {
  const [selectedFile, setSelectedFile] = useState<string>("script.js");
  const [notes, setNotes] = useState<string>("");

  if (!pair) return null;

  // Initialiser le fichier sélectionné avec le premier fichier disponible
  const filesList = pair.fileDetails.map((f) => f.chemin);
  const activeFilePath = filesList.includes(selectedFile)
    ? selectedFile
    : (filesList[0] ?? "index.html");

  const contentA =
    copyA?.fichiers.find((f) => f.chemin === activeFilePath)?.contenu ||
    "// Fichier absent dans cette copie";
  const contentB =
    copyB?.fichiers.find((f) => f.chemin === activeFilePath)?.contenu ||
    "// Fichier absent dans cette copie";

  const fileDetail = pair.fileDetails.find((f) => f.chemin === activeFilePath);
  const fileSim = fileDetail ? fileDetail.similarity : 0;

  const handleApplyVerdict = (verdict: TeacherArbitrationVerdict) => {
    onArbitrate(pair.id, verdict, notes.trim() || undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Arbitrage Pédagogique & Comparaison Côte-à-Côte (PRD §16)
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Copie de{" "}
                <strong>
                  {pair.studentA.prenom} {pair.studentA.nom}
                </strong>{" "}
                comparée à celle de{" "}
                <strong>
                  {pair.studentB.prenom} {pair.studentB.nom}
                </strong>
                .
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono font-bold">
                Similarité globale : {pair.overallSimilarity}%
              </span>
              {pair.overallSimilarity >= 85 ? (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Forte présomption (≥ 85%)
                </Badge>
              ) : pair.overallSimilarity >= 70 ? (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Similarité suspecte
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  Normal (&lt; 70%)
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Sélecteur de fichiers de la copie */}
        <div className="py-2.5 border-b shrink-0 flex items-center justify-between flex-wrap gap-2">
          <Tabs value={activeFilePath} onValueChange={setSelectedFile} className="w-auto">
            <TabsList className="h-8 bg-muted/50 p-1">
              {pair.fileDetails.map((f) => (
                <TabsTrigger key={f.chemin} value={f.chemin} className="text-xs gap-1.5 h-6 px-2.5">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{f.chemin}</span>
                  <span
                    className={`font-mono text-[10px] ml-1 px-1 rounded ${
                      f.similarity >= 85
                        ? "bg-destructive/20 text-destructive font-bold"
                        : f.similarity >= 70
                          ? "bg-amber-500/20 text-amber-500"
                          : "text-muted-foreground"
                    }`}
                  >
                    {f.similarity}%
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <span className="text-[11px] text-muted-foreground">
            Fichier actif : <strong>{activeFilePath}</strong> ({fileSim}% identique
            structurellement)
          </span>
        </div>

        {/* Zone de comparaison côte-à-côte */}
        <div className="flex-1 min-h-[280px] max-h-[380px] grid grid-cols-1 md:grid-cols-2 gap-3 py-3 overflow-hidden">
          {/* Colonne Élève A */}
          <div className="border rounded-lg flex flex-col bg-card overflow-hidden">
            <div className="p-2 border-b bg-muted/40 text-xs font-semibold flex items-center justify-between">
              <span>
                Élève A : {pair.studentA.prenom} {pair.studentA.nom}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">{activeFilePath}</span>
            </div>
            <pre className="p-3 text-[11px] font-mono flex-1 overflow-auto bg-editor text-editor-foreground leading-relaxed whitespace-pre select-text">
              {contentA}
            </pre>
          </div>

          {/* Colonne Élève B */}
          <div className="border rounded-lg flex flex-col bg-card overflow-hidden">
            <div className="p-2 border-b bg-muted/40 text-xs font-semibold flex items-center justify-between">
              <span>
                Élève B : {pair.studentB.prenom} {pair.studentB.nom}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">{activeFilePath}</span>
            </div>
            <pre className="p-3 text-[11px] font-mono flex-1 overflow-auto bg-editor text-editor-foreground leading-relaxed whitespace-pre select-text">
              {contentB}
            </pre>
          </div>
        </div>

        {/* Panneau d'arbitrage enseignant (L'humain décide) */}
        <div className="pt-3 border-t shrink-0 space-y-3 bg-muted/20 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Scale className="w-4 h-4 text-primary" />
              <span>Principe didactique : « L'algorithme informe, l'humain décide »</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Statut actuel :{" "}
              <strong>
                {pair.verdictProf === "confirme"
                  ? "Plagiat confirmé"
                  : pair.verdictProf === "faux_positif"
                    ? "Classé sans suite (Faux positif)"
                    : "En attente d'arbitrage"}
              </strong>
            </span>
          </div>

          <Textarea
            placeholder="Commentaire ou observation de l'enseignant (ex: structure identique imposée par le sujet, ou similitude flagrante des variables renommées)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-xs h-16 resize-none bg-background"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8"
            >
              Fermer sans modifier
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyVerdict("faux_positif")}
                className="text-xs h-8 gap-1.5 border-green-600/30 text-green-600 hover:bg-green-600/10"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Classer sans suite (Faux positif)
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleApplyVerdict("confirme")}
                className="text-xs h-8 gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                Confirmer suspicion de plagiat
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
