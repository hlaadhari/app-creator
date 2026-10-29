import React, { useState, useMemo } from "react";
import { Play, RotateCcw, Terminal, AlertCircle, CheckCircle, Clock, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PhpRunner } from "@/lib/php/php-runner";
import type { PhpExecutionResponse } from "@/lib/php/types";

interface PhpRunnerPanelProps {
  files: Record<string, { name: string; content: string }>;
  activeFileName?: string;
  className?: string;
}

export function PhpRunnerPanel({ files, activeFileName, className = "" }: PhpRunnerPanelProps) {
  // Trouver tous les fichiers PHP du projet
  const phpFiles = useMemo(() => {
    return Object.keys(files).filter((k) => k.endsWith(".php"));
  }, [files]);

  const [selectedScript, setSelectedScript] = useState<string>(() => {
    if (activeFileName && activeFileName.endsWith(".php")) return activeFileName;
    return phpFiles[0] ?? "index.php";
  });

  // Simuler les superglobales POST
  const [postParams, setPostParams] = useState<Array<{ key: string; value: string }>>([
    { key: "cin", value: "08123456" },
  ]);

  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<PhpExecutionResponse | null>(null);

  const handleAddParam = () => {
    setPostParams([...postParams, { key: "", value: "" }]);
  };

  const handleRemoveParam = (index: number) => {
    setPostParams(postParams.filter((_, i) => i !== index));
  };

  const handleParamChange = (index: number, field: "key" | "value", val: string) => {
    const updated = [...postParams];
    if (updated[index]) {
      updated[index][field] = val;
      setPostParams(updated);
    }
  };

  const handleRun = async () => {
    const scriptCode = files[selectedScript]?.content;
    if (!scriptCode) return;

    setExecuting(true);
    try {
      const runner = new PhpRunner();

      // Injecter tous les fichiers du projet en fichiers virtuels
      const virtualFiles: Record<string, string> = {};
      for (const [name, f] of Object.entries(files)) {
        virtualFiles[name] = f.content;
      }
      runner.setVirtualFiles(virtualFiles);

      // Préparer superglobales
      const postData: Record<string, string> = {};
      for (const p of postParams) {
        if (p.key.trim()) {
          postData[p.key.trim()] = p.value;
        }
      }

      const res = await runner.execute({
        script: scriptCode,
        entrypoint: selectedScript,
        files: virtualFiles,
        post: postData,
        method: Object.keys(postData).length > 0 ? "POST" : "GET",
      });

      setResult(res);
    } catch (err: unknown) {
      setResult({
        id: "err",
        success: false,
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        exitCode: 1,
        headers: {},
        session: {},
        durationMs: 0,
        memoryUsageBytes: 0,
        timedOut: false,
        memoryExceeded: false,
        error: err instanceof Error ? err.message : "Erreur d'exécution PHP WASM",
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-card border rounded-lg overflow-hidden text-xs ${className}`}
    >
      {/* Barre d'outils supérieure */}
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">
            Console PHP • Simulateur procédural MySQLi
          </span>
          <Badge
            variant="outline"
            className="text-[10px] bg-primary/10 text-primary border-primary/20"
          >
            Simulateur procédural Bac STI • Watchdog 3s
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {phpFiles.length > 1 && (
            <select
              value={selectedScript}
              onChange={(e) => setSelectedScript(e.target.value)}
              className="bg-background border rounded px-2 py-1 text-xs font-mono"
            >
              {phpFiles.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          )}

          <Button
            size="sm"
            onClick={handleRun}
            disabled={executing || !files[selectedScript]}
            className="h-7 text-xs gap-1.5 bg-primary text-primary-foreground font-medium"
          >
            <Play className={`w-3 h-3 fill-current ${executing ? "animate-spin" : ""}`} />
            <span>{executing ? "Exécution..." : `Exécuter ${selectedScript}`}</span>
          </Button>
        </div>
      </div>

      {/* Configuration des paramètres POST / Formulaire */}
      <div className="border-b bg-muted/20 p-2.5 space-y-2 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
          <span>Paramètres de formulaire simulés ($_POST) :</span>
          <button
            onClick={handleAddParam}
            className="text-primary hover:underline cursor-pointer font-mono"
          >
            + Ajouter paramètre
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {postParams.map((p, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 bg-background border rounded px-1.5 py-0.5 font-mono"
            >
              <input
                type="text"
                placeholder="clé"
                value={p.key}
                onChange={(e) => handleParamChange(idx, "key", e.target.value)}
                className="w-16 bg-transparent text-[11px] focus:outline-none"
              />
              <span className="text-muted-foreground">=</span>
              <input
                type="text"
                placeholder="valeur"
                value={p.value}
                onChange={(e) => handleParamChange(idx, "value", e.target.value)}
                className="w-20 bg-transparent text-[11px] focus:outline-none"
              />
              <button
                onClick={() => handleRemoveParam(idx)}
                className="text-muted-foreground hover:text-destructive text-[10px] ml-1"
                title="Supprimer"
              >
                ×
              </button>
            </div>
          ))}
          {postParams.length === 0 && (
            <span className="text-[11px] text-muted-foreground italic">
              Aucun paramètre POST (méthode GET).
            </span>
          )}
        </div>
      </div>

      {/* Métriques d'exécution */}
      {result && (
        <div className="flex items-center gap-4 px-3 py-1.5 border-b bg-background font-mono text-[11px] text-muted-foreground shrink-0">
          <div className="flex items-center gap-1">
            {result.exitCode === 0 ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
            )}
            <span>Code retour : {result.exitCode}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{result.durationMs} ms</span>
          </div>
          <div className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>{Math.round(result.memoryUsageBytes / 1024)} Ko</span>
          </div>
          {result.engine && (
            <span className="text-[10px] text-primary/80 font-sans ml-auto">
              Mode : {result.engine}
            </span>
          )}
        </div>
      )}

      {/* Sortie standard / Terminal stdout */}
      <div className="flex-1 bg-neutral-950 text-neutral-100 p-3 font-mono text-xs overflow-auto select-text space-y-3">
        {result ? (
          <div className="space-y-3">
            {result.error && (
              <div className="p-2 rounded bg-destructive/20 border border-destructive/40 text-destructive-foreground text-[11px] whitespace-pre-wrap">
                ⚠️ {result.error}
              </div>
            )}
            {result.executedQueries && result.executedQueries.length > 0 && (
              <div className="p-2 rounded bg-neutral-900 border border-neutral-800 text-[11px] space-y-1">
                <div className="text-neutral-400 font-semibold">
                  Requêtes SQL exécutées sur la base du sujet ({result.executedQueries.length}) :
                </div>
                {result.executedQueries.map((q, i) => (
                  <div key={i} className="text-emerald-400 font-mono break-all">
                    ➜ {q}
                  </div>
                ))}
              </div>
            )}
            <div className="whitespace-pre-wrap leading-relaxed">
              {result.stdout || (
                <span className="text-neutral-500 italic">
                  [Script exécuté avec succès sans sortie standard (stdout vide).]
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-neutral-500 italic flex items-center justify-center h-full text-center px-4">
            Cliquez sur « Exécuter {selectedScript} » pour lancer le script PHP dans le simulateur
            procédural MySQLi Bac STI.
          </div>
        )}
      </div>
    </div>
  );
}
