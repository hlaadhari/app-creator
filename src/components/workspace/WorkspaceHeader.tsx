import { Link } from "@tanstack/react-router";
import { Clock, Lock } from "lucide-react";
import type { Exercise } from "@/lib/exercises";
import type { WorkspaceState } from "@/hooks/useWorkspaceState";
import { AppHeader } from "@/components/layout/AppHeader";
import { SubjectInfoPopover } from "@/components/workspace/SubjectInfoPopover";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** En-tête du workspace : fil d'Ariane, infos du sujet, badge et chrono d'examen. */
export function WorkspaceHeader({ ex, ws }: { ex: Exercise; ws: WorkspaceState }) {
  const id = ex.id;
  const { baremeRepartition, isExamMode, countdown } = ws;
  return (
    <AppHeader
      hideNav
      breadcrumb={
        <>
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap gap-1 text-xs sm:gap-1.5">
              <BreadcrumbSeparator />
              <BreadcrumbItem className="hidden sm:inline-flex">
                <BreadcrumbLink asChild>
                  <Link to="/">Sujets</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem className="min-w-0">
                <h1 className="font-medium text-foreground truncate max-w-[120px] sm:max-w-[260px] lg:max-w-[420px] text-xs inline">
                  {ex.title}
                </h1>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <SubjectInfoPopover
            sujetId={id}
            typeSujet={ex.typeSujet}
            sessionAnnee={ex.sessionAnnee}
            baremeRepartition={baremeRepartition}
          />
          {isExamMode && (
            <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-500">
              <Lock className="h-3 w-3" />
              <span className="hidden sm:inline">Mode Examen - Assistance Neutralisée</span>
              <span className="sm:hidden">Examen</span>
            </span>
          )}
        </>
      }
      center={
        isExamMode && countdown ? (
          <div
            className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-mono ${
              countdown.isExpired
                ? "border-rose-500/40 bg-rose-500/15 text-rose-500 font-bold animate-pulse"
                : countdown.isCritical
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-500 font-bold"
                  : "border-border bg-background/50 text-foreground"
            }`}
            title="Temps d'épreuve officiel synchronisé avec l'horloge serveur (PRD F-50, T-06)"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{countdown.isExpired ? "00:00 (Échéance échue)" : countdown.formatted}</span>
          </div>
        ) : null
      }
    />
  );
}
