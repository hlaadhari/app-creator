import React, { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Equal,
  CheckCircle2,
  AlertCircle,
  History,
  Sparkles,
} from "lucide-react";
import { listerHistoriqueAvecDeltas, type AttemptWithDelta } from "@/lib/pedagogy/attempts-service";

interface AttemptsTimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sujetId: string;
  sujetTitle?: string | undefined;
}

export function AttemptsTimelineDrawer({
  isOpen,
  onClose,
  sujetId,
  sujetTitle,
}: AttemptsTimelineDrawerProps) {
  const history = useMemo(() => {
    if (!isOpen) return [];
    return listerHistoriqueAvecDeltas(sujetId);
  }, [isOpen, sujetId]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto flex flex-col p-6">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-2 text-primary">
            <History className="h-5 w-5" />
            <SheetTitle className="text-base font-bold">Historique des Tentatives</SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {sujetTitle ? `Sujet : ${sujetTitle}` : "Évolution didactique de votre code"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 py-4 space-y-4 overflow-y-auto">
          {history.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
              <div className="p-3 rounded-full bg-muted/60">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-sm font-semibold">Aucune tentative consignée</div>
              <p className="text-xs text-muted-foreground max-w-xs">
                Cliquez sur « Lancer la vérification » dans votre espace de travail pour générer
                votre premier rapport d'évaluation formative.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-mono text-muted-foreground flex items-center justify-between">
                <span>
                  {history.length} vérification{history.length > 1 ? "s" : ""} effectuée
                  {history.length > 1 ? "s" : ""}
                </span>
                <span>Ordre antichronologique</span>
              </div>

              {history.map(({ attempt, delta }: AttemptWithDelta) => {
                const dateObj = new Date(attempt.date);
                const formattedTime = dateObj.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });

                return (
                  <div
                    key={attempt.id}
                    className="rounded-xl border bg-card/70 p-4 space-y-3 shadow-xs transition-all hover:border-primary/30"
                  >
                    {/* En-tête de la tentative : Numéro + Heure + Score + Delta */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">
                            Tentative #{attempt.numeroTentative}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {formattedTime}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {attempt.pointsObtenus} / {attempt.pointsTotal} pts
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Note sur 20 */}
                        <Badge
                          variant="secondary"
                          className={`font-mono text-xs px-2 py-0.5 ${
                            attempt.note20 >= 16
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : attempt.note20 >= 10
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          }`}
                        >
                          {attempt.note20} / 20
                        </Badge>

                        {/* Badge de delta didactique */}
                        {delta && (
                          <div
                            className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border ${
                              delta.progression === "amelioration"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : delta.progression === "regression"
                                  ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                  : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {delta.progression === "amelioration" && (
                              <TrendingUp className="h-3 w-3 shrink-0" />
                            )}
                            {delta.progression === "regression" && (
                              <TrendingDown className="h-3 w-3 shrink-0" />
                            )}
                            {delta.progression === "constant" && (
                              <Equal className="h-3 w-3 shrink-0" />
                            )}
                            <span>{delta.formattedNoteDelta}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Détails des critères validés / échoués */}
                    <div className="space-y-1.5 pt-1 border-t text-[11px]">
                      {attempt.criteres.map((crit) => {
                        const isNewSuccess = delta?.nouveauxValides.includes(crit.id);
                        const isNewFail = delta?.nouveauxEchecs.includes(crit.id);

                        return (
                          <div
                            key={crit.id}
                            className={`flex items-center justify-between p-1.5 rounded transition-colors ${
                              crit.ok
                                ? "bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                                : "bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {crit.ok ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                              <span className="truncate">{crit.label}</span>
                            </div>

                            <div className="flex items-center gap-1.5 font-mono text-[10px] shrink-0 ml-2">
                              {isNewSuccess && (
                                <span className="text-emerald-600 font-bold bg-emerald-500/20 px-1 rounded">
                                  + Gagné
                                </span>
                              )}
                              {isNewFail && (
                                <span className="text-rose-600 font-bold bg-rose-500/20 px-1 rounded">
                                  - Perdu
                                </span>
                              )}
                              <span>
                                {crit.ok ? `+${crit.points}` : "0"} / {crit.maxPoints} pt
                                {crit.maxPoints > 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
