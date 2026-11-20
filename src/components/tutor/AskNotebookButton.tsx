/**
 * Bouton « Demander au notebook » avec contexte préparé, copie presse-papiers,
 * repli manuel et fenêtre de première utilisation (Issue #294).
 */
import React, { useState } from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  LogIn,
  ClipboardPaste,
  CornerUpLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParametreApplication } from "@/hooks/useParametreApplication";
import {
  construireQuestionNotebook,
  type ContexteQuestionNotebook,
} from "@/lib/tutor/notebook-prompt";
import { estNeutraliseEnExamen } from "@/lib/tutor/guardrails";
import type { TutorContext } from "@/lib/tutor/types";

export const NOTEBOOK_INTRO_STORAGE_KEY = "labo_sti_notebook_intro_masquee";

function lireIntroMasquee(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.localStorage.getItem(NOTEBOOK_INTRO_STORAGE_KEY) === "1"
    );
  } catch {
    return false;
  }
}

function enregistrerIntroMasquee(masquer: boolean): void {
  try {
    if (typeof window !== "undefined") {
      if (masquer) {
        window.localStorage.setItem(NOTEBOOK_INTRO_STORAGE_KEY, "1");
      } else {
        window.localStorage.removeItem(NOTEBOOK_INTRO_STORAGE_KEY);
      }
    }
  } catch {
    // Repli silencieux si localStorage est indisponible
  }
}

export interface AskNotebookButtonProps {
  /** Construit le contexte de la question au moment du clic. */
  buildContext: () => ContexteQuestionNotebook;
  /** Contexte complet de l'atelier (utilisé pour vérifier estNeutraliseEnExamen). */
  tutorContext?: TutorContext | undefined;
  /** Indique explicitement qu'une copie d'examen est en cours. */
  isExamMode?: boolean | undefined;
  /** Libellé court pour les barres compactes. */
  compact?: boolean | undefined;
  /** Classe CSS optionnelle. */
  className?: string | undefined;
}

export function AskNotebookButton({
  buildContext,
  tutorContext,
  isExamMode = false,
  compact = false,
  className,
}: AskNotebookButtonProps) {
  const { parametre } = useParametreApplication("tuteur_gemini_notebook");
  const [showIntro, setShowIntro] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [manualPrompt, setManualPrompt] = useState<string | null>(null);
  const [manualCopied, setManualCopied] = useState(false);

  // Masqué si désactivé par l'admin ou si une épreuve d'examen est en cours
  const neutralise = isExamMode || (tutorContext ? estNeutraliseEnExamen(tutorContext) : false);

  if (!parametre.actif || neutralise) {
    return null;
  }

  const executerCopieEtOuverture = async () => {
    const prompt = construireQuestionNotebook(buildContext());
    const url = parametre.url;

    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard API indisponible");
      }
      await navigator.clipboard.writeText(prompt);
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Question copiée. Colle-la dans le notebook (Ctrl+V).");
    } catch {
      setManualCopied(false);
      setManualPrompt(prompt);
    }
  };

  const handleTriggerClick = () => {
    if (lireIntroMasquee()) {
      void executerCopieEtOuverture();
    } else {
      setShowIntro(true);
    }
  };

  const handleConfirmIntro = () => {
    if (dontShowAgain) {
      enregistrerIntroMasquee(true);
    }
    setShowIntro(false);
    void executerCopieEtOuverture();
  };

  const handleManualOpen = () => {
    window.open(parametre.url, "_blank", "noopener,noreferrer");
    setManualPrompt(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleTriggerClick}
        className={
          className ??
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 transition-colors cursor-pointer"
        }
        title="Copier votre question avec son contexte et ouvrir Gemini Notebook dans un nouvel onglet"
      >
        <Sparkles className="w-3 h-3 shrink-0" />
        <span>{compact ? "Notebook" : "Demander au notebook"}</span>
        <ExternalLink className="w-3 h-3 shrink-0 opacity-75" />
      </button>

      {/* Fenêtre explicative de première utilisation (3 étapes) */}
      <AlertDialog open={showIntro} onOpenChange={setShowIntro}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-primary" />
              Demander au notebook STI-BAC INFO
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              Labo STI prépare votre question avec le contexte du cours ou de l&apos;exercice (sans
              aucune donnée personnelle) puis ouvre le notebook public Google dans un nouvel onglet.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ol className="space-y-2.5 my-2 text-xs">
            <li className="flex items-start gap-2.5 rounded-md border bg-muted/40 p-2.5">
              <span className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <LogIn className="w-3.5 h-3.5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">
                  1. Connecte-toi avec ton compte Google
                </p>
                <p className="text-muted-foreground">
                  Utilise ton propre compte Google dans l&apos;onglet ouvert. Aucune donnée Google
                  n&apos;est transmise à Labo STI.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2.5 rounded-md border bg-muted/40 p-2.5">
              <span className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <ClipboardPaste className="w-3.5 h-3.5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">2. Colle la question (Ctrl+V)</p>
                <p className="text-muted-foreground">
                  Ta question contextualisée est déjà copiée dans le presse-papiers. Colle-la dans
                  le champ de discussion du notebook.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2.5 rounded-md border bg-muted/40 p-2.5">
              <span className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <CornerUpLeft className="w-3.5 h-3.5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">3. Reviens dans Labo STI</p>
                <p className="text-muted-foreground">
                  Applique les explications dans ton code et relance l&apos;évaluation pour vérifier
                  tes progrès.
                </p>
              </div>
            </li>
          </ol>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-border"
            />
            Ne plus afficher cette fenêtre
          </label>

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <Button type="button" onClick={handleConfirmIntro} className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Copier et ouvrir le notebook
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fenêtre de repli manuel si navigator.clipboard.writeText échoue */}
      <AlertDialog
        open={manualPrompt !== null}
        onOpenChange={(open) => !open && setManualPrompt(null)}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <Copy className="w-4 h-4 text-primary" />
              Copier manuellement la question
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              La copie automatique n&apos;a pas pu s&apos;effectuer dans ce navigateur. Sélectionnez
              le texte ci-dessous (Ctrl+C), puis ouvrez le notebook.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <textarea
            readOnly
            value={manualPrompt ?? ""}
            onFocus={(e) => e.currentTarget.select()}
            rows={9}
            aria-label="Question préparée pour le notebook"
            className="w-full rounded-md border bg-muted/50 p-2.5 text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <AlertDialogFooter>
            <AlertDialogCancel>Fermer</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!manualPrompt) return;
                try {
                  await navigator.clipboard.writeText(manualPrompt);
                  setManualCopied(true);
                } catch {
                  setManualCopied(false);
                }
              }}
              className="gap-1.5"
            >
              {manualCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {manualCopied ? "Copié" : "Réessayer la copie"}
            </Button>
            <Button type="button" onClick={handleManualOpen} className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir le notebook
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
