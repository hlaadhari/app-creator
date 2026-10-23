import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useState, useMemo } from "react";
import { COURSE_MODULES, type CourseModule } from "@/content/courses";
import { MEMENTO_CARDS, type MementoCard, type MementoSnippet } from "@/content/mementos";
import {
  NOTEBOOK_VIDEOS,
  type NotebookCategoryId,
  type NotebookVideoCapsule,
} from "@/content/notebook-sti";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import { CodeSnippet } from "@/components/course/CodeSnippet";
import { CourseSearch } from "@/components/course/CourseSearch";
import {
  CourseModuleView,
  CourseNotebookTutor,
  RevisionGuideModal,
} from "@/components/course/CourseModule";
import { VideoPlayerModal } from "@/components/course/VideoPlayerModal";
import { SproutLogo } from "@/components/SproutLogo";
import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BookOpen,
  Menu,
  X,
  FileCode,
  Palette,
  Braces,
  Server,
  Database,
  Layers,
  FileText,
  Search,
  Film,
  Bot,
  GraduationCap,
  FileDown,
} from "lucide-react";

export const Route = createFileRoute("/cours")({
  head: () => ({
    meta: [
      { title: "Mémento, Capsules Vidéo & Support de Cours – Labo STI" },
      {
        name: "description",
        content:
          "Support de cours officiel, 10 capsules vidéo du carnet STI-BAC INFO, guide de révision synthétique, flashcards, quiz et annales corrigées Bac STI (2025/2026).",
      },
      { property: "og:title", content: "Mémento & Carnet STI-BAC INFO – Labo STI" },
      {
        property: "og:description",
        content:
          "Fiches mémento, 10 capsules vidéo, flashcards, quiz interactifs et tuteur IA fondé sur le carnet STI-BAC INFO.",
      },
      { property: "og:type", content: "article" },
    ],
  }),
  component: CoursPage,
});

const STICKY_MODULES: {
  id: NotebookCategoryId;
  label: string;
  badge: string;
}[] = [
  { id: "html5", label: "HTML5", badge: "M1" },
  { id: "css3", label: "CSS3", badge: "M2" },
  { id: "js", label: "JavaScript", badge: "M3" },
  { id: "php", label: "PHP / MySQLi", badge: "M4" },
  { id: "sql", label: "BD & SQL", badge: "M5" },
  { id: "annales", label: "Annales Bac", badge: "M6" },
];

const QUICK_SEARCH_KEYWORDS = ["mysqli_query", "box-model", "onsubmit", "CREATE TABLE"];

function CoursPage() {
  const [viewMode, setViewMode] = useState<"memento" | "manuel" | "annales">("memento");
  const [activeFicheId, setActiveFicheId] = useState<MementoCard["id"]>("html5");
  const [activeModuleId, setActiveModuleId] = useState<CourseModule["id"]>("html5");
  const [searchQuery, setSearchQuery] = useState("");
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeVideoCapsule, setActiveVideoCapsule] = useState<NotebookVideoCapsule | null>(null);
  const [revisionGuideOpen, setRevisionGuideOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(true);

  const activeModule = useMemo<CourseModule>(() => {
    return (
      COURSE_MODULES.find((m) => m.id === activeModuleId) ?? (COURSE_MODULES[0] as CourseModule)
    );
  }, [activeModuleId]);

  const activeFiche = useMemo<MementoCard>(() => {
    return MEMENTO_CARDS.find((f) => f.id === activeFicheId) ?? (MEMENTO_CARDS[0] as MementoCard);
  }, [activeFicheId]);

  const activeCategoryId: NotebookCategoryId =
    viewMode === "annales" ? "annales" : viewMode === "manuel" ? activeModuleId : activeFicheId;

  const getFicheIcon = (name: MementoCard["iconName"]) => {
    switch (name) {
      case "FileCode":
        return <FileCode className="h-4 w-4 text-emerald-400" />;
      case "Palette":
        return <Palette className="h-4 w-4 text-sky-400" />;
      case "Braces":
        return <Braces className="h-4 w-4 text-amber-400" />;
      case "Server":
        return <Server className="h-4 w-4 text-indigo-400" />;
      case "Database":
        return <Database className="h-4 w-4 text-rose-400" />;
    }
  };

  const handleSelectSection = (sectionId: string) => {
    setTargetSectionId(sectionId);
    setMobileSidebarOpen(false);
  };

  const handleSelectModule = (id: CourseModule["id"]) => {
    setActiveModuleId(id);
    setActiveFicheId(id);
    setTargetSectionId(null);
    setMobileSidebarOpen(false);
  };

  const handleSelectStickyModule = (catId: NotebookCategoryId) => {
    setSearchQuery("");
    if (catId === "annales") {
      setViewMode("annales");
    } else {
      if (viewMode === "annales") {
        setViewMode("memento");
      }
      setActiveFicheId(catId);
      setActiveModuleId(catId);
    }
  };

  // Moteur de recherche global pour les fiches mémento et capsules vidéo
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matches: {
      fiche: MementoCard;
      sectionTitle: string;
      snippet: MementoSnippet;
    }[] = [];

    for (const fiche of MEMENTO_CARDS) {
      for (const sec of fiche.sections) {
        for (const snip of sec.snippets) {
          const matchTitle = snip.title.toLowerCase().includes(q);
          const matchCode = snip.code.toLowerCase().includes(q);
          const matchKeywords = snip.keywords.some((k) => k.toLowerCase().includes(q));
          const matchExpl = snip.explanation?.toLowerCase().includes(q);

          if (matchTitle || matchCode || matchKeywords || matchExpl) {
            matches.push({
              fiche,
              sectionTitle: sec.title,
              snippet: snip,
            });
          }
        }
      }
    }
    return matches;
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Barre de navigation supérieure */}
      <header className="h-12 border-b flex items-center justify-between px-4 bg-panel/85 backdrop-blur shrink-0 z-20 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
            title="Menu du cours"
          >
            {mobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-85 transition-opacity shrink-0"
          >
            <SproutLogo size="sm" showText={false} />
            <span className="font-bold text-xs tracking-tight text-foreground hidden sm:inline">
              Labo STI
            </span>
          </Link>

          <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block shrink-0" />

          <div className="flex items-center gap-1.5 shrink-0">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-semibold text-foreground hidden lg:inline">
              Carnet STI-BAC INFO
            </span>
            <span className="hidden xl:inline text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 font-mono shrink-0">
              10 Vidéos • 262 Sources
            </span>
          </div>
        </div>

        {/* Sélecteur de mode d'affichage : Fiches Mémento | Manuel Complet | Annales */}
        <div className="flex items-center gap-1 bg-background/60 p-0.5 rounded-lg border border-border overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setViewMode("memento")}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === "memento"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span>Fiches Mémento</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("manuel")}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === "manuel"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>Manuel Complet</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("annales")}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === "annales"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Film className="h-3.5 w-3.5 shrink-0" />
            <span>Annales</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRevisionGuideOpen(true)}
            className="gap-1.5 text-xs h-8 cursor-pointer hidden sm:inline-flex"
            title="Consulter ou télécharger le Guide de Révision Synthétique - 4ème Bac STI"
          >
            <FileDown className="h-3.5 w-3.5 text-primary" />
            <span className="hidden xl:inline">Guide de Révision Synthétique</span>
            <span className="xl:hidden">Guide STI</span>
          </Button>

          <Button
            type="button"
            variant={tutorOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setTutorOpen((o) => !o)}
            className="gap-1.5 text-xs h-8 cursor-pointer"
            title="Ouvrir/Fermer le Tuteur IA du Carnet STI-BAC INFO"
          >
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Tuteur STI-BAC</span>
          </Button>

          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Retour aux Sujets</span>
            </Button>
          </Link>
          <AuthModal />
        </div>
      </header>

      {/* Sommaire Flottant / Sticky Navigation : accès direct aux 6 modules + filtres rapides */}
      <nav
        aria-label="Sommaire flottant des 6 modules"
        className="border-b bg-panel/60 px-4 py-1.5 flex items-center justify-between gap-3 overflow-x-auto shrink-0 z-10"
        data-testid="sticky-module-nav"
      >
        <div className="flex items-center gap-1.5 shrink-0">
          {STICKY_MODULES.map((m) => {
            const isActive = activeCategoryId === m.id && searchQuery.trim() === "";
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectStickyModule(m.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? "bg-primary/20 text-primary border-primary/40 font-semibold shadow-2xs"
                    : "bg-background/60 hover:bg-accent text-muted-foreground hover:text-foreground border-border/60"
                }`}
              >
                <span className="text-[10px] font-mono opacity-75">{m.badge}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mots-clés de filtrage instantané */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground uppercase">
            Accès rapide :
          </span>
          {QUICK_SEARCH_KEYWORDS.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => setSearchQuery((prev) => (prev === kw ? "" : kw))}
              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                searchQuery === kw
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-background/50 hover:bg-accent text-muted-foreground hover:text-foreground border-border/50"
              }`}
            >
              {kw}
            </button>
          ))}
        </div>
      </nav>

      {/* Volet Latéral Mobile Escamotable */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-panel h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {viewMode === "manuel" ? "Sommaire du Manuel" : "Chapitres & Annales"}
              </span>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                title="Fermer le menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {viewMode !== "manuel" ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                <CourseSearch value={searchQuery} onChange={setSearchQuery} />
                <div className="space-y-1 pt-2">
                  {MEMENTO_CARDS.map((f) => {
                    const isActive = viewMode === "memento" && f.id === activeFicheId;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setViewMode("memento");
                          setActiveFicheId(f.id);
                          setSearchQuery("");
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all cursor-pointer border ${
                          isActive
                            ? "bg-primary/15 text-primary border-primary/30 font-medium"
                            : "bg-panel/40 hover:bg-accent/40 text-muted-foreground hover:text-foreground border-transparent"
                        }`}
                      >
                        <div className="shrink-0">{getFicheIcon(f.iconName)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-mono opacity-80 uppercase tracking-wide">
                            {f.badge}
                          </div>
                          <div className="text-xs font-semibold truncate text-foreground">
                            {f.title}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Entrée Module 6 : Annales & Examens Pratiques */}
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("annales");
                      setSearchQuery("");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all cursor-pointer border ${
                      viewMode === "annales"
                        ? "bg-primary/15 text-primary border-primary/30 font-medium"
                        : "bg-panel/40 hover:bg-accent/40 text-muted-foreground hover:text-foreground border-transparent"
                    }`}
                  >
                    <GraduationCap className="h-4 w-4 text-purple-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono opacity-80 uppercase tracking-wide">
                        Module 6 • Sessions 2025 & 2026
                      </div>
                      <div className="text-xs font-semibold truncate text-foreground">
                        Annales & Projets Full-Stack
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <CourseSidebar
                activeModuleId={activeModuleId}
                onSelectModule={(id) => {
                  handleSelectModule(id);
                  setMobileSidebarOpen(false);
                }}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectSection={(secId) => {
                  handleSelectSection(secId);
                  setMobileSidebarOpen(false);
                }}
                className="flex-1"
              />
            )}
          </div>
        </div>
      )}

      {/* Contenu principal + Volet Tuteur IA Carnet STI-BAC INFO */}
      <div className="flex flex-1 min-h-0 relative">
        {viewMode === "manuel" ? (
          <>
            <div className="hidden md:flex w-72 lg:w-80 shrink-0 h-full border-r">
              <CourseSidebar
                activeModuleId={activeModuleId}
                onSelectModule={handleSelectModule}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectSection={handleSelectSection}
                className="w-full h-full"
              />
            </div>

            <main className="flex-1 flex flex-col min-w-0 h-full">
              <CourseModuleView
                categoryId={activeModuleId}
                viewMode="manuel"
                activeManualModule={activeModule}
                searchQuery={searchQuery}
                targetSectionId={targetSectionId}
                onPlayCapsule={setActiveVideoCapsule}
                onOpenRevisionGuide={() => setRevisionGuideOpen(true)}
              />
            </main>
          </>
        ) : (
          <>
            {/* Sommaire des 6 Modules (5 Fiches Mémento + Module 6 Annales) */}
            <aside className="hidden md:flex w-72 lg:w-80 shrink-0 h-full border-r bg-panel/70 flex-col p-3 space-y-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                  Carnet STI-BAC INFO • 6 Modules
                </span>
                <CourseSearch value={searchQuery} onChange={setSearchQuery} />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
                {MEMENTO_CARDS.map((f) => {
                  const isActive = viewMode === "memento" && f.id === activeFicheId;
                  const videoCount = NOTEBOOK_VIDEOS.filter((v) => v.moduleId === f.id).length;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setViewMode("memento");
                        setActiveFicheId(f.id);
                        setSearchQuery("");
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                        isActive
                          ? "bg-primary/15 text-primary border-primary/30 font-medium shadow-xs"
                          : "bg-panel/40 hover:bg-accent/40 text-muted-foreground hover:text-foreground border-transparent"
                      }`}
                    >
                      <div className="shrink-0">{getFicheIcon(f.iconName)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono opacity-80 uppercase tracking-wide">
                            {f.badge}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                            {videoCount} vidéo{videoCount > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="text-xs font-semibold truncate text-foreground">
                          {f.title}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Module 6 : Annales Pratiques & Projets Full-Stack */}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("annales");
                    setSearchQuery("");
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                    viewMode === "annales"
                      ? "bg-primary/15 text-primary border-primary/30 font-medium shadow-xs"
                      : "bg-panel/40 hover:bg-accent/40 text-muted-foreground hover:text-foreground border-transparent"
                  }`}
                >
                  <GraduationCap className="h-4 w-4 text-purple-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono opacity-80 uppercase tracking-wide">
                        Module 6 • Annales
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300">
                        3 vidéos
                      </span>
                    </div>
                    <div className="text-xs font-semibold truncate text-foreground">
                      Annales Pratiques & Full-Stack
                    </div>
                  </div>
                </button>
              </div>

              <div className="p-2.5 border-t text-[11px] text-muted-foreground bg-panel/30 rounded space-y-1.5">
                <span className="text-amber-400 font-bold block">
                  🎓 Carnet STI-BAC INFO Connecté :
                </span>
                <p className="leading-snug">
                  10 capsules vidéo, Guide de Révision, Flashcards, Quiz et injection directe vers{" "}
                  <code>SW_&lt;NCIN&gt;</code>.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setRevisionGuideOpen(true)}
                  className="w-full h-7 text-[11px] gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-3 h-3 text-primary" />
                  <span>Guide de Révision Synthétique</span>
                </Button>
              </div>
            </aside>

            {/* Corps de la Fiche Active ou des Annales */}
            <main className="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8 min-h-0 bg-background/50">
              <div className="max-w-4xl mx-auto space-y-6">
                {searchResults !== null ? (
                  /* Résultats de recherche plein texte */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b">
                      <span>
                        Résultats pour « <strong className="text-foreground">{searchQuery}</strong>{" "}
                        »
                      </span>
                      <span className="font-mono">{searchResults.length} résultat(s)</span>
                    </div>

                    {searchResults.length === 0 ? (
                      <div className="py-16 text-center text-xs text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p>Aucun extrait trouvé pour ce mot-clé.</p>
                        <p className="mt-1">
                          Essayez <code>mysqli_query</code>, <code>box-model</code>,{" "}
                          <code>onsubmit</code> ou <code>CREATE TABLE</code>.
                        </p>
                      </div>
                    ) : (
                      searchResults.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                            <span className="text-primary font-semibold">{item.fiche.badge}</span>
                            <span>›</span>
                            <span>{item.sectionTitle}</span>
                          </div>
                          <CodeSnippet snippet={item.snippet} />
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <CourseModuleView
                    categoryId={activeCategoryId}
                    viewMode={viewMode}
                    activeFiche={activeFiche}
                    onPlayCapsule={setActiveVideoCapsule}
                    onOpenRevisionGuide={() => setRevisionGuideOpen(true)}
                  />
                )}
              </div>
            </main>
          </>
        )}

        {/* Volet Tuteur IA fondé sur le Carnet STI-BAC INFO */}
        {tutorOpen && (
          <div className="hidden lg:block w-80 xl:w-96 shrink-0 h-full">
            <CourseNotebookTutor activeCategoryId={activeCategoryId} />
          </div>
        )}
      </div>

      {/* Modale de Lecture Vidéo / Audio Interactive */}
      <VideoPlayerModal capsule={activeVideoCapsule} onClose={() => setActiveVideoCapsule(null)} />

      {/* Modale Guide de Révision Synthétique - 4ème Bac STI */}
      <RevisionGuideModal isOpen={revisionGuideOpen} onClose={() => setRevisionGuideOpen(false)} />
    </div>
  );
}
