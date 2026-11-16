import { describe, expect, it } from "vitest";
import {
  verifierRequeteEleve,
  filtrerReponseTuteur,
  estNeutraliseEnExamen,
} from "@/lib/tutor/guardrails";
import { interagirAvecTuteur } from "@/lib/tutor/engine";
import type { TutorContext } from "@/lib/tutor/types";

describe("Tuteur Pédagogique d'Aide Contextuelle (Issue #35 - PRD §15, F-56, T-06, Jalon M7)", () => {
  const defaultContext: TutorContext = {
    sujetId: "sujet-tp-don",
    sujetTitre: "TP Synthèse Don Lycée",
    competence: "Validation de formulaire & DOM Client",
    activeFile: "script.js",
    fileContent: "console.log('init');",
    activeCriteria: [
      { id: "c1", code: "HTML.FORM", label: "Formulaire avec labels et inputs", ok: true },
      { id: "c2", code: "JS.VALIDATION", label: "Contrôle de saisie CIN (8 chiffres)", ok: false },
      { id: "c3", code: "CSS.FLEX", label: "Mise en page Flexbox", ok: true },
    ],
    isExamMode: false,
  };

  const examContext: TutorContext = {
    ...defaultContext,
    sujetId: "exam-blanc-sti-2026",
    isExamMode: true,
  };

  describe("1. Garde-fous Anti-Triche & Refus de Code Brut (Anti-Cheat)", () => {
    it("refuse catégoriquement de donner le code complet ou la solution brute", () => {
      const cheatPrompts = [
        "Donne-moi le code complet de script.js",
        "Écris-moi le code pour valider le formulaire",
        "Fais le travail à ma place s'il te plaît",
        "Résous l'exercice pour moi",
        "Quelle est la solution complète du critère 2 ?",
        "Give me the code solution now",
      ];

      cheatPrompts.forEach((prompt) => {
        const check = verifierRequeteEleve(prompt, defaultContext);
        expect(check.autorise).toBe(false);
        expect(check.motif).toBe("DEMANDE_SOLUTION_BRUTE");
        expect(check.messageRefus).toContain("je ne peux pas écrire le code à votre place");
      });
    });

    it("intercepte les tentatives de triche via interagirAvecTuteur sans générer de code", async () => {
      const res = await interagirAvecTuteur("Donne-moi la solution de script.js", defaultContext);

      expect(res.blocked).toBe(true);
      expect(res.reason).toBe("TENTATIVE_TRICHE");
      expect(res.message.isWarning).toBe(true);
      expect(res.message.content).toContain("je ne peux pas écrire le code à votre place");
      expect(res.message.content).not.toContain("document.getElementById");
    });

    it("autorise les questions méthodologiques et de compréhension", () => {
      const legitPrompts = [
        "Pourquoi mon écouteur d'événement ne se déclenche pas ?",
        "Que signifie l'attribut type submit ?",
        "Comment fonctionne preventDefault en JavaScript ?",
        "Aide-moi à comprendre pourquoi le critère échoue",
      ];

      legitPrompts.forEach((prompt) => {
        const check = verifierRequeteEleve(prompt, defaultContext);
        expect(check.autorise).toBe(true);
      });
    });
  });

  describe("2. Dialogue Maïeutique Socratique & Questionnement Guidé", () => {
    it("répond par des questions réflexives et de diagnostic sans révéler la solution", async () => {
      const res = await interagirAvecTuteur("Pourquoi mon critère échoue ?", defaultContext);

      expect(res.blocked).toBe(false);
      expect(res.message.role).toBe("assistant");
      // Vérifie la démarche socratique (pose des questions numérotées ou guidées)
      expect(res.message.content).toContain("Contrôle de saisie CIN");
      expect(res.message.content).toMatch(/\?|\bQu'|\bComment|\bQuelle/);
      // Ne contient aucun code complet executable
      expect(res.message.content).not.toContain("function validerFormulaire() {");

      // Fournit des suggestions de relance ciblées
      expect(res.message.suggestedFollowUps).toBeDefined();
      expect(res.message.suggestedFollowUps?.length).toBeGreaterThanOrEqual(2);
    });

    it("fournit une orientation ciblée sur les sélecteurs DOM et événements", async () => {
      const res = await interagirAvecTuteur(
        "Comment cibler mon bouton en JavaScript ?",
        defaultContext,
      );

      expect(res.blocked).toBe(false);
      expect(res.message.content).toContain("Sélectionner");
      expect(res.message.content).toContain("Écouter");
      expect(res.message.content).toMatch(/querySelector|getElementById/);
      expect(res.message.suggestedFollowUps).toBeDefined();
    });

    it("filtre toute tentative de fuite d'un bloc de code volumineux (> 3 lignes)", () => {
      const leakCode =
        "```javascript\nconst a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\nreturn a + b + c + d;\n```";
      const { reponseFiltree, fuiteDetectee } = filtrerReponseTuteur(leakCode);

      expect(fuiteDetectee).toBe(true);
      expect(reponseFiltree).toContain("masquée par le garde-fous anti-triche");
      expect(reponseFiltree).not.toContain("const d = 4");
    });
  });

  describe("3. Neutralisation Matérielle Stricte en Mode Examen (PRD F-56, T-06)", () => {
    it("détecte instantanément le mode examen via isExamMode = true", () => {
      expect(estNeutraliseEnExamen(examContext)).toBe(true);
      expect(estNeutraliseEnExamen(defaultContext)).toBe(false);
    });

    it("détecte également le mode examen pour un sujet portant un identifiant d'épreuve officielle", () => {
      const bacContext: TutorContext = {
        ...defaultContext,
        sujetId: "bac2026-sti-si",
        isExamMode: false,
      };
      expect(estNeutraliseEnExamen(bacContext)).toBe(true);
    });

    it("bloque catégoriquement toute interaction avec le tuteur en mode examen", async () => {
      const res = await interagirAvecTuteur("Aide-moi s'il te plaît", examContext);

      expect(res.blocked).toBe(true);
      expect(res.reason).toBe("MODE_EXAMEN_ACTIF");
      expect(res.message.isWarning).toBe(true);
      expect(res.message.content).toContain(
        "Le Tuteur Pédagogique est neutralisé et inaccessible en session d'examen",
      );
      expect(res.message.content).toContain("T-06");
    });
  });

  describe("4. Diagnostic Réel du Code Élève & Repli Honnête (Issue #276)", () => {
    it("adapte le diagnostic au contenu réel de fileContent pour un même critère en échec", async () => {
      const resSansSelecteur = await interagirAvecTuteur("Pourquoi mon critère échoue ?", {
        ...defaultContext,
        fileContent: "console.log('test');",
      });
      const resSansValue = await interagirAvecTuteur("Pourquoi mon critère échoue ?", {
        ...defaultContext,
        fileContent: "const champ = document.getElementById('cin');",
      });
      const resSansLength = await interagirAvecTuteur("Pourquoi mon critère échoue ?", {
        ...defaultContext,
        fileContent: "const cin = document.getElementById('cin').value;",
      });
      const resSansIsNaN = await interagirAvecTuteur("Pourquoi mon critère échoue ?", {
        ...defaultContext,
        fileContent: "const cin = document.getElementById('cin').value; if (cin.length !== 8) {}",
      });
      const resSansReturnFalse = await interagirAvecTuteur("Pourquoi mon critère échoue ?", {
        ...defaultContext,
        fileContent:
          "const cin = document.getElementById('cin').value; if (cin.length !== 8 || isNaN(cin)) { alert('err'); }",
      });

      // Les réponses doivent être différentes selon le code soumis par l'élève
      expect(resSansSelecteur.message.content).not.toBe(resSansValue.message.content);
      expect(resSansValue.message.content).not.toBe(resSansLength.message.content);
      expect(resSansLength.message.content).not.toBe(resSansIsNaN.message.content);
      expect(resSansIsNaN.message.content).not.toBe(resSansReturnFalse.message.content);

      expect(resSansSelecteur.message.content).toContain("aucune sélection de champ");
      expect(resSansValue.message.content).toContain(".value");
      expect(resSansLength.message.content).toContain(".length !== 8");
      expect(resSansIsNaN.message.content).toContain("isNaN");
      expect(resSansReturnFalse.message.content).toContain("return false;");
      // Aucun bloc de code ne doit déclencher l'avertissement anti-fuite
      expect(resSansReturnFalse.message.isWarning).toBeFalsy();
      expect(resSansReturnFalse.message.content).toContain("/cours");
    });

    it("répond avec précision aux questions de cours du référentiel STI posées dans l'atelier", async () => {
      const resFk = await interagirAvecTuteur("c'est quoi une clé étrangère", defaultContext);
      expect(resFk.blocked).toBe(false);
      expect(resFk.message.content).toContain("FOREIGN KEY");
      expect(resFk.message.content).toContain("/cours");

      const resJoin = await interagirAvecTuteur(
        "explique la jointure externe LEFT JOIN",
        defaultContext,
      );
      expect(resJoin.blocked).toBe(false);
      expect(resJoin.message.content).toContain("LEFT JOIN");

      const resEvent = await interagirAvecTuteur(
        "je n'arrive pas à comprendre addEventListener",
        defaultContext,
      );
      expect(resEvent.blocked).toBe(false);
      expect(resEvent.message.content).toContain("addEventListener");
      expect(resEvent.message.content).toContain("preventDefault");
    });

    it("affiche un repli honnête explicite pour une salutation ou une question hors sujet", async () => {
      const resBonjour = await interagirAvecTuteur("bonjour", defaultContext);
      expect(resBonjour.blocked).toBe(false);
      expect(resBonjour.message.content).toContain("Je n'ai pas de fiche sur ce sujet");

      const resHorsSujet = await interagirAvecTuteur(
        "quelle est la météo demain à Tunis ?",
        defaultContext,
      );
      expect(resHorsSujet.blocked).toBe(false);
      expect(resHorsSujet.message.content).toContain("Je n'ai pas de fiche sur ce sujet");
    });
  });
});
