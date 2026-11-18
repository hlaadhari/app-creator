import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    params?: unknown;
    className?: string;
  }) => (
    <a href={to} data-params={JSON.stringify(params)} className={className}>
      {children}
    </a>
  ),
}));

import {
  calculerBaremeRepartition,
  getDernierTravailEnCours,
  type DernierTravailEnCours,
} from "@/lib/pedagogy/bareme-repartition";
import { RepriseRapideBanner } from "@/components/workspace/RepriseRapideBanner";
import { BaremeRepartitionBadge } from "@/components/workspace/BaremeRepartitionBadge";
import { saveToBuffer, deleteFromBuffer, getAllBuffers } from "@/lib/storage/indexeddb";
import { getExercise } from "@/lib/exercises";

describe("Issue #134 (UX-04 / PED-06) — Répartition du barème", () => {
  it("calcule correctement un sujet 100% automatique", () => {
    const ex = getExercise("ex-html-css-01");
    expect(ex).toBeDefined();
    const rep = calculerBaremeRepartition(ex!.criteria);
    expect(rep.totalPoints).toBe(20);
    expect(rep.pointsAuto).toBe(20);
    expect(rep.pointsEnseignant).toBe(0);
    expect(rep.hasManuel).toBe(false);
    expect(rep.pourcentageAuto).toBe(100);
  });

  it("calcule correctement la répartition 100% auto des examens 2025/2026 (#285) et des critères manuels", () => {
    for (const id of [
      "exam-bac2025-droits-acces",
      "exam-bac2026-bijoux-aurythia",
      "exam-bac2026-croisieres-marivana",
    ]) {
      const ex = getExercise(id);
      expect(ex).toBeDefined();
      const rep = calculerBaremeRepartition(ex!.criteria);
      expect(rep.totalPoints).toBe(20);
      expect(rep.pointsEnseignant).toBe(0);
      expect(rep.pointsAuto).toBe(20);
      expect(rep.hasManuel).toBe(false);
    }

    // Vérifie également le calcul lorsque des critères manuels sont présents
    const repMixte = calculerBaremeRepartition([{ points: 10.75 }, { points: 9.25, manuel: true }]);
    expect(repMixte.totalPoints).toBe(20);
    expect(repMixte.pointsEnseignant).toBe(9.25);
    expect(repMixte.pointsAuto).toBe(10.75);
    expect(repMixte.hasManuel).toBe(true);
  });

  it("affiche les badges de répartition compacts et détaillés", () => {
    const repManuel = {
      totalPoints: 20,
      pointsAuto: 18.5,
      pointsEnseignant: 1.5,
      pourcentageAuto: 93,
      hasManuel: true,
    };

    // Rendu compact
    const { unmount } = render(
      <BaremeRepartitionBadge repartition={repManuel} variant="compact" />,
    );
    expect(screen.getByText("18.5 pts auto")).toBeInTheDocument();
    expect(screen.getByText("1.5 pts enseignant")).toBeInTheDocument();
    unmount();

    // Rendu détaillé
    render(<BaremeRepartitionBadge repartition={repManuel} variant="detailed" />);
    expect(screen.getByText("Vérifié auto : 18.5 pts")).toBeInTheDocument();
    expect(screen.getByText("Évalué enseignant : 1.5 pts")).toBeInTheDocument();
  });
});

describe("Issue #134 (UX-04 / PED-06) — Reprise rapide sur l'accueil", () => {
  beforeEach(async () => {
    // Nettoyer les tampons
    const all = await getAllBuffers();
    for (const b of all) {
      await deleteFromBuffer(b.exerciseId);
    }
  });

  it("détecte le dernier travail sauvegardé dans le tampon local", async () => {
    const now = Date.now();

    await saveToBuffer({
      exerciseId: "ex-html-css-01",
      files: {
        "index.html": {
          name: "index.html",
          content: "<h1>Bonjour</h1>",
          type: "text",
          rev: 1,
          updatedAt: now - 10000,
        },
      },
      rev: 1,
      syncStatus: "local",
      lastLocalSaveAt: now - 10000,
    });

    await saveToBuffer({
      exerciseId: "exam-bac2026-bijoux-aurythia",
      files: {
        "index.html": {
          name: "index.html",
          content: "<h1>Bijoux</h1>",
          type: "text",
          rev: 2,
          updatedAt: now,
        },
        "style.css": {
          name: "style.css",
          content: "body { margin: 0; }",
          type: "text",
          rev: 2,
          updatedAt: now,
        },
      },
      rev: 2,
      syncStatus: "local",
      bestScore: 16,
      lastLocalSaveAt: now,
    });

    const dernier = await getDernierTravailEnCours();
    expect(dernier).not.toBeNull();
    expect(dernier!.exerciseId).toBe("exam-bac2026-bijoux-aurythia");
    expect(dernier!.filesCount).toBe(2);
    expect(dernier!.bestScore).toBe(16);
    expect(dernier!.titre).toContain("Bijoux Aurythia");
  });

  it("affiche la bannière de reprise rapide avec bouton direct", () => {
    const mockTravail: DernierTravailEnCours = {
      exerciseId: "exam-bac2026-bijoux-aurythia",
      titre: "Bac 2026 - Bijoux Aurythia",
      module: "Module C",
      lastSavedAt: Date.now(),
      formattedTime: "14:30",
      formattedDate: "3 nov.",
      filesCount: 3,
      bestScore: 17,
    };

    render(<RepriseRapideBanner dernierTravail={mockTravail} />);

    // Doit afficher le titre et les informations de reprise
    expect(screen.getByRole("region", { name: "Reprise de travail en cours" })).toBeInTheDocument();
    expect(screen.getByText("Travail en cours sauvegardé")).toBeInTheDocument();
    expect(screen.getByText("Bac 2026 - Bijoux Aurythia")).toBeInTheDocument();
    expect(screen.getByText("Modifié à 14:30 (3 nov.)")).toBeInTheDocument();
    expect(screen.getByText("3 fichiers")).toBeInTheDocument();
    expect(screen.getByText("Score : 17/20")).toBeInTheDocument();

    // Bouton de reprise directe
    const repriseBtn = screen.getByRole("button", {
      name: "Reprendre : Bac 2026 - Bijoux Aurythia",
    });
    expect(repriseBtn).toBeInTheDocument();
  });

  it("ne rend rien si aucun travail n'est en cours", () => {
    const { container } = render(<RepriseRapideBanner dernierTravail={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
