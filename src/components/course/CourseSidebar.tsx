import React from "react";
import {
  FileCode,
  Palette,
  Braces,
  Server,
  Database,
  Search,
  X,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { COURSE_MODULES, type CourseModule } from "@/content/courses";

interface CourseSidebarProps {
  activeModuleId: CourseModule["id"];
  onSelectModule: (id: CourseModule["id"]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectSection?: ((sectionId: string) => void) | undefined;
  className?: string | undefined;
}

export function CourseSidebar({
  activeModuleId,
  onSelectModule,
  searchQuery,
  onSearchChange,
  onSelectSection,
  className = "",
}: CourseSidebarProps) {
  const getIcon = (name: CourseModule["iconName"]) => {
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

  const cleanQuery = searchQuery.trim().toLowerCase();

  return (
    <aside className={`flex flex-col bg-panel/90 border-r min-h-0 select-none ${className}`}>
      {/* En-tête du volet */}
      <div className="p-3 border-b shrink-0 bg-panel/60">
        <div className="flex items-center gap-2 mb-2.5">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Mémento Bac STI
          </h2>
          <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            4ème SI
          </span>
        </div>

        {/* Barre de recherche intégrée */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher (ex: mysqli, verif...)"
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-background/60 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/60 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
              title="Effacer la recherche"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Liste des modules & Sommaire interactif */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {COURSE_MODULES.map((mod) => {
          const isActive = mod.id === activeModuleId;
          const matchInModule =
            cleanQuery.length > 0 &&
            (mod.title.toLowerCase().includes(cleanQuery) ||
              mod.rawHtml.toLowerCase().includes(cleanQuery) ||
              mod.sections.some((s) => s.title.toLowerCase().includes(cleanQuery)));

          return (
            <div
              key={mod.id}
              className="rounded-lg overflow-hidden border border-transparent transition-all"
            >
              <button
                onClick={() => onSelectModule(mod.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-md transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30 font-medium"
                    : matchInModule
                      ? "bg-amber-500/10 text-foreground border border-amber-500/20 hover:bg-amber-500/15"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                }`}
              >
                <div className="shrink-0">{getIcon(mod.iconName)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono opacity-80 uppercase tracking-wider">
                      {mod.badge}
                    </span>
                    {matchInModule && (
                      <span className="ml-auto text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                        Trouvé
                      </span>
                    )}
                  </div>
                  <div className="text-xs truncate font-medium">{mod.shortTitle}</div>
                </div>
                <ChevronRight
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                    isActive ? "rotate-90 text-primary" : "text-muted-foreground/60"
                  }`}
                />
              </button>

              {/* Sections / Sommaire interne au module actif */}
              {isActive && (
                <div className="mt-1 ml-4 pl-3 border-l-2 border-primary/30 py-1 space-y-1 animate-in fade-in duration-200">
                  {mod.sections.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => onSelectSection?.(sec.id)}
                      className="block w-full text-left text-[11px] py-1 px-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors truncate cursor-pointer"
                      title={sec.title}
                    >
                      {sec.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pied de sidebar : info programme */}
      <div className="p-2.5 border-t bg-panel/40 shrink-0 text-[11px] text-muted-foreground flex items-center justify-between">
        <span className="font-mono text-[10px]">Programme Officiel STI</span>
        <span className="text-[10px] text-emerald-400 font-mono">v3.1 Validée</span>
      </div>
    </aside>
  );
}
