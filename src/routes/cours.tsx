import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useState, useMemo } from "react";
import { COURSE_MODULES, type CourseModule } from "@/content/courses";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import { CourseViewer } from "@/components/course/CourseViewer";
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
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/cours")({
  head: () => ({
    meta: [
      { title: "Mémento & Support de Cours – Labo STI" },
      {
        name: "description",
        content:
          "Support de cours officiel et mémento Bac STI (4ème SI) : HTML5, CSS3, JavaScript, PHP 8.2 et MySQLi procédural.",
      },
      { property: "og:title", content: "Mémento & Support de Cours – Labo STI" },
      {
        property: "og:description",
        content: "Guide de référence officiel et exemples prêts à copier pour le Bac STI.",
      },
      { property: "og:type", content: "article" },
    ],
  }),
  component: CoursPage,
});

function CoursPage() {
  const [activeModuleId, setActiveModuleId] = useState<CourseModule["id"]>("html5");
  const [searchQuery, setSearchQuery] = useState("");
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const activeModule = useMemo<CourseModule>(() => {
    return (
      COURSE_MODULES.find((m) => m.id === activeModuleId) ?? (COURSE_MODULES[0] as CourseModule)
    );
  }, [activeModuleId]);

  const handleSelectSection = (sectionId: string) => {
    setTargetSectionId(sectionId);
    setMobileSidebarOpen(false);
  };

  const handleSelectModule = (id: CourseModule["id"]) => {
    setActiveModuleId(id);
    setTargetSectionId(null);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Barre de navigation supérieure */}
      <header className="h-12 border-b flex items-center justify-between px-4 bg-panel/80 backdrop-blur shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
            title="Menu du cours"
          >
            {mobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <Link to="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
            <SproutLogo className="h-5 w-5" />
            <span className="font-semibold text-xs tracking-tight hidden sm:inline">Labo STI</span>
          </Link>

          <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Mémento Officiel 4ème SI</span>
            <span className="hidden md:inline text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 font-mono">
              Bac STI
            </span>
          </div>
        </div>

        {/* Modules rapides dans la barre d'onglets pour desktop */}
        <div className="hidden lg:flex items-center gap-1">
          {COURSE_MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => handleSelectModule(m.id)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                m.id === activeModuleId
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {m.shortTitle}
            </button>
          ))}
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

      {/* Contenu principal divisé en Volet Latéral & Visualiseur */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Volet Latéral Desktop */}
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

        {/* Volet Latéral Mobile (tiroir escamotable) */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-panel h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
              <div className="p-3 border-b flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Sommaire
                </span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CourseSidebar
                activeModuleId={activeModuleId}
                onSelectModule={handleSelectModule}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectSection={handleSelectSection}
                className="flex-1"
              />
            </div>
          </div>
        )}

        {/* Visualiseur de Cours & Code */}
        <main className="flex-1 flex flex-col min-w-0 h-full">
          <CourseViewer
            module={activeModule}
            searchQuery={searchQuery}
            targetSectionId={targetSectionId}
            className="flex-1"
          />
        </main>
      </div>
    </div>
  );
}
