import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useState, useMemo } from "react";
import { COURSE_MODULES, type CourseModule } from "@/content/courses";
import { MEMENTO_CARDS, type MementoCard, type MementoSnippet } from "@/content/mementos";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import { CourseViewer } from "@/components/course/CourseViewer";
import { CodeSnippet } from "@/components/course/CodeSnippet";
import { CourseSearch } from "@/components/course/CourseSearch";
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
  AlertTriangle,
  Layers,
  FileText,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/cours")({
  head: () => ({
    meta: [
      { title: "Mémento & Support de Cours – Labo STI" },
      {
        name: "description",
        content:
          "Support de cours officiel et mémento interactif Bac STI (4ème SI) : HTML5, CSS3, JavaScript, PHP 8.2 et MySQLi procédural.",
      },
      { property: "og:title", content: "Mémento & Support de Cours – Labo STI" },
      {
        property: "og:description",
        content:
          "Fiches mémento pratiques, pièges à éviter et exemples prêts à copier pour le Bac STI.",
      },
      { property: "og:type", content: "article" },
    ],
  }),
  component: CoursPage,
});

function CoursPage() {
  const [viewMode, setViewMode] = useState<"memento" | "manuel">("memento");
  const [activeFicheId, setActiveFicheId] = useState<MementoCard["id"]>("html5");
  const [activeModuleId, setActiveModuleId] = useState<CourseModule["id"]>("html5");
  const [searchQuery, setSearchQuery] = useState("");
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const activeModule = useMemo<CourseModule>(() => {
    return (
      COURSE_MODULES.find((m) => m.id === activeModuleId) ?? (COURSE_MODULES[0] as CourseModule)
    );
  }, [activeModuleId]);

  const activeFiche = useMemo<MementoCard>(() => {
    return MEMENTO_CARDS.find((f) => f.id === activeFicheId) ?? (MEMENTO_CARDS[0] as MementoCard);
  }, [activeFicheId]);

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

  // Moteur de recherche global pour les fiches mémento
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
      <header className="h-12 border-b flex items-center justify-between px-4 bg-panel/85 backdrop-blur shrink-0 z-20">
        <div className="flex items-center gap-3">
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
            <span className="text-xs font-semibold text-foreground">Mémento Officiel</span>
            <span className="hidden md:inline text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 font-mono shrink-0">
              Bac STI (4ème SI)
            </span>
          </div>
        </div>

        {/* Sélecteur de mode d'affichage : Fiches Mémento vs Manuel Détaillé */}
        <div className="flex items-center gap-1 bg-background/60 p-0.5 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setViewMode("memento")}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "memento"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Fiches Mémento</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("manuel")}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "manuel"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Manuel Complet</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Retour aux Sujets</span>
            </Button>
          </Link>
          <AuthModal />
        </div>
      </header>

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
                {viewMode === "memento" ? "Fiches Mémento" : "Sommaire du Manuel"}
              </span>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                title="Fermer le menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {viewMode === "memento" ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                <CourseSearch value={searchQuery} onChange={setSearchQuery} />
                <div className="space-y-1 pt-2">
                  {MEMENTO_CARDS.map((f) => {
                    const isActive = f.id === activeFicheId;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
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

      {/* Contenu principal */}
      {viewMode === "memento" ? (
        /* MODE FICHES MÉMENTO AVEC PIÈGES BAC & CODESNIPPETS */
        <div className="flex flex-1 min-h-0 relative">
          {/* Sommaire des 5 Fiches Mémento */}
          <aside className="hidden md:flex w-72 lg:w-80 shrink-0 h-full border-r bg-panel/70 flex-col p-3 space-y-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                Fiches d'aide-mémoire
              </span>
              <CourseSearch value={searchQuery} onChange={setSearchQuery} />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
              {MEMENTO_CARDS.map((f) => {
                const isActive = f.id === activeFicheId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
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
            </div>

            <div className="p-2 border-t text-[11px] text-muted-foreground bg-panel/30 rounded">
              <span className="text-amber-400 font-bold block mb-0.5">💡 Astuce Révision :</span>
              Chaque fiche contient le piège d'examen récurrent signalé par les inspecteurs du Bac.
            </div>
          </aside>

          {/* Corps de la Fiche Active */}
          <main className="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8 min-h-0 bg-background/50">
            <div className="max-w-4xl mx-auto space-y-6">
              {searchResults !== null ? (
                /* Résultats de recherche plein texte */
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b">
                    <span>
                      Résultats pour « <strong className="text-foreground">{searchQuery}</strong> »
                    </span>
                    <span className="font-mono">{searchResults.length} résultat(s)</span>
                  </div>

                  {searchResults.length === 0 ? (
                    <div className="py-16 text-center text-xs text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p>Aucun extrait trouvé pour ce mot-clé.</p>
                      <p className="mt-1">
                        Essayez <code>mysqli_fetch_array</code>, <code>box-model</code>,{" "}
                        <code>length</code> ou <code>CHECK</code>.
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
                /* Affichage standard de la fiche */
                <div className="space-y-6">
                  {/* Titre & Description */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-primary uppercase px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                        {activeFiche.badge}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {activeFiche.description}
                      </span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-foreground mt-2 tracking-tight">
                      {activeFiche.title}
                    </h2>
                  </div>

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

                  {/* Sections & Snippets */}
                  <div className="space-y-6 pt-2">
                    {activeFiche.sections.map((section) => (
                      <section key={section.id} className="space-y-3">
                        <div className="border-b border-border/80 pb-2">
                          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                            {section.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {section.description}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {section.snippets.map((snip, sIdx) => (
                            <CodeSnippet key={sIdx} snippet={snip} />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      ) : (
        /* MODE MANUEL COMPLET (5 MODULES HTML) */
        <div className="flex flex-1 min-h-0 relative">
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
            <CourseViewer
              module={activeModule}
              searchQuery={searchQuery}
              targetSectionId={targetSectionId}
              className="flex-1"
            />
          </main>
        </div>
      )}
    </div>
  );
}
