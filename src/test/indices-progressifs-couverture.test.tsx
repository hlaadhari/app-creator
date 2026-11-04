import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { genererIndicesProgressifs } from "@/lib/evaluation/progressive-hints";
import { EvaluationResultsPane } from "@/components/workspace/EvaluationResultsPane";
import type { EvaluationSummary } from "@/lib/evaluation/probe-runner";

const SUBJECT_DIRS = [
  "ex-html-css-01",
  "ex-js-01",
  "ex-sql-01",
  "tp-fs-01",
  "tp-fs-02",
  "exam-bac2018-test-drive",
  "exam-bac2022-principale",
  "exam-bac2023-location-habits",
  "exam-bac2025-droits-acces",
  "exam-bac2026-bijoux-aurythia",
  "exam-bac2026-croisieres-marivana",
];

describe("Issue #133 (PED-06) — Matrices de couverture COUVERTURE.md", () => {
  it("contient un fichier COUVERTURE.md valide pour chacun des 10 sujets", () => {
    for (const dir of SUBJECT_DIRS) {
      const couverturePath = path.resolve(process.cwd(), "content", dir, "COUVERTURE.md");
      expect(fs.existsSync(couverturePath), `COUVERTURE.md manquant pour ${dir}`).toBe(true);

      const content = fs.readFileSync(couverturePath, "utf-8");
      expect(content).toContain(`Matrice de Couverture Pédagogique`);
      expect(content).toContain(dir);
      expect(content).toContain("Matrice Consignes ➔ Critères ➔ Sondes de Test");
      expect(content).toContain("Banc Didactique Tripartite");
      expect(content).toContain("solution/");
      expect(content).toContain("solution-alt/");
      expect(content).toContain("solution-invalide/");

      // Vérifier la présence de critères dans le tableau markdown
      const criteriaPath = path.resolve(process.cwd(), "content", dir, "criteria.json");
      if (fs.existsSync(criteriaPath)) {
        const criteria = JSON.parse(fs.readFileSync(criteriaPath, "utf-8")) as Array<{
          id: string;
        }>;
        for (const crit of criteria) {
          expect(content, `Critère ${crit.id} manquant dans COUVERTURE.md de ${dir}`).toContain(
            crit.id,
          );
        }
      }
    }
  });
});

describe("Issue #133 (PED-06) — Indices progressifs à 3 niveaux", () => {
  it("génère 3 niveaux d'indices distincts pour différentes catégories de critères", () => {
    // 1. Critère CSS
    const cssCrit = {
      id: "C-CSS",
      titre: "Bordure et coins arrondis",
      selector: ".card",
      css_property: "border-radius",
    };
    const [c1, c2, c3] = genererIndicesProgressifs(cssCrit);
    expect(c1.length).toBeGreaterThan(10);
    expect(c2.length).toBeGreaterThan(10);
    expect(c3.length).toBeGreaterThan(10);
    expect(c1).not.toEqual(c2);
    expect(c2).not.toEqual(c3);
    expect(c2).toContain(".card");

    // 2. Critère JS
    const jsCrit = {
      id: "C-JS",
      titre: "Validation du formulaire",
      function_name: "verif",
      type: "js_test_cas",
    };
    const [j1, j2, j3] = genererIndicesProgressifs(jsCrit);
    expect(j1).toContain("validation de formulaire");
    expect(j2).toContain("verif()");
    expect(j3).toContain("function verif()");

    // 3. Critère SQL
    const sqlCrit = {
      id: "C-SQL",
      titre: "Création de la table avec clé primaire",
      type: "sql_table_check",
    };
    const [s1, s2, s3] = genererIndicesProgressifs(sqlCrit);
    expect(s1).toContain("Langage de Définition de Données");
    expect(s2).toContain("PRIMARY KEY");
    expect(s3).toContain("CREATE TABLE");

    // 4. Critère PHP
    const phpCrit = {
      id: "C-PHP",
      titre: "Connexion et insertion mysqli",
      type: "php_mysqli_check",
    };
    const [p1, p2, p3] = genererIndicesProgressifs(phpCrit);
    expect(p1).toContain("PHP procédural");
    expect(p2).toContain("$_POST");
    expect(p3).toContain("mysqli_connect");
  });

  it("utilise les indices personnalisés si définis dans le critère", () => {
    const customCrit = {
      id: "C-CUSTOM",
      hints: ["Niveau 1 sur-mesure", "Niveau 2 sur-mesure", "Niveau 3 sur-mesure"],
    };
    const [h1, h2, h3] = genererIndicesProgressifs(customCrit);
    expect(h1).toBe("Niveau 1 sur-mesure");
    expect(h2).toBe("Niveau 2 sur-mesure");
    expect(h3).toBe("Niveau 3 sur-mesure");
  });

  it("permet à l'élève de débloquer progressivement les 3 niveaux dans EvaluationResultsPane", () => {
    const mockSummary: EvaluationSummary = {
      note20: 10,
      earnedPoints: 1,
      totalPoints: 2,
      totalDurationMs: 150,
      evaluatedAt: Date.now(),
      results: [
        {
          id: "CRIT-01",
          code: "HTML-01",
          label: "Structure de base",
          points: 0,
          maxPoints: 1,
          passed: false,
          automatique: true,
          durationMs: 10,
          message: "L'élément attendu est absent",
          hints: [
            "Indice 1: Pensez aux balises sémantiques.",
            "Indice 2: Utilisez la balise header.",
            "Indice 3: <header><h1>Titre</h1></header>",
          ],
        },
      ],
    };

    render(<EvaluationResultsPane summary={mockSummary} onVerify={() => {}} examMode={false} />);

    // Initialement: 0/3 débloqués
    expect(screen.getByText("Indices progressifs (0/3)")).toBeInTheDocument();
    const unlockBtn = screen.getByRole("button", { name: "Débloquer niveau 1" });
    expect(unlockBtn).toBeInTheDocument();

    // Débloquer niveau 1
    fireEvent.click(unlockBtn);
    expect(screen.getByText("Indices progressifs (1/3)")).toBeInTheDocument();
    expect(screen.getByText("Niveau 1 — Conceptuel")).toBeInTheDocument();
    expect(screen.getByText("Indice 1: Pensez aux balises sémantiques.")).toBeInTheDocument();

    // Débloquer niveau 2
    const unlockBtn2 = screen.getByRole("button", { name: "Débloquer niveau 2" });
    fireEvent.click(unlockBtn2);
    expect(screen.getByText("Indices progressifs (2/3)")).toBeInTheDocument();
    expect(screen.getByText("Niveau 2 — Piste Syntaxique")).toBeInTheDocument();
    expect(screen.getByText("Indice 2: Utilisez la balise header.")).toBeInTheDocument();

    // Débloquer niveau 3
    const unlockBtn3 = screen.getByRole("button", { name: "Débloquer niveau 3" });
    fireEvent.click(unlockBtn3);
    expect(screen.getByText("Indices progressifs (3/3)")).toBeInTheDocument();
    expect(screen.getByText("Niveau 3 — Extrait d'Illustration")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("<header><h1>Titre</h1></header>")),
    ).toBeInTheDocument();
    expect(screen.getByText("3/3 débloqués")).toBeInTheDocument();
  });

  it("neutralise strictement les indices en mode examen (T-04 / T-06)", () => {
    const mockSummary: EvaluationSummary = {
      note20: 10,
      earnedPoints: 1,
      totalPoints: 2,
      totalDurationMs: 120,
      evaluatedAt: Date.now(),
      results: [
        {
          id: "CRIT-01",
          code: "HTML-01",
          label: "Structure de base",
          points: 0,
          maxPoints: 1,
          passed: false,
          automatique: true,
          durationMs: 10,
          message: "L'élément attendu est absent",
          hints: ["Indice 1 secret", "Indice 2 secret", "Indice 3 secret"],
        },
      ],
    };

    render(<EvaluationResultsPane summary={mockSummary} onVerify={() => {}} examMode={true} />);

    // Doit afficher le message de neutralisation
    expect(
      screen.getByText("Indices progressifs désactivés en mode examen (T-04 / T-06)"),
    ).toBeInTheDocument();

    // Les indices ne doivent pas être visibles
    expect(screen.queryByText("Indice 1 secret")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Débloquer niveau/i })).not.toBeInTheDocument();
  });
});
