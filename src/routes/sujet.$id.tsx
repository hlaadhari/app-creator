import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { getExercise, runCriteria, score, type FileName, type Result } from "@/lib/exercises";
import { clear } from "@/lib/progress";
import { useBufferSync } from "@/lib/storage/useBufferSync";
import { deleteFromBuffer } from "@/lib/storage/indexeddb";
import { SyncStatusBar } from "@/components/workspace/SyncStatusBar";
import { ConflictModal } from "@/components/workspace/ConflictModal";
import { EvaluationResultsPane } from "@/components/workspace/EvaluationResultsPane";
import { debloquerNiveauIndice, type UnlockedHint } from "@/lib/evaluation/hints-service";
import { calculerCompteARebours, getTempsServeurSynchronise } from "@/lib/exam/server-clock";
import type { EvaluationSummary } from "@/lib/evaluation/probe-runner";
import { SproutLogo } from "@/components/SproutLogo";
import { AuthModal } from "@/components/AuthModal";
import { enregistrerTentative } from "@/lib/supabase/projets";
import { enregistrerNouvelleTentative } from "@/lib/pedagogy/attempts-service";
import { MonacoEditorPane } from "@/components/workspace/MonacoEditorPane";
import { WorkspaceFileTree } from "@/components/workspace/WorkspaceFileTree";
import { PreviewSandbox } from "@/components/workspace/PreviewSandbox";
import { DatabasePanel } from "@/components/sql/DatabasePanel";
import { PhpRunnerPanel } from "@/components/php/PhpRunnerPanel";
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
  TrendingUp,
  Bot,
  Lock,
} from "lucide-react";
import { SubjectCompetencesPill } from "@/components/competences/SubjectCompetencesPill";
import { ProgressionModal } from "@/components/competences/ProgressionModal";
import { PedagogicalTutorPane } from "@/components/workspace/PedagogicalTutorPane";
import { CourseModal } from "@/components/course/CourseModal";

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
      {
        property: "og:description",
        content: `Sujet d'entraînement Bac STI : ${loaderData?.competence ?? ""}`,
      },
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

  const [activeFileName, setActiveFileName] = useState<string>(
    () => Object.keys(ex.starter)[0] ?? "index.html",
  );
  const [sidebarTab, setSidebarTab] = useState<"enonce" | "fichiers" | "resultats" | "tuteur">(
    "enonce",
  );
  const [evaluationSummary, setEvaluationSummary] = useState<EvaluationSummary | null>(null);
  const [unlockedHints, setUnlockedHints] = useState<UnlockedHint[]>([]);
  const [unlockingHint, setUnlockingHint] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [showCourseModal, setShowCourseModal] = useState(false);

  const handleInsertCourseCode = (snippet: string) => {
    const current = files[activeFileName]?.content || "";
    const updated = current.trim() === "" ? snippet : `${current}\n\n${snippet}`;
    updateFileContent(activeFileName, updated);
  };

  const isExamMode = Boolean(ex.examMode);

  // Synchronisation du compte à rebours officiel d'examen (PRD F-48, F-50, T-06)
  const [countdown, setCountdown] = useState(() => {
    if (!isExamMode) return null;
    const durationMs = (ex.dureeMinutes || 90) * 60 * 1000;
    const storageKey = `bacsti_exam_start_${id}`;
    let startTimestamp = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (!startTimestamp) {
      startTimestamp = Date.now().toString();
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, startTimestamp);
      }
    }
    const deadline = new Date(Number(startTimestamp) + durationMs);
    return calculerCompteARebours(deadline, getTempsServeurSynchronise());
  });

  useEffect(() => {
    if (!isExamMode) return;
    const durationMs = (ex.dureeMinutes || 90) * 60 * 1000;
    const storageKey = `bacsti_exam_start_${id}`;
    let startTimestamp = localStorage.getItem(storageKey);
    if (!startTimestamp) {
      startTimestamp = Date.now().toString();
      localStorage.setItem(storageKey, startTimestamp);
    }
    const deadline = new Date(Number(startTimestamp) + durationMs);

    const updateTimer = () => {
      const cd = calculerCompteARebours(deadline, getTempsServeurSynchronise());
      setCountdown(cd);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [id, isExamMode, ex.dureeMinutes]);

  const isExamExpired = isExamMode && Boolean(countdown?.isExpired);

  // Neutralisation de l'onglet tuteur en mode examen
  useEffect(() => {
    if (isExamMode && sidebarTab === "tuteur") {
      setSidebarTab("enonce");
    }
  }, [isExamMode, sidebarTab]);

  const hasPhp = useMemo(() => Object.keys(files).some((k) => k.endsWith(".php")), [files]);
  const hasSql = useMemo(
    () => Object.keys(files).some((k) => k.endsWith(".sql") || k === "db/init.sql"),
    [files],
  );
  const [rightPanelTab, setRightPanelTab] = useState<"preview" | "sql" | "php">("preview");

  const handleVerify = () => {
    if (isExamExpired) return;
    setVerifying(true);
    const startTime = performance.now();

    // Évaluation sécurisée dans une frame masquée
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
    frame.style.cssText = "position:absolute;width:800px;height:600px;left:-9999px;";
    document.body.appendChild(frame);

    // Extraction du contenu HTML pour les tests
    const htmlKey =
      files["index.html"] !== undefined
        ? "index.html"
        : (Object.keys(files).find((k) => k.endsWith(".html")) ?? "index.html");
    const html = files[htmlKey]?.content ?? "";
    const css = Object.entries(files)
      .filter(([k]) => k.endsWith(".css"))
      .map(([, f]) => f.content)
      .join("\n");
    const js = Object.entries(files)
      .filter(([k]) => k.endsWith(".js"))
      .map(([, f]) => f.content)
      .join("\n");

    const combinedDoc = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html.replace(/<!DOCTYPE.*?>/i, "")}<script>${js}</script></body></html>`;

    frame.onload = () => {
      try {
        const doc = frame.contentDocument!;
        const win = frame.contentWindow!;
        const r = runCriteria(ex.criteria, doc, win);
        frame.remove();

        const duration = Math.round(performance.now() - startTime);
        const sc = score(r);
        const n = sc.note20;
        updateBestScore(n);

        const summary: EvaluationSummary = {
          results: r.map((c) => ({
            id: c.id,
            code: c.id.toUpperCase(),
            label: c.label,
            points: c.ok ? c.points : 0,
            maxPoints: c.points,
            passed: c.ok,
            message: c.message,
            durationMs: 12,
          })),
          earnedPoints: sc.got,
          totalPoints: sc.total,
          note20: sc.note20,
          totalDurationMs: duration,
          evaluatedAt: Date.now(),
        };

        setEvaluationSummary(summary);
        setSidebarTab("resultats");

        enregistrerTentative({
          sujetId: id,
          pointsObtenus: sc.got,
          pointsTotal: sc.total,
          note20: sc.note20,
          details: Object.fromEntries(r.map((c) => [c.id, { ok: c.ok, label: c.label }])),
        });

        enregistrerNouvelleTentative({
          sujetId: id,
          note20: sc.note20,
          pointsObtenus: sc.got,
          pointsTotal: sc.total,
          dureeMs: duration,
          criteres: r.map((c) => ({
            id: c.id,
            label: c.label,
            ok: c.ok,
            points: c.ok ? c.points : 0,
            maxPoints: c.points,
            message: c.message,
          })),
        });
      } catch (err) {
        console.error("Erreur lors de l'évaluation formative :", err);
        frame.remove();
      } finally {
        setVerifying(false);
      }
    };
    frame.srcdoc = combinedDoc;
  };

  const handleUnlockHint = async () => {
    if (unlockedHints.length >= ex.hints.length) return;
    setUnlockingHint(true);
    const nextLevel = unlockedHints.length + 1;
    const res = await debloquerNiveauIndice(id, nextLevel);
    setUnlockingHint(false);
    if (res.success && res.hint) {
      setUnlockedHints((prev) => [...prev, res.hint!]);
    }
  };

  const handleReset = async () => {
    if (!confirm("Réinitialiser le sujet aux fichiers de départ ? Votre code local sera effacé."))
      return;
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
    setEvaluationSummary(null);
    setUnlockedHints([]);
  };

  // Raccourci clavier global Ctrl+Entrée / Cmd+Entrée pour lancer l'évaluation (Item 5)
  const handleVerifyRef = useRef(handleVerify);
  handleVerifyRef.current = handleVerify;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!verifying && !isExamExpired) {
          handleVerifyRef.current();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [verifying, isExamExpired]);

  const currentFile: WorkspaceFile = files[activeFileName] ??
    files["index.html"] ?? {
      name: "index.html",
      type: "text",
      content: "",
      language: "html",
    };
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
          <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-none">
            {ex.title}
          </span>
          <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] text-primary hidden md:inline">
            SW_{id}
          </span>
          {isExamMode && (
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-500">
              <Lock className="h-3 w-3" />
              <span>Mode Examen - Assistance Neutralisée</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isExamMode && countdown && (
            <div
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-mono ${
                countdown.isExpired
                  ? "border-rose-500/40 bg-rose-500/15 text-rose-500 font-bold animate-pulse"
                  : countdown.isCritical
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-500 font-bold"
                    : "border-border bg-background/50 text-foreground"
              }`}
              title="Temps d'épreuve officiel synchronisé avec l'horloge serveur (PRD F-50, T-06)"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{countdown.isExpired ? "00:00 (Échéance échue)" : countdown.formatted}</span>
            </div>
          )}

          <ProgressionModal
            triggerButton={
              <button
                className="flex items-center gap-1.5 rounded border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary hover:bg-primary/20 transition-colors cursor-pointer text-xs font-mono"
                title="Consulter mon bilan de compétences et badges"
              >
                <TrendingUp className="h-3 w-3" />
                <span className="hidden md:inline">Bilan Compétences</span>
              </button>
            }
          />

          {!isExamMode && (
            <button
              onClick={() => setShowCourseModal(true)}
              className="flex items-center gap-1.5 rounded border border-border/80 bg-background/80 hover:bg-accent/40 px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer text-foreground"
              title="Consulter le support de cours officiel et insérer des extraits de code"
            >
              <BookOpen className="h-3 w-3 text-primary" />
              <span className="hidden sm:inline">Mémento STI</span>
            </button>
          )}

          {!isExamMode && (
            <button
              onClick={() => setSidebarTab("tuteur")}
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                sidebarTab === "tuteur"
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
              }`}
              title="Consulter le tuteur pédagogique d'aide contextuelle"
            >
              <Bot className="h-3 w-3" />
              <span className="hidden sm:inline">Tuteur STI</span>
            </button>
          )}

          <AuthModal />
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
              {evaluationSummary && (
                <span className="ml-1 px-1 rounded-full bg-primary/20 text-[10px] text-primary">
                  {evaluationSummary.note20}/20
                </span>
              )}
            </button>
            {!isExamMode && (
              <button
                onClick={() => setSidebarTab("tuteur")}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 uppercase tracking-wider text-[11px] transition-colors ${
                  sidebarTab === "tuteur"
                    ? "border-b-2 border-primary text-foreground font-semibold bg-background/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Dialogue socratique & questionnement guidé"
              >
                <Bot className="h-3.5 w-3.5 text-primary" />
                <span>Tuteur</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto min-h-0">
            {sidebarTab === "enonce" && (
              <div className="p-4 text-sm space-y-4">
                <div>
                  <div className="text-[11px] font-mono uppercase text-primary tracking-wider">
                    {ex.competence}
                  </div>
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
                  <div className="mt-2.5">
                    <SubjectCompetencesPill
                      exerciseId={id}
                      criteria={ex.criteria.map((c) => ({ id: c.id, label: c.label }))}
                    />
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                    Instructions
                  </h3>
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
                      <span>Indices progressifs (3 niveaux)</span>
                    </h3>
                    {!isExamMode && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {unlockedHints.length}/{ex.hints.length} débloqué(s)
                      </span>
                    )}
                  </div>

                  {isExamMode ? (
                    <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
                      <div className="flex items-center gap-1.5 font-semibold mb-1">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Assistance neutralisée</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Conformément au règlement du Bac STI (PRD F-48, F-56, T-06), les indices,
                        corrections et solutions sont strictement inaccessibles pendant l'examen.
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
              <EvaluationResultsPane
                summary={evaluationSummary}
                onVerify={handleVerify}
                verifying={verifying}
                sujetId={id}
                sujetTitle={ex.title}
                examMode={ex.examMode}
              />
            )}

            {!isExamMode && sidebarTab === "tuteur" && (
              <PedagogicalTutorPane
                context={{
                  sujetId: id,
                  sujetTitre: ex.title,
                  competence: ex.competence,
                  activeFile: activeFileName,
                  fileContent: files[activeFileName]?.content,
                  activeCriteria: ex.criteria.map((c) => {
                    const evalRes = evaluationSummary?.results.find((r) => r.id === c.id);
                    return {
                      id: c.id,
                      code: c.id.toUpperCase(),
                      label: c.label,
                      ok: evalRes?.passed,
                      message: evalRes?.message,
                    };
                  }),
                  isExamMode: Boolean(ex.examMode),
                }}
              />
            )}
          </div>
        </aside>

        {/* Panneau Central : Éditeur Monaco + Onglets VS Code + Actions (Item 5) */}
        <section className="flex min-h-0 flex-col bg-editor">
          {/* Barre d'onglets de fichiers et actions d'évaluation */}
          <div className="flex items-center justify-between border-b bg-panel text-xs font-mono shrink-0 select-none px-1 overflow-x-auto">
            {/* Onglets des fichiers */}
            <div className="flex items-center min-w-0">
              {Object.keys(files).map((fileName) => {
                const isActive = activeFileName === fileName;
                return (
                  <button
                    key={fileName}
                    onClick={() => setActiveFileName(fileName)}
                    className={`flex items-center gap-2 border-r px-3.5 py-2 transition-colors border-t-2 shrink-0 cursor-pointer ${
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
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        title="Modifications locales enregistrées dans le tampon IndexedDB"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Actions de l'éditeur : Réinitialiser & Vérifier mon code (Item 5) */}
            <div className="flex items-center gap-2 px-2 py-1 shrink-0">
              <button
                onClick={handleReset}
                disabled={isExamExpired}
                className="flex items-center gap-1.5 rounded border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Réinitialiser le fichier à l'état de départ"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </button>

              <button
                onClick={handleVerify}
                disabled={verifying || isExamExpired}
                className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Vérifier mon code (Ctrl + Entrée)"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>{verifying ? "Vérification..." : "Vérifier mon code"}</span>
                <kbd className="hidden sm:inline-block rounded bg-emerald-700/60 px-1 py-0.2 text-[9px] font-mono text-emerald-100 border border-emerald-500/40">
                  Ctrl ↵
                </kbd>
              </button>
            </div>
          </div>

          {/* Bannière de verrouillage en cas d'échéance d'examen (PRD F-50, T-06) */}
          {isExamExpired && (
            <div className="bg-rose-500/15 border-b border-rose-500/30 px-3 py-1.5 text-xs text-rose-500 font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" />
                <span>
                  Temps réglementaire d'examen écoulé : éditeur scellé en lecture seule (T-06).
                </span>
              </div>
            </div>
          )}

          {/* Éditeur de code Monaco ou Visualiseur d'asset */}
          <div className="flex-1 min-h-0 relative">
            {currentFile.type === "asset" ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
                <img
                  src={currentFile.content}
                  alt={currentFile.name}
                  className="max-h-64 max-w-full rounded border bg-card shadow-sm object-contain"
                />
                <span className="mt-3 font-mono text-xs text-foreground font-medium">
                  {currentFile.name}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {currentFile.size
                    ? `${Math.round(currentFile.size / 1024)} Ko`
                    : "Ressource locale"}
                </span>
              </div>
            ) : (
              <MonacoEditorPane
                value={currentFile.content}
                onChange={(newContent) => updateFileContent(activeFileName, newContent)}
                language={editorLanguage}
                theme="vs-dark"
                readOnly={isExamExpired}
                onSave={triggerManualSync}
                onVerify={handleVerify}
                onCursorChange={(line, col) => setCursorPos({ line, col })}
              />
            )}
          </div>
        </section>

        {/* Panneau Droit : Aperçu Bac à Sable Sécurisé + Base SQL + Console PHP */}
        <section className="flex min-h-0 flex-col bg-background">
          {(hasSql || hasPhp) && (
            <div className="flex border-b bg-panel text-xs font-mono shrink-0 select-none">
              <button
                onClick={() => setRightPanelTab("preview")}
                className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                  rightPanelTab === "preview"
                    ? "border-b-primary font-semibold text-foreground bg-background/50"
                    : "border-b-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Aperçu Web
              </button>
              {hasSql && (
                <button
                  onClick={() => setRightPanelTab("sql")}
                  className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                    rightPanelTab === "sql"
                      ? "border-b-primary font-semibold text-foreground bg-background/50"
                      : "border-b-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Base de Données (MySQLi)
                </button>
              )}
              {hasPhp && (
                <button
                  onClick={() => setRightPanelTab("php")}
                  className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                    rightPanelTab === "php"
                      ? "border-b-primary font-semibold text-foreground bg-background/50"
                      : "border-b-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Console PHP 8.2
                </button>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
            {rightPanelTab === "preview" && <PreviewSandbox files={files} />}
            {rightPanelTab === "sql" && (
              <DatabasePanel
                initialSql={files["db/init.sql"]?.content || files["schema.sql"]?.content || ""}
                projectFiles={Object.fromEntries(
                  Object.entries(files).map(([k, v]) => [k, v.content]),
                )}
              />
            )}
            {rightPanelTab === "php" && (
              <PhpRunnerPanel files={files} activeFileName={activeFileName} />
            )}
          </div>
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
      <ConflictModal open={Boolean(conflict)} conflict={conflict} onResolve={resolveConflict} />

      {/* Support de Cours Interactif & Mémento Bac STI */}
      <CourseModal
        open={showCourseModal}
        onOpenChange={setShowCourseModal}
        onInsertCode={handleInsertCourseCode}
        activeFileName={activeFileName}
      />
    </div>
  );
}
