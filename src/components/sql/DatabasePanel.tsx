import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Database,
  Download,
  Info,
  Play,
  RotateCcw,
  Table as TableIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { declencherTelechargementZip, exporterProjetEleveZip } from "@/lib/export/archive-exporter";
import { SqliteEngine } from "@/lib/sql/sqlite-engine";
import type { SqlQueryResult, SqlTableInfo } from "@/lib/sql/types";

export interface DatabasePanelProps {
  initialSql?: string;
  numeroCin?: string;
  projectFiles?: Record<string, string>;
  className?: string;
}

export function DatabasePanel({
  initialSql = "",
  numeroCin = "08123456",
  projectFiles = {},
  className = "",
}: DatabasePanelProps) {
  const [engine] = useState(() => new SqliteEngine({ initialSql }));
  const [tables, setTables] = useState<SqlTableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<SqlQueryResult | null>(null);
  const [queryInput, setQueryInput] = useState("SELECT * FROM candidat;");
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null);
  const [activeTab, setActiveTab] = useState<"viewer" | "console">("viewer");
  const [isExecuting, setIsExecuting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Charger les tables au montage
  useEffect(() => {
    let mounted = true;
    (async () => {
      await engine.init(initialSql);
      const list = await engine.getTables();
      if (mounted) {
        setTables(list);
        if (list.length > 0 && list[0]) {
          setSelectedTable(list[0].name);
          const data = await engine.getTableData(list[0].name);
          setTableData(data);
          setQueryInput(`SELECT * FROM ${list[0].name};`);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [engine, initialSql]);

  // Changer de table sélectionnée
  const handleSelectTable = async (tableName: string) => {
    setSelectedTable(tableName);
    const data = await engine.getTableData(tableName);
    setTableData(data);
    setQueryInput(`SELECT * FROM ${tableName};`);
  };

  // Exécution d'une requête SQL libre
  const handleExecuteQuery = async () => {
    if (!queryInput.trim() || isExecuting) return;
    setIsExecuting(true);
    setStatusMessage(null);

    try {
      const result = await engine.executeQuery(queryInput);
      setQueryResult(result);
      // Mettre à jour l'arborescence des tables (au cas où CREATE/DROP/INSERT a eu lieu)
      const updatedTables = await engine.getTables();
      setTables(updatedTables);
      if (selectedTable) {
        const freshData = await engine.getTableData(selectedTable);
        setTableData(freshData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Erreur d'exécution : ${msg}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Réinitialisation de la BDD
  const handleResetDatabase = async () => {
    await engine.reset();
    const list = await engine.getTables();
    setTables(list);
    if (list.length > 0 && list[0]) {
      setSelectedTable(list[0].name);
      const data = await engine.getTableData(list[0].name);
      setTableData(data);
    } else {
      setSelectedTable(null);
      setTableData(null);
    }
    setQueryResult(null);
    setStatusMessage("Base de données réinitialisée à son état initial.");
  };

  // Exportation SW_xxxxx.zip
  const handleExportZip = async () => {
    const dump = await engine.exportDump();
    const zip = exporterProjetEleveZip({
      numeroCin,
      files: projectFiles,
      sqlDump: dump,
    });
    declencherTelechargementZip(zip.data, zip.filename);
    setStatusMessage(
      `Archive ${zip.filename} téléchargée avec succès (${zip.entryCount} fichiers).`,
    );
  };

  return (
    <Card
      className={`flex flex-col border border-border bg-card text-card-foreground shadow-sm ${className}`}
    >
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">
            Panneau Base de données (SQLite WASM)
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Dialecte Bac STI actif
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetDatabase}
            title="Restaurer l'état initial des tables et données"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser la base
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={handleExportZip}
            title="Exporter l'archive SW_xxxxx.zip conforme pour l'examen"
            className="flex items-center gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Exporter SW_{numeroCin}.zip
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-0 p-0 h-[480px]">
        {/* Volet gauche : Liste des tables */}
        <div className="border-r border-border p-3 bg-muted/20 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Tables ({tables.length})</span>
          </div>

          {tables.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucune table chargée.</p>
          ) : (
            <div className="space-y-1">
              {tables.map((t) => (
                <div key={t.name} className="space-y-1">
                  <button
                    onClick={() => handleSelectTable(t.name)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-colors ${
                      selectedTable === t.name
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <TableIcon className="h-3.5 w-3.5 shrink-0" />
                      {t.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        selectedTable === t.name
                          ? "bg-primary-foreground/20 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.rowCount}
                    </span>
                  </button>

                  {/* Colonnes de la table sélectionnée */}
                  {selectedTable === t.name && (
                    <div className="pl-5 pr-1 py-1 space-y-0.5 border-l-2 border-primary/40 ml-2">
                      {t.columns.map((c) => (
                        <div
                          key={c.name}
                          className="flex items-center justify-between text-[11px] text-muted-foreground"
                        >
                          <span className="truncate">{c.name}</span>
                          <span className="text-[9px] opacity-75 font-mono">{c.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Volet droit : Visualiseur de données et console SQL */}
        <div className="col-span-3 flex flex-col h-full overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "viewer" | "console")}
            className="flex-1 flex flex-col"
          >
            <div className="border-b px-3 py-1.5 flex items-center justify-between bg-muted/10">
              <TabsList className="h-8">
                <TabsTrigger value="viewer" className="text-xs px-2.5 py-1">
                  Visualiseur de données
                </TabsTrigger>
                <TabsTrigger value="console" className="text-xs px-2.5 py-1">
                  Console SQL interactive
                </TabsTrigger>
              </TabsList>

              {statusMessage && (
                <span className="text-xs text-muted-foreground truncate max-w-sm">
                  {statusMessage}
                </span>
              )}
            </div>

            {/* Onglet 1 : Visualiseur de données */}
            <TabsContent value="viewer" className="flex-1 p-3 m-0 overflow-auto">
              {!selectedTable ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  Sélectionnez une table à gauche pour visualiser son contenu.
                </div>
              ) : !tableData || tableData.rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-1">
                  <p>
                    La table <strong className="text-foreground">{selectedTable}</strong> est
                    actuellement vide.
                  </p>
                  <p className="text-[11px]">
                    Utilisez la console SQL pour exécuter des requêtes INSERT.
                  </p>
                </div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground uppercase text-[10px]">
                      <tr>
                        {tableData.columns.map((col) => (
                          <th key={col} className="px-3 py-2 border-b font-semibold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tableData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/50">
                          {tableData.columns.map((col) => (
                            <td key={col} className="px-3 py-1.5 font-mono text-[11px]">
                              {row[col] === null ? (
                                <span className="text-muted-foreground italic">NULL</span>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Onglet 2 : Console SQL interactive */}
            <TabsContent
              value="console"
              className="flex-1 flex flex-col p-3 m-0 gap-3 overflow-hidden"
            >
              <div className="flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Requête SQL à exécuter :
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    Raccourci : Ctrl + Entrée
                  </span>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        handleExecuteQuery();
                      }
                    }}
                    rows={3}
                    placeholder="Tapez votre requête SQL (ex: SELECT * FROM candidat WHERE classe = 'Terminale STI';)"
                    className="flex-1 font-mono text-xs p-2 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    onClick={handleExecuteQuery}
                    disabled={isExecuting}
                    className="h-auto px-4 flex flex-col items-center justify-center gap-1 text-xs"
                  >
                    <Play className="h-4 w-4" />
                    <span>Exécuter</span>
                  </Button>
                </div>
              </div>

              {/* Alertes du Contrôleur de dialecte */}
              {queryResult?.dialectWarnings && queryResult.dialectWarnings.length > 0 && (
                <div className="shrink-0 space-y-1.5">
                  {queryResult.dialectWarnings.map((warn, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold">{warn.titre}</p>
                        <p className="text-[11px] leading-relaxed">{warn.message}</p>
                        <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                          Conseil Bac STI : {warn.suggestion}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Résultat de la requête */}
              <div className="flex-1 overflow-auto border rounded-md p-2 bg-background">
                {queryResult?.error ? (
                  <div className="text-xs text-destructive p-2 font-mono">
                    Erreur SQL : {queryResult.error}
                  </div>
                ) : !queryResult ? (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                    Exécutez une requête SQL pour voir les résultats.
                  </div>
                ) : queryResult.rows.length === 0 ? (
                  <div className="flex items-center justify-between text-xs text-muted-foreground p-2">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle className="h-4 w-4" />
                      Requête exécutée avec succès ({queryResult.rowsAffected} ligne(s) affectée(s))
                    </span>
                    <span className="text-[10px] font-mono">{queryResult.durationMs} ms</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                      <span>{queryResult.rows.length} résultat(s)</span>
                      <span className="font-mono">{queryResult.durationMs} ms</span>
                    </div>
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground uppercase text-[10px]">
                        <tr>
                          {queryResult.columns.map((c) => (
                            <th key={c} className="px-2.5 py-1.5 border-b font-semibold">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {queryResult.rows.map((r, i) => (
                          <tr key={i} className="hover:bg-muted/40">
                            {queryResult.columns.map((c) => (
                              <td key={c} className="px-2.5 py-1 font-mono text-[11px]">
                                {r[c] === null ? (
                                  <span className="text-muted-foreground italic">NULL</span>
                                ) : (
                                  String(r[c])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
