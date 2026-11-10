import React from "react";
import { Eye, X, ShieldCheck, Lock, Unlock } from "lucide-react";
import { useOptionalAuth } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";

/**
 * Bandeau permanent affiché lorsqu'un administrateur prévisualise l'application
 * sous le rôle Élève ou Enseignant (#189).
 * Permet de revenir au rôle réel Admin en un clic et signale le blocage par défaut
 * des écritures en base pendant la simulation.
 */
export function RolePreviewBanner() {
  const auth = useOptionalAuth();
  if (!auth || !auth.isRoleSimulated || auth.realRole !== "admin" || !auth.previewRole) {
    return null;
  }

  const roleLabel = auth.previewRole === "eleve" ? "élève" : "enseignant";

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="role-preview-banner"
      className="sticky top-0 z-50 w-full border-b border-amber-500/40 bg-amber-500/15 backdrop-blur-xs px-4 py-2 text-xs text-amber-950 dark:text-amber-100"
    >
      <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 font-mono text-[11px] font-semibold">
            <Eye className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>Vue {roleLabel} simulée — quitter</span>
          </span>
          <span className="text-[11px] text-amber-400/90 dark:text-amber-200/90">
            Rôle réel : <strong className="font-mono">Admin</strong> (RLS inchangée).{" "}
            {auth.allowSimulationWrites
              ? "Écritures en base explicitement autorisées."
              : "Écritures en base bloquées pendant la simulation."}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="role-preview-toggle-writes"
            onClick={() => auth.setAllowSimulationWrites(!auth.allowSimulationWrites)}
            className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-background/70 px-2 py-1 text-[11px] font-medium hover:bg-background transition-colors cursor-pointer"
            title="Activer ou bloquer les écritures en base pendant la simulation de rôle"
          >
            {auth.allowSimulationWrites ? (
              <>
                <Unlock className="h-3 w-3 text-amber-400" />
                <span>Écritures autorisées</span>
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 text-amber-400" />
                <span>Écritures bloquées</span>
              </>
            )}
          </button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="role-preview-exit"
            aria-label="Quitter la vue simulée et revenir au rôle Admin"
            onClick={() => auth.setPreviewRole(null)}
            className="h-7 gap-1.5 px-2.5 text-xs border-amber-600/50 bg-amber-600 text-white hover:bg-amber-700 hover:text-white cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Quitter la simulation</span>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
