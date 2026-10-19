import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/lib/supabase/auth";
import { getStudentProgressionReport } from "@/lib/competences/competences-service";
import { OFFICIAL_BADGES } from "@/lib/competences/referentiel";
import type { StudentProgressionReport, CompetenceCategory } from "@/lib/competences/types";
import { CompetenceProgressBar } from "./CompetenceProgressBar";
import { CompetenceRadarChart } from "./CompetenceRadarChart";
import { BadgesShowcase } from "./BadgesShowcase";

interface ProgressionModalProps {
  triggerButton?: React.ReactNode;
}

export function ProgressionModal({ triggerButton }: ProgressionModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<StudentProgressionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>("all");

  const loadReport = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStudentProgressionReport(user?.id);
      setReport(data);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (open) {
      void loadReport();
    }
  }, [open, loadReport]);

  const filteredCompetences = React.useMemo(() => {
    if (!report) return [];
    if (selectedCatFilter === "all") return report.competences;
    return report.competences.filter((c) => c.competence.categorie === selectedCatFilter);
  }, [report, selectedCatFilter]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-mono border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Mon Bilan de Compétences</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <BarChart3 className="w-5 h-5 text-primary" />
                <span>Progression & Compétences Bac STI</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Suivi transparent de vos acquis selon le programme officiel (Formule v1.0).
              </DialogDescription>
            </div>

            {report && (
              <div className="flex items-center gap-3 bg-muted/60 px-3 py-1.5 rounded-lg border">
                <div className="text-right">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">
                    Maîtrise Globale
                  </div>
                  <div className="text-base font-bold font-mono text-primary">
                    {report.scoreGlobalPercentage}%
                  </div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-left">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">
                    Badges
                  </div>
                  <div className="text-base font-bold font-mono text-amber-500">
                    {report.badgesObtenusCount} / {report.badgesDisponiblesCount}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        {loading || !report ? (
          <div className="py-12 text-center text-sm text-muted-foreground font-mono">
            Calcul des métriques de maîtrise en cours...
          </div>
        ) : (
          <Tabs defaultValue="synthese" className="mt-4">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="synthese" className="text-xs font-medium gap-1.5">
                <TrendingUp className="w-4 h-4" /> Synthèse & Radar
              </TabsTrigger>
              <TabsTrigger value="competences" className="text-xs font-medium gap-1.5">
                <BookOpen className="w-4 h-4" /> Référentiel Détaillé ({report.competences.length})
              </TabsTrigger>
              <TabsTrigger value="badges" className="text-xs font-medium gap-1.5">
                <Award className="w-4 h-4" /> Mes Badges ({report.badgesObtenusCount})
              </TabsTrigger>
            </TabsList>

            {/* Onglet 1 : Synthèse & Radar */}
            <TabsContent value="synthese" className="space-y-4">
              {/* Graphique Radar des 5 domaines Bac */}
              <CompetenceRadarChart categories={report.categories} />

              {/* Bloc Points Forts vs Axes de Révision */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Points forts */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Points Forts ({report.pointsForts.length})
                    </h3>
                  </div>
                  {report.pointsForts.length > 0 ? (
                    <div className="space-y-2">
                      {report.pointsForts.slice(0, 4).map((item) => (
                        <div
                          key={item.competence.id}
                          className="flex items-center justify-between text-xs p-2 rounded-md bg-emerald-500/5 border border-emerald-500/10"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              {item.competence.code}
                            </span>
                            <span className="text-foreground truncate font-medium">
                              {item.competence.libelle}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            {item.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Aucun point fort consolidé pour le moment (seuil : &ge; 75%). Continuez vos
                      entraînements !
                    </p>
                  )}
                </div>

                {/* Axes prioritaires */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Axes de Révision Prioritaires ({report.axesPrioritaires.length})
                    </h3>
                  </div>
                  {report.axesPrioritaires.length > 0 ? (
                    <div className="space-y-2">
                      {report.axesPrioritaires.slice(0, 4).map((item) => (
                        <div
                          key={item.competence.id}
                          className="flex items-center justify-between text-xs p-2 rounded-md bg-amber-500/5 border border-amber-500/10"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                              {item.competence.code}
                            </span>
                            <span className="text-foreground truncate font-medium">
                              {item.competence.libelle}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                            {item.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Bravo ! Aucune compétence critique en difficulté.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Onglet 2 : Référentiel Détaillé des 25 compétences */}
            <TabsContent value="competences" className="space-y-3">
              {/* Filtres par domaine */}
              <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b">
                <Button
                  variant={selectedCatFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCatFilter("all")}
                  className="text-xs h-7 px-2.5"
                >
                  Toutes ({report.competences.length})
                </Button>
                {(
                  ["HTML", "CSS", "JAVASCRIPT", "PHP", "SQL", "ALGO_ARCHI"] as CompetenceCategory[]
                ).map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCatFilter === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCatFilter(cat)}
                    className="text-xs h-7 px-2.5"
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {/* Liste des compétences filtrées */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {filteredCompetences.map((item) => (
                  <CompetenceProgressBar key={item.competence.id} item={item} />
                ))}
              </div>
            </TabsContent>

            {/* Onglet 3 : Galerie des Badges */}
            <TabsContent value="badges" className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Distinctions & Badges Débloqués</span>
                  </h3>
                  <span className="text-xs font-mono text-muted-foreground">
                    {report.badgesObtenusCount} sur {report.badgesDisponiblesCount} débloqués
                  </span>
                </div>
                <BadgesShowcase definitions={OFFICIAL_BADGES} studentBadges={report.badges} />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
