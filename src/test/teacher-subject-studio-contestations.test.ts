import { describe, expect, it } from "vitest";
import {
  validerBancDidactique,
  publierVersionSujet,
  creerNouvelleVersion,
  type SubjectVersionRecord,
  type ValidationSolution,
} from "@/lib/subjects/subject-studio";
import {
  arbitrerContestation,
  recalculerNotesClasseApresDesactivation,
  type ContestationRecord,
  type StudentAttemptRecord,
} from "@/lib/subjects/contestations-service";
import type { CriterionDefinition } from "@/lib/evaluation/probe-runner";

describe("Studio Enseignant, Immuabilité et Arbitrage (Issue #11 - PRD F-32, F-35, F-36, F-44, F-45, T-09)", () => {
  const criteria: CriterionDefinition[] = [
    {
      id: "c1",
      code: "DOM-01",
      label: "Élément article.carte",
      points: 4,
      ordre: 1,
      sonde: { type: "dom_selector", selector: "article.carte" },
      message_echec: "Article carte manquant",
    },
    {
      id: "c2",
      code: "DOM-02",
      label: "Titre h1 non vide",
      points: 6,
      ordre: 2,
      sonde: { type: "dom_selector", selector: "article.carte h1", textNotEmpty: true },
      message_echec: "Titre h1 vide ou manquant",
    },
    {
      id: "c3",
      code: "DOM-03",
      label: "Au moins 3 loisirs",
      points: 10,
      ordre: 3,
      sonde: { type: "dom_selector", selector: "article.carte ul > li", minCount: 3 },
      message_echec: "Moins de 3 éléments li",
    },
  ];

  const solutionsConformes: ValidationSolution[] = [
    {
      id: "s1",
      nom: "Solution A (Canonique)",
      type: "canonique",
      description: "Solution standard rédigée par l'enseignant",
      files: {
        "index.html": `
          <article class="carte">
            <h1>Hatem</h1>
            <ul>
              <li>Prog</li>
              <li>Élec</li>
              <li>Réseau</li>
            </ul>
          </article>
        `,
        "style.css": "",
        "script.js": "",
      },
    },
    {
      id: "s2",
      nom: "Solution B (Alternative)",
      type: "alternative",
      description: "Variante avec balises span et 4 items",
      files: {
        "index.html": `
          <article class="carte">
            <h1><span>Amira</span></h1>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
              <li>Item 3</li>
              <li>Item 4</li>
            </ul>
          </article>
        `,
        "style.css": "",
        "script.js": "",
      },
    },
    {
      id: "s3",
      nom: "Solution C (Invalide)",
      type: "invalide",
      description: "Solution avec seulement 2 items dans la liste",
      files: {
        "index.html": `
          <article class="carte">
            <h1>Karim</h1>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </article>
        `,
        "style.css": "",
        "script.js": "",
      },
    },
  ];

  describe("Banc de Pré-validation didactique (PRD §10.4, F-35)", () => {
    it("valide avec succès le banc didactique lorsque les 2 solutions valides et 1 invalide sont conformes", () => {
      const report = validerBancDidactique(criteria, solutionsConformes);

      expect(report.readyToPublish).toBe(true);
      expect(report.canoniquePassed).toBe(true);
      expect(report.alternativePassed).toBe(true);
      expect(report.invalideFailedAsExpected).toBe(true);
      expect(report.errors).toHaveLength(0);
      expect(report.results).toHaveLength(3);
    });

    it("refuse la publication si la solution alternative échoue (faux négatif)", () => {
      const solutionsDefaillantes: ValidationSolution[] = [
        solutionsConformes[0]!,
        {
          id: "s2-bad",
          nom: "Solution B défaillante",
          type: "alternative",
          description: "Alternative omettant la classe carte",
          files: {
            "index.html": `
              <article class="autre">
                <h1>Amira</h1>
                <ul><li>1</li><li>2</li><li>3</li></ul>
              </article>
            `,
            "style.css": "",
            "script.js": "",
          },
        },
        solutionsConformes[2]!,
      ];

      const report = validerBancDidactique(criteria, solutionsDefaillantes);

      expect(report.readyToPublish).toBe(false);
      expect(report.alternativePassed).toBe(false);
      expect(report.errors.some((e) => e.includes("alternative"))).toBe(true);
    });

    it("refuse la publication si la solution invalide est acceptée à 100% (critère non discriminant)", () => {
      const solutionsLaxistes: ValidationSolution[] = [
        solutionsConformes[0]!,
        solutionsConformes[1]!,
        {
          id: "s3-overly-valid",
          nom: "Solution C supposée invalide mais en fait valide",
          type: "invalide",
          description: "Contient 3 items, donc valide",
          files: {
            "index.html": `
              <article class="carte">
                <h1>Karim</h1>
                <ul><li>1</li><li>2</li><li>3</li></ul>
              </article>
            `,
            "style.css": "",
            "script.js": "",
          },
        },
      ];

      const report = validerBancDidactique(criteria, solutionsLaxistes);

      expect(report.readyToPublish).toBe(false);
      expect(report.invalideFailedAsExpected).toBe(false);
      expect(report.errors.some((e) => e.includes("invalide"))).toBe(true);
    });
  });

  describe("Publication conditionnée et Immuabilité stricte (PRD F-32, F-36, T-09)", () => {
    const mockVersion: SubjectVersionRecord = {
      id: "v-carte-1",
      sujet_id: "carte-profil",
      numero: 1,
      titre: "Carte de profil",
      enonce_md: "# Énoncé",
      niveau: "Facile",
      duree_min: 30,
      publiee: false,
      published_at: null,
      criteres: criteria,
      fichiers_depart: { "index.html": "<html></html>" },
      solutions_test: solutionsConformes,
    };

    it("bloque la publication d'un sujet sans rapport didactique validé", () => {
      const invalidReport = {
        readyToPublish: false,
        canoniquePassed: true,
        alternativePassed: false,
        invalideFailedAsExpected: false,
        results: [],
        errors: ["Solution alternative en échec"],
        validatedAt: Date.now(),
      };

      const res = publierVersionSujet(mockVersion, invalidReport);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Publication refusée : la validation didactique");
    });

    it("autorise la publication lorsque le banc didactique est certifié conforme", () => {
      const validReport = validerBancDidactique(criteria, solutionsConformes);
      const res = publierVersionSujet(mockVersion, validReport);

      expect(res.success).toBe(true);
      expect(res.version?.publiee).toBe(true);
      expect(res.version?.published_at).toBeTruthy();
    });

    it("interdit formellement toute modification d'une version déjà publiée (T-09)", () => {
      const publishedVersion: SubjectVersionRecord = {
        ...mockVersion,
        publiee: true,
        published_at: new Date().toISOString(),
      };

      const report = validerBancDidactique(criteria, solutionsConformes);
      const res = publierVersionSujet(publishedVersion, report);

      expect(res.success).toBe(false);
      expect(res.error).toContain("déjà publiée et est strictement immuable (T-09)");
    });

    it("impose la création d'une nouvelle version (numero + 1) pour toute révision", () => {
      const publishedVersion: SubjectVersionRecord = {
        ...mockVersion,
        publiee: true,
        published_at: new Date().toISOString(),
      };

      const nextVersion = creerNouvelleVersion(publishedVersion, {
        titre: "Carte de profil (Mise à jour)",
        enonce_md: "# Nouvel énoncé enrichi",
      });

      expect(nextVersion.numero).toBe(2);
      expect(nextVersion.publiee).toBe(false);
      expect(nextVersion.published_at).toBeNull();
      expect(nextVersion.titre).toBe("Carte de profil (Mise à jour)");
      // La version 1 précédente reste intacte et immuable
      expect(publishedVersion.numero).toBe(1);
      expect(publishedVersion.publiee).toBe(true);
    });
  });

  describe("Arbitrage des Contestations & Recalcul Instantané (PRD F-44, F-45)", () => {
    const attempts: StudentAttemptRecord[] = [
      {
        id: "att-1",
        eleve_id: "e1",
        eleve_nom: "Amira",
        note20: 10,
        points_obtenus: 10, // c1(4) + c2(6) = 10 ; a échoué c3(10)
        points_total: 20,
        criteres: [
          { id: "c1", code: "DOM-01", label: "Article carte", points: 4, valide: true },
          { id: "c2", code: "DOM-02", label: "Titre h1", points: 6, valide: true },
          { id: "c3", code: "DOM-03", label: "Liste 3 items", points: 10, valide: false },
        ],
      },
      {
        id: "att-2",
        eleve_id: "e2",
        eleve_nom: "Karim",
        note20: 20,
        points_obtenus: 20, // a validé c1, c2, c3
        points_total: 20,
        criteres: [
          { id: "c1", code: "DOM-01", label: "Article carte", points: 4, valide: true },
          { id: "c2", code: "DOM-02", label: "Titre h1", points: 6, valide: true },
          { id: "c3", code: "DOM-03", label: "Liste 3 items", points: 10, valide: true },
        ],
      },
    ];

    const contestation: ContestationRecord = {
      id: "cont-1",
      critere_id: "c3",
      critere_code: "DOM-03",
      critere_label: "Liste de 3 centres d'intérêt minimum",
      eleve_id: "e1",
      eleve_nom: "Amira",
      classe_id: "class-1",
      classe_nom: "Terminale STI2D 1",
      texte: "L'énoncé n'était pas clair sur la balise ul vs ol.",
      statut: "en_attente",
      created_at: new Date().toISOString(),
    };

    it("permet à l'enseignant de rejeter une contestation sans impacter les notes", () => {
      const res = arbitrerContestation(contestation, "rejeter", attempts, "Énoncé explicite.");
      expect(res.contestation.statut).toBe("rejetee");
      expect(res.contestation.motif_rejet).toBe("Énoncé explicite.");
      expect(res.recalcul).toBeUndefined();
    });

    it("accepte la contestation, neutralise le critère et recalcule instantanément les notes de classe", () => {
      const res = arbitrerContestation(contestation, "accepter", attempts);

      expect(res.contestation.statut).toBe("acceptee");
      expect(res.recalcul).toBeDefined();

      const recalcul = res.recalcul!;
      expect(recalcul.critere_desactive_id).toBe("c3");
      expect(recalcul.eleves_impactes).toBe(1); // Seule Amira voit sa note modifiée

      // Barème résiduel : c1(4) + c2(6) = 10 pts max.
      // Amira avait obtenu 10/10 sur c1 et c2 -> sa nouvelle note passe de 10/20 à 20/20 !
      const amiraCopy = recalcul.copies_recalculees.find((c) => c.eleve_id === "e1")!;
      expect(amiraCopy.points_total).toBe(10);
      expect(amiraCopy.points_obtenus).toBe(10);
      expect(amiraCopy.note20).toBe(20);

      // Karim conserve sa note maximale de 20/20
      const karimCopy = recalcul.copies_recalculees.find((c) => c.eleve_id === "e2")!;
      expect(karimCopy.note20).toBe(20);

      // Moyenne de classe passe de (10+20)/2 = 15/20 à (20+20)/2 = 20/20
      expect(recalcul.moyenne_avant).toBe(15);
      expect(recalcul.moyenne_apres).toBe(20);
    });

    it("gère le recalcul direct via recalculerNotesClasseApresDesactivation", () => {
      const recalcul = recalculerNotesClasseApresDesactivation("class-1", "c3", attempts);
      expect(recalcul.copies_recalculees).toHaveLength(2);
      expect(
        recalcul.copies_recalculees.every((c) => !c.criteres.some((cr) => cr.id === "c3")),
      ).toBe(true);
    });
  });
});
