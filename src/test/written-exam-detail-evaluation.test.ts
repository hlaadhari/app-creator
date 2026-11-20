import { describe, expect, it, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import {
  demarrerOuRecupererCopieExamenEcrit,
  listerCopiesExamenEcritEnseignant,
  remettreCopieExamenEcrit,
} from "@/lib/exam/written-exam-service";

describe("Lot 0 (#292) : lecture de la clé SQL detail_evaluation renvoyée par les RPC 0033", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleDetailEvaluation = {
    scoreQcm: 2.5,
    maxQcm: 2.5,
    scoreOuvert: 10,
    maxOuvert: 17.5,
    totalScore: 12.5,
    baremeTotal: 20,
    statutNotation: "corrigee" as const,
    sections: [
      {
        sectionId: "ex1-qcm",
        title: "Exercice N° 1",
        type: "qcm",
        pointsEarned: 2.5,
        pointsMax: 2.5,
        items: [
          {
            questionId: "EX1-Q1",
            passed: true,
            pointsEarned: 0.5,
            pointsMax: 0.5,
            feedback: "Bonne réponse.",
            studentAnswer: "opt-num",
            expectedSummary: "mysqli_num_rows()",
            statutCorrection: "auto_qcm" as const,
          },
        ],
      },
    ],
  };

  it("mappe detail_evaluation lors de demarrerOuRecupererCopieExamenEcrit et remettreCopieExamenEcrit", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        copie_id: "copie-292",
        exam_id: "exam-bac2022-blanc-ecrit",
        statut: "remise",
        motif_cloture: "remise_volontaire",
        started_at: "2026-11-20T08:00:00Z",
        echeance_serveur: "2026-11-20T11:00:00Z",
        submitted_at: "2026-11-20T09:30:00Z",
        server_now: "2026-11-20T09:31:00Z",
        reponses: { "EX1-Q1": "opt-num" },
        score_qcm: 2.5,
        max_qcm: 2.5,
        score_ouvert: 10,
        max_ouvert: 17.5,
        note_finale: 12.5,
        bareme_total: 20,
        notes_enseignant: {},
        detail_evaluation: sampleDetailEvaluation,
        is_locked: true,
      },
      error: null,
    });

    const state = await demarrerOuRecupererCopieExamenEcrit("exam-bac2022-blanc-ecrit", 180);
    expect(state.evaluationDetail).not.toBeNull();
    expect(state.evaluationDetail?.scoreQcm).toBe(2.5);
    expect(state.evaluationDetail?.sections).toHaveLength(1);
    expect(state.evaluationDetail?.sections[0]?.items[0]?.questionId).toBe("EX1-Q1");

    rpcMock.mockResolvedValueOnce({
      data: {
        copie_id: "copie-292",
        exam_id: "exam-bac2022-blanc-ecrit",
        statut: "remise",
        motif_cloture: "remise_volontaire",
        started_at: "2026-11-20T08:00:00Z",
        echeance_serveur: "2026-11-20T11:00:00Z",
        submitted_at: "2026-11-20T09:30:00Z",
        server_now: "2026-11-20T09:31:00Z",
        reponses: { "EX1-Q1": "opt-num" },
        note_finale: 12.5,
        detail_evaluation: sampleDetailEvaluation,
        is_locked: true,
      },
      error: null,
    });

    const submitted = await remettreCopieExamenEcrit("exam-bac2022-blanc-ecrit", {
      "EX1-Q1": "opt-num",
    });
    expect(submitted.noteFinale).toBe(12.5);
    expect(submitted.evaluationDetail?.sections[0]?.items[0]?.studentAnswer).toBe("opt-num");
  });

  it("mappe detail_evaluation dans listerCopiesExamenEcritEnseignant", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          copie_id: "copie-292",
          eleve_id: "eleve-1",
          eleve_nom: "Ben Salah",
          eleve_prenom: "Amine",
          exam_id: "exam-bac2022-blanc-ecrit",
          exam_title: "Bac Blanc 2022",
          statut: "corrigee",
          motif_cloture: "remise_volontaire",
          started_at: "2026-11-20T08:00:00Z",
          echeance_serveur: "2026-11-20T11:00:00Z",
          submitted_at: "2026-11-20T09:30:00Z",
          reponses: { "EX1-Q1": "opt-num" },
          score_qcm: 2.5,
          max_qcm: 2.5,
          score_ouvert: 10,
          max_ouvert: 17.5,
          note_finale: 12.5,
          bareme_total: 20,
          detail_evaluation: sampleDetailEvaluation,
          notes_enseignant: {},
          commentaire_enseignant: "Bon travail",
          hash_sha256: "abc",
          corrected_at: "2026-11-20T10:00:00Z",
        },
      ],
      error: null,
    });

    const copies = await listerCopiesExamenEcritEnseignant();
    expect(copies).toHaveLength(1);
    expect(copies[0]?.evaluationDetail).not.toBeNull();
    expect(copies[0]?.evaluationDetail?.sections[0]?.items[0]?.expectedSummary).toBe(
      "mysqli_num_rows()",
    );
  });
});
