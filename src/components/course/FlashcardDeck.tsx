import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NOTEBOOK_FLASHCARDS,
  type NotebookCategoryId,
  type NotebookFlashcard,
} from "@/content/notebook-sti";

interface FlashcardDeckProps {
  moduleId: NotebookCategoryId;
  cards?: NotebookFlashcard[] | undefined;
}

export function FlashcardDeck({ moduleId, cards }: FlashcardDeckProps) {
  const deck = useMemo<NotebookFlashcard[]>(() => {
    if (cards && cards.length > 0) return cards;
    const filtered = NOTEBOOK_FLASHCARDS.filter((c) => c.moduleId === moduleId);
    return filtered.length > 0 ? filtered : NOTEBOOK_FLASHCARDS;
  }, [moduleId, cards]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<string[]>([]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [moduleId]);

  const currentCard = deck[currentIndex] ?? deck[0];
  if (!currentCard) return null;

  const isMastered = masteredIds.includes(currentCard.id);
  const masteredInDeckCount = deck.filter((c) => masteredIds.includes(c.id)).length;

  const toggleMastered = (id: string) => {
    setMasteredIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + deck.length) % deck.length);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % deck.length);
  };

  return (
    <section
      className="rounded-xl border border-border bg-panel/75 p-5 space-y-4 shadow-xs"
      data-testid="flashcard-deck"
    >
      {/* En-tête du jeu de Flashcards */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/15 text-amber-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <span>Flashcards de Révision Rapide — Carnet STI-BAC INFO</span>
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Cliquez sur la carte pour révéler la réponse officielle et l'extrait de code
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {masteredInDeckCount}/{deck.length} maîtrisée{masteredInDeckCount > 1 ? "s" : ""}
          </span>
          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
            Carte {currentIndex + 1}/{deck.length}
          </span>
        </div>
      </div>

      {/* Carte interactive Recto / Verso */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsFlipped((f) => !f);
          }
        }}
        className={`w-full min-h-[210px] rounded-xl border p-5 flex flex-col justify-between transition-all cursor-pointer select-none ${
          isFlipped
            ? "bg-emerald-950/25 border-emerald-500/40"
            : "bg-background/80 hover:border-primary/40 border-border"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 font-semibold">
              {currentCard.tag}
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                currentCard.difficulty === "Piège Bac"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : currentCard.difficulty === "Avancé"
                    ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                    : "bg-sky-500/15 text-sky-300 border-sky-500/30"
              }`}
            >
              {currentCard.difficulty}
            </span>
          </div>

          <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
            <RotateCw className="w-3 h-3" />
            <span>{isFlipped ? "Verso (Réponse)" : "Recto (Question)"}</span>
          </span>
        </div>

        <div className="my-4 space-y-3">
          {!isFlipped ? (
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm sm:text-base font-bold text-foreground leading-relaxed">
                {currentCard.question}
              </p>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in duration-150">
              <p className="text-xs sm:text-sm text-foreground/95 leading-relaxed whitespace-pre-line">
                {currentCard.answer}
              </p>
              {currentCard.codeExample && (
                <pre className="p-3 rounded-lg bg-slate-950 text-emerald-300 border border-slate-800 text-xs font-mono overflow-x-auto">
                  <code>{currentCard.codeExample}</code>
                </pre>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
          <span>
            {isFlipped
              ? "Astuce : cliquez à nouveau pour revenir à l'énoncé"
              : "Cliquez pour retourner la carte et voir la réponse"}
          </span>
          {isMastered && (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Maîtrisée
            </span>
          )}
        </div>
      </div>

      {/* Contrôles de navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrev}
            className="h-8 gap-1 text-xs cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Précédente</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsFlipped((f) => !f)}
            className="h-8 gap-1.5 text-xs cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{isFlipped ? "Voir la question" : "Voir la réponse"}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="h-8 gap-1 text-xs cursor-pointer"
          >
            <span>Suivante</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <Button
          type="button"
          variant={isMastered ? "secondary" : "default"}
          size="sm"
          onClick={() => toggleMastered(currentCard.id)}
          className="h-8 gap-1.5 text-xs cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{isMastered ? "Acquis ✓" : "Marquer comme maîtrisée"}</span>
        </Button>
      </div>
    </section>
  );
}
