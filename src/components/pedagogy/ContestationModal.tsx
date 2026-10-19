import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Send, MessageSquare, ShieldAlert } from "lucide-react";
import {
  soumettreContestation,
  type ContestationSubmission,
} from "@/lib/pedagogy/contestations-client";
import type { ContestationRecord } from "@/lib/subjects/contestations-service";

interface ContestationModalProps {
  isOpen: boolean;
  onClose: () => void;
  critere: {
    id: string;
    code?: string | undefined;
    label: string;
    maxPoints: number;
    message?: string | undefined;
  };
  eleveId: string;
  eleveNom?: string | undefined;
  projetId?: string | null | undefined;
  sujetVersionId?: string | null | undefined;
  existingContestation?: ContestationRecord | undefined;
  onContestationSubmitted?: ((contestation: ContestationRecord) => void) | undefined;
}

export function ContestationModal({
  isOpen,
  onClose,
  critere,
  eleveId,
  eleveNom,
  projetId,
  sujetVersionId,
  existingContestation,
  onContestationSubmitted,
}: ContestationModalProps) {
  const [texte, setTexte] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const charCount = texte.trim().length;
  const isValidLength = charCount >= 10;

  const handleSubmit = async () => {
    if (!isValidLength || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    const submission: ContestationSubmission = {
      critereId: critere.id,
      critereCode: critere.code ?? critere.id.toUpperCase(),
      critereLabel: critere.label,
      eleveId,
      eleveNom: eleveNom ?? "Élève STI",
      texte,
      projetId,
      sujetVersionId,
    };

    const res = await soumettreContestation(submission);
    setSubmitting(false);

    if (res.success && res.contestation) {
      onContestationSubmitted?.(res.contestation);
      onClose();
    } else {
      setErrorMessage(res.error ?? "Erreur lors de la soumission de la contestation.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <MessageSquare className="h-5 w-5" />
            <DialogTitle className="text-base font-semibold">
              Contestation didactique de critère
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Signalez un critère d'évaluation jugé erroné ou trop restrictif par rapport à votre
            code.
          </DialogDescription>
        </DialogHeader>

        {/* Détails du critère contesté */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">{critere.label}</span>
            <Badge variant="outline" className="font-mono text-[10px]">
              {critere.maxPoints} pts
            </Badge>
          </div>
          {critere.message && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
              Retour de la sonde : {critere.message}
            </p>
          )}
        </div>

        {/* Si une contestation a déjà été soumise pour ce critère */}
        {existingContestation ? (
          <div className="space-y-3 py-2">
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                existingContestation.statut === "en_attente"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                  : existingContestation.statut === "acceptee"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
              }`}
            >
              {existingContestation.statut === "en_attente" && (
                <Clock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              )}
              {existingContestation.statut === "acceptee" && (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              )}
              {existingContestation.statut === "rejetee" && (
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              )}

              <div className="space-y-1">
                <div className="font-semibold">
                  {existingContestation.statut === "en_attente" &&
                    "Contestation en cours d'analyse"}
                  {existingContestation.statut === "acceptee" &&
                    "Contestation validée par l'enseignant"}
                  {existingContestation.statut === "rejetee" && "Contestation rejetée après examen"}
                </div>
                <p className="text-[11px] opacity-90">
                  Votre motif : &laquo; {existingContestation.texte} &raquo;
                </p>
                {existingContestation.motif_rejet && (
                  <p className="text-[11px] font-medium mt-1">
                    Motif enseignant : {existingContestation.motif_rejet}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onClose} className="w-full text-xs">
                Fermer
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label htmlFor="motif-contestation" className="text-xs font-medium text-foreground">
                Motif explicatif de votre contestation :
              </label>
              <Textarea
                id="motif-contestation"
                placeholder="Exemple : J'ai utilisé une balise sémantique équivalente ou une structure CSS valide que la sonde n'a pas détectée..."
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                rows={4}
                className="text-xs"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Argumentez votre démarche technique</span>
                <span
                  className={`font-mono font-medium ${
                    isValidLength ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
                  }`}
                >
                  {charCount} / 10 caractères min.
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!isValidLength || submitting}
                className="text-xs gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? "Envoi..." : "Envoyer à l'enseignant"}</span>
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
