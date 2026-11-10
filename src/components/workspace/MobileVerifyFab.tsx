import { Play } from "lucide-react";
import type { WorkspaceState } from "@/hooks/useWorkspaceState";

/** Bouton flottant « Vérifier mon code » du panneau Code sur mobile (#243). */
export function MobileVerifyFab({ ws }: { ws: WorkspaceState }) {
  const { handleVerify, verifying, isExamExpired, examCadre } = ws;
  return (
    <button
      type="button"
      onClick={handleVerify}
      disabled={verifying || isExamExpired}
      aria-label="Vérifier mon code"
      title={
        isExamExpired
          ? examCadre === "officiel"
            ? "Vérification verrouillée : l'échéance serveur de l'examen officiel est dépassée"
            : "Vérification en pause : relancez le chronomètre d'entraînement pour vérifier votre code"
          : "Vérifier mon code"
      }
      className="absolute bottom-4 right-4 z-10 flex h-12 items-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-emerald-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Play className="h-4 w-4 fill-current" />
      <span>{verifying ? "Vérification..." : "Vérifier"}</span>
    </button>
  );
}
