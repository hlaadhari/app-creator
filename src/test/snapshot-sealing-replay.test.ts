/**
 * Labo STI - Tests du Scellement Cryptographique et Rejouage de Référence (Issue #16, PRD F-54, F-55, T-08)
 */

import { describe, expect, it } from "vitest";
import {
  computeSha256,
  normaliserCheminFichier,
  serialiserJsonCanonique,
  scellerSnapshot,
  verifierIntegriteSnapshot,
  creerArchiveSnapshotZip,
} from "@/lib/snapshot/snapshot-engine";
import { rejouerCorrectionReference } from "@/lib/snapshot/replay-engine";
import {
  initialiserNoteOfficielle,
  ajusterPointsCritere,
  ajusterNoteFinaleGlobale,
} from "@/lib/snapshot/grading-service";
import {
  verifierMutationSnapshot,
  ImmutabilityViolationError,
} from "@/lib/security/immutability-guard";
import { type CriterionDefinition } from "@/lib/evaluation/probe-runner";

describe("Scellement Cryptographique des Snapshots (SHA-256) & Rejouage (Issue #16)", () => {
  const dummyFiles: Record<string, string> = {
    "index.html": `<!DOCTYPE html>
<html>
  <head><link rel="stylesheet" href="style.css"></head>
  <body>
    <header class="titre-principal">
      <h1>Plateforme Bac STI</h1>
    </header>
    <main>
      <form id="monForm">
        <input type="text" id="cin" name="cin" />
        <button type="submit" id="btnValider">Valider</button>
      </form>
    </main>
  </body>
</html>`,
    "style.css": `
body { font-family: sans-serif; }
.titre-principal { display: flex; justify-content: center; }
`,
    "script.js": `console.log("ready");`,
  };

  const dummySqlDump = `
CREATE TABLE don (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nom VARCHAR(50) NOT NULL,
  montant DECIMAL(10,2) NOT NULL
);
INSERT INTO don (nom, montant) VALUES ('Lycée Pilote', 150.00);
`;

  const dummyCriteres: CriterionDefinition[] = [
    {
      id: "crit-1",
      code: "HTML.HEADER",
      label: "En-tête de page présent",
      points: 2,
      ordre: 1,
      sonde: {
        type: "dom_selector",
        selector: "header.titre-principal",
      },
      message_echec: "L'en-tête est manquant.",
    },
    {
      id: "crit-2",
      code: "HTML.FORM",
      label: "Formulaire avec champ CIN",
      points: 3,
      ordre: 2,
      sonde: {
        type: "dom_selector",
        selector: "form#monForm input#cin",
      },
      message_echec: "Formulaire ou champ CIN introuvable.",
    },
  ];

  // =========================================================================
  // 1. Calcul SHA-256 canonique & Normalisation
  // =========================================================================
  describe("1. Calcul canonique SHA-256 et normalisation", () => {
    it("calcule une empreinte SHA-256 valide conforme au standard (64 caractères hex)", async () => {
      const hash = await computeSha256("test-labo-sti");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("normalise uniformément les chemins de fichiers", () => {
      expect(normaliserCheminFichier(".\\css\\style.css")).toBe("css/style.css");
      expect(normaliserCheminFichier("/Travail_Eleve/SW_12345/index.html")).toBe(
        "Travail_Eleve/SW_12345/index.html"
      );
    });

    it("sérialise le JSON avec des clés triées récursivement", () => {
      const obj1 = { b: 2, a: 1, c: { z: 9, y: 8 } };
      const obj2 = { a: 1, c: { y: 8, z: 9 }, b: 2 };
      expect(serialiserJsonCanonique(obj1)).toBe(serialiserJsonCanonique(obj2));
    });
  });

  // =========================================================================
  // 2. Scellement cryptographique et vérification d'intégrité
  // =========================================================================
  describe("2. Scellement cryptographique de la copie et intégrité", () => {
    it("scelle un snapshot complet avec fichiers et base SQL", async () => {
      const snapshot = await scellerSnapshot({
        sujetId: "sujet-bac-2023",
        versionId: "ver-1",
        eleveId: "eleve-001",
        projetId: "proj-100",
        passageId: "pass-50",
        fichiers: dummyFiles,
        baseDonnees: {
          tables: ["don"],
          dumpSql: dummySqlDump,
        },
        horodatageServeur: "2026-10-19T10:00:00.000Z",
      });

      expect(snapshot.rootHash).toHaveLength(64);
      expect(snapshot.fichiers).toHaveLength(3);
      expect(snapshot.baseDonnees?.tables).toContain("don");
      expect(snapshot.baseDonnees?.sha256).toHaveLength(64);

      // Vérification immédiate conforme
      const verif = await verifierIntegriteSnapshot(snapshot, dummyFiles, dummySqlDump);
      expect(verif.valide).toBe(true);
      expect(verif.erreurs).toHaveLength(0);
      expect(verif.fichiersVerifies).toBe(3);
      expect(verif.hashCalcule).toBe(snapshot.rootHash);
    });

    it("détecte l'altération d'un seul caractère dans un fichier", async () => {
      const snapshot = await scellerSnapshot({
        sujetId: "sujet-bac-2023",
        versionId: "ver-1",
        eleveId: "eleve-001",
        projetId: "proj-100",
        fichiers: dummyFiles,
        horodatageServeur: "2026-10-19T10:00:00.000Z",
      });

      // Corruption intentionnelle d'un octet dans style.css
      const fichiersCorrompus = {
        ...dummyFiles,
        "style.css": dummyFiles["style.css"] + "/* modification illicite */",
      };

      const verif = await verifierIntegriteSnapshot(snapshot, fichiersCorrompus);
      expect(verif.valide).toBe(false);
      expect(verif.erreurs.some((e) => e.includes("style.css"))).toBe(true);
      expect(verif.erreurs.some((e) => e.includes("Sceau cryptographique"))).toBe(true);
    });

    it("détecte la suppression d'un fichier requis du bundle", async () => {
      const snapshot = await scellerSnapshot({
        sujetId: "sujet-bac-2023",
        versionId: "ver-1",
        eleveId: "eleve-001",
        projetId: "proj-100",
        fichiers: dummyFiles,
        horodatageServeur: "2026-10-19T10:00:00.000Z",
      });

      const fichiersTronques: Record<string, string> = {
        "index.html": dummyFiles["index.html"]!,
      };

      const verif = await verifierIntegriteSnapshot(snapshot, fichiersTronques);
      expect(verif.valide).toBe(false);
      expect(verif.erreurs.some((e) => e.includes("Fichier manquant"))).toBe(true);
    });

    it("détecte l'injection d'un fichier clandestin non référencé", async () => {
      const snapshot = await scellerSnapshot({
        sujetId: "sujet-bac-2023",
        versionId: "ver-1",
        eleveId: "eleve-001",
        projetId: "proj-100",
        fichiers: dummyFiles,
        horodatageServeur: "2026-10-19T10:00:00.000Z",
      });

      const fichiersAvecIntrus = {
        ...dummyFiles,
        "cheat.js": "window.parent.postMessage('cheat');",
      };

      const verif = await verifierIntegriteSnapshot(snapshot, fichiersAvecIntrus);
      expect(verif.valide).toBe(false);
      expect(verif.erreurs.some((e) => e.includes("Fichier intempestif"))).toBe(true);
    });

    it("détecte la modification frauduleuse de l'état de la base de données SQL", async () => {
      const snapshot = await scellerSnapshot({
        sujetId: "sujet-bac-2023",
        versionId: "ver-1",
        eleveId: "eleve-001",
        projetId: "proj-100",
        fichiers: dummyFiles,
        baseDonnees: {
          tables: ["don"],
          dumpSql: dummySqlDump,
        },
        horodatageServeur: "2026-10-19T10:00:00.000Z",
      });

      const dumpSqlAltere = dummySqlDump.replace("150.00", "9999.00");
      const verif = await verifierIntegriteSnapshot(snapshot, dummyFiles, dumpSqlAltere);
      expect(verif.valide).toBe(false);
      expect(verif.erreurs.some((e) => e.includes("dump SQL invalide"))).toBe(true);
    });
  });

  // =========================================================================
  // 3. Règle de sécurité T-08 : Immuabilité absolue des snapshots
  // =========================================================================
  describe("3. Immuabilité absolue des snapshots (T-08)", () => {
    it("rejette formellement toute tentative de UPDATE sur un snapshot existant", () => {
      expect(() => {
        verifierMutationSnapshot("UPDATE");
      }).toThrowError(ImmutabilityViolationError);
    });

    it("rejette formellement toute tentative de DELETE sur un snapshot scellé", () => {
      expect(() => {
        verifierMutationSnapshot("DELETE");
      }).toThrowError(ImmutabilityViolationError);
    });

    it("interdit la réinsertion d'un snapshot déjà scellé", () => {
      const snapshotExistant = {
        id: "snap-1",
        eleve_id: "eleve-1",
        projet_id: "proj-1",
        empreinte_sha256: "abc",
        scelle_le: "2026-10-19T10:00:00Z",
      };

      expect(() => {
        verifierMutationSnapshot("INSERT", snapshotExistant);
      }).toThrowError(ImmutabilityViolationError);
    });
  });

  // =========================================================================
  // 4. Rejouage de référence reproductible et déterministe
  // =========================================================================
  describe("4. Moteur de rejouage officiel et reproductibilité (PRD §10)", () => {
    it("exécute le rejouage de référence et valide la reproductibilité déterministe", async () => {
      const snapshot = await scellerSnapshot({
        sujetId: "sujet-bac-2023",
        versionId: "ver-1",
        eleveId: "eleve-001",
        projetId: "proj-100",
        fichiers: dummyFiles,
        baseDonnees: {
          tables: ["don"],
          dumpSql: dummySqlDump,
        },
        horodatageServeur: "2026-10-19T10:00:00.000Z",
      });

      const replay = await rejouerCorrectionReference({
        snapshot,
        fichiers: dummyFiles,
        criteres: dummyCriteres,
        sqlDump: dummySqlDump,
        baremeTotal: 20,
      });

      expect(replay.rootHash).toBe(snapshot.rootHash);
      expect(replay.reproductible).toBe(true);
      expect(replay.grille.criteres).toHaveLength(2);
      expect(replay.grille.totalPointsMax).toBe(5);
      expect(replay.grille.totalPointsAuto).toBe(5);
      expect(replay.grille.noteAuto20).toBe(20);
      expect(replay.journal.some((j) => j.includes("Déterminisme vérifié"))).toBe(true);
    });
  });

  // =========================================================================
  // 5. Génération de l'archive ZIP officielle scellée
  // =========================================================================
  describe("5. Export normalisé de l'archive certifiée SW_xxxxx.zip", () => {
    it("génère l'archive ZIP avec manifest.json et CHECKSUM.sha256", async () => {
      const snapshot = await scellerSnapshot({
        sujetId: "sujet-bac-2023",
        versionId: "ver-1",
        eleveId: "eleve-001",
        projetId: "proj-100",
        fichiers: dummyFiles,
        baseDonnees: {
          tables: ["don"],
          dumpSql: dummySqlDump,
        },
        horodatageServeur: "2026-10-19T10:00:00.000Z",
      });

      const zipBytes = creerArchiveSnapshotZip(
        "12345678",
        snapshot,
        dummyFiles,
        dummySqlDump
      );

      expect(zipBytes).toBeInstanceOf(Uint8Array);
      expect(zipBytes.length).toBeGreaterThan(500);

      // Signature PKZIP
      expect(zipBytes[0]).toBe(0x50);
      expect(zipBytes[1]).toBe(0x4b);
      expect(zipBytes[2]).toBe(0x03);
      expect(zipBytes[3]).toBe(0x04);
    });
  });

  // =========================================================================
  // 6. Service de notation enseignant et journal d'audit
  // =========================================================================
  describe("6. Décision pédagogique enseignant et historique d'audit", () => {
    it("initialise un brouillon de note à partir du résultat du rejouage", async () => {
      const snapshot = await scellerSnapshot({
        sujetId: "sujet-bac-2023",
        versionId: "ver-1",
        eleveId: "eleve-001",
        projetId: "proj-100",
        passageId: "pass-1",
        fichiers: dummyFiles,
      });

      const replay = await rejouerCorrectionReference({
        snapshot,
        fichiers: dummyFiles,
        criteres: dummyCriteres,
      });

      const note = initialiserNoteOfficielle(
        snapshot.projetId,
        snapshot.passageId ?? null,
        replay,
        "prof-007"
      );

      expect(note.note_auto).toBe(20);
      expect(note.note_finale).toBe(20);
      expect(note.corrige_par).toBe("prof-007");
      expect(note.historique).toHaveLength(1);
    });

    it("impose une motivation pédagogique lors de l'ajustement des points d'un critère", async () => {
      const snapshot = await scellerSnapshot({
        sujetId: "sujet-bac-2023",
        versionId: "ver-1",
        eleveId: "eleve-001",
        projetId: "proj-100",
        fichiers: dummyFiles,
      });

      const replay = await rejouerCorrectionReference({
        snapshot,
        fichiers: dummyFiles,
        criteres: dummyCriteres,
      });

      const note = initialiserNoteOfficielle(snapshot.projetId, null, replay, "prof-007");

      expect(() => {
        ajusterPointsCritere({
          note,
          critereId: "crit-1",
          pointsAjustes: 1,
          modifiePar: "prof-007",
          justification: "", // Interdit sans justification
        });
      }).toThrowError(/Motivation pédagogique obligatoire/);
    });

    it("enregistre l'historique d'audit lors d'un ajustement justifié", async () => {
      const snapshot = await scellerSnapshot({
        sujetId: "sujet-bac-2023",
        versionId: "ver-1",
        eleveId: "eleve-001",
        projetId: "proj-100",
        fichiers: dummyFiles,
      });

      const replay = await rejouerCorrectionReference({
        snapshot,
        fichiers: dummyFiles,
        criteres: dummyCriteres,
      });

      const note = initialiserNoteOfficielle(snapshot.projetId, null, replay, "prof-007");

      const noteModifiee = ajusterPointsCritere({
        note,
        critereId: "crit-1",
        pointsAjustes: 1,
        commentaireProf: "En-tête présent mais style incomplet",
        modifiePar: "prof-007",
        justification: "Pénalité sur présentation CSS non conforme aux consignes",
      });

      expect(noteModifiee.grille.totalPointsAjustes).toBe(4); // 1 + 3 au lieu de 2 + 3
      expect(noteModifiee.note_finale).toBe(16); // 4/5 * 20
      expect(noteModifiee.historique).toHaveLength(2);
      expect(noteModifiee.historique[1]?.justification).toContain("Pénalité sur présentation");
    });
  });
});
