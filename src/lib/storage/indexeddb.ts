import type { ProjectBuffer, BufferFile } from "./types";

const DB_NAME = "labo_sti_buffer";
const DB_VERSION = 1;
const STORE_NAME = "student_work";

// En mémoire si IndexedDB est indisponible (ex: SSR, tests unitaires sans polyfill)
const memoryStore = new Map<string, ProjectBuffer>();

function isIndexedDBSupported(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Ouvre ou récupère la connexion singleton vers la base IndexedDB labo_sti_buffer.
 */
export async function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDBSupported()) {
    throw new Error("IndexedDB is not supported in this environment");
  }

  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "exerciseId" });
        store.createIndex("by_syncStatus", "syncStatus", { unique: false });
        store.createIndex("by_lastLocalSaveAt", "lastLocalSaveAt", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        dbPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      dbPromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

/**
 * Sauvegarde prioritaire dans le tampon local (< 100ms)
 * Respecte le principe directeur n°4 : « Ne jamais perdre le travail d'un élève ».
 */
export async function saveToBuffer(buffer: ProjectBuffer): Promise<void> {
  if (!isIndexedDBSupported()) {
    memoryStore.set(buffer.exerciseId, { ...buffer });
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(`buffer:${buffer.exerciseId}`, JSON.stringify(buffer));
      } catch {
        // Ignorer les quotas localStorage dépassés
      }
    }
    return;
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put(buffer);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Échec d'écriture dans labo_sti_buffer, repli en mémoire :", err);
    memoryStore.set(buffer.exerciseId, { ...buffer });
  }
}

/**
 * Récupère le tampon local pour un sujet donné.
 * Si aucun tampon n'existe dans IndexedDB, tente une migration transparente depuis localStorage (bacsti:xxx).
 */
export async function getFromBuffer(exerciseId: string): Promise<ProjectBuffer | null> {
  if (!isIndexedDBSupported()) {
    if (memoryStore.has(exerciseId)) {
      return memoryStore.get(exerciseId)!;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(`buffer:${exerciseId}`);
        if (raw) return JSON.parse(raw) as ProjectBuffer;
      } catch {
        return null;
      }
    }
    return migrateLegacyLocalStorage(exerciseId);
  }

  try {
    const db = await openDatabase();
    const result = await new Promise<ProjectBuffer | null>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(exerciseId);

      req.onsuccess = () => resolve((req.result as ProjectBuffer) || null);
      req.onerror = () => reject(req.error);
    });

    if (result) return result;

    // Tentative de migration depuis l'ancien format localStorage
    const migrated = migrateLegacyLocalStorage(exerciseId);
    if (migrated) {
      await saveToBuffer(migrated);
      return migrated;
    }

    return null;
  } catch (err) {
    console.warn("[IndexedDB] Échec de lecture dans labo_sti_buffer, tentative repli :", err);
    return memoryStore.get(exerciseId) || migrateLegacyLocalStorage(exerciseId);
  }
}

/**
 * Supprime le tampon local d'un sujet (ex: réinitialisation explicite).
 */
export async function deleteFromBuffer(exerciseId: string): Promise<void> {
  memoryStore.delete(exerciseId);
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(`buffer:${exerciseId}`);
    } catch {
      // Ignorer
    }
  }

  if (!isIndexedDBSupported()) return;

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(exerciseId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Échec de suppression :", err);
  }
}

/**
 * Récupère tous les tampons locaux (pour inspection ou reprise hors-ligne).
 */
export async function getAllBuffers(): Promise<ProjectBuffer[]> {
  if (!isIndexedDBSupported()) {
    return Array.from(memoryStore.values());
  }

  try {
    const db = await openDatabase();
    return await new Promise<ProjectBuffer[]>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Échec de récupération globale :", err);
    return Array.from(memoryStore.values());
  }
}

/**
 * Migration transparente depuis l'ancien format `bacsti:${id}`
 */
function migrateLegacyLocalStorage(exerciseId: string): ProjectBuffer | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const oldRaw = window.localStorage.getItem(`bacsti:${exerciseId}`);
    if (!oldRaw) return null;

    const old = JSON.parse(oldRaw);
    if (!old || !old.files) return null;

    const files: Record<string, BufferFile> = {};
    for (const [name, content] of Object.entries(old.files)) {
      files[name] = {
        name,
        content: String(content),
        type: "text",
        rev: 1,
        updatedAt: old.savedAt || Date.now(),
      };
    }

    return {
      exerciseId,
      files,
      bestScore: old.best,
      rev: 1,
      syncStatus: "local",
      lastLocalSaveAt: old.savedAt || Date.now(),
    };
  } catch {
    return null;
  }
}
