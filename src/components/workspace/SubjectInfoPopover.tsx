import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BaremeRepartitionBadge } from "@/components/workspace/BaremeRepartitionBadge";
import type { BaremeRepartition } from "@/lib/pedagogy/bareme-repartition";

const TYPE_LABELS: Record<string, string> = {
  annale_officielle: "Annale officielle",
  annale_adaptee: "Sujet blanc adapté",
  tp: "TP de synthèse",
};

interface SubjectInfoPopoverProps {
  sujetId: string;
  typeSujet?: string | undefined;
  sessionAnnee?: number | string | undefined;
  baremeRepartition: BaremeRepartition | null;
}

/**
 * Regroupe les métadonnées du sujet (identifiant, type, session, barème) dans un
 * popover pour libérer l'en-tête du workspace (#240).
 */
export function SubjectInfoPopover({
  sujetId,
  typeSujet,
  sessionAnnee,
  baremeRepartition,
}: SubjectInfoPopoverProps) {
  const typeLabel = typeSujet ? (TYPE_LABELS[typeSujet] ?? typeSujet) : null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Informations sur le sujet"
          title="Informations sur le sujet"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border/80 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground cursor-pointer"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 text-xs font-mono">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sujet</p>
        <dl className="grid grid-cols-[5.5rem_1fr] gap-y-1">
          <dt className="text-muted-foreground">Référence</dt>
          <dd data-testid="subject-info-id">SW_{sujetId}</dd>
          {typeLabel && (
            <>
              <dt className="text-muted-foreground">Type</dt>
              <dd>{typeLabel}</dd>
            </>
          )}
          {sessionAnnee && (
            <>
              <dt className="text-muted-foreground">Session</dt>
              <dd>{sessionAnnee}</dd>
            </>
          )}
        </dl>
        {baremeRepartition && (
          <div className="space-y-1 border-t pt-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Barème</p>
            <BaremeRepartitionBadge repartition={baremeRepartition} variant="detailed" />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
