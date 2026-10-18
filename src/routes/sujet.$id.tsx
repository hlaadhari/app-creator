import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  getExercise,
  runCriteria,
  score,
  type FileName,
  type Result,
} from "@/lib/exercises";
import { clear } from "@/lib/progress";
import { useBufferSync } from "@/lib/storage/useBufferSync";
import { deleteFromBuffer } from "@/lib/storage/indexeddb";
import { SyncStatusBar } from "@/components/workspace/SyncStatusBar";
import { ConflictModal } from "@/components/workspace/ConflictModal";
import { SproutLogo } from "@/components/SproutLogo";
import { AuthModal } from "@/components/AuthModal";
import { enregistrerTentative } from "@/lib/supabase/projets";
import { MonacoEditorPane } from "@/components/workspace/MonacoEditorPane";
import { WorkspaceFileTree } from "@/components/workspace/WorkspaceFileTree";
import { PreviewSandbox } from "@/components/workspace/PreviewSandbox";
import type { WorkspaceFile } from "@/components/workspace/types";
import {
  BookOpen,
  FolderTree,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Clock,
  Save,
} from "lucide-react";

export const Route = createFileRoute("/sujet/$id")({
  loader: ({ params }) => {
    const ex = getExercise(params.id);
    if (!ex) throw notFound();
    return { title: ex.title, competence: ex.competence };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Sujet"} – Labo STI` },
      { name: "description", content: `Sujet d'entraînement : ${loaderData?.competence ?? ""}` },
      { property: "og:title", content: `${loaderData?.title ?? "Sujet"} – Labo STI` },
      { property: "og:description", content: `Sujet d'entraînement Bac STI : ${loaderData?.competence ?? ""}` },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Workspace,
});

function Workspace() {
  const { id } = Route.useParams();
  const ex = getExercise(id)!;

  // Normalisation du dossier : Travail_Eleve/SW_<id> (F-16)
  const folderName = `Travail_Eleve/SW_${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // Hook de persistance prioritaire dans IndexedDB (labo_sti_buffer) et sync asynchrone
  const {
    files,
    setFiles,
    updateFileContent,
    addNewFile,
    removeFile,
    syncStatus,
    rev,
    lastSavedAt,
    bestScore,
    updateBestScore,
    conflict,
    resolveConflict,
    isLateSync,
    triggerManualSync,
  } = useBufferSync({
    exerciseId: id,
    starterFiles: ex.starter,
  });

  const [activeFileName, setActiveFileName] = useState<string>("index.html");
  const [sidebarTab, setSidebarTab] = useState<"enonce" | "fichiers" | "resultats">("enonce");
  const [results, setResults] = useState<Result[] | null>(null);
  const [hints, setHints] = useState(0);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const handleVerify = () => {
    // Évaluation sécurisée dans une frame masquée
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
    frame.style.cssText = "position:absolute;width:800px;height:600px;left:-9999px;";
    document.body.appendChild(frame);

    // Extraction du contenu HTML pour les tests
    const html = files["index.html"]?.content ?? "";
    const css = files["style.css"]?.content ?? "";
    const js = files["script.js"]?.content ?? "";

    const combinedDoc = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html.replace(/<!DOCTYPE.*?>/i, "")}<script>${js}</script></body></html>`;

    frame.onload = () => {
      try {
        const doc = frame.contentDocument!;
        const win = frame.contentWindow!;
        const r = runCriteria(ex.criteria, doc, win);
        frame.remove();
        setResults(r);
        setSidebarTab("resultats");

        const sc = score(r);
        const n = sc.note20;
        updateBestScore(n);

        enregistrerTentative({
          sujetId: id,
          pointsObtenus: sc.got,
          pointsTotal: sc.total,
          note20: sc.note20,
          details: Object.fromEntries(r.map((c) => [c.id, { ok: c.ok, label: c.label }])),
        });
      } catch (err) {
        console.error("Erreur lors de l'évaluation formative :", err);
        frame.remove();
      }
    };
    frame.srcdoc = combinedDoc;
  };

  const handleReset = async () => {
    if (!confirm("Réinitialiser le sujet aux fichiers de départ ? Votre code local sera effacé.")) return;
    await deleteFromBuffer(id);
    clear(id);
    const resetFiles: Record<string, WorkspaceFile> = {};
    for (const [name, content] of Object.entries(ex.starter)) {
      const ext = name.split(".").pop() || "";
      const lang = ext === "html" ? "html" : ext === "css" ? "css" : "javascript";
      resetFiles[name] = { name, content, type: "text", language: lang };
    }
    setFiles(resetFiles);
    setActiveFileName("index.html");
    setResults(null);
    setHints(0);
  };

  const currentFile: WorkspaceFile = files[activeFileName] ?? files["index.html"] ?? {
    name: "index.html",
    type: "text",
    content: "",
    language: "html",
  };
  const sc = results ? score(results) : null;
  const lineCount = currentFile.type === "text" ? currentFile.content.split("\n").length : 0;

  // Détection du langage pour Monaco
  const editorLanguage = useMemo(() => {
    if (activeFileName.endsWith(".html")) return "html";
    if (activeFileName.endsWith(".css")) return "css";
    if (activeFileName.endsWith(".js")) return "javascript";
    if (activeFileName.endsWith(".php")) return "php";
    if (activeFileName.endsWith(".sql")) return "sql";
    return "html";
  }, [activeFileName]);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground font-sans overflow-hidden">
      {/* Header Principal */}
      <header className="flex h-11 items-center justify-between border-b bg-panel px-4 text-xs font-mono select-none shrink-0">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
            <SproutLogo size="sm" showText={false} />
            <span className="font-semibold text-xs tracking-tight">Sprout Workshop</span>
          </Link>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-muted-foreground">Sujets</span>
          <span className="text-muted-foreground/60">/</span>
          <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-none">{ex.title}</span>
          <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] text-primary hidden md:inline">
            SW_{id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <AuthModal />
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded border bg-background/50 px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Réinitialiser le projet à son état de départ"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </button>
          <button
            onClick={handleVerify}
            className="flex items-center gap-1.5 rounded bg-primary px-3.5 py-1 font-medium text-primary-foreground hover:opacity-90 shadow-xs transition-opacity cursor-pointer"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Vérifier</span>
          </button>
        </div>
      </header>

      {/* Corps du Workspace en 3 Panneaux */}
      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[320px_1fr_1fr] divide-x">
        {/* Panneau Latéral Gauche : Énoncé / Fichiers / Résultats */}
        <aside className="flex min-h-0 flex-col bg-panel">
          <div className="flex border-b text-xs font-mono bg-panel/80 shrink-0">
            <button
              onClick={() => setSidebarTab("enonce")}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 uppercase tracking-wider text-[11px] transition-colors ${
                sidebarTab === "enonce"
                  ? "border-b-2 border-primary text-foreground font-semibold bg-background/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Sujet</span>
            </button>
            <button
              onClick={() => setSidebarTab("fichiers")}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 uppercase tracking-wider text-[11px] transition-colors ${
                sidebarTab === "fichiers"
                  ? "border-b-2 border-primary text-foreground font-semibold bg-background/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderTree className="h-3.5 w-3.5" />
              <span>Fichiers</span>
            </button>
            <button
              onClick={() => setSidebarTab("resultats")}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 uppercase tracking-wider text-[11px] transition-colors ${
                sidebarTab === "resultats"
                  ? "border-b-2 border-primary text-foreground font-semibold bg-background/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Résultats</span>
              {results && (
                <span className="ml-1 px-1 rounded-full bg-primary/20 text-[10px] text-primary">
                  {sc?.note20}/20
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-auto min-h-0">
            {sidebarTab === "enonce" && (
              <div className="p-4 text-sm space-y-4">
                <div>
                  <div className="text-[11px] font-mono uppercase text-primary tracking-wider">{ex.competence}</div>
                  <h2 className="text-base font-semibold mt-1">{ex.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="rounded border px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                      Niveau : {ex.level}
                    </span>
                    {bestScore !== undefined && (
                      <span className="rounded bg-success/10 border border-success/30 px-1.5 py-0.2 text-[10px] font-mono text-success">
                        Meilleur score : {bestScore}/20
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Instructions</h3>
                  <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-foreground/90">
                    {ex.statement.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>Indices progressifs</span>
                    </h3>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {hints}/{ex.hints.length} débloqué(s)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {ex.hints.slice(0, hints).map((hintText, i) => (
                      <div key={i} className="rounded-md border-l-2 border-primary bg-muted/60 p-2.5 text-xs text-foreground/90">
                        <span className="font-mono font-semibold text-[10px] text-primary uppercase block mb-1">
                          Indice {i + 1}
                        </span>
                        {hintText}
                      </div>
                    ))}

                    {hints < ex.hints.length && (
                      <button
                        onClick={() => setHints((h) => h + 1)}
                        className="w-full text-left rounded border border-dashed p-2 text-xs text-primary hover:bg-accent/40 transition-colors flex items-center justify-between"
                      >
                        <span>Afficher l'indice {hints + 1}</span>
                        <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {sidebarTab === "fichiers" && (
              <WorkspaceFileTree
                folderName={folderName}
                files={files}
                activeFile={activeFileName}
                onSelectFile={setActiveFileName}
                onAddFile={addNewFile}
                onDeleteFile={removeFile}
              />
            )}

            {sidebarTab === "resultats" && (
              <div className="p-4 space-y-4">
                {results && sc ? (
                  <>
                    <div className="rounded-lg border bg-card p-4 text-center">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Note provisoire</div>
                      <div className="mt-1 flex items-baseline justify-center gap-1">
                        <span className={`text-4xl font-mono font-bold ${sc.note20 >= 16 ? "text-success" : sc.note20 >= 10 ? "text-primary" : "text-destructive"}`}>
                          {sc.note20}
                        </span>
                        <span className="text-sm font-mono text-muted-foreground">/20</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground font-mono">
                        {sc.got} / {sc.total} critères validés
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Détail des critères</h3>
                      <ul className="space-y-2">
                        {results.map((r) => (
                          <li key={r.id} className="rounded-md border bg-card p-2.5 text-xs transition-colors">
                            <div className="flex items-start gap-2">
                              <span className={`font-mono text-sm shrink-0 ${r.ok ? "text-success" : "text-destructive"}`}>
                                {r.ok ? "✓" : "✗"}
                              </span>
                              <div className="flex-1">
                                <div className="font-medium text-foreground">{r.label}</div>
                                {!r.ok && <p className="mt-1 text-[11px] text-muted-foreground leading-normal">{r.message}</p>}
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground shrink-0">{r.points} pt</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mb-2 stroke-1 text-muted-foreground/60" />
                    <p className="text-xs font-mono">Aucune vérification effectuée.</p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1">
                      Cliquez sur le bouton « ▶ Vérifier » pour exécuter les critères sur votre code.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Panneau Central : Éditeur Monaco + Onglets VS Code */}
        <section className="flex min-h-0 flex-col bg-editor">
          {/* Barre d'onglets de fichiers */}
          <div className="flex items-center border-b bg-panel text-xs font-mono overflow-x-auto shrink-0 select-none">
            {Object.keys(files).map((fileName) => {
              const isActive = activeFileName === fileName;
              return (
                <button
                  key={fileName}
                  onClick={() => setActiveFileName(fileName)}
                  className={`flex items-center gap-2 border-r px-4 py-2 transition-colors border-t-2 ${
                    isActive
                      ? "bg-editor text-foreground border-t-primary font-medium"
                      : "text-muted-foreground hover:bg-accent/40 border-t-transparent"
                  }`}
                >
                  <span
                    className={
                      fileName.endsWith(".html")
                        ? "text-orange-500 font-bold"
                        : fileName.endsWith(".css")
                          ? "text-sky-400 font-bold"
                          : fileName.endsWith(".js")
                            ? "text-amber-400 font-bold"
                            : "text-purple-400"
                    }
                  >
                    ●
                  </span>
                  <span>{fileName}</span>
                  {syncStatus === "pending" && isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Modifications locales enregistrées dans le tampon IndexedDB" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Éditeur de code Monaco ou Visualiseur d'asset */}
          <div className="flex-1 min-h-0 relative">
            {currentFile.type === "asset" ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
                <img
                  src={currentFile.content}
                  alt={currentFile.name}
                  className="max-h-64 max-w-full rounded border bg-card shadow-sm object-contain"
                />
                <span className="mt-3 font-mono text-xs text-foreground font-medium">{currentFile.name}</span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {currentFile.size ? `${Math.round(currentFile.size / 1024)} Ko` : "Ressource locale"}
                </span>
              </div>
            ) : (
              <MonacoEditorPane
                value={currentFile.content}
                onChange={(newContent) => updateFileContent(activeFileName, newContent)}
                language={editorLanguage}
                theme="vs-dark"
                onSave={triggerManualSync}
                onCursorChange={(line, col) => setCursorPos({ line, col })}
              />
            )}
          </div>
        </section>

        {/* Panneau Droit : Aperçu Bac à Sable Sécurisé */}
        <section className="flex min-h-0 flex-col">
          <PreviewSandbox files={files} />
        </section>
      </div>

      {/* Barre de Statut Résiliente */}
      <SyncStatusBar
        status={syncStatus}
        rev={rev}
        lastSavedAt={lastSavedAt}
        cursorPos={cursorPos}
        activeFileName={activeFileName}
        isLateSync={isLateSync}
        onManualSync={triggerManualSync}
      />

      {/* Modale d'arbitrage de conflit explicite (Inviolable #4) */}
      <ConflictModal
        open={Boolean(conflict)}
        conflict={conflict}
        onResolve={resolveConflict}
      />
    </div>
  );
}
