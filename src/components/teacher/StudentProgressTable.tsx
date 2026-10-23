import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  FileSearch,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Download,
  AlertOctagon,
} from "lucide-react";
import type { TeacherClassMember } from "@/lib/supabase/teacher";
import type { StudentBlockageAlert } from "@/lib/analytics/class-analytics";
import { getLibelleSourceTentative } from "@/lib/supabase/tentative-details";

interface StudentProgressTableProps {
  students: TeacherClassMember[];
  loading: boolean;
  onInspectCopy: (student: TeacherClassMember) => void;
  onExportCsv: () => void;
  onExportPronote?: (() => void) | undefined;
  alerts?: StudentBlockageAlert[] | undefined;
}

export function StudentProgressTable({
  students,
  loading,
  onInspectCopy,
  onExportCsv,
  onExportPronote,
  alerts = [],
}: StudentProgressTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = students.filter(
    (s) =>
      s.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.prenom.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Barre d'outils (Recherche + Exports) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Filtrer par nom ou prénom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onExportPronote && (
            <Button
              size="sm"
              variant="default"
              onClick={onExportPronote}
              disabled={students.length === 0}
              className="text-xs gap-1.5 h-9 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="w-3.5 h-3.5" />
              Export Pronote / ENT (.csv)
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onExportCsv}
            disabled={students.length === 0}
            className="text-xs gap-1.5 h-9"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Standard
          </Button>
        </div>
      </div>

      {/* Tableau des élèves */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/40 text-xs">
            <TableRow>
              <TableHead>Élève</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-48">Score & Progression</TableHead>
              <TableHead>Critères validés</TableHead>
              <TableHead>Difficultés détectées</TableHead>
              <TableHead>Dernière activité</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-28 text-center text-muted-foreground animate-pulse"
                >
                  Chargement de la progression des élèves...
                </TableCell>
              </TableRow>
            ) : filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground italic">
                  {students.length === 0
                    ? "Aucun élève inscrit dans cette classe pour le moment."
                    : "Aucun élève ne correspond aux critères de recherche."}
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((eleve) => {
                const score = eleve.score_formatif ?? 0;
                const hasStruggles = eleve.points_faibles && eleve.points_faibles.length > 0;

                return (
                  <TableRow key={eleve.eleve_id} className="hover:bg-muted/20">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex flex-col">
                        <span>
                          {eleve.nom} {eleve.prenom}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          Inscrit le {new Date(eleve.joined_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {eleve.projet_statut === "rendu" ? (
                        <Badge
                          variant="default"
                          className="text-[10px] bg-green-600 hover:bg-green-700"
                        >
                          Rendu
                        </Badge>
                      ) : eleve.projet_statut === "en_cours" ? (
                        <Badge variant="secondary" className="text-[10px]">
                          En cours
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Non démarré
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                          <span>{score}%</span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 h-4 ${
                              eleve.score_source === "serveur" ||
                              eleve.score_source === "enseignant"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            }`}
                          >
                            {getLibelleSourceTentative(eleve.score_source)}
                          </Badge>
                        </div>
                        <Progress value={score} className="h-1.5" />
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-[11px] flex items-center gap-1">
                        {eleve.criteres_reussis === eleve.total_criteres &&
                        (eleve.total_criteres ?? 0) > 0 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : null}
                        {eleve.criteres_reussis ?? 0} / {eleve.total_criteres ?? 0}
                      </span>
                    </TableCell>

                    <TableCell>
                      {(() => {
                        const studentAlerts = alerts.filter((a) => a.eleveId === eleve.eleve_id);
                        const criticalAlert = studentAlerts.find((a) => a.severite === "critique");
                        const inactivityAlert = studentAlerts.find(
                          (a) => a.severite === "inactivite",
                        );

                        if (criticalAlert) {
                          return (
                            <Badge
                              variant="destructive"
                              className="text-[10px] gap-1 py-0.5 px-2 bg-destructive text-destructive-foreground font-semibold"
                              title={criticalAlert.description}
                            >
                              <AlertOctagon className="w-3 h-3" />
                              Bloqué ({criticalAlert.consecutiveFailures ?? ">3"} échecs)
                            </Badge>
                          );
                        }

                        if (inactivityAlert) {
                          return (
                            <Badge
                              variant="outline"
                              className="text-[10px] gap-1 py-0.5 px-2 bg-amber-500/10 text-amber-500 border-amber-500/30 font-medium"
                              title={inactivityAlert.description}
                            >
                              <Clock className="w-3 h-3" />
                              Inactif ({inactivityAlert.inactivityMinutes} min)
                            </Badge>
                          );
                        }

                        if (hasStruggles) {
                          return (
                            <div className="flex items-center gap-1 text-[11px] text-amber-500">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span
                                className="truncate max-w-[150px]"
                                title={eleve.points_faibles?.join(", ")}
                              >
                                {eleve.points_faibles?.[0]}
                                {(eleve.points_faibles?.length ?? 0) > 1 &&
                                  ` (+${(eleve.points_faibles?.length ?? 0) - 1})`}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <span className="text-muted-foreground text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500/70" />
                            Progression fluide
                          </span>
                        );
                      })()}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-[11px]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(eleve.derniere_activite || eleve.joined_at).toLocaleDateString(
                          "fr-FR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onInspectCopy(eleve)}
                        className="h-7 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <FileSearch className="w-3.5 h-3.5" />
                        Consulter copie
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
