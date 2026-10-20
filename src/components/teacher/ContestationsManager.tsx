import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  arbitrerContestation,
  type ContestationRecord,
  type StudentAttemptRecord,
  type RecalculationResult,
} from "@/lib/subjects/contestations-service";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calculator,
  User,
  Clock,
  Sparkles,
} from "lucide-react";

interface ContestationsManagerProps {
  classId: string;
  className: string;
  initialContestations?: ContestationRecord[];
  initialAttempts?: StudentAttemptRecord[];
}

export function ContestationsManager({
  classId,
  className,
  initialContestations,
  initialAttempts,
}: ContestationsManagerProps) {
  const [contestations, setContestations] = useState<ContestationRecord[]>(
    initialContestations ?? [],
  );
  const [attempts, setAttempts] = useState<StudentAttemptRecord[]>(initialAttempts ?? []);
  const [lastRecalcul, setLastRecalcul] = useState<RecalculationResult | null>(null);

  React.useEffect(() => {
    if (initialContestations) {
      setContestations(initialContestations);
    }
  }, [initialContestations]);

  React.useEffect(() => {
    if (initialAttempts) {
      setAttempts(initialAttempts);
    }
  }, [initialAttempts]);

  const pendingCount = contestations.filter((c) => c.statut === "en_attente").length;

  const handleArbitrage = (contestationId: string, decision: "accepter" | "rejeter") => {
    const cont = contestations.find((c) => c.id === contestationId);
    if (!cont) return;

    const res = arbitrerContestation(cont, decision, attempts);

    setContestations((prev) => prev.map((c) => (c.id === contestationId ? res.contestation : c)));

    if (res.recalcul) {
      setAttempts(res.recalcul.copies_recalculees);
      setLastRecalcul(res.recalcul);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight">Arbitrage des Contestations</h2>
            {pendingCount > 0 ? (
              <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-500/10">
                {pendingCount} en attente
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Toutes traitées
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Classe active : <strong>{className}</strong> (ID : {classId})
          </p>
        </div>
      </div>

      {/* Bannière de recalcul automatique en cas d'acceptation */}
      {lastRecalcul && (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Recalcul automatique instantané exécuté (PRD F-45)
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Critère neutralisé pour toute la classe. {lastRecalcul.eleves_impactes} note(s)
                  réajustée(s). Moyenne de classe : {lastRecalcul.moyenne_avant}/20 ➔{" "}
                  <strong>{lastRecalcul.moyenne_apres}/20</strong>.
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white gap-1 text-[10px]">
              <Sparkles className="w-3 h-3" />
              Barème rééquilibré
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Liste des contestations */}
      <div className="space-y-4">
        {contestations.length > 0 ? (
          contestations.map((cont) => {
            const isPending = cont.statut === "en_attente";
            const isAccepted = cont.statut === "acceptee";

            return (
              <Card
                key={cont.id}
                className={`transition-all ${
                  isPending
                    ? "border-amber-500/30 bg-amber-500/[0.02]"
                    : isAccepted
                      ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                      : "opacity-60"
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                    <div className="flex items-center gap-2 text-xs">
                      <User className="w-4 h-4 text-primary" />
                      <strong className="text-foreground">{cont.eleve_nom}</strong>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(cont.created_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {cont.critere_code}
                      </Badge>
                      {isPending ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                          En attente d'arbitrage
                        </Badge>
                      ) : isAccepted ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          Acceptée & Critère Neutralisé
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Rejetée
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Critère contesté : {cont.critere_label}
                    </p>
                    <div className="mt-1.5 p-3 rounded-md bg-muted/40 text-xs italic text-foreground/90 border">
                      « {cont.texte} »
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArbitrage(cont.id, "rejeter")}
                        className="text-xs gap-1 text-muted-foreground hover:text-destructive"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rejeter
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleArbitrage(cont.id, "accepter")}
                        className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accepter & Neutraliser le critère (Recalcul automatique)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12 border rounded-xl bg-card space-y-2">
            <HelpCircle className="w-8 h-8 mx-auto text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">
              Aucune contestation enregistrée pour cette classe.
            </p>
          </div>
        )}
      </div>

      {/* Tableau des notes recalculées de la classe */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-primary" />
              <span>Notes actuelles de la classe ({attempts.length} élèves)</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Moyenne actuelle :{" "}
              <strong className="text-foreground">
                {Math.round(
                  (attempts.reduce((s, a) => s + a.note20, 0) / (attempts.length || 1)) * 10,
                ) / 10}
                /20
              </strong>
            </span>
          </div>

          <div className="divide-y text-xs">
            {attempts.map((att) => (
              <div key={att.id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-medium text-foreground">{att.eleve_nom}</span>
                  <span className="text-muted-foreground text-[11px] ml-2">
                    ({att.points_obtenus} / {att.points_total} pts)
                  </span>
                </div>
                <Badge variant={att.note20 >= 10 ? "default" : "destructive"} className="text-xs">
                  {att.note20} / 20
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
