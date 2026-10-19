import React, { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { MEMENTO_CARDS, type MementoCard, type MementoSnippet } from "@/content/mementos";
import { CodeSnippet } from "./CodeSnippet";
import { CourseSearch } from "./CourseSearch";
import {
  BookOpen,
  AlertTriangle,
  ExternalLink,
  FileCode,
  Palette,
  Braces,
  Server,
  Database,
  Search,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

interface CourseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertCode?: ((code: string, targetFile?: string | undefined) => void) | undefined;
  activeFileName?: string | undefined;
}

export function CourseDrawer({
  open,
  onOpenChange,
  onInsertCode,
  activeFileName,
}: CourseDrawerProps) {
  const [activeFicheId, setActiveFicheId] = useState<MementoCard["id"]>("html5");
  const [searchQuery, setSearchQuery] = useState("");

  const getFicheIcon = (name: MementoCard["iconName"]) => {
    switch (name) {
      case "FileCode":
        return <FileCode className="h-3.5 w-3.5 text-emerald-400" />;
      case "Palette":
        return <Palette className="h-3.5 w-3.5 text-sky-400" />;
      case "Braces":
        return <Braces className="h-3.5 w-3.5 text-amber-400" />;
      case "Server":
        return <Server className="h-3.5 w-3.5 text-indigo-400" />;
      case "Database":
        return <Database className="h-3.5 w-3.5 text-rose-400" />;
    }
  };

  const activeFiche = useMemo<MementoCard>(() => {
    return MEMENTO_CARDS.find((f) => f.id === activeFicheId) ?? (MEMENTO_CARDS[0] as MementoCard);
  }, [activeFicheId]);

  // Filtrage global par recherche
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col bg-background text-foreground border-l border-border shadow-2xl z-50"
      >
        {/* En-tête du volet latéral */}
        <SheetHeader className="px-5 py-3.5 border-b border-border bg-panel/75 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-sm font-semibold tracking-tight">
                    Mémento Interactif Bac STI
                  </SheetTitle>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/30">
                    4ème SI
                  </span>
                </div>
                <SheetDescription className="text-xs text-muted-foreground">
                  Fiches pratiques & injection immédiate dans{" "}
                  <span className="font-mono text-primary font-semibold">
                    {activeFileName || "l'éditeur"}
                  </span>
                </SheetDescription>
              </div>
            </div>

            <Link
              to="/cours"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors pr-6 cursor-pointer"
              title="Ouvrir le support de cours en plein écran"
            >
              <span>Plein écran</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Recherche instantanée */}
          <div className="mt-3">
            <CourseSearch value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Sélecteur d'onglets des 5 fiches (si pas de recherche active) */}
          {!searchQuery && (
            <div className="flex items-center gap-1 mt-2.5 overflow-x-auto no-scrollbar pt-1">
              {MEMENTO_CARDS.map((f) => {
                const isActive = f.id === activeFicheId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFicheId(f.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer shrink-0 border ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50"
                    }`}
                  >
                    {getFicheIcon(f.iconName)}
                    <span>{f.shortTitle}</span>
                  </button>
                );
              })}
            </div>
          )}
        </SheetHeader>

        {/* Corps déroulant du tiroir */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 space-y-6">
          {/* Mode Résultats de Recherche */}
          {searchResults !== null ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b">
                <span>
                  Résultats pour « <strong className="text-foreground">{searchQuery}</strong> »
                </span>
                <span className="font-mono">{searchResults.length} trouvé(s)</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p>Aucun extrait trouvé pour ce mot-clé.</p>
                  <p className="mt-1">
                    Essayez <code>mysqli</code>, <code>box-model</code>, <code>length</code> ou{" "}
                    <code>CHECK</code>.
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
                    <CodeSnippet snippet={item.snippet} onInsertCode={onInsertCode} />
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Mode Consultation d'une Fiche */
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* En-tête de fiche */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-primary uppercase">
                    {activeFiche.badge}
                  </span>
                  <span className="text-muted-foreground text-xs">•</span>
                  <span className="text-xs text-muted-foreground">{activeFiche.description}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mt-0.5">{activeFiche.title}</h3>
              </div>

              {/* Cadre Spécial : ⚠️ Piège Bac Officiel */}
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                      ⚠️ Piège Fréquent au Bac STI
                    </h4>
                    <p className="leading-relaxed text-amber-100/90 text-[11px]">
                      {activeFiche.piegeBac}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sections & Extraits de code */}
              <div className="space-y-5 pt-1">
                {activeFiche.sections.map((section) => (
                  <div key={section.id} className="space-y-2">
                    <div className="border-b border-border/60 pb-1.5">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                        {section.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {section.description}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {section.snippets.map((snip, sIdx) => (
                        <CodeSnippet key={sIdx} snippet={snip} onInsertCode={onInsertCode} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pied du tiroir */}
        <div className="px-5 py-2.5 border-t border-border bg-panel/40 shrink-0 text-[11px] text-muted-foreground flex items-center justify-between">
          <span className="font-mono text-[10px]">Programme Officiel STI (v3.1)</span>
          <span className="text-[10px] text-emerald-400 font-mono">
            ⚡ Prêt pour injection dans Monaco
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
