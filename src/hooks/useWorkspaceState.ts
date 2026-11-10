import { useEffect, useMemo, useRef, useState } from "react";
import type { Exercise } from "@/lib/exercises";
import { clear } from "@/lib/progress";
import { useBufferSync } from "@/lib/storage/useBufferSync";
import { deleteFromBuffer } from "@/lib/storage/indexeddb";
import { notify } from "@/lib/notify";
import { evaluerCopie } from "@/lib/evaluation/evaluation-par-page";
import { evaluateurFrame } from "@/lib/evaluation/iframe-evaluation";
import { debloquerNiveauIndice, type UnlockedHint } from "@/lib/evaluation/hints-service";
import type { EvaluationSummary } from "@/lib/evaluation/probe-runner";
import { enregistrerNouvelleTentative } from "@/lib/pedagogy/attempts-service";
import { calculerBaremeRepartition } from "@/lib/pedagogy/bareme-repartition";
import type { WorkspaceFile } from "@/components/workspace/types";
import { useExamClock } from "@/hooks/useExamClock";

export type SidebarTab = "enonce" | "fichiers" | "resultats" | "tuteur";
export type RightPanelTab = "preview" | "sql" | "php";
export type EditorLanguage = "html" | "css" | "javascript" | "php" | "sql";

const FICHIER_PAR_DEFAUT = "index.html";

/**
 * État et actions du workspace d'un sujet : tampon IndexedDB + synchronisation,
 * onglets, évaluation formative, indices et chronomètre d'examen.
 */
export function useWorkspaceState(ex: Exercise) {
  const id = ex.id;
  const isExamMode = Boolean(ex.examMode);
  const premierFichier = Object.keys(ex.starter)[0] ?? FICHIER_PAR_DEFAUT;

  // Écriture prioritaire dans IndexedDB (labo_sti_buffer), synchronisation asynchrone
  const buffer = useBufferSync({
    exerciseId: id,
    starterFiles: ex.starter,
    debounceMs: isExamMode ? 2500 : 1000,
  });
  const { files, setFiles, updateFileContent, updateBestScore, syncStatus } = buffer;

  const exam = useExamClock({ exerciseId: id, dureeMinutes: ex.dureeMinutes, isExamMode });
  const { isExamExpired, examCadre, examVersionId, examProjetId } = exam;

  const [activeFileName, setActiveFileName] = useState<string>(premierFichier);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("enonce");
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("preview");
  const [evaluationSummary, setEvaluationSummary] = useState<EvaluationSummary | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [unlockedHints, setUnlockedHints] = useState<UnlockedHint[]>([]);
  const [unlockingHint, setUnlockingHint] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [showCourseDrawer, setShowCourseDrawer] = useState(false);
  const [showSolutionModal, setShowSolutionModal] = useState(false);

  const baremeRepartition = useMemo(
    () => (ex.criteria ? calculerBaremeRepartition(ex.criteria) : null),
    [ex.criteria],
  );

  const accessibilityMessage = useMemo(() => {
    if (evaluationSummary) {
      return `Évaluation terminée. Note formative : ${evaluationSummary.note20} sur 20. ${evaluationSummary.earnedPoints} points obtenus sur ${evaluationSummary.totalPoints}.`;
    }
    if (syncStatus === "synced") return "Code synchronisé et sauvegardé.";
    if (syncStatus === "local") return "Modifications enregistrées dans le tampon local.";
    if (syncStatus === "conflict") return "Attention : Conflit de version détecté.";
    return "";
  }, [evaluationSummary, syncStatus]);

  // Retour d'état de synchronisation : seules les transitions utiles sont notifiées.
  const previousSyncStatus = useRef(syncStatus);
  useEffect(() => {
    const previous = previousSyncStatus.current;
    previousSyncStatus.current = syncStatus;
    if (previous === syncStatus) return;
    if (syncStatus === "offline") {
      notify.info("Hors ligne : votre travail est conservé sur cet appareil.", { id: "sync" });
    } else if (previous === "offline" && syncStatus === "synced") {
      notify.success("Connexion rétablie : travail synchronisé.", { id: "sync" });
    }
  }, [syncStatus]);

  // Neutralisation de l'onglet tuteur en mode examen
  useEffect(() => {
    if (isExamMode && sidebarTab === "tuteur") setSidebarTab("enonce");
  }, [isExamMode, sidebarTab]);

  const hasPhp = useMemo(() => Object.keys(files).some((k) => k.endsWith(".php")), [files]);
  const hasSql = useMemo(
    () => Object.keys(files).some((k) => k.endsWith(".sql") || k === "db/init.sql"),
    [files],
  );

  const handleInsertCourseCode = (snippet: string, targetFile?: string | undefined) => {
    const destFile = targetFile && files[targetFile] ? targetFile : activeFileName;
    if (destFile !== activeFileName) setActiveFileName(destFile);
    const current = files[destFile]?.content || "";
    const updated = current.trim() === "" ? snippet : `${current}\n\n${snippet}`;
    updateFileContent(destFile, updated);
  };

  const handleVerify = async () => {
    if (isExamExpired) return;
    setVerifying(true);
    const startTime = performance.now();

    // Fichiers de l'élève assemblés comme dans les tests de notation (constructeur partagé)
    const fichiersTexte = Object.fromEntries(
      Object.entries(files).map(([nom, f]) => [nom, f.content]),
    );

    setEvaluationError(null);
    try {
      // Moteur unique (issue #127) : chaque critère est évalué sur sa page, dans une frame sandboxée
      const { resultats: r, bilan: sc } = await evaluerCopie(
        ex.criteria,
        fichiersTexte,
        evaluateurFrame(fichiersTexte),
      );

      const duration = Math.round(performance.now() - startTime);
      // Sans critère vérifiable, aucune note n'existe : ni meilleur score ni tentative enregistrée.
      const notable = sc.verifiable > 0;
      if (notable) updateBestScore(sc.note20);

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
          automatique: c.automatique,
          ...(c.cause ? { cause: c.cause } : {}),
          ...(c.hints && c.hints.length > 0 ? { hints: c.hints } : {}),
        })),
        earnedPoints: sc.got,
        totalPoints: sc.total,
        pointsNonVerifiables: sc.nonVerifiable,
        note20: sc.note20,
        totalDurationMs: duration,
        evaluatedAt: Date.now(),
      };

      setEvaluationSummary(summary);
      setSidebarTab("resultats");
      if (notable) {
        notify.success(`Vérification terminée : ${sc.note20}/20`, {
          description: `${sc.got} points sur ${sc.total}`,
          id: "verification",
        });
        enregistrerNouvelleTentative({
          sujetId: id,
          sujetVersionId: examVersionId,
          projetId: examProjetId,
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
      } else {
        notify.info("Vérification terminée : aucun critère noté automatiquement.", {
          id: "verification",
        });
      }
    } catch (err) {
      console.error("Erreur lors de l'évaluation formative :", err);
      const watchdog = err instanceof Error && err.message.includes("Watchdog");
      setEvaluationError(
        watchdog
          ? "L'évaluation a dépassé 3 secondes et a été interrompue (boucle infinie ou page trop lourde ?). Vérifiez votre code puis relancez."
          : "L'évaluation a échoué. Vérifiez votre code puis relancez.",
      );
      notify.error(watchdog ? "Évaluation interrompue (plus de 3 s)" : "L'évaluation a échoué", {
        description: "Vérifiez votre code puis relancez.",
        id: "verification",
      });
      setSidebarTab("resultats");
    } finally {
      setVerifying(false);
    }
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
    if (isExamExpired && examCadre === "officiel") return;
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
    setActiveFileName(premierFichier);
    setEvaluationSummary(null);
    setUnlockedHints([]);
    notify.info("Sujet réinitialisé aux fichiers de départ");
    await exam.relancerPourReinitialisation();
  };

  // Raccourci clavier global Ctrl+Entrée / Cmd+Entrée pour lancer l'évaluation
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
    files[FICHIER_PAR_DEFAUT] ?? {
      name: FICHIER_PAR_DEFAUT,
      type: "text",
      content: "",
      language: "html",
    };

  // Détection du langage pour Monaco
  const editorLanguage = useMemo<EditorLanguage>(() => {
    if (activeFileName.endsWith(".html")) return "html";
    if (activeFileName.endsWith(".css")) return "css";
    if (activeFileName.endsWith(".js")) return "javascript";
    if (activeFileName.endsWith(".php")) return "php";
    if (activeFileName.endsWith(".sql")) return "sql";
    return "html";
  }, [activeFileName]);

  return {
    ...buffer,
    ...exam,
    isExamMode,
    baremeRepartition,
    accessibilityMessage,
    activeFileName,
    setActiveFileName,
    sidebarTab,
    setSidebarTab,
    rightPanelTab,
    setRightPanelTab,
    evaluationSummary,
    evaluationError,
    verifying,
    unlockedHints,
    unlockingHint,
    cursorPos,
    setCursorPos,
    showCourseDrawer,
    setShowCourseDrawer,
    showSolutionModal,
    setShowSolutionModal,
    hasPhp,
    hasSql,
    currentFile,
    editorLanguage,
    handleInsertCourseCode,
    handleVerify,
    handleUnlockHint,
    handleReset,
  };
}

export type WorkspaceState = ReturnType<typeof useWorkspaceState>;
