import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WrittenExamEnvironment } from "@/components/exam/written/WrittenExamEnvironment";
import { WrittenQCM } from "@/components/exam/written/WrittenQCM";
import { RelationalModelBox } from "@/components/exam/written/RelationalModelBox";
import { SQLExecutorConsole } from "@/components/exam/written/SQLExecutorConsole";
import { CodeAnalysisBox } from "@/components/exam/written/CodeAnalysisBox";
import { ExamSecurityManager } from "@/components/exam/written/ExamSecurityManager";
import {
  type WrittenQcmQuestion,
  type WrittenModelingQuestion,
  type WrittenSqlQuestion,
  type WrittenCodeAnalysisQuestion,
} from "@/lib/evaluator/written/written-exam-evaluator";
import { sampleWrittenExam } from "@/lib/content/written-subjects";
import * as writtenExamService from "@/lib/exam/written-exam-service";

describe("Written Exam Environment UI & Security (Issue #165 & #163)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("1. Orchestration & Rendu dynamique des sections", () => {
    it("affiche le titre de l'épreuve, les badges officiels et les onglets de sections", () => {
      render(<WrittenExamEnvironment manifest={sampleWrittenExam} />);

      expect(screen.getAllByText(sampleWrittenExam.title).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Barème : 20 points/i)).toBeInTheDocument();
      expect(
        screen.getAllByText("Partie I : QCM & Concepts Théoriques (4 pts)").length,
      ).toBeGreaterThanOrEqual(1);

      // Vérifier les onglets des sections
      expect(screen.getByTestId("tab-partie-1-qcm")).toBeInTheDocument();
      expect(screen.getByTestId("tab-partie-2-modeling")).toBeInTheDocument();
      expect(screen.getByTestId("tab-partie-3-sql")).toBeInTheDocument();
      expect(screen.getByTestId("tab-partie-4-code")).toBeInTheDocument();
    });

    it("permet de basculer entre les sections en cliquant sur les onglets", () => {
      render(<WrittenExamEnvironment manifest={sampleWrittenExam} />);

      // Au départ sur Partie I (QCM)
      expect(
        screen.getByText(/Quelle clause SQL permet de filtrer les résultats après regroupement/i),
      ).toBeInTheDocument();

      // Clic sur l'onglet Modélisation
      fireEvent.click(screen.getByTestId("tab-partie-2-modeling"));
      expect(
        screen.getByText(/Donnez la représentation textuelle normalisée de la relation Employe/i),
      ).toBeInTheDocument();

      // Clic sur l'onglet SQL
      fireEvent.click(screen.getByTestId("tab-partie-3-sql"));
      expect(
        screen.getByText(/Rédigez la requête SQL affichant le Nom et le Salaire/i),
      ).toBeInTheDocument();

      // Clic sur l'onglet Analyse de Code
      fireEvent.click(screen.getByTestId("tab-partie-4-code"));
      expect(
        screen.getByText(/Identifiez l'erreur dans la condition JavaScript suivante/i),
      ).toBeInTheDocument();
    });
  });

  describe("2. Blocs modulaires d'évaluation", () => {
    it("WrittenQCM met à jour les réponses pour choix unique et multiple", () => {
      const onAnswerChange = vi.fn();
      render(
        <WrittenQCM
          questions={sampleWrittenExam.sections[0]!.questions as WrittenQcmQuestion[]}
          answers={{ "qcm-2": ["opt-pk"] }}
          onAnswerChange={onAnswerChange}
        />,
      );

      // Clic sur choix unique
      const optHaving = screen.getByTestId("qcm-option-qcm-1-opt-having");
      fireEvent.click(optHaving);
      expect(onAnswerChange).toHaveBeenCalledWith("qcm-1", "opt-having");

      // Clic pour ajouter un choix multiple
      const optFk = screen.getByTestId("qcm-option-qcm-2-opt-fk");
      fireEvent.click(optFk);
      expect(onAnswerChange).toHaveBeenCalledWith("qcm-2", ["opt-pk", "opt-fk"]);
    });

    it("RelationalModelBox permet de saisir du texte et d'insérer les tokens de clé (#)", () => {
      const onAnswerChange = vi.fn();
      render(
        <RelationalModelBox
          questions={sampleWrittenExam.sections[1]!.questions as WrittenModelingQuestion[]}
          answers={{ "mod-1": "Employe (" }}
          onAnswerChange={onAnswerChange}
        />,
      );

      const hashBtn = screen.getByRole("button", { name: /Clé Primaire \(#\)/i });
      fireEvent.click(hashBtn);
      expect(onAnswerChange).toHaveBeenCalledWith("mod-1", "Employe (#");
    });

    it("SQLExecutorConsole exécute la requête SQL et affiche le résultat", () => {
      const onAnswerChange = vi.fn();
      render(
        <SQLExecutorConsole
          questions={sampleWrittenExam.sections[2]!.questions as WrittenSqlQuestion[]}
          answers={{ "sql-1": "SELECT Nom, Salaire FROM Employe WHERE Salaire >= 1900;" }}
          onAnswerChange={onAnswerChange}
          initialSql={sampleWrittenExam.initialSql}
        />,
      );

      const testBtn = screen.getAllByRole("button", { name: /Tester la Requête/i })[0]!;
      fireEvent.click(testBtn);

      expect(screen.getByText(/ligne\(s\) retournée\(s\)/i)).toBeInTheDocument();
      expect(screen.getByText("Ben Salah")).toBeInTheDocument();
    });

    it("CodeAnalysisBox affiche l'extrait de code et permet la saisie", () => {
      const onAnswerChange = vi.fn();
      render(
        <CodeAnalysisBox
          questions={sampleWrittenExam.sections[3]!.questions as WrittenCodeAnalysisQuestion[]}
          answers={{}}
          onAnswerChange={onAnswerChange}
        />,
      );

      expect(screen.getByText(/function verifCin\(cin\)/i)).toBeInTheDocument();
      const input = screen.getByTestId("code-analysis-input-code-1");
      fireEvent.change(input, { target: { value: "cin.length !== 8" } });
      expect(onAnswerChange).toHaveBeenCalledWith("code-1", "cin.length !== 8");
    });
  });

  describe("3. Sécurité d'examen & Neutralisation (PRD F-48, F-50, T-04, T-06)", () => {
    it("affiche le badge de neutralisation stricte du tuteur IA et des corrigés", () => {
      render(<WrittenExamEnvironment manifest={sampleWrittenExam} />);

      expect(
        screen.getByText(/Mode Examen Strict \(Tuteur IA & Corrigés Neutralisés\)/i),
      ).toBeInTheDocument();

      // Vérifie l'absence absolue de boutons de tuteur ou d'indices
      expect(screen.queryByText(/Débloquer l'indice/i)).toBeNull();
      expect(screen.queryByText(/Tuteur Pédagogique/i)).toBeNull();
    });

    it("ExamSecurityManager ouvre le modal de confirmation avant la remise définitive", () => {
      const onSubmitManual = vi.fn();
      const onAutoSubmit = vi.fn();

      render(
        <ExamSecurityManager
          examTitle={sampleWrittenExam.title}
          durationMinutes={120}
          echeance={new Date(Date.now() + 3600000).toISOString()}
          isLocked={false}
          onAutoSubmit={onAutoSubmit}
          onSubmitManual={onSubmitManual}
          totalQuestions={8}
          answeredQuestions={6}
        />,
      );

      const submitBtn = screen.getByRole("button", { name: /Remettre ma Copie/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText(/Confirmer la remise définitive/i)).toBeInTheDocument();
      expect(screen.getByText(/Vous avez complété/i)).toBeInTheDocument();

      const confirmBtn = screen.getByRole("button", { name: /Confirmer la Remise/i });
      fireEvent.click(confirmBtn);

      expect(onSubmitManual).toHaveBeenCalled();
    });

    it("soumission complète : remet la copie au serveur et affiche le relevé de notes", async () => {
      const now = new Date().toISOString();
      const echeance = new Date(Date.now() + 7200_000).toISOString();
      vi.spyOn(writtenExamService, "demarrerOuRecupererCopieExamenEcrit").mockResolvedValue({
        copieId: "copie-test-1",
        examId: sampleWrittenExam.id,
        statut: "en_cours",
        motifCloture: null,
        startedAt: now,
        echeanceServeur: echeance,
        submittedAt: null,
        serverNow: now,
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
      });

      vi.spyOn(writtenExamService, "remettreCopieExamenEcrit").mockResolvedValue({
        copieId: "copie-test-1",
        examId: sampleWrittenExam.id,
        statut: "remise",
        motifCloture: "remise_volontaire",
        startedAt: now,
        echeanceServeur: echeance,
        submittedAt: now,
        serverNow: now,
        reponses: {},
        scoreQcm: 4,
        maxQcm: 4,
        scoreOuvert: null,
        maxOuvert: 16,
        noteFinale: null,
        baremeTotal: 20,
        evaluationDetail: {
          examId: sampleWrittenExam.id,
          totalScore: 4,
          baremeTotal: 20,
          percentage: 20,
          passed: false,
          scoreQcm: 4,
          maxQcm: 4,
          scoreOuvert: null,
          maxOuvert: 16,
          attenteCorrectionEnseignant: true,
          sections: [
            {
              sectionId: "partie-1-qcm",
              title: "Partie I : QCM & Concepts Théoriques (4 pts)",
              type: "qcm",
              pointsEarned: 4,
              pointsMax: 4,
              items: [],
            },
          ],
        },
        notesEnseignant: {},
        commentaireEnseignant: null,
        hashSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        isLocked: true,
        persistedOnServer: true,
      });

      const onCompleted = vi.fn();
      render(
        <WrittenExamEnvironment manifest={sampleWrittenExam} onEvaluationCompleted={onCompleted} />,
      );

      // Cliquer sur remettre ma copie
      const submitBtn = screen.getByRole("button", { name: /Remettre ma Copie/i });
      fireEvent.click(submitBtn);

      const confirmBtn = screen.getByRole("button", { name: /Confirmer la Remise/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/Relevé de Notes & Bilan par Exercice/i)).toBeInTheDocument();
        expect(screen.getByText(/Note Finale Officielle/i)).toBeInTheDocument();
        expect(screen.getByText(/Copie Scellée \(Remise volontaire\)/i)).toBeInTheDocument();
      });

      expect(onCompleted).toHaveBeenCalled();
    });
  });
});
