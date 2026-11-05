import { describe, it, expect } from "vitest";
import {
  evaluerQcm,
  evaluerModeling,
  evaluerSql,
  evaluerCodeAnalysis,
  evaluerCopieEcrite,
  normaliserTexte,
  comparerLignesResultats,
  type WrittenExamManifest,
  type WrittenQcmQuestion,
  type WrittenModelingQuestion,
  type WrittenSqlQuestion,
  type WrittenCodeAnalysisQuestion,
} from "@/lib/evaluator/written/written-exam-evaluator";
import { sampleWrittenExam } from "@/lib/content/written-subjects";

describe("Written Exam Evaluator (PRD §8, §10, Issue #165 & #163)", () => {
  describe("1. Utilitaires de normalisation & comparaison", () => {
    it("normalise correctement les textes (espaces, casse, ponctuation terminale)", () => {
      expect(normaliserTexte("  SELECT * FROM Eleve;  ")).toBe("select * from eleve");
      expect(normaliserTexte("A , B , C ;")).toBe("a , b , c");
    });

    it("compare les lignes de résultats indépendamment de l'ordre", () => {
      const actual = [
        { id: 2, nom: "Trabelsi" },
        { id: 1, nom: "Ben Ali" },
      ];
      const expected = [
        { id: 1, nom: "Ben Ali" },
        { id: 2, nom: "Trabelsi" },
      ];
      expect(comparerLignesResultats(actual, expected)).toBe(true);
    });

    it("détecte les différences de données ou de colonnes", () => {
      const actual = [{ id: 1, nom: "Ben Ali" }];
      const expected = [{ id: 1, nom: "Different" }];
      expect(comparerLignesResultats(actual, expected)).toBe(false);

      const missingCol = [{ id: 1 }];
      expect(comparerLignesResultats(missingCol, expected)).toBe(false);
    });
  });

  describe("2. Évaluation des QCM (evaluerQcm)", () => {
    const qSingle: WrittenQcmQuestion = {
      id: "q1",
      question: "Quelle clause filtre après GROUP BY ?",
      options: ["WHERE", "HAVING", "ORDER BY"],
      points: 2,
      multiple: false,
      correctAnswers: ["HAVING"],
      explanation: "HAVING filtre les groupes.",
    };

    const qMultiple: WrittenQcmQuestion = {
      id: "q2",
      question: "Sélectionnez les clés valides",
      options: ["PRIMARY KEY", "FOREIGN KEY", "LIMIT"],
      points: 3,
      multiple: true,
      correctAnswers: ["PRIMARY KEY", "FOREIGN KEY"],
    };

    it("valide une réponse exacte à choix unique", () => {
      const res = evaluerQcm(qSingle, "HAVING", "sec1");
      expect(res.isCorrect).toBe(true);
      expect(res.pointsEarned).toBe(2);
      expect(res.pointsMax).toBe(2);
    });

    it("rejette une mauvaise réponse ou réponse vide", () => {
      const bad = evaluerQcm(qSingle, "WHERE", "sec1");
      expect(bad.isCorrect).toBe(false);
      expect(bad.pointsEarned).toBe(0);

      const empty = evaluerQcm(qSingle, "", "sec1");
      expect(empty.isCorrect).toBe(false);
      expect(empty.pointsEarned).toBe(0);
    });

    it("valide les choix multiples si et seulement si tous les choix concordent", () => {
      const perfect = evaluerQcm(qMultiple, ["PRIMARY KEY", "FOREIGN KEY"], "sec1");
      expect(perfect.isCorrect).toBe(true);
      expect(perfect.pointsEarned).toBe(3);

      const incomplete = evaluerQcm(qMultiple, ["PRIMARY KEY"], "sec1");
      expect(incomplete.isCorrect).toBe(false);

      const withIntruder = evaluerQcm(qMultiple, ["PRIMARY KEY", "FOREIGN KEY", "LIMIT"], "sec1");
      expect(withIntruder.isCorrect).toBe(false);
    });
  });

  describe("3. Évaluation de la modélisation relationnelle (evaluerModeling)", () => {
    const qModel: WrittenModelingQuestion = {
      id: "m1",
      prompt: "Donnez la représentation textuelle de Employe",
      points: 2.5,
      type: "representation",
      expectedPattern: "employe\\s*\\(\\s*#matricule.*#codedep.*\\)",
      expectedKeywords: ["Employe", "#Matricule", "#CodeDep"],
    };

    it("valide une représentation textuelle conforme avec clés primaires/étrangères", () => {
      const res = evaluerModeling(
        qModel,
        "Employe (#Matricule, Nom, Prenom, Salaire, #CodeDep)",
        "sec2",
      );
      expect(res.isCorrect).toBe(true);
      expect(res.pointsEarned).toBe(2.5);
    });

    it("rejette une représentation où il manque un mot-clé ou le pattern #", () => {
      const missingHash = evaluerModeling(
        qModel,
        "Employe (Matricule, Nom, Prenom, Salaire, CodeDep)",
        "sec2",
      );
      expect(missingHash.isCorrect).toBe(false);
      expect(missingHash.pointsEarned).toBe(0);
    });

    const qDdl: WrittenModelingQuestion = {
      id: "m2",
      prompt: "Créez la table Projet",
      points: 2,
      type: "ddl",
      expectedKeywords: ["CREATE TABLE", "Projet", "CodeP"],
    };

    it("valide une instruction DDL exécutable", () => {
      const res = evaluerModeling(
        qDdl,
        "CREATE TABLE Projet (CodeP VARCHAR(5) PRIMARY KEY, Titre VARCHAR(30));",
        "sec2",
      );
      expect(res.isCorrect).toBe(true);
      expect(res.pointsEarned).toBe(2);
    });
  });

  describe("4. Évaluation des requêtes SQL (evaluerSql)", () => {
    const initSql = `
      CREATE TABLE Client (Cin VARCHAR(8) PRIMARY KEY, Nom VARCHAR(30), Solde DECIMAL(8,2));
      INSERT INTO Client VALUES ('01234567', 'Ben Ali', 150.00), ('08888888', 'Trabelsi', 500.00);
    `;

    const qQuery: WrittenSqlQuestion = {
      id: "s1",
      prompt: "Sélectionnez les clients ayant un solde > 200",
      points: 3,
      type: "query",
      initialSql: initSql,
      expectedQuery: "SELECT Cin, Nom FROM Client WHERE Solde > 200;",
    };

    it("valide une requête SELECT conforme au résultat attendu", () => {
      const res = evaluerSql(
        qQuery,
        "SELECT Cin, Nom FROM Client WHERE Solde > 200;",
        "sec3",
        initSql,
      );
      expect(res.isCorrect).toBe(true);
      expect(res.pointsEarned).toBe(3);
    });

    it("rejette une requête SELECT avec erreur de syntaxe ou filtre incorrect", () => {
      const syntaxErr = evaluerSql(qQuery, "SELEC Cin FROM Client", "sec3", initSql);
      expect(syntaxErr.isCorrect).toBe(false);
      expect(syntaxErr.feedback).toContain("Erreur SQL");

      const wrongFilter = evaluerSql(
        qQuery,
        "SELECT Cin, Nom FROM Client WHERE Solde < 200;",
        "sec3",
        initSql,
      );
      expect(wrongFilter.isCorrect).toBe(false);
    });

    const qDml: WrittenSqlQuestion = {
      id: "s2",
      prompt: "Mettre à jour le solde du client 01234567 à 300",
      points: 3,
      type: "dml",
      initialSql: initSql,
      expectedTableRows: {
        table: "Client",
        where: {
          Cin: "01234567",
          Solde: 300,
        },
      },
    };

    it("valide une requête UPDATE modifiant correctement la table", () => {
      const res = evaluerSql(
        qDml,
        "UPDATE Client SET Solde = 300 WHERE Cin = '01234567';",
        "sec3",
        initSql,
      );
      expect(res.isCorrect).toBe(true);
      expect(res.pointsEarned).toBe(3);
    });
  });

  describe("5. Évaluation de l'analyse de code (evaluerCodeAnalysis)", () => {
    const qCode: WrittenCodeAnalysisQuestion = {
      id: "c1",
      prompt: "Identifiez la superglobale POST pour 'cin'",
      points: 2.5,
      expectedAnswer: "$_POST['cin']",
      expectedRegex: "\\$_POST\\[['\"]cin['\"]\\]",
    };

    it("valide une réponse exacte", () => {
      const res = evaluerCodeAnalysis(qCode, "$_POST['cin']", "sec4");
      expect(res.isCorrect).toBe(true);
      expect(res.pointsEarned).toBe(2.5);
    });

    it("valide via regex avec guillemets doubles", () => {
      const res = evaluerCodeAnalysis(qCode, '$_POST["cin"]', "sec4");
      expect(res.isCorrect).toBe(true);
    });

    it("rejette une réponse incorrecte", () => {
      const res = evaluerCodeAnalysis(qCode, "$_GET['cin']", "sec4");
      expect(res.isCorrect).toBe(false);
      expect(res.pointsEarned).toBe(0);
    });
  });

  describe("6. Évaluation globale d'une copie écrite (evaluerCopieEcrite)", () => {
    it("évalue un spécimen complet et calcule la note sur 20 points", async () => {
      const perfectAnswers: Record<string, unknown> = {
        "qcm-1": "opt-having",
        "qcm-2": ["opt-pk", "opt-fk", "opt-check"],
        "mod-1": "Employe (#Matricule, Nom, Prenom, Salaire, #CodeDep)",
        "mod-2": "CREATE TABLE Projet (CodeP VARCHAR(5) PRIMARY KEY, Titre VARCHAR(50) NOT NULL);",
        "sql-1": "SELECT Nom, Salaire FROM Employe WHERE Salaire >= 1900.00 ORDER BY Salaire DESC;",
        "sql-2": "UPDATE Employe SET Salaire = 2420.00 WHERE Matricule = 'E001';",
        "code-1": "cin.length !== 8",
        "code-2": "$_POST['matricule']",
      };

      const result = await evaluerCopieEcrite(sampleWrittenExam, perfectAnswers);
      expect(result.examId).toBe("written-bac-demo");
      expect(result.totalScore).toBe(20);
      expect(result.baremeTotal).toBe(20);
      expect(result.percentage).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.sections).toHaveLength(4);
    });

    it("calcule un score proportionnel pour une copie partiellement exacte", async () => {
      const partialAnswers: Record<string, unknown> = {
        "qcm-1": "opt-having", // 2 pts
        "qcm-2": ["opt-pk"], // Faux (manque des options) -> 0 pt
        // Reste vide
      };

      const result = await evaluerCopieEcrite(sampleWrittenExam, partialAnswers);
      expect(result.totalScore).toBe(2);
      expect(result.percentage).toBe(10);
      expect(result.passed).toBe(false);
    });
  });
});
