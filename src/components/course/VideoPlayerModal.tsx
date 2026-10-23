import React, { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Film,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  SkipForward,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotebookVideoCapsule } from "@/content/notebook-sti";

interface VideoPlayerModalProps {
  capsule: NotebookVideoCapsule | null;
  onClose: () => void;
}

export function VideoPlayerModal({ capsule, onClose }: VideoPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [copiedSlide, setCopiedSlide] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Réinitialiser l'état à chaque changement de capsule
  useEffect(() => {
    setIsPlaying(false);
    setActiveChapterIdx(0);
    setElapsedSeconds(0);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [capsule?.id]);

  // Synchroniser le chapitre actif avec le temps écoulé
  useEffect(() => {
    if (!capsule) return;
    let currentIdx = 0;
    for (let i = 0; i < capsule.chapters.length; i++) {
      const ch = capsule.chapters[i];
      if (ch && elapsedSeconds >= ch.seconds) {
        currentIdx = i;
      }
    }
    setActiveChapterIdx(currentIdx);
  }, [elapsedSeconds, capsule]);

  // Boucle de lecture temporelle de la capsule interactive
  useEffect(() => {
    if (!isPlaying || !capsule) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(
      () => {
        setElapsedSeconds((prev) => {
          if (prev + 1 >= capsule.durationSeconds) {
            setIsPlaying(false);
            return capsule.durationSeconds;
          }
          return prev + 1;
        });
      },
      Math.round(1000 / playbackRate),
    );

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackRate, capsule]);

  // Synthèse vocale optionnelle lors du changement de chapitre en lecture
  useEffect(() => {
    if (
      !capsule ||
      !isPlaying ||
      isMuted ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }
    const chapter = capsule.chapters[activeChapterIdx];
    if (!chapter) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`${chapter.title}. ${chapter.narration}`);
      utterance.lang = "fr-FR";
      utterance.rate = playbackRate;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignorer si le navigateur bloque la synthèse vocale sans geste direct
    }

    return () => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    };
  }, [activeChapterIdx, isPlaying, isMuted, playbackRate, capsule]);

  if (!capsule) return null;

  const currentChapter = capsule.chapters[activeChapterIdx] ?? capsule.chapters[0];
  const progressPercent = Math.min(
    100,
    Math.round((elapsedSeconds / Math.max(1, capsule.durationSeconds)) * 100),
  );

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleSelectChapter = (idx: number) => {
    const target = capsule.chapters[idx];
    if (!target) return;
    setActiveChapterIdx(idx);
    setElapsedSeconds(target.seconds);
  };

  const handleCopySlideCode = async () => {
    if (!currentChapter?.codeSlide?.code) return;
    try {
      await navigator.clipboard.writeText(currentChapter.codeSlide.code);
      setCopiedSlide(true);
      setTimeout(() => setCopiedSlide(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={`Capsule vidéo : ${capsule.title}`}
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-panel border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* En-tête de la modale */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25">
                  {capsule.badge}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                  {capsule.notebookRef}
                </span>
              </div>
              <h3 className="text-sm font-bold text-foreground truncate mt-0.5">{capsule.title}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            title="Fermer le lecteur"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps du lecteur vidéo/audio */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 min-h-0">
          {/* Écran principal de la capsule */}
          <div className="rounded-xl border border-border bg-slate-950 text-slate-100 overflow-hidden shadow-lg">
            {capsule.videoUrl ? (
              <video
                src={capsule.videoUrl}
                controls
                className="w-full aspect-video bg-black"
                poster=""
              />
            ) : (
              /* Scène interactive synchronisée (Diaporama de code + Narration Carnet STI-BAC INFO) */
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <Sparkles className="w-3 h-3" />
                      Capsule Interactive STI-BAC INFO
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Chapitre {activeChapterIdx + 1}/{capsule.chapters.length}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {formatTime(elapsedSeconds)} / {capsule.duration}
                  </span>
                </div>

                {currentChapter && (
                  <div className="space-y-3">
                    <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {currentChapter.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
                      {currentChapter.narration}
                    </p>

                    {currentChapter.codeSlide && (
                      <div className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                          <span>
                            <strong className="text-primary uppercase mr-2">
                              {currentChapter.codeSlide.language}
                            </strong>
                            {currentChapter.codeSlide.caption}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopySlideCode}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] cursor-pointer"
                          >
                            {copiedSlide ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copié</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copier l'extrait</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3.5 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                          <code>{currentChapter.codeSlide.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Barre de contrôle du lecteur */}
            <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 space-y-2.5">
              {/* Barre de progression cliquable */}
              <div
                className="w-full h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setElapsedSeconds(Math.round(ratio * capsule.durationSeconds));
                }}
                title="Cliquer pour naviguer dans la capsule"
              >
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="h-8 gap-1.5 text-xs cursor-pointer"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Lire la capsule</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleSelectChapter((activeChapterIdx + 1) % capsule.chapters.length)
                    }
                    className="h-8 gap-1 text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 cursor-pointer"
                    title="Chapitre suivant"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Chapitre suivant</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsPlaying(false);
                      setElapsedSeconds(0);
                      setActiveChapterIdx(0);
                    }}
                    className="h-8 px-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                    title="Recommencer au début"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMuted((m) => !m)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
                    title={isMuted ? "Activer la voix synthèse" : "Couper la voix synthèse"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span className="text-[10px] font-mono hidden sm:inline">
                      {isMuted ? "Audio coupé" : "Audio FR"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlaybackRate((r) => (r === 1 ? 1.25 : r === 1.25 ? 1.5 : 1))}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono cursor-pointer"
                    title="Vitesse de lecture"
                  >
                    {playbackRate}x
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chapitres de la capsule & Points clés du carnet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sommaire des chapitres */}
            <div className="rounded-lg border border-border bg-background/60 p-3.5 space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span>Chapitres de la capsule ({capsule.chapters.length})</span>
              </h5>
              <div className="space-y-1.5">
                {capsule.chapters.map((ch, idx) => {
                  const active = idx === activeChapterIdx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectChapter(idx)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-left text-xs transition-colors cursor-pointer border ${
                        active
                          ? "bg-primary/15 text-primary border-primary/30 font-semibold"
                          : "hover:bg-accent/50 text-foreground/85 border-transparent"
                      }`}
                    >
                      <span className="truncate">{ch.title}</span>
                      <span className="text-[10px] font-mono opacity-75 shrink-0">
                        {ch.timestamp}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Points clés à retenir */}
            <div className="rounded-lg border border-border bg-background/60 p-3.5 space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Points Clés Bac STI à retenir</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-foreground/90">
                {capsule.keyTakeaways.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-emerald-400 font-bold mt-0.5">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Pied de modale */}
        <div className="px-4 py-3 border-t bg-background/90 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground truncate">{capsule.subtitle}</span>
          <div className="flex items-center gap-2 shrink-0">
            {capsule.relatedSubjectId && (
              <Link to="/sujet/$id" params={{ id: capsule.relatedSubjectId }} onClick={onClose}>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs cursor-pointer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ouvrir le sujet dans l'IDE</span>
                </Button>
              </Link>
            )}
            <Button size="sm" onClick={onClose} className="h-8 text-xs cursor-pointer">
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChapterVideoBannerProps {
  capsules: NotebookVideoCapsule[];
  onPlayCapsule: (capsule: NotebookVideoCapsule) => void;
}

/**
 * Bandeau de capsules vidéo intégré en haut de chaque chapitre / fiche de /cours
 */
export function ChapterVideoBanner({ capsules, onPlayCapsule }: ChapterVideoBannerProps) {
  if (capsules.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 shadow-xs"
      data-testid="chapter-video-banner"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/15 text-primary">
            <Film className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Capsules Vidéo & Audio — Carnet STI-BAC INFO
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Explications guidées, démonstrations de code et points de vigilance pour l'épreuve
              pratique
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 shrink-0">
          {capsules.length} capsule{capsules.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {capsules.map((cap) => (
          <div
            key={cap.id}
            className="flex flex-col justify-between rounded-lg border border-border bg-panel/90 p-3.5 hover:border-primary/40 transition-all gap-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-semibold text-primary uppercase px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                  {cap.badge}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">{cap.duration}</span>
              </div>
              <h4 className="text-sm font-bold text-foreground">{cap.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {cap.summary}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
              <span className="text-[10px] font-mono text-muted-foreground truncate">
                {cap.chapters.length} chapitres • {cap.notebookRef.split("•")[1] ?? "STI-BAC INFO"}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => onPlayCapsule(cap)}
                className="h-7 gap-1.5 text-xs shrink-0 cursor-pointer"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Regarder</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
