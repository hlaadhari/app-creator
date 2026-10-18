import { describe, expect, it, beforeEach } from "vitest";
import {
  saveToBuffer,
  getFromBuffer,
  deleteFromBuffer,
  getAllBuffers,
} from "@/lib/storage/indexeddb";
import type { ProjectBuffer } from "@/lib/storage/types";

describe("Tampon Local Garanti (labo_sti_buffer) - Issue #6 & Principe Directeur n°4", () => {
  const testExerciseId = "test-carte-profil";

  beforeEach(async () => {
    await deleteFromBuffer(testExerciseId);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it("enregistre et relit fidèlement un tampon de projet élève", async () => {
    const buffer: ProjectBuffer = {
      exerciseId: testExerciseId,
      files: {
        "index.html": {
          name: "index.html",
          content: "<h1>Test STI</h1>",
          type: "text",
          language: "html",
          rev: 1,
          updatedAt: Date.now(),
        },
        "style.css": {
          name: "style.css",
          content: "h1 { color: green; }",
          type: "text",
          language: "css",
          rev: 1,
          updatedAt: Date.now(),
        },
      },
      rev: 1,
      bestScore: 18,
      syncStatus: "local",
      lastLocalSaveAt: Date.now(),
    };

    await saveToBuffer(buffer);
    const loaded = await getFromBuffer(testExerciseId);

    expect(loaded).not.toBeNull();
    expect(loaded?.exerciseId).toBe(testExerciseId);
    expect(loaded?.files["index.html"]?.content).toBe("<h1>Test STI</h1>");
    expect(loaded?.files["style.css"]?.content).toBe("h1 { color: green; }");
    expect(loaded?.rev).toBe(1);
    expect(loaded?.bestScore).toBe(18);
  });

  it("gère l'incrémentation des révisions rev lors des modifications successives", async () => {
    const initialBuffer: ProjectBuffer = {
      exerciseId: testExerciseId,
      files: {
        "index.html": {
          name: "index.html",
          content: "Version 1",
          type: "text",
          rev: 1,
          updatedAt: 1000,
        },
      },
      rev: 1,
      syncStatus: "synced",
      lastLocalSaveAt: 1000,
    };

    await saveToBuffer(initialBuffer);

    // Nouvelle révision après modification élève
    const updatedBuffer: ProjectBuffer = {
      ...initialBuffer,
      files: {
        "index.html": {
          name: "index.html",
          content: "Version 2 modifiée",
          type: "text",
          rev: 2,
          updatedAt: 2000,
        },
      },
      rev: 2,
      syncStatus: "pending",
      lastLocalSaveAt: 2000,
    };

    await saveToBuffer(updatedBuffer);
    const loaded = await getFromBuffer(testExerciseId);

    expect(loaded?.rev).toBe(2);
    expect(loaded?.files["index.html"]?.content).toBe("Version 2 modifiée");
    expect(loaded?.syncStatus).toBe("pending");
  });

  it("migre automatiquement les données historiques depuis localStorage sans perte", async () => {
    const legacyExerciseId = "legacy-sujet-1";
    const legacyData = {
      files: {
        "index.html": "<main>Legacy Code</main>",
        "style.css": "body { margin: 0; }",
      },
      best: 15,
      savedAt: 1700000000000,
    };

    // Injection de l'ancien format dans localStorage
    window.localStorage.setItem(`bacsti:${legacyExerciseId}`, JSON.stringify(legacyData));

    // Lecture via le nouveau gestionnaire de tampon
    const migrated = await getFromBuffer(legacyExerciseId);

    expect(migrated).not.toBeNull();
    expect(migrated?.exerciseId).toBe(legacyExerciseId);
    expect(migrated?.files["index.html"]?.content).toBe("<main>Legacy Code</main>");
    expect(migrated?.bestScore).toBe(15);
    expect(migrated?.rev).toBe(1);
    expect(migrated?.syncStatus).toBe("local");

    // Nettoyage
    await deleteFromBuffer(legacyExerciseId);
  });

  it("enregistre les métadonnées de conflit sans écrasement silencieux", async () => {
    const conflictBuffer: ProjectBuffer = {
      exerciseId: testExerciseId,
      files: {
        "script.js": {
          name: "script.js",
          content: "console.log('local')",
          type: "text",
          rev: 2,
          updatedAt: 3000,
        },
      },
      rev: 2,
      syncStatus: "conflict",
      lastLocalSaveAt: 3000,
      conflict: {
        fileName: "script.js",
        localContent: "console.log('local')",
        remoteContent: "console.log('remote')",
        localRev: 2,
        remoteRev: 3,
        remoteUpdatedAt: new Date().toISOString(),
      },
    };

    await saveToBuffer(conflictBuffer);
    const loaded = await getFromBuffer(testExerciseId);

    expect(loaded?.syncStatus).toBe("conflict");
    expect(loaded?.conflict).toBeDefined();
    expect(loaded?.conflict?.remoteRev).toBe(3);
    expect(loaded?.conflict?.localRev).toBe(2);
    expect(loaded?.conflict?.remoteContent).toBe("console.log('remote')");
  });

  it("supporte le marquage de synchronisation tardive (tolérance réseau examen)", async () => {
    const lateBuffer: ProjectBuffer = {
      exerciseId: testExerciseId,
      files: {
        "index.html": {
          name: "index.html",
          content: "Travail remis après coupure",
          type: "text",
          rev: 5,
          updatedAt: 4000,
        },
      },
      rev: 5,
      syncStatus: "synced",
      isLateSync: true,
      lastLocalSaveAt: 4000,
    };

    await saveToBuffer(lateBuffer);
    const loaded = await getFromBuffer(testExerciseId);

    expect(loaded?.isLateSync).toBe(true);
  });
});
