import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { COURSE_MODULES, type CourseModule } from "@/content/courses";
import { CourseSidebar } from "./CourseSidebar";
import { CourseViewer } from "./CourseViewer";
import { BookOpen, Sparkles, X } from "lucide-react";

interface CourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertCode?: ((code: string) => void) | undefined;
  activeFileName?: string | undefined;
}

export function CourseModal({
  open,
  onOpenChange,
  onInsertCode,
  activeFileName,
}: CourseModalProps) {
  const [activeModuleId, setActiveModuleId] = useState<CourseModule["id"]>("html5");
  const [searchQuery, setSearchQuery] = useState("");
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);

  const activeModule = useMemo<CourseModule>(() => {
    return (
      COURSE_MODULES.find((m) => m.id === activeModuleId) ?? (COURSE_MODULES[0] as CourseModule)
    );
  }, [activeModuleId]);

  const handleSelectSection = (sectionId: string) => {
    setTargetSectionId(sectionId);
  };

  const handleSelectModule = (id: CourseModule["id"]) => {
    setActiveModuleId(id);
    setTargetSectionId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-background border shadow-2xl">
        {/* Header de la boîte modale */}
        <DialogHeader className="px-5 py-3 border-b flex flex-row items-center justify-between shrink-0 bg-panel/70">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm font-semibold">
                  Mémento & Support de Cours Officiel
                </DialogTitle>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/30">
                  4ème SI (Bac STI)
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Consultez les notions officielles et insérez des extraits de code directement dans{" "}
                <span className="font-mono text-primary font-semibold">
                  {activeFileName || "l'éditeur"}
                </span>
                .
              </DialogDescription>
            </div>
          </div>

          {/* Sélecteur rapide des modules en haut */}
          <div className="hidden sm:flex items-center gap-1 mr-6">
            {COURSE_MODULES.map((m) => (
              <button
                key={m.id}
                onClick={() => handleSelectModule(m.id)}
                className={`px-2 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                  m.id === activeModuleId
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                {m.shortTitle}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Corps de la modale divisé en Sidebar + Visualiseur */}
        <div className="flex flex-1 min-h-0 relative overflow-hidden">
          {/* Sommaire & Moteur de recherche */}
          <div className="w-64 md:w-72 shrink-0 h-full border-r">
            <CourseSidebar
              activeModuleId={activeModuleId}
              onSelectModule={handleSelectModule}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectSection={handleSelectSection}
              className="w-full h-full"
            />
          </div>

          {/* Visualiseur avec bouton copier & insérer */}
          <div className="flex-1 flex flex-col min-w-0 h-full">
            <CourseViewer
              module={activeModule}
              searchQuery={searchQuery}
              onInsertCode={onInsertCode}
              targetSectionId={targetSectionId}
              className="flex-1"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
