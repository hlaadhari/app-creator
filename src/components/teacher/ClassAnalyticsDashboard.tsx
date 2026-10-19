import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  CheckCircle2,
  Download,
  Lightbulb,
  Clock,
  Sparkles,
  FileSearch,
  BookOpen,
} from "lucide-react";
import type { TeacherClassMember } from "@/lib/supabase/teacher";
import {
  calculerStatistiquesClasse,
  detecterBlocagesEtAlertes,
  genererRecommandationsPedagogiques,
  type StudentAttemptHistory,
} from "@/lib/analytics/class-analytics";
import { telechargerExportPronote } from "@/lib/export/pronote-export";

interface ClassAnalyticsDashboardProps {
  className?: string | undefined;
  students: TeacherClassMember[];
  attemptHistories?: StudentAttemptHistory[] | undefined;
  onInspectCopy?: ((student: TeacherClassMember) => void) | undefined;
  onSuggestHint?: ((studentId: string, critereCode?: string) => void) | undefined;
}

export function ClassAnalyticsDashboard({
  className = "Classe active",
  students,
  attemptHistories,
  onInspectCopy,
  onSuggestHint,
}: ClassAnalyticsDashboardProps) {
  // Calcul en temps réel des statistiques de classe
  const stats = useMemo(
    () => calculerStatistiquesClasse(students, attemptHistories),
    [students, attemptHistories],
  );

  // Détection des situations de blocage (> 3 échecs ou inactivité)
  const alerts = useMemo(
    () => detecterBlocagesEtAlertes(students, attemptHistories),
    [students, attemptHistories],
  );

  // Recommandations pédagogiques ciblées
  const recommendations = useMemo(
    () => genererRecommandationsPedagogiques(alerts, stats),
    [alerts, stats],
  );

  const handleExportPronote = () => {
    telechargerExportPronote(students, className);
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec Actions d'Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Tableau de Bord Analytique & Détection des Décrochages
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Suivi statistique en direct, détection automatique des blocages et recommandations
            pédagogiques.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            onClick={handleExportPronote}
            disabled={students.length === 0}
            className="text-xs gap-1.5 h-9 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download className="w-4 h-4" />
            Export Pronote / ENT (.csv)
          </Button>
        </div>
      </div>

      {/* 4 Cartes Métriques Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Moyenne & Écart-Type */}
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Moyenne de classe</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold font-mono">{stats.moyenne20.toFixed(1)} / 20</h3>
                <span className="text-[11px] text-muted-foreground">
                  (σ = {stats.ecartType.toFixed(1)})
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Min: {stats.noteMin20.toFixed(1)} — Max: {stats.noteMax20.toFixed(1)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Médiane & Quartiles */}
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Médiane de classe</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold font-mono text-blue-500">
                  {stats.mediane20.toFixed(1)} / 20
                </h3>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Q1: {stats.q1_20.toFixed(1)} | Q3: {stats.q3_20.toFixed(1)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Taux de Réussite */}
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Taux de réussite (≥ 10/20)
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold font-mono text-green-500">
                  {stats.tauxReussite}%
                </h3>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {stats.tauxRendu}% copies rendues
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Alertes de Blocage */}
        <Card className={`bg-card ${alerts.length > 0 ? "border-destructive/40" : ""}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Alertes de blocage</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3
                  className={`text-2xl font-bold font-mono ${
                    alerts.length > 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {alerts.length}
                </h3>
                {alerts.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] uppercase tracking-wider">
                    Intervention
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {alerts.length === 0
                  ? "Aucun élève bloqué"
                  : `${alerts.filter((a) => a.severite === "critique").length} critique(s)`}
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                alerts.length > 0
                  ? "bg-destructive/10 text-destructive animate-pulse"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution des Notes (Histogramme visuel) */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Distribution des Notes par Tranche (/20)
            </CardTitle>
            <CardDescription className="text-xs">
              Répartition des résultats des {stats.totalEleves} élèves inscrits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.distributionNotes.map((bucket) => {
              const colorClass =
                bucket.min === 0
                  ? "bg-red-500"
                  : bucket.min === 5
                    ? "bg-amber-500"
                    : bucket.min === 10
                      ? "bg-blue-500"
                      : "bg-green-500";

              return (
                <div key={bucket.tranche} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="font-semibold text-foreground">{bucket.tranche} / 20</span>
                    <span className="text-muted-foreground">
                      {bucket.count} élève(s) ({bucket.pourcentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full ${colorClass} transition-all duration-500`}
                      style={{ width: `${bucket.pourcentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Taux de Réussite par Domaine de Compétence */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Taux de Maîtrise par Domaine Technique
            </CardTitle>
            <CardDescription className="text-xs">
              Indicateurs de succès sur les domaines clés du Bac STI2D / NSI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.competenceStats.map((comp) => (
              <div key={comp.categorie} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-foreground">{comp.label}</span>
                  <span className="font-mono text-muted-foreground">{comp.tauxReussite}%</span>
                </div>
                <Progress value={comp.tauxReussite} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Situations de Blocage Détectées (> 3 tentatives ou inactivité) */}
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <CardTitle className="text-sm font-bold">
                Élèves en Situation de Blocage ou Décrochage ({alerts.length})
              </CardTitle>
            </div>
            {alerts.length > 0 && (
              <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                Règle : &gt; 3 échecs consécutifs ou inactivité &gt; 30 min
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Détection automatique en direct pour orienter l'aide individualisée en salle de TP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="p-6 text-center border rounded-lg bg-muted/10">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-xs font-medium text-foreground">
                Aucun blocage persistant détecté.
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Tous les élèves progressent de façon fluide sur les critères du sujet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const student = students.find((s) => s.eleve_id === alert.eleveId);

                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      alert.severite === "critique"
                        ? "bg-destructive/5 border-destructive/30"
                        : alert.severite === "inactivite"
                          ? "bg-amber-500/5 border-amber-500/30"
                          : "bg-muted/40 border-border"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {alert.prenom} {alert.nom}
                        </span>
                        {alert.severite === "critique" ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Blocage Critique ({alert.consecutiveFailures} échecs)
                          </Badge>
                        ) : alert.severite === "inactivite" ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30"
                          >
                            <Clock className="w-3 h-3 mr-1 inline" />
                            Inactif ({alert.inactivityMinutes} min)
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Avertissement
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground/90 font-medium">{alert.description}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Lightbulb className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Action conseillée : {alert.actionConseillee}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {onSuggestHint && alert.critereCode && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSuggestHint(alert.eleveId, alert.critereCode)}
                          className="text-xs h-7 gap-1"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          Proposer indice
                        </Button>
                      )}
                      {onInspectCopy && student && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onInspectCopy(student)}
                          className="text-xs h-7 gap-1"
                        >
                          <FileSearch className="w-3.5 h-3.5" />
                          Voir la copie
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommandations Pédagogiques Proactives (PRD F-64) */}
      {recommendations.length > 0 && (
        <Card className="bg-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              Recommandations Pédagogiques pour l'Enseignant
            </CardTitle>
            <CardDescription className="text-xs">
              Suggestions d'interventions collectives et individuelles basées sur la dynamique de
              classe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded-lg border bg-primary/5 border-primary/20 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-primary" />
                    {rec.titre}
                  </h4>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      rec.urgence === "haute"
                        ? "border-red-500 text-red-500"
                        : "border-primary/40 text-primary"
                    }`}
                  >
                    Urgence : {rec.urgence}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{rec.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
