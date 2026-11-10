import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import type { Exercise } from "@/lib/exercises";
import type { WorkspaceState } from "@/hooks/useWorkspaceState";
import { AppHeader } from "@/components/layout/AppHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { ExamCountdownBadge } from "@/components/workspace/ExamCountdownBadge";
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
  const isMobile = useIsMobile();
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
        isExamMode && countdown && !isMobile ? <ExamCountdownBadge countdown={countdown} /> : null
      }
    />
  );
}
