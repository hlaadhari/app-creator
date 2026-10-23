import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bot,
  Send,
  Sparkles,
  BookOpen,
  ExternalLink,
  GraduationCap,
  Play,
  RotateCcw,
  FileDown,
  X,
  Zap,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeSnippet } from "./CodeSnippet";
import { CourseViewer } from "./CourseViewer";
import { ChapterVideoBanner } from "./VideoPlayerModal";
import { FlashcardDeck } from "./FlashcardDeck";
import { InteractiveQuiz } from "./InteractiveQuiz";
import type { MementoCard } from "@/content/mementos";
import type { CourseModule as CourseModuleData } from "@/content/courses";
import {
  NOTEBOOK_VIDEOS,
  REVISION_GUIDE_STI,
  injectSnippetIntoStudentIde,
  queryNotebookKnowledgeBase,
  type NotebookCategoryId,
  type NotebookVideoCapsule,
} from "@/content/notebook-sti";

interface RevisionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RevisionGuideModal({ isOpen, onClose }: RevisionGuideModalProps) {
  const [injectedId, setInjectedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadGuide = () => {
    const lines: string[] = [
      `# ${REVISION_GUIDE_STI.title}`,
      `> ${REVISION_GUIDE_STI.subtitle} (${REVISION_GUIDE_STI.version})`,
      "",
    ];
    for (const sec of REVISION_GUIDE_STI.sections) {
      lines.push(`## ${sec.title} (${sec.badge})`);
      for (const rule of sec.goldenRules) {
        lines.push(`- ${rule}`);
      }
      lines.push("", "```", sec.essentialSyntax, "```", "");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Guide_Revision_Synthetique_4eme_Bac_STI.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={REVISION_GUIDE_STI.title}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-panel border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/90 shrink-0 gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 font-bold">
              {REVISION_GUIDE_STI.version}
            </span>
            <h3 className="text-sm sm:text-base font-extrabold text-foreground mt-1">
              {REVISION_GUIDE_STI.title}
            </h3>
            <p className="text-[11px] text-muted-foreground">{REVISION_GUIDE_STI.subtitle}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownloadGuide}
              className="h-8 gap-1.5 text-xs cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Télécharger (.md)</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
              title="Fermer le guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-h-0">
          {REVISION_GUIDE_STI.sections.map((sec) => (
            <div
              key={sec.id}
              className="rounded-xl border border-border bg-background/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-foreground">{sec.title}</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {sec.badge}
                </span>
              </div>

              <ul className="space-y-1.5 text-xs text-foreground/90">
                {sec.goldenRules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>

              <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-300">
                  <span>Patron Officiel Bac STI</span>
                  <button
                    type="button"
                    onClick={() => {
                      injectSnippetIntoStudentIde(sec.essentialSyntax);
                      setInjectedId(sec.id);
                      setTimeout(() => setInjectedId(null), 2000);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-sans font-semibold cursor-pointer"
                  >
                    {injectedId === sec.id ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Injecté dans SW_&lt;NCIN&gt; !</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        <span>⚡ Injecter dans l'IDE</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto">
                  <code>{sec.essentialSyntax}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface CourseModuleViewProps {
  categoryId: NotebookCategoryId;
  viewMode: "memento" | "manuel" | "annales";
  activeFiche?: MementoCard | undefined;
  activeManualModule?: CourseModuleData | undefined;
  searchQuery?: string | undefined;
  targetSectionId?: string | null | undefined;
  onPlayCapsule: (capsule: NotebookVideoCapsule) => void;
  onOpenRevisionGuide?: (() => void) | undefined;
}

export function CourseModuleView({
  categoryId,
  viewMode,
  activeFiche,
  activeManualModule,
  searchQuery = "",
  targetSectionId = null,
  onPlayCapsule,
  onOpenRevisionGuide,
}: CourseModuleViewProps) {
  const effectiveCategory: NotebookCategoryId = viewMode === "annales" ? "annales" : categoryId;

  const moduleVideos = NOTEBOOK_VIDEOS.filter((v) => v.moduleId === effectiveCategory);

  if (viewMode === "annales" || categoryId === "annales") {
    return (
      <div className="max-w-4xl mx-auto space-y-8" data-testid="annales-module-view">
        {/* En-tête de la section Module 6 : Annales Pratiques & Projets Full-Stack */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-primary uppercase px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                Module 6 • Annales Pratiques & Projets Full-Stack
              </span>
              <span className="text-xs text-muted-foreground">
                Carnet STI-BAC INFO • Sessions 2023, 2025 & 2026
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
              Corrigés Vidéo Guidés & Préparation à l'Épreuve Pratique
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
              Visionnez les résolutions complètes pas-à-pas : Projet Web Full-Stack, Correction Bac
              2025 (Droits d'accès) et Correction Bac 2026 (Bijoux Aurythia).
            </p>
          </div>

          {onOpenRevisionGuide && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenRevisionGuide}
              className="gap-1.5 text-xs h-8 cursor-pointer shrink-0"
            >
              <FileDown className="w-3.5 h-3.5 text-primary" />
              <span>Guide de Révision Synthétique - 4ème Bac STI</span>
            </Button>
          )}
        </div>

        {/* Cartes des vidéos d'annales (Projet Web Full-Stack, Bac 2025, Bac 2026 Bijoux Aurythia) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moduleVideos.map((cap) => (
            <div
              key={cap.id}
              className="rounded-xl border border-border bg-panel/90 p-4 flex flex-col justify-between gap-4 hover:border-primary/40 transition-all shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/25">
                    {cap.badge}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{cap.duration}</span>
                </div>

                <h3 className="text-base font-bold text-foreground">{cap.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{cap.summary}</p>

                <ul className="space-y-1 pt-1">
                  {cap.keyTakeaways.slice(0, 2).map((kt, idx) => (
                    <li
                      key={idx}
                      className="text-[11px] text-foreground/85 flex items-start gap-1.5"
                    >
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{kt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onPlayCapsule(cap)}
                  className="h-8 gap-1.5 text-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Lire le corrigé vidéo</span>
                </Button>

                {cap.relatedSubjectId && (
                  <Link to="/sujet/$id" params={{ id: cap.relatedSubjectId }}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Pratiquer dans l'IDE</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Flashcards et Quiz d'Annales */}
        <FlashcardDeck moduleId="annales" />
        <InteractiveQuiz moduleId="annales" />
      </div>
    );
  }

  if (viewMode === "manuel" && activeManualModule) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8 min-h-0 bg-background/50">
        <div className="max-w-4xl mx-auto space-y-8">
          <ChapterVideoBanner capsules={moduleVideos} onPlayCapsule={onPlayCapsule} />
          <CourseViewer
            module={activeManualModule}
            searchQuery={searchQuery}
            targetSectionId={targetSectionId}
            className="!px-0 !py-0"
          />
          <FlashcardDeck moduleId={effectiveCategory} />
          <InteractiveQuiz moduleId={effectiveCategory} />
        </div>
      </div>
    );
  }

  if (!activeFiche) return null;

  return (
    <div className="space-y-6" data-testid={`course-module-${activeFiche.id}`}>
      {/* Titre, Description & Accès rapide au Guide de Révision Synthétique */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-primary uppercase px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              {activeFiche.badge}
            </span>
            <span className="text-xs text-muted-foreground">{activeFiche.description}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mt-2 tracking-tight">
            {activeFiche.title}
          </h2>
        </div>

        {onOpenRevisionGuide && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenRevisionGuide}
            className="gap-1.5 text-xs h-8 cursor-pointer shrink-0"
          >
            <FileDown className="w-3.5 h-3.5 text-primary" />
            <span>Guide de Révision Synthétique - 4ème Bac STI</span>
          </Button>
        )}
      </div>

      {/* 1. Capsules Vidéo du Chapitre issues du Carnet "STI-BAC INFO" */}
      <ChapterVideoBanner capsules={moduleVideos} onPlayCapsule={onPlayCapsule} />

      {/* ⚠️ Cadre Piège Bac Officiel */}
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-amber-300 uppercase tracking-wider text-xs">
              ⚠️ Piège Fréquent au Bac STI
            </h3>
            <p className="leading-relaxed text-amber-100 text-xs font-sans">
              {activeFiche.piegeBac}
            </p>
          </div>
        </div>
      </div>

      {/* Sections & Snippets de code (avec bouton ⚡ Injecter dans l'IDE SW_<NCIN>) */}
      <div className="space-y-6 pt-2">
        {activeFiche.sections.map((section) => (
          <section key={section.id} className="space-y-3">
            <div className="border-b border-border/80 pb-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                {section.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
            </div>

            <div className="space-y-3">
              {section.snippets.map((snip, sIdx) => (
                <CodeSnippet key={sIdx} snippet={snip} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* 2. Cartes de révision rapide (Flashcards du Carnet STI-BAC INFO) */}
      <FlashcardDeck moduleId={effectiveCategory} />

      {/* 3. Quiz interactif de validation + Test de syntaxe de fin de chapitre */}
      <InteractiveQuiz moduleId={effectiveCategory} />
    </div>
  );
}

interface NotebookTutorChatProps {
  activeCategoryId: NotebookCategoryId;
}

interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  sourceRef?: string | undefined;
  codeSnippet?: string | undefined;
  followUps?: string[] | undefined;
}

/**
 * Tuteur IA connecté à la base de connaissances du Carnet "STI-BAC INFO" (262 sources)
 */
export function CourseNotebookTutor({ activeCategoryId }: NotebookTutorChatProps) {
  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      id: "welcome-nb",
      role: "assistant",
      text: "Bonjour ! Je suis le Tuteur IA connecté au carnet **STI-BAC INFO (262 sources de cours et d'annales Bac STI)**.\n\nPosez-moi une question sur le programme officiel (HTML5, CSS3, `controle.js`, PHP `mysqli_*`, contraintes SQL ou corrigés Bac 2025/2026).",
      sourceRef: "Carnet STI-BAC INFO • 262 sources indexées",
      followUps: [
        "Comment contrôler un CIN à 8 chiffres en JS ?",
        "Quelle est la syntaxe procédurale mysqli_query ?",
        "Explique-moi le corrigé du Bac 2026 Bijoux Aurythia",
      ],
    },
  ]);
  const [input, setInput] = useState("");

  const handleAsk = (questionText?: string) => {
    const q = (questionText ?? input).trim();
    if (!q) return;

    const userMsg: ChatEntry = {
      id: `u-${Date.now()}`,
      role: "user",
      text: q,
    };

    const kbResult = queryNotebookKnowledgeBase(q, activeCategoryId);
    const botMsg: ChatEntry = {
      id: `b-${Date.now() + 1}`,
      role: "assistant",
      text: kbResult.answer,
      sourceRef: kbResult.sourceRef,
      codeSnippet: kbResult.codeSnippet,
      followUps: kbResult.followUps,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  return (
    <aside
      className="flex flex-col h-full bg-panel/95 border-l border-border text-foreground"
      data-testid="course-notebook-tutor"
    >
      {/* En-tête du Tuteur Carnet STI-BAC INFO */}
      <div className="p-3 border-b bg-background/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary border border-primary/30 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold flex items-center gap-1.5">
              <span>Tuteur IA — STI-BAC INFO</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              262 sources officielles connectées
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMessages((prev) => (prev.length > 0 ? [prev[0] as ChatEntry] : []))}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
          title="Réinitialiser la discussion"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fil de discussion */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg p-3 text-xs space-y-2 ${
              m.role === "user"
                ? "bg-primary text-primary-foreground ml-6"
                : "bg-background/90 border border-border mr-2"
            }`}
          >
            {m.sourceRef && (
              <div className="flex items-center gap-1 text-[10px] font-mono text-primary">
                <BookOpen className="w-3 h-3 shrink-0" />
                <span className="truncate">{m.sourceRef}</span>
              </div>
            )}

            <p className="leading-relaxed whitespace-pre-line">{m.text}</p>

            {m.codeSnippet && (
              <pre className="p-2.5 rounded bg-slate-950 text-emerald-300 border border-slate-800 text-[11px] font-mono overflow-x-auto">
                <code>{m.codeSnippet}</code>
              </pre>
            )}

            {m.followUps && m.followUps.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {m.followUps.map((f, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAsk(f)}
                    className="text-[10px] px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-left transition-colors cursor-pointer"
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Zone de saisie */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="p-3 border-t bg-background/80 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Question sur le carnet STI-BAC INFO..."
          className="flex-1 px-3 py-1.5 text-xs bg-panel border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
        />
        <Button type="submit" size="sm" className="h-8 px-2.5 cursor-pointer" title="Envoyer">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </aside>
  );
}
