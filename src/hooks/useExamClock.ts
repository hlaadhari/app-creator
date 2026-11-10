import { useCallback, useEffect, useState } from "react";
import {
  demarrerOuRecupererExamenPratique,
  lireCacheChronometreExamen,
  relancerEntrainementExamen,
  type CadreExamenPratique,
} from "@/lib/exam/exam-service";
import { calculerCompteARebours, getTempsServeurSynchronise } from "@/lib/exam/server-clock";

interface EtatExamen {
  echeanceServeur: string;
  projetId?: string | null | undefined;
  versionId?: string | null | undefined;
  cadre?: CadreExamenPratique | undefined;
}

interface UseExamClockOptions {
  exerciseId: string;
  dureeMinutes: number | undefined;
  isExamMode: boolean;
}

/**
 * Compte à rebours officiel d'examen synchronisé sur l'horloge et l'échéance serveur
 * (#198, PRD F-48, F-50, T-06). Le localStorage n'est lu QU'APRÈS le montage : le lire
 * pendant le rendu produit un écart serveur/client (erreur React #418, #196).
 * La base de données fait foi.
 */
export function useExamClock({ exerciseId, dureeMinutes, isExamMode }: UseExamClockOptions) {
  const [examDeadline, setExamDeadline] = useState<string | null>(null);
  const [examProjetId, setExamProjetId] = useState<string | null>(null);
  const [examVersionId, setExamVersionId] = useState<string | null>(null);
  const [examCadre, setExamCadre] = useState<CadreExamenPratique>("entrainement");
  const [restartingExam, setRestartingExam] = useState(false);
  const [countdown, setCountdown] = useState<ReturnType<typeof calculerCompteARebours> | null>(
    null,
  );

  const appliquerEtat = useCallback((state: EtatExamen) => {
    setExamDeadline(state.echeanceServeur);
    setExamProjetId(state.projetId ?? null);
    setExamVersionId(state.versionId ?? null);
    setExamCadre(state.cadre ?? "entrainement");
  }, []);

  useEffect(() => {
    if (!isExamMode) {
      setExamDeadline(null);
      setCountdown(null);
      return;
    }

    let cancelled = false;
    const cached = lireCacheChronometreExamen(exerciseId);
    if (cached) {
      setExamDeadline(cached.echeanceServeur);
      setExamProjetId(cached.projetId ?? null);
      setExamVersionId(cached.versionId ?? null);
      setExamCadre(cached.cadre ?? "entrainement");
    }

    void demarrerOuRecupererExamenPratique(exerciseId, dureeMinutes || 90).then((res) => {
      if (cancelled) return;
      appliquerEtat(res.state);
      setCountdown(calculerCompteARebours(res.state.echeanceServeur, getTempsServeurSynchronise()));
    });

    return () => {
      cancelled = true;
    };
  }, [exerciseId, isExamMode, dureeMinutes, appliquerEtat]);

  useEffect(() => {
    if (!isExamMode || !examDeadline) return;

    const updateTimer = () => {
      setCountdown(calculerCompteARebours(examDeadline, getTempsServeurSynchronise()));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isExamMode, examDeadline]);

  const relancer = useCallback(
    async (reinitialiser: boolean) => {
      const res = await relancerEntrainementExamen(exerciseId, dureeMinutes || 90, reinitialiser);
      if (res.success && res.state) {
        appliquerEtat(res.state);
        setCountdown(
          calculerCompteARebours(res.state.echeanceServeur, getTempsServeurSynchronise()),
        );
      }
    },
    [exerciseId, dureeMinutes, appliquerEtat],
  );

  /** Nouvelle tentative d'entraînement (jamais en examen officiel). */
  const restartExam = useCallback(async () => {
    if (!isExamMode || examCadre === "officiel") return;
    setRestartingExam(true);
    try {
      await relancer(false);
    } finally {
      setRestartingExam(false);
    }
  }, [isExamMode, examCadre, relancer]);

  /** Relance du chrono lors d'une réinitialisation du sujet (entraînement uniquement). */
  const relancerPourReinitialisation = useCallback(async () => {
    if (isExamMode && examCadre !== "officiel") await relancer(true);
  }, [isExamMode, examCadre, relancer]);

  const isExamExpired = isExamMode && Boolean(countdown?.isExpired);

  return {
    countdown,
    examProjetId,
    examVersionId,
    examCadre,
    restartingExam,
    isExamExpired,
    restartExam,
    relancerPourReinitialisation,
  };
}
