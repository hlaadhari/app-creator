import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WrittenExamEnvironment } from "@/components/exam/written/WrittenExamEnvironment";
import { sampleWrittenExam } from "@/lib/content/written-subjects";
import { DELAI_BROUILLON_MS, GIGUE_BROUILLON_MS } from "@/lib/exam/written-exam-sync";
import * as writtenExamService from "@/lib/exam/written-exam-service";

const maintenant = () => new Date().toISOString();

const etatCopie = (overrides: Partial<writtenExamService.WrittenExamCopyState> = {}) =>
  ({
    copieId: "copie-1",
    examId: sampleWrittenExam.id,
    statut: "en_cours",
    motifCloture: null,
    startedAt: maintenant(),
    echeanceServeur: new Date(Date.now() + 3_600_000).toISOString(),
    submittedAt: null,
    serverNow: maintenant(),
    reponses: {},
    scoreQcm: null,
    maxQcm: 4,
    scoreOuvert: null,
    maxOuvert: 16,
    noteFinale: null,
    baremeTotal: 20,
    evaluationDetail: null,
    notesEnseignant: {},
    commentaireEnseignant: null,
    hashSha256: null,
    isLocked: false,
    persistedOnServer: true,
    ...overrides,
  }) as writtenExamService.WrittenExamCopyState;

describe("Épreuve écrite : brouillon différé (#263)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(writtenExamService, "demarrerOuRecupererCopieExamenEcrit").mockResolvedValue(
      etatCopie(),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("n'envoie pas le brouillon à chaque modification mais une fois, avec les dernières réponses", async () => {
    const brouillon = vi
      .spyOn(writtenExamService, "sauvegarderBrouillonExamenEcrit")
      .mockResolvedValue({ success: true, isLocked: false });
    render(<WrittenExamEnvironment manifest={sampleWrittenExam} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Trois modifications rapprochées sur les options d'un même QCM.
    const options = screen.getAllByRole("radio");
    fireEvent.click(options[0]!);
    fireEvent.click(options[1]!);
    fireEvent.click(options[2]!);
    expect(brouillon).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAI_BROUILLON_MS + GIGUE_BROUILLON_MS);
    });

    expect(brouillon).toHaveBeenCalledTimes(1);
    const reponses = brouillon.mock.calls[0]![1] as Record<string, unknown>;
    expect(Object.keys(reponses).length).toBeGreaterThanOrEqual(1);
  });

  it("envoie tout de suite le brouillon quand l'onglet passe en arrière-plan", async () => {
    const brouillon = vi
      .spyOn(writtenExamService, "sauvegarderBrouillonExamenEcrit")
      .mockResolvedValue({ success: true, isLocked: false });
    render(<WrittenExamEnvironment manifest={sampleWrittenExam} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.click(screen.getAllByRole("radio")[0]!);
    expect(brouillon).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });

    expect(brouillon).toHaveBeenCalledTimes(1);
  });
});
