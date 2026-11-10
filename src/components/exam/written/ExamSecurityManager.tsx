import React, { useEffect, useState } from "react";
import { Lock, ShieldAlert, CheckCircle2, Send, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExamCountdownBanner } from "@/components/exam/ExamCountdownBanner";

export interface ExamSecurityManagerProps {
  examTitle: string;
  durationMinutes: number;
  echeance: string | Date;
  isLocked: boolean;
  motifCloture?: "remise_volontaire" | "temps_ecoule" | null;
  onAutoSubmit: () => void;
  onSubmitManual: () => void;
  totalQuestions: number;
  answeredQuestions: number;
  isSubmitting?: boolean;
}

export const ExamSecurityManager: React.FC<ExamSecurityManagerProps> = ({
  examTitle,
  durationMinutes,
  echeance,
  isLocked,
  motifCloture = null,
  onAutoSubmit,
  onSubmitManual,
  totalQuestions,
  answeredQuestions,
  isSubmitting = false,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Avertissement anti-fermeture / changement d'onglet accidentel
  useEffect(() => {
    if (isLocked) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        "Attention : une épreuve officielle est en cours. Vos réponses risquent d'être perdues.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isLocked]);

  const percentageAnswered =
    totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Bannière de compte à rebours asservie à l'horloge serveur */}
      <ExamCountdownBanner
        echeance={echeance}
        titre={examTitle}
        isLocked={isLocked}
        motifCloture={motifCloture}
        onExpired={onAutoSubmit}
      />

      {/* Barre de contrôle, avancement et neutralisation */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Mode Examen Strict (Tuteur IA & Corrigés Neutralisés)
          </Badge>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span>Durée officielle : {durationMinutes} min</span>
            <span>•</span>
            <span className="font-medium text-foreground">
              {answeredQuestions} / {totalQuestions} questions répondues ({percentageAnswered}%)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLocked ? (
            motifCloture === "remise_volontaire" ? (
              <Badge
                variant="secondary"
                className="flex items-center gap-1.5 text-xs border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Copie Scellée (Remise volontaire)
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1.5 text-xs">
                <Lock className="h-3.5 w-3.5" /> Épreuve Clôturée & Verrouillée
              </Badge>
            )
          ) : (
            <Button
              size="sm"
              onClick={() => setShowConfirmModal(true)}
              disabled={isSubmitting}
              className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground font-medium shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              Remettre ma Copie
            </Button>
          )}
        </div>
      </div>

      {/* Modal de confirmation de remise */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center gap-2.5 text-amber-400 mb-3">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-semibold text-foreground">
                Confirmer la remise définitive
              </h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Vous avez complété <strong className="text-foreground">{answeredQuestions}</strong>{" "}
              sur <strong className="text-foreground">{totalQuestions}</strong> questions.
              {answeredQuestions < totalQuestions && (
                <span className="block mt-1 text-destructive font-medium">
                  Attention : certaines questions sont encore sans réponse !
                </span>
              )}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                className="text-xs"
              >
                Continuer l'Épreuve
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowConfirmModal(false);
                  onSubmitManual();
                }}
                disabled={isSubmitting}
                className="text-xs bg-primary"
              >
                Confirmer la Remise
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
