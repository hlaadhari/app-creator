import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Scale,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Filter,
  Users,
  Sliders,
  Check,
  XCircle,
  HelpCircle,
} from "lucide-react";
import type {
  StudentCopyData,
  SimilarityPairResult,
  TeacherArbitrationVerdict,
} from "@/lib/similarity/types";
import { analyserSimilariteClasse } from "@/lib/similarity/comparator";
import { SimilarityDiffModal } from "./SimilarityDiffModal";

interface SimilarityAnalysisTabProps {
  classId?: string | undefined;
  className?: string | undefined;
  copies: StudentCopyData[];
}

export function SimilarityAnalysisTab({
  classId,
  className = "Classe active",
  copies,
}: SimilarityAnalysisTabProps) {
  const [seuilAlerte, setSeuilAlerte] = useState<number>(80);
  const [filterVerdict, setFilterVerdict] = useState<
    "tous" | "en_attente" | "confirme" | "faux_positif"
  >("tous");
  const [arbitrations, setArbitrations] = useState<
    Record<string, { verdict: TeacherArbitrationVerdict; notes?: string | undefined; date: string }>
  >({});
  const [activePairForDiff, setActivePairForDiff] = useState<SimilarityPairResult | null>(null);

  // Exécution de l'analyse matricielle de similarité (N * (N-1) / 2)
  const matrixResult = useMemo(
    () => analyserSimilariteClasse(copies, seuilAlerte, { classId }),
    [copies, seuilAlerte, classId],
  );

  // Fusionner les arbitrages enregistrés localement avec les résultats de comparaison
  const pairsWithArbitration = useMemo(() => {
    return matrixResult.pairs.map((p) => {
      const arb = arbitrations[p.id];
      if (arb) {
        return {
          ...p,
          verdictProf: arb.verdict,
          notesProf: arb.notes,
          arbitreLe: arb.date,
        };
      }
      return p;
    });
  }, [matrixResult.pairs, arbitrations]);

  // Filtrage selon les choix de l'enseignant
  const filteredPairs = useMemo(() => {
    return pairsWithArbitration.filter((p) => {
      if (filterVerdict !== "tous" && p.verdictProf !== filterVerdict) {
        return false;
      }
      return true;
    });
  }, [pairsWithArbitration, filterVerdict]);

  const pairesSuspectesCount = pairsWithArbitration.filter(
    (p) => p.overallSimilarity >= seuilAlerte,
  ).length;
  const pairesArbitreesCount = pairsWithArbitration.filter(
    (p) => p.verdictProf !== "en_attente",
  ).length;

  const handleArbitrate = (
    pairId: string,
    verdict: TeacherArbitrationVerdict,
    notes?: string | undefined,
  ) => {
    setArbitrations((prev) => ({
      ...prev,
      [pairId]: {
        verdict,
        notes,
        date: new Date().toISOString(),
      },
    }));
  };

  const copyA = copies.find((c) => c.eleveId === activePairForDiff?.studentA.id);
  const copyB = copies.find((c) => c.eleveId === activePairForDiff?.studentB.id);

  return (
    <div className="space-y-6">
      {/* En-tête & Principe Didactique */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Analyse de Similarité Structurelle & Détection Anti-Plagiat (PRD §16)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comparaison multi-fichiers, détection des renommages de variables et arbitrage
            enseignant : <strong>« L'algorithme informe, l'humain décide »</strong>.
          </p>
        </div>

        <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
          {copies.length} copies analysées
        </Badge>
      </div>

      {/* 4 Cartes Métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Copies d'examen</p>
              <h3 className="text-2xl font-bold font-mono mt-1">{copies.length}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{className}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Paires comparées</p>
              <h3 className="text-2xl font-bold font-mono mt-1">{matrixResult.totalPaires}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Matrice croisée complète</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-card ${pairesSuspectesCount > 0 ? "border-destructive/40" : ""}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Paires au-dessus du seuil</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3
                  className={`text-2xl font-bold font-mono ${
                    pairesSuspectesCount > 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {pairesSuspectesCount}
                </h3>
                <span className="text-[11px] text-muted-foreground">(≥ {seuilAlerte}%)</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {pairesSuspectesCount === 0 ? "Aucun signalement" : "Nécessite examen visuel"}
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                pairesSuspectesCount > 0
                  ? "bg-destructive/10 text-destructive animate-pulse"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Arbitrages enregistrés</p>
              <h3 className="text-2xl font-bold font-mono text-green-600 mt-1">
                {pairesArbitreesCount} / {Math.max(1, pairesSuspectesCount)}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Dossiers traités par l'enseignant
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre de contrôle du seuil & Filtres */}
      <Card className="bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 w-full max-w-md space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                Seuil d'alerte de similarité :{" "}
                <strong className="font-mono text-primary">{seuilAlerte}%</strong>
              </span>
              <span className="text-[10px] text-muted-foreground">(Standard officiel : 80%)</span>
            </div>
            <Slider
              value={[seuilAlerte]}
              onValueChange={([val]) => val !== undefined && setSeuilAlerte(val)}
              min={50}
              max={95}
              step={5}
              className="w-full cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filtrer :
            </span>
            <Button
              size="sm"
              variant={filterVerdict === "tous" ? "default" : "outline"}
              onClick={() => setFilterVerdict("tous")}
              className="text-xs h-7 px-2.5"
            >
              Toutes ({matrixResult.pairs.length})
            </Button>
            <Button
              size="sm"
              variant={filterVerdict === "en_attente" ? "default" : "outline"}
              onClick={() => setFilterVerdict("en_attente")}
              className="text-xs h-7 px-2.5"
            >
              En attente (
              {pairsWithArbitration.filter((p) => p.verdictProf === "en_attente").length})
            </Button>
            <Button
              size="sm"
              variant={filterVerdict === "confirme" ? "default" : "outline"}
              onClick={() => setFilterVerdict("confirme")}
              className="text-xs h-7 px-2.5"
            >
              Plagiats confirmés (
              {pairsWithArbitration.filter((p) => p.verdictProf === "confirme").length})
            </Button>
            <Button
              size="sm"
              variant={filterVerdict === "faux_positif" ? "default" : "outline"}
              onClick={() => setFilterVerdict("faux_positif")}
              className="text-xs h-7 px-2.5"
            >
              Faux positifs (
              {pairsWithArbitration.filter((p) => p.verdictProf === "faux_positif").length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des Paires de Copies */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/40 text-xs">
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Élève A</TableHead>
              <TableHead>Élève B</TableHead>
              <TableHead className="w-48">Indice Global</TableHead>
              <TableHead>Fichiers & Détails</TableHead>
              <TableHead>Statut d'Arbitrage</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {filteredPairs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground italic">
                  Aucune paire de copies ne correspond aux filtres actuels.
                </TableCell>
              </TableRow>
            ) : (
              filteredPairs.map((pair, idx) => {
                const isAboveThreshold = pair.overallSimilarity >= seuilAlerte;

                return (
                  <TableRow
                    key={pair.id}
                    className={`hover:bg-muted/30 ${
                      pair.overallSimilarity >= 85
                        ? "bg-destructive/5"
                        : isAboveThreshold
                          ? "bg-amber-500/5"
                          : ""
                    }`}
                  >
                    <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>

                    <TableCell className="font-semibold text-foreground">
                      {pair.studentA.prenom} {pair.studentA.nom}
                    </TableCell>

                    <TableCell className="font-semibold text-foreground">
                      {pair.studentB.prenom} {pair.studentB.nom}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-mono font-bold">
                          <span
                            className={
                              pair.overallSimilarity >= 85
                                ? "text-destructive"
                                : isAboveThreshold
                                  ? "text-amber-500"
                                  : "text-foreground"
                            }
                          >
                            {pair.overallSimilarity}%
                          </span>
                          {pair.overallSimilarity >= 85 ? (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1 py-0">
                              Forte présomption
                            </Badge>
                          ) : isAboveThreshold ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1 py-0 bg-amber-500/10 text-amber-500 border-amber-500/30"
                            >
                              Suspect
                            </Badge>
                          ) : null}
                        </div>
                        <Progress value={pair.overallSimilarity} className="h-1.5" />
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {pair.fileDetails.map((f) => (
                          <span
                            key={f.chemin}
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              f.similarity >= 85
                                ? "bg-destructive/10 text-destructive border-destructive/20 font-bold"
                                : f.similarity >= 70
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                  : "bg-muted/40 text-muted-foreground border-border"
                            }`}
                          >
                            {f.chemin}: {f.similarity}%
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>
                      {pair.verdictProf === "confirme" ? (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <XCircle className="w-3 h-3" />
                          Plagiat confirmé
                        </Badge>
                      ) : pair.verdictProf === "faux_positif" ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-green-500/10 text-green-600 border-green-600/30 gap-1 font-medium"
                        >
                          <Check className="w-3 h-3" />
                          Classé sans suite
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          En attente d'arbitrage
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setActivePairForDiff(pair)}
                        className="h-7 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <FileSearch className="w-3.5 h-3.5" />
                        Examiner (Diff)
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modale d'examen côte-à-côte et d'arbitrage */}
      <SimilarityDiffModal
        isOpen={activePairForDiff !== null}
        onClose={() => setActivePairForDiff(null)}
        pair={activePairForDiff}
        copyA={copyA}
        copyB={copyB}
        onArbitrate={handleArbitrate}
      />
    </div>
  );
}
