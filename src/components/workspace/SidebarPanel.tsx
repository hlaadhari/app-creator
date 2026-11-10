import { Bot, BookOpen, CheckCircle2, FolderTree } from "lucide-react";
import type { Exercise } from "@/lib/exercises";
import type { WorkspaceState } from "@/hooks/useWorkspaceState";
import { EvaluationResultsPane } from "@/components/workspace/EvaluationResultsPane";
import { PedagogicalTutorPane } from "@/components/workspace/PedagogicalTutorPane";
import { SidebarTabButton } from "@/components/workspace/SidebarTabButton";
import { SubjectTab } from "@/components/workspace/SubjectTab";
import { WorkspaceFileTree } from "@/components/workspace/WorkspaceFileTree";

/** Panneau latéral gauche : énoncé, fichiers, résultats et tuteur. */
export function SidebarPanel({
  ex,
  ws,
  hidden = false,
}: {
  ex: Exercise;
  ws: WorkspaceState;
  hidden?: boolean;
}) {
  const id = ex.id;
  // Normalisation du dossier : Travail_Eleve/SW_<id> (F-16)
  const folderName = `Travail_Eleve/SW_${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const {
    sidebarTab,
    setSidebarTab,
    evaluationSummary,
    evaluationError,
    isExamMode,
    files,
    activeFileName,
    setActiveFileName,
    addNewFile,
    removeFile,
    handleVerify,
    verifying,
    examVersionId,
    examProjetId,
    isExamExpired,
    examCadre,
    restartExam: handleRestartExam,
    restartingExam,
  } = ws;
  return (
    <aside className={`${hidden ? "hidden" : "flex"} min-h-0 flex-1 flex-col bg-panel`}>
      <div className="flex items-stretch border-b text-xs font-mono bg-panel/80 shrink-0">
        <SidebarTabButton
          active={sidebarTab === "enonce"}
          onClick={() => setSidebarTab("enonce")}
          ariaLabel="Afficher l'énoncé du sujet"
          label="Sujet"
          icon={<BookOpen className="h-3.5 w-3.5" />}
        />
        <SidebarTabButton
          active={sidebarTab === "fichiers"}
          onClick={() => setSidebarTab("fichiers")}
          ariaLabel="Afficher l'arborescence des fichiers"
          label="Fichiers"
          icon={<FolderTree className="h-3.5 w-3.5" />}
        />
        <SidebarTabButton
          active={sidebarTab === "resultats"}
          onClick={() => setSidebarTab("resultats")}
          ariaLabel="Afficher les résultats de vérification"
          label="Résultats"
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          badge={
            evaluationSummary && evaluationSummary.results.some((r) => r.automatique !== false) ? (
              <span className="ml-1 px-1 rounded-full bg-primary/20 text-[10px] text-primary">
                {evaluationSummary.note20}/20
              </span>
            ) : null
          }
        />
        {!isExamMode && (
          <button
            type="button"
            onClick={() => setSidebarTab("tuteur")}
            aria-label="Afficher le tuteur pédagogique d'aide contextuelle"
            aria-pressed={sidebarTab === "tuteur"}
            title="Tuteur STI : dialogue socratique et questionnement guidé"
            className={`flex shrink-0 items-center gap-1.5 border-l px-3 transition-colors cursor-pointer ${
              sidebarTab === "tuteur"
                ? "border-b-2 border-b-primary bg-primary/15 text-primary font-semibold"
                : "text-primary hover:bg-primary/10"
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span className="sr-only">Tuteur</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        {sidebarTab === "enonce" && <SubjectTab ex={ex} ws={ws} />}

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

        {sidebarTab === "resultats" && evaluationError && (
          <div
            role="alert"
            className="m-3 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 space-y-2"
          >
            <p>{evaluationError}</p>
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="rounded border border-rose-500/40 px-2.5 py-1 font-semibold hover:bg-rose-500/15 disabled:opacity-50 cursor-pointer"
            >
              Relancer l'évaluation
            </button>
          </div>
        )}

        {sidebarTab === "resultats" && (
          <EvaluationResultsPane
            summary={evaluationSummary}
            onVerify={handleVerify}
            verifying={verifying}
            sujetId={id}
            sujetTitle={ex.title}
            sujetVersionId={examVersionId}
            projetId={examProjetId}
            examMode={ex.examMode}
            examLocked={isExamExpired}
            examCadre={examCadre}
            onRestartExam={handleRestartExam}
            restartingExam={restartingExam}
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
  );
}
