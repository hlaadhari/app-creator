import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  getWrittenExamPublic,
  masquerCorrigeManifestEcrit,
  sampleWrittenExam,
} from "@/lib/content/written-subjects";
import { ExamCountdownBanner } from "@/components/exam/ExamCountdownBanner";
import { WrittenExamEnvironment } from "@/components/exam/written/WrittenExamEnvironment";
import { WrittenExamCopiesTab } from "@/components/teacher/WrittenExamCopiesTab";
import * as writtenExamService from "@/lib/exam/written-exam-service";

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

describe("Épreuve écrite serveur, scellement & correction enseignant (Issue #197)", () => {
  beforeEach(() => {
    localStorage.clear();
    rpcMock.mockReset();
    vi.restoreAllMocks();
  });

  describe("1. Non-exposition des corrigés avant la clôture de l'épreuve (T-01)", () => {
    it("masquerCorrigeManifestEcrit et getWrittenExamPublic expurgent toutes les réponses attendues", () => {
      const publicExam = getWrittenExamPublic("written-bac-demo");
      expect(publicExam).toBeDefined();

      const serialized = JSON.stringify(publicExam);
      // Les bonnes réponses QCM et les patterns/requêtes attendus ne doivent plus figurer dans le manifeste public
      expect(serialized).not.toContain('"correctAnswers":["opt-having"]');
      expect(serialized).not.toContain('"correctAnswers":["opt-pk","opt-fk","opt-check"]');
      expect(serialized).not.toContain("SELECT Nom, Salaire FROM Employe WHERE Salaire >= 1900");
      expect(serialized).not.toContain("UPDATE Employe SET Salaire = 2420");
      expect(serialized).not.toContain("$_POST['matricule']");

      for (const section of publicExam!.sections) {
        if (section.type === "qcm") {
          for (const q of section.questions) {
            if ("correctAnswers" in q) {
              expect(q.correctAnswers).toEqual([]);
            }
            expect(q.explanation).toBeUndefined();
          }
        }
      }

      // Le manifeste serveur de référence reste intact pour les tests unitaires de l'évaluateur
      expect(
        (sampleWrittenExam.sections[0]!.questions[0] as { correctAnswers: string[] })
          .correctAnswers,
      ).toEqual(["opt-having"]);
      expect(
        masquerCorrigeManifestEcrit(sampleWrittenExam).sections[0]!.questions[0],
      ).toMatchObject({
        correctAnswers: [],
      });
    });
  });

  describe("2. Distinction entre remise volontaire et échéance dépassée (#197)", () => {
    it("affiche un message de remise volontaire (et non 'Échéance serveur atteinte') lorsque motifCloture = 'remise_volontaire'", () => {
      render(
        <ExamCountdownBanner
          echeance={new Date(Date.now() + 3600_000).toISOString()}
          titre="Spécimen Bac STI"
          isLocked={true}
          motifCloture="remise_volontaire"
        />,
      );

      expect(
        screen.getByText(
          /Remise volontaire effectuée : votre copie est scellée sur le serveur et transmise pour correction/i,
        ),
      ).toBeInTheDocument();
      expect(screen.getByText(/Copie remise/i)).toBeInTheDocument();
      expect(screen.queryByText(/Échéance serveur atteinte/i)).toBeNull();
    });

    it("affiche le message d'échéance serveur atteinte et '00:00' lorsque motifCloture = 'temps_ecoule'", () => {
      render(
        <ExamCountdownBanner
          echeance={new Date(Date.now() - 10_000).toISOString()}
          titre="Spécimen Bac STI"
          isLocked={true}
          motifCloture="temps_ecoule"
        />,
      );

      expect(
        screen.getByText(/Échéance serveur atteinte : dépôt verrouillé \(T-06\)/i),
      ).toBeInTheDocument();
      expect(screen.getByText("00:00")).toBeInTheDocument();
    });
  });

  describe("3. Persistance serveur et immunité face à localStorage (#197)", () => {
    it("purge localStorage (labo_sti_written_exam_*) et conserve la copie + score QCM serveur même si localStorage est vidé", async () => {
      localStorage.setItem(
        "labo_sti_written_exam_written-bac-demo",
        JSON.stringify({ "qcm-1": "falsified-local-answer" }),
      );

      const now = new Date().toISOString();
      const echeance = new Date(Date.now() + 7200_000).toISOString();

      rpcMock.mockImplementation(async (fnName: string, args?: Record<string, unknown>) => {
        if (fnName === "demarrer_copie_examen_ecrit") {
          return {
            data: {
              copie_id: "copie-srv-1",
              exam_id: "written-bac-demo",
              statut: "en_cours",
              motif_cloture: null,
              started_at: now,
              echeance_serveur: echeance,
              submitted_at: null,
              server_now: now,
              reponses: { "qcm-1": "opt-having" },
              score_qcm: null,
              max_qcm: 4,
              score_ouvert: null,
              max_ouvert: 16,
              note_finale: null,
              bareme_total: 20,
              evaluation_detail: null,
              notes_enseignant: {},
              commentaire_enseignant: null,
              hash_sha256: null,
              is_locked: false,
            },
            error: null,
          };
        }
        if (fnName === "remettre_copie_examen_ecrit") {
          return {
            data: {
              copie_id: "copie-srv-1",
              exam_id: "written-bac-demo",
              statut: "remise",
              motif_cloture: args?.["_motif"] ?? "remise_volontaire",
              started_at: now,
              echeance_serveur: echeance,
              submitted_at: now,
              server_now: now,
              reponses: args?.["_reponses"] ?? { "qcm-1": "opt-having" },
              score_qcm: 2,
              max_qcm: 4,
              score_ouvert: null,
              max_ouvert: 16,
              note_finale: null,
              bareme_total: 20,
              evaluation_detail: {
                examId: "written-bac-demo",
                totalScore: 2,
                baremeTotal: 20,
                percentage: 10,
                passed: false,
                scoreQcm: 2,
                maxQcm: 4,
                scoreOuvert: null,
                maxOuvert: 16,
                attenteCorrectionEnseignant: true,
                sections: [
                  {
                    sectionId: "partie-1-qcm",
                    title: "Partie I : QCM & Concepts Théoriques (4 pts)",
                    type: "qcm",
                    pointsEarned: 2,
                    pointsMax: 4,
                    items: [],
                  },
                  {
                    sectionId: "partie-2-modeling",
                    title: "Partie II : Modélisation Relationnelle (5 pts)",
                    type: "modeling",
                    pointsEarned: 0,
                    pointsMax: 5,
                    items: [],
                  },
                ],
              },
              notes_enseignant: {},
              commentaire_enseignant: null,
              hash_sha256: "abc1234567890defabc1234567890defabc1234567890defabc1234567890def",
              is_locked: true,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      });

      render(<WrittenExamEnvironment manifest={sampleWrittenExam} />);

      // La clé localStorage obsolète a été purgée dès le montage
      await waitFor(() => {
        expect(localStorage.getItem("labo_sti_written_exam_written-bac-demo")).toBeNull();
      });

      // Remettre volontairement la copie
      fireEvent.click(screen.getByRole("button", { name: /Remettre ma Copie/i }));
      fireEvent.click(screen.getByRole("button", { name: /Confirmer la Remise/i }));

      await waitFor(() => {
        expect(screen.getByText(/QCM corrigé par le serveur : 2 \/ 4 pts/i)).toBeInTheDocument();
        expect(
          screen.getByText(/Questions ouvertes \(16 pts\) en attente de correction enseignant/i),
        ).toBeInTheDocument();
      });

      // Vider entièrement localStorage après remise ne modifie ni la copie ni la note affichée
      localStorage.clear();
      expect(screen.getByText(/QCM corrigé par le serveur : 2 \/ 4 pts/i)).toBeInTheDocument();
      expect(rpcMock).toHaveBeenCalledWith(
        "remettre_copie_examen_ecrit",
        expect.objectContaining({
          _exam_id: "written-bac-demo",
          _motif: "remise_volontaire",
        }),
      );
    });
  });

  describe("4. Interface enseignant : consultation et notation des questions ouvertes (#197)", () => {
    it("permet à l'enseignant de consulter une copie remise et de sceller les points des questions ouvertes", async () => {
      const now = new Date().toISOString();
      vi.spyOn(writtenExamService, "listerCopiesExamenEcritEnseignant").mockResolvedValue([
        {
          copieId: "copie-eleve-1",
          eleveId: "eleve-1",
          eleveNom: "Khelifi",
          elevePrenom: "Inès",
          examId: "written-bac-demo",
          examTitle: sampleWrittenExam.title,
          statut: "remise",
          motifCloture: "remise_volontaire",
          startedAt: now,
          echeanceServeur: now,
          submittedAt: now,
          reponses: {
            "qcm-1": "opt-having",
            "mod-1": "Employe (#Matricule, Nom, Prenom, Salaire, #CodeDep)",
          },
          scoreQcm: 4,
          maxQcm: 4,
          scoreOuvert: null,
          maxOuvert: 16,
          noteFinale: null,
          baremeTotal: 20,
          evaluationDetail: null,
          notesEnseignant: {},
          commentaireEnseignant: null,
          hashSha256: "99887766554433221100",
          correctedAt: null,
        },
      ]);

      const noterSpy = vi.spyOn(writtenExamService, "noterCopieExamenEcrit").mockResolvedValue({
        success: true,
        scoreQcm: 4,
        scoreOuvert: 14.5,
        noteFinale: 18.5,
        baremeTotal: 20,
      });

      render(<WrittenExamCopiesTab classId="cls-1" className="4ème SI - Groupe 1" />);

      await waitFor(() => {
        expect(screen.getByText(/Inès Khelifi/i)).toBeInTheDocument();
      });

      // Sélectionner la copie
      fireEvent.click(screen.getByText(/Inès Khelifi/i));

      expect(
        screen.getByText(/Employe \(#Matricule, Nom, Prenom, Salaire, #CodeDep\)/i),
      ).toBeInTheDocument();

      // Attribuer une note à mod-1
      const inputMod1 = screen.getByLabelText("Note pour mod-1");
      fireEvent.change(inputMod1, { target: { value: "2.5" } });

      // Enregistrer la correction
      fireEvent.click(screen.getByRole("button", { name: /Valider et sceller la note finale/i }));

      await waitFor(() => {
        expect(noterSpy).toHaveBeenCalledWith(
          "copie-eleve-1",
          expect.objectContaining({ "mod-1": 2.5 }),
          "",
        );
        expect(
          screen.getByText(/note finale officielle scellée à 18.5 \/ 20/i),
        ).toBeInTheDocument();
      });
    });
  });
});
