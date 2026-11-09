/**
 * Labo STI - Catalogue des Épreuves Écrites Théoriques (Bac STI)
 * PRD §8, Issue #165 & #163.
 */

import type {
  WrittenExamManifest,
  WrittenQcmQuestion,
  WrittenModelingQuestion,
  WrittenSqlQuestion,
  WrittenCodeAnalysisQuestion,
} from "@/lib/evaluator/written/written-exam-evaluator";
import bac2022ControleManifest from "../../../content/exam-bac2022-controle-ecrit/manifest.json";
import bac2023ControleManifest from "../../../content/exam-bac2023-controle-ecrit/manifest.json";
import bac2023PrincipaleManifest from "../../../content/exam-bac2023-principale-ecrit/manifest.json";
import bac2024ControleManifest from "../../../content/exam-bac2024-controle-ecrit/manifest.json";
import bac2025ControleManifest from "../../../content/exam-bac2025-controle-ecrit/manifest.json";
import bac2025PrincipaleManifest from "../../../content/exam-bac2025-principale-ecrit/manifest.json";
import bac2024PrincipaleManifest from "../../../content/exam-bac2024-principale-ecrit/manifest.json";

export const examBac2022Controle = bac2022ControleManifest as unknown as WrittenExamManifest;
export const examBac2023Controle = bac2023ControleManifest as unknown as WrittenExamManifest;
export const examBac2023Principale = bac2023PrincipaleManifest as unknown as WrittenExamManifest;
export const examBac2024Controle = bac2024ControleManifest as unknown as WrittenExamManifest;
export const examBac2025Controle = bac2025ControleManifest as unknown as WrittenExamManifest;
export const examBac2025Principale = bac2025PrincipaleManifest as unknown as WrittenExamManifest;
export const examBac2024Principale = bac2024PrincipaleManifest as unknown as WrittenExamManifest;

export const sampleWrittenExam: WrittenExamManifest = {
  id: "written-bac-demo",
  title: "Épreuve Écrite Théorique Standard - Bac STI (Spécimen Officiel)",
  exam_type: "written",
  session_type: "blanc",
  year: 2026,
  duration: 120,
  exam_mode: true,
  bareme_total: 20,
  category: "Module C - Épreuves Écrites",
  level: "Moyen",
  tags: ["QCM", "Modélisation", "SQL DDL/DML", "Analyse de Code"],
  initialSql: `
CREATE TABLE IF NOT EXISTS Departement (
  CodeDep VARCHAR(5) PRIMARY KEY,
  NomDep VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS Employe (
  Matricule VARCHAR(6) PRIMARY KEY,
  Nom VARCHAR(30) NOT NULL,
  Prenom VARCHAR(30) NOT NULL,
  Salaire DECIMAL(8,2) NOT NULL,
  CodeDep VARCHAR(5),
  FOREIGN KEY (CodeDep) REFERENCES Departement(CodeDep)
);

INSERT INTO Departement VALUES ('D01', 'Informatique'), ('D02', 'Ressources Humaines');
INSERT INTO Employe VALUES 
  ('E001', 'Ben Salah', 'Amine', 2200.00, 'D01'),
  ('E002', 'Mejri', 'Salma', 1800.00, 'D01'),
  ('E003', 'Gharbi', 'Karim', 1950.00, 'D02');
`,
  sections: [
    {
      id: "partie-1-qcm",
      title: "Partie I : QCM & Concepts Théoriques (4 pts)",
      type: "qcm",
      description: "Cochez la ou les bonnes réponses pour chaque question.",
      points: 4,
      questions: [
        {
          id: "qcm-1",
          question:
            "Quelle clause SQL permet de filtrer les résultats après regroupement avec GROUP BY ?",
          options: [
            { id: "opt-where", label: "WHERE" },
            { id: "opt-having", label: "HAVING" },
            { id: "opt-order", label: "ORDER BY" },
            { id: "opt-filter", label: "FILTER" },
          ],
          points: 2,
          multiple: false,
          correctAnswers: ["opt-having"],
          explanation:
            "La clause HAVING permet de filtrer sur les fonctions d'agrégat après un GROUP BY.",
        },
        {
          id: "qcm-2",
          question: "Quelles contraintes garantissent l'intégrité dans une table relationnelle ?",
          options: [
            { id: "opt-pk", label: "PRIMARY KEY" },
            { id: "opt-fk", label: "FOREIGN KEY ... REFERENCES" },
            { id: "opt-limit", label: "LIMIT" },
            { id: "opt-check", label: "CHECK" },
          ],
          points: 2,
          multiple: true,
          correctAnswers: ["opt-pk", "opt-fk", "opt-check"],
          explanation: "PRIMARY KEY, FOREIGN KEY et CHECK sont des contraintes d'intégrité.",
        },
      ],
    },
    {
      id: "partie-2-modeling",
      title: "Partie II : Modélisation & Schéma Relationnel (5 pts)",
      type: "modeling",
      description: "Rédigez la représentation textuelle ou les instructions DDL demandées.",
      points: 5,
      questions: [
        {
          id: "mod-1",
          prompt:
            "Donnez la représentation textuelle normalisée de la relation Employe en indiquant la clé primaire avec '#' et la clé étrangère avec '#'.",
          points: 2.5,
          type: "representation",
          expectedPattern: "employe\\s*\\(\\s*#matricule.*#codedep.*\\)",
          expectedKeywords: ["Employe", "#Matricule", "#CodeDep"],
          explanation: "Format attendu : Employe (#Matricule, Nom, Prenom, Salaire, #CodeDep)",
        },
        {
          id: "mod-2",
          prompt:
            "Écrivez la commande SQL DDL pour créer la table Projet avec CodeP (VARCHAR(5), Clé primaire) et Titre (VARCHAR(50), NOT NULL).",
          points: 2.5,
          type: "ddl",
          expectedKeywords: [
            "CREATE TABLE",
            "Projet",
            "CodeP",
            "VARCHAR",
            "PRIMARY KEY",
            "NOT NULL",
          ],
          explanation:
            "CREATE TABLE Projet (CodeP VARCHAR(5) PRIMARY KEY, Titre VARCHAR(50) NOT NULL);",
        },
      ],
    },
    {
      id: "partie-3-sql",
      title: "Partie III : Exploitation & Requêtes SQL (6 pts)",
      type: "sql",
      description: "Rédigez les requêtes SQL et testez-les directement dans la console.",
      points: 6,
      questions: [
        {
          id: "sql-1",
          prompt:
            "Rédigez la requête SQL affichant le Nom et le Salaire de tous les employés dont le salaire est supérieur ou égal à 1900.00, triés par salaire décroissant.",
          points: 3,
          type: "query",
          expectedQuery:
            "SELECT Nom, Salaire FROM Employe WHERE Salaire >= 1900.00 ORDER BY Salaire DESC;",
          explanation:
            "SELECT Nom, Salaire FROM Employe WHERE Salaire >= 1900 ORDER BY Salaire DESC;",
        },
        {
          id: "sql-2",
          prompt: "Mettez à jour le salaire de l'employé 'E001' à 2420.00.",
          points: 3,
          type: "dml",
          expectedTableRows: {
            table: "Employe",
            where: {
              Matricule: "E001",
              Salaire: 2420,
            },
          },
          explanation: "UPDATE Employe SET Salaire = 2420.00 WHERE Matricule = 'E001';",
        },
      ],
    },
    {
      id: "partie-4-code",
      title: "Partie IV : Analyse de Code Web & Algorithmique (5 pts)",
      type: "code_analysis",
      description: "Analysez le code fourni et répondez aux questions.",
      points: 5,
      questions: [
        {
          id: "code-1",
          prompt:
            "Identifiez l'erreur dans la condition JavaScript suivante et donnez la version corrigée pour valider qu'un champ CIN comporte exactement 8 chiffres :",
          codeSnippet: `function verifCin(cin) {
  if (cin.length = 8 || isNaN(cin)) {
    return false;
  }
  return true;
}`,
          language: "javascript",
          points: 2.5,
          expectedRegex: "cin\\.length\\s*!==?\\s*8",
          keywords: ["length", "8"],
          explanation:
            "L'opérateur d'affectation '=' doit être remplacé par la comparaison de non-égalité '!==' (ou '!=') : cin.length !== 8.",
        },
        {
          id: "code-2",
          prompt:
            "Quelle superglobale PHP doit être utilisée pour récupérer une variable envoyée en méthode POST sous le nom 'matricule' ?",
          points: 2.5,
          expectedAnswer: "$_POST['matricule']",
          expectedRegex: "\\$_POST\\[['\"]matricule['\"]\\]",
          explanation: "La superglobale est $_POST['matricule'].",
        },
      ],
    },
  ],
};

const writtenExamsRegistry: Map<string, WrittenExamManifest> = new Map([
  [sampleWrittenExam.id, sampleWrittenExam],
  [examBac2022Controle.id, examBac2022Controle],
  [examBac2023Controle.id, examBac2023Controle],
  [examBac2023Principale.id, examBac2023Principale],
  [examBac2024Controle.id, examBac2024Controle],
  [examBac2024Principale.id, examBac2024Principale],
  [examBac2025Controle.id, examBac2025Controle],
  [examBac2025Principale.id, examBac2025Principale],
]);

export function registerWrittenExam(manifest: WrittenExamManifest): void {
  writtenExamsRegistry.set(manifest.id, manifest);
}

export function getWrittenExam(id: string): WrittenExamManifest | undefined {
  return writtenExamsRegistry.get(id);
}

/**
 * Masque l'ensemble des corrigés et réponses attendues d'un manifeste d'épreuve écrite
 * avant la clôture de l'épreuve côté client (#197, T-01).
 */
export function masquerCorrigeManifestEcrit(manifest: WrittenExamManifest): WrittenExamManifest {
  return {
    ...manifest,
    sections: manifest.sections.map((section) => {
      if (section.type === "qcm") {
        return {
          ...section,
          questions: section.questions.map((q) => {
            const { explanation: _exp, ...rest } = q as WrittenQcmQuestion;
            return {
              ...rest,
              correctAnswers: [],
            };
          }),
        };
      }
      if (section.type === "modeling") {
        return {
          ...section,
          questions: section.questions.map((q) => {
            const {
              expectedPattern: _p,
              expectedKeywords: _k,
              expectedDdl: _d,
              explanation: _exp,
              ...rest
            } = q as WrittenModelingQuestion;
            return rest;
          }),
        };
      }
      if (section.type === "sql") {
        return {
          ...section,
          questions: section.questions.map((q) => {
            const {
              expectedQuery: _q,
              expectedOutput: _o,
              expectedTableRows: _t,
              verificationSql: _v,
              explanation: _exp,
              ...rest
            } = q as WrittenSqlQuestion;
            return rest;
          }),
        };
      }
      return {
        ...section,
        questions: section.questions.map((q) => {
          const {
            expectedAnswer: _a,
            expectedRegex: _r,
            keywords: _k,
            explanation: _exp,
            ...rest
          } = q as WrittenCodeAnalysisQuestion;
          return rest;
        }),
      };
    }),
  };
}

/**
 * Retourne un sujet d'épreuve écrite expurgé de ses corrigés pour l'interface élève (#197).
 */
export function getWrittenExamPublic(id: string): WrittenExamManifest | undefined {
  const found =
    writtenExamsRegistry.get(id) ??
    (id === "demo" || id === "written-bac-demo" ? sampleWrittenExam : undefined);
  if (!found) return undefined;
  return masquerCorrigeManifestEcrit(found);
}

export function getAllWrittenExams(): WrittenExamManifest[] {
  return Array.from(writtenExamsRegistry.values());
}
