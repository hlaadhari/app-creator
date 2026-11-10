import { HelpCircle, Lock, Sparkles } from "lucide-react";
import type { Exercise } from "@/lib/exercises";
import type { WorkspaceState } from "@/hooks/useWorkspaceState";
import { SubjectCompetencesPill } from "@/components/competences/SubjectCompetencesPill";
import { SubjectStatement } from "@/components/workspace/SubjectStatement";

/** Onglet « Sujet » : métadonnées, énoncé et indices progressifs. */
export function SubjectTab({ ex, ws }: { ex: Exercise; ws: WorkspaceState }) {
  const id = ex.id;
  const { bestScore, isExamMode, unlockedHints, unlockingHint, handleUnlockHint } = ws;
  return (
    <div className="p-4 text-sm space-y-4">
      <div>
        <div className="text-[11px] font-mono uppercase text-primary tracking-wider">
          {ex.competence}
        </div>
        <h2 className="text-base font-semibold mt-1">{ex.title}</h2>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span className="rounded border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            Niveau : {ex.level}
          </span>
          <span className="rounded border bg-primary/10 border-primary/20 px-1.5 py-0.5 text-[10px] font-mono text-primary font-medium">
            Bac 4ème SI (STI)
          </span>
          {ex.typeSujet === "annale_officielle" && (
            <span className="rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-mono text-rose-400 font-semibold">
              Annale {ex.sessionAnnee ? `${ex.sessionAnnee}` : "Officielle"}
              {ex.sessionLibelle ? ` • ${ex.sessionLibelle}` : ""}
            </span>
          )}
          {ex.typeSujet === "annale_adaptee" && (
            <span className="rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-mono text-purple-400 font-semibold">
              Annale Blanche {ex.sessionAnnee ? `${ex.sessionAnnee}` : ""}
              {ex.sessionLibelle ? ` • ${ex.sessionLibelle}` : ""}
            </span>
          )}
          {ex.typeSujet === "tp" && (
            <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-mono text-cyan-400 font-medium">
              TP Synthèse{ex.sessionAnnee ? ` (${ex.sessionAnnee})` : ""}
            </span>
          )}
          {bestScore !== undefined && (
            <span className="rounded bg-success/10 border border-success/30 px-1.5 py-0.5 text-[10px] font-mono text-success">
              Meilleur score : {bestScore}/20
            </span>
          )}
        </div>
        {ex.sourceReference && (
          <div className="mt-1.5 text-[11px] font-mono text-muted-foreground flex items-center gap-1">
            <span className="text-muted-foreground">Source :</span>
            <span>{ex.sourceReference}</span>
          </div>
        )}
        <div className="mt-2.5">
          <SubjectCompetencesPill
            exerciseId={id}
            criteria={ex.criteria.map((c) => ({ id: c.id, label: c.label }))}
          />
        </div>
      </div>

      <SubjectStatement
        title={ex.title}
        statement={ex.statement}
        enonceMarkdown={ex.enonceMarkdown}
      />

      <div className="border-t pt-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Indices progressifs (3 niveaux)</span>
          </h3>
          {!isExamMode && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {unlockedHints.length}/{ex.hints.length} débloqué(s)
            </span>
          )}
        </div>

        {isExamMode ? (
          <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
            <div className="flex items-center gap-1.5 font-semibold mb-1">
              <Lock className="h-3.5 w-3.5" />
              <span>Assistance neutralisée</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Conformément au règlement du Bac STI (PRD F-48, F-56, T-06), les indices, corrections
              et solutions sont strictement inaccessibles pendant l'examen.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {unlockedHints.map((uh, i) => (
              <div
                key={i}
                className="rounded-md border-l-2 border-primary bg-muted/60 p-2.5 text-xs text-foreground/90"
              >
                <span className="font-mono font-semibold text-[10px] text-primary uppercase block mb-1">
                  Indice {uh.level} • {uh.levelName}
                </span>
                {uh.texte}
              </div>
            ))}

            {unlockedHints.length < ex.hints.length && (
              <button
                onClick={handleUnlockHint}
                disabled={unlockingHint}
                className="w-full text-left rounded border border-dashed p-2 text-xs text-primary hover:bg-accent/40 transition-colors flex items-center justify-between disabled:opacity-50 cursor-pointer"
              >
                <span>
                  {unlockingHint
                    ? "Déblocage sécurisé..."
                    : `Débloquer l'indice ${unlockedHints.length + 1} (${
                        unlockedHints.length === 0
                          ? "Niveau 1 : Conceptuel"
                          : unlockedHints.length === 1
                            ? "Niveau 2 : Syntaxique"
                            : "Niveau 3 : Extrait de code"
                      })`}
                </span>
                <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
