import React from "react";
import { Link } from "@tanstack/react-router";
import { Play, Clock, Sparkles, FolderCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DernierTravailEnCours } from "@/lib/pedagogy/bareme-repartition";

interface RepriseRapideBannerProps {
  dernierTravail: DernierTravailEnCours | null;
}

export function RepriseRapideBanner({ dernierTravail }: RepriseRapideBannerProps) {
  if (!dernierTravail) return null;

  return (
    <div
      role="region"
      aria-label="Reprise de travail en cours"
      className="mt-6 rounded-xl border-2 border-primary/30 bg-card/80 p-4 shadow-sm backdrop-blur-xs transition-all hover:border-primary/50"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="rounded-lg bg-primary/10 border border-primary/25 p-2.5 text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-mono tracking-wider bg-primary/10 text-primary border-primary/30"
              >
                Travail en cours sauvegardé
              </Badge>
              {dernierTravail.module && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  • {dernierTravail.module}
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-foreground">{dernierTravail.titre}</h3>

            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  Modifié à {dernierTravail.formattedTime} ({dernierTravail.formattedDate})
                </span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:flex items-center gap-1">
                <FolderCode className="h-3 w-3" />
                <span>
                  {dernierTravail.filesCount} fichier{dernierTravail.filesCount > 1 ? "s" : ""}
                </span>
              </span>
              {dernierTravail.bestScore !== undefined && (
                <>
                  <span>•</span>
                  <span className="text-primary font-semibold">
                    Score : {dernierTravail.bestScore}/20
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end">
          <Link
            to="/sujet/$id"
            params={{ id: dernierTravail.exerciseId }}
            className="w-full sm:w-auto"
          >
            <Button className="gap-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer w-full sm:w-auto">
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Reprendre : {dernierTravail.titre}</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
