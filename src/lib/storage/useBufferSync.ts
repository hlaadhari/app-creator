import { useState, useEffect, useRef, useCallback } from "react";
import type { WorkspaceFile } from "@/components/workspace/types";
import type { ProjectBuffer, BufferFile, SyncStatus, ConflictData } from "./types";
import { getFromBuffer, saveToBuffer } from "./indexeddb";
import { arbitrerRevisionDistante, createCoalescingQueue } from "./sync-utils";
import {
  getOrCreateProjet,
  sauvegarderFichierDistant,
  sauvegarderFichiersDistants,
  chargerFichiersDistants,
} from "@/lib/supabase/projets";
import { isSimulationWriteBlocked } from "@/lib/supabase/auth";
import { supabase } from "@/integrations/supabase/client";

function detectLanguage(fileName: string): "html" | "css" | "javascript" | "php" | "sql" {
  if (fileName.endsWith(".html")) return "html";
  if (fileName.endsWith(".css")) return "css";
  if (fileName.endsWith(".js")) return "javascript";
  if (fileName.endsWith(".php")) return "php";
  if (fileName.endsWith(".sql")) return "sql";
  return "html";
}

interface UseBufferSyncOptions {
  exerciseId: string;
  starterFiles: Record<string, string>;
  /** Délai sans frappe avant la synchronisation distante (plus long en examen pour alléger le serveur). */
  debounceMs?: number;
}

/** Décalage aléatoire (0 à 500 ms) : évite que toute une classe synchronise à la même milliseconde. */
const GIGUE_MAX_MS = 500;
const REPRISE_BASE_MS = 2000;
const REPRISE_MAX_MS = 60000;

/** Délai de reprise après une erreur : exponentiel plafonné, avec gigue (« full jitter »). */
export function delaiReprise(tentative: number, hasard: () => number = Math.random): number {
  const plafond = Math.min(REPRISE_MAX_MS, REPRISE_BASE_MS * 2 ** Math.max(0, tentative - 1));
  return Math.round(plafond / 2 + (hasard() * plafond) / 2);
}

export function useBufferSync({
  exerciseId,
  starterFiles,
  debounceMs = 1000,
}: UseBufferSyncOptions) {
  // État local des fichiers
  const [files, setFiles] = useState<Record<string, WorkspaceFile>>(() => {
    const init: Record<string, WorkspaceFile> = {};
    for (const [name, content] of Object.entries(starterFiles)) {
      init[name] = {
        name,
        content,
        type: "text",
        language: detectLanguage(name),
      };
    }
    return init;
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [rev, setRev] = useState<number>(1);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number | undefined>(undefined);
  const [conflict, setConflict] = useState<ConflictData | null>(null);
  const [isLateSync, setIsLateSync] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Références d'état
  const fileRevs = useRef<Record<string, number>>({});
  const projetIdRef = useRef<string | null>(null);
  const pendingSyncTimer = useRef<NodeJS.Timeout | null>(null);
  // Contenu du dernier envoi réussi, par fichier : sert à n'envoyer que ce qui a changé.
  const syncedContent = useRef<Record<string, string>>({});
  const tentativesReprise = useRef(0);
  const isOnline = useRef<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const starterFilesRef = useRef(starterFiles);
  starterFilesRef.current = starterFiles;
  const filesRef = useRef(files);
  filesRef.current = files;

  // 1. Écriture immédiate locale (< 100ms) dans IndexedDB
  const persistToLocalBuffer = useCallback(
    async (overrides?: Partial<ProjectBuffer>) => {
      const now = Date.now();
      const bufferFiles: Record<string, BufferFile> = {};

      for (const [name, f] of Object.entries(files)) {
        bufferFiles[name] = {
          name: f.name,
          content: f.content,
          type: f.type,
          language: f.language,
          rev: fileRevs.current[name] ?? 1,
          updatedAt: now,
        };
      }

      const updatedBuffer: ProjectBuffer = {
        exerciseId,
        files: bufferFiles,
        rev,
        syncStatus: overrides?.syncStatus || (syncStatus === "offline" ? "offline" : "pending"),
        lastLocalSaveAt: now,
      };

      if (projetIdRef.current) updatedBuffer.projetId = projetIdRef.current;
      if (bestScore !== undefined) updatedBuffer.bestScore = bestScore;
      if (isLateSync) updatedBuffer.isLateSync = isLateSync;
      if (conflict) updatedBuffer.conflict = conflict;

      if (overrides) {
        Object.assign(updatedBuffer, overrides);
      }

      await saveToBuffer(updatedBuffer);
      setLastSavedAt(now);
    },
    [exerciseId, files, bestScore, rev, syncStatus, isLateSync, conflict],
  );

  // 2. Vérification distante lors de la connexion
  const checkRemoteSync = useCallback(
    async (exId: string, localSnapshot?: Record<string, string>) => {
      try {
        if (isSimulationWriteBlocked()) {
          setSyncStatus("local");
          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return; // Mode invité

        const pId = await getOrCreateProjet(exId);
        if (!pId) return;
        projetIdRef.current = pId;

        // Charger les fichiers distants
        const remoteFiles = await chargerFichiersDistants(pId);
        if (remoteFiles && remoteFiles.length > 0) {
          const adoptes: Record<string, string> = {};
          for (const rf of remoteFiles) {
            const hasLocal =
              (localSnapshot !== undefined && rf.chemin in localSnapshot) ||
              rf.chemin in filesRef.current;
            if (!hasLocal) {
              fileRevs.current[rf.chemin] = rf.rev;
              syncedContent.current[rf.chemin] = rf.contenu;
              adoptes[rf.chemin] = rf.contenu;
              continue;
            }
            const currentRev = fileRevs.current[rf.chemin] || 1;
            if (rf.rev <= currentRev) continue;

            // Révision distante plus récente : conflit réel seulement si les deux côtés diffèrent (#201)
            // Contenu local réellement chargé : filesRef peut ne pas être à jour juste après le chargement
            // du tampon, et comparer au départ à tort écraserait du travail en silence.
            const localContent =
              localSnapshot?.[rf.chemin] ?? filesRef.current[rf.chemin]?.content ?? "";
            const decision = arbitrerRevisionDistante({
              localContent,
              remoteContent: rf.contenu,
              starterContent: starterFilesRef.current[rf.chemin],
            });

            if (decision === "conflit") {
              setConflict({
                fileName: rf.chemin,
                localContent,
                remoteContent: rf.contenu,
                localRev: currentRev,
                remoteRev: rf.rev,
                remoteUpdatedAt: rf.updated_at,
              });
              setSyncStatus("conflict");
              return;
            }

            // identique ou départ intact : on adopte la révision distante sans rien perdre
            fileRevs.current[rf.chemin] = rf.rev;
            if (decision === "depart_intact") adoptes[rf.chemin] = rf.contenu;
            if (decision === "depart_intact" || localContent === rf.contenu) {
              syncedContent.current[rf.chemin] = rf.contenu;
            }
          }

          if (Object.keys(adoptes).length > 0) {
            setFiles((prev) => {
              const next = { ...prev };
              for (const [name, contenu] of Object.entries(adoptes)) {
                const existing = next[name];
                next[name] = existing
                  ? { ...existing, content: contenu }
                  : {
                      name,
                      content: contenu,
                      type: "text",
                      language: detectLanguage(name),
                    };
              }
              return next;
            });
          }
          setSyncStatus("synced");
        }
      } catch {
        // Ignorer si offline
      }
    },
    [],
  );

  // 3. Synchronisation effective (exécutée une à la fois, voir file d'attente ci-dessous)
  const runSync = useCallback(async () => {
    if (isSimulationWriteBlocked()) {
      setSyncStatus("local");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
      return;
    }

    // getSession lit la session locale (aucun appel réseau) : la sécurité est assurée côté serveur par la RPC.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setSyncStatus("local");
      return;
    }

    let pId = projetIdRef.current;
    if (!pId) {
      pId = await getOrCreateProjet(exerciseId);
      if (!pId) {
        setSyncStatus("local");
        return;
      }
      projetIdRef.current = pId;
    }

    // Seuls les fichiers modifiés depuis la dernière synchronisation réussie sont envoyés.
    const aEnvoyer = Object.entries(files)
      .filter(
        ([name, file]) => file.type === "text" && syncedContent.current[name] !== file.content,
      )
      .map(([name, file]) => ({
        chemin: name,
        contenu: file.content,
        expectedRev: fileRevs.current[name] ?? 1,
      }));

    if (aEnvoyer.length === 0) {
      setSyncStatus("synced");
      return;
    }

    setSyncStatus("syncing");

    try {
      const res = await sauvegarderFichiersDistants(pId, aEnvoyer);

      if (res.conflict) {
        const local = aEnvoyer.find((f) => f.chemin === res.conflict!.fileName);
        setConflict({
          fileName: res.conflict.fileName,
          localContent: local?.contenu ?? "",
          remoteContent: res.conflict.remoteContent,
          localRev: local?.expectedRev ?? 1,
          remoteRev: res.conflict.remoteRev,
        });
        setSyncStatus("conflict");
        return;
      }

      if (!res.ok || !res.revs) {
        throw new Error(res.error || "Échec de la synchronisation");
      }

      let maxRev = rev;
      for (const f of aEnvoyer) {
        const nouvelle = res.revs[f.chemin];
        if (typeof nouvelle === "number") {
          fileRevs.current[f.chemin] = nouvelle;
          if (nouvelle > maxRev) maxRev = nouvelle;
        }
        syncedContent.current[f.chemin] = f.contenu;
      }

      tentativesReprise.current = 0;
      setRev(maxRev);
      setSyncStatus("synced");

      // Sauvegarder l'état synchronisé dans IndexedDB
      await persistToLocalBuffer({
        syncStatus: "synced",
        rev: maxRev,
        lastServerSyncAt: Date.now(),
      });
    } catch {
      setSyncStatus("error");
      // Reprise automatique avec délai croissant et gigue : évite la tempête de requêtes si le serveur sature.
      tentativesReprise.current += 1;
      if (pendingSyncTimer.current) clearTimeout(pendingSyncTimer.current);
      pendingSyncTimer.current = setTimeout(() => {
        void syncQueueRef.current?.();
      }, delaiReprise(tentativesReprise.current));
    }
  }, [exerciseId, files, persistToLocalBuffer, rev]);

  // Une seule synchronisation à la fois : sinon deux écritures partent avec la même révision
  // locale et la seconde prend la première pour une écriture concurrente (#201).
  const runSyncRef = useRef(runSync);
  runSyncRef.current = runSync;
  const syncQueueRef = useRef<(() => Promise<void>) | null>(null);
  if (!syncQueueRef.current) {
    syncQueueRef.current = createCoalescingQueue(() => runSyncRef.current());
  }
  const triggerSync = useCallback(() => syncQueueRef.current!(), []);

  // 4. Déclenchement de la synchronisation asynchrone vers Supabase (avec debounce configurable et gigue)
  const scheduleRemoteSync = useCallback(() => {
    if (pendingSyncTimer.current) {
      clearTimeout(pendingSyncTimer.current);
    }

    pendingSyncTimer.current = setTimeout(
      () => {
        void triggerSync();
      },
      debounceMs + Math.random() * GIGUE_MAX_MS,
    );
  }, [triggerSync, debounceMs]);

  // 5. Initialisation depuis le tampon local IndexedDB
  useEffect(() => {
    let isCancelled = false;

    async function initBuffer() {
      try {
        const local = await getFromBuffer(exerciseId);
        if (isCancelled) return;
        const snapshot: Record<string, string> = {};

        if (local && local.files && Object.keys(local.files).length > 0) {
          const loadedFiles: Record<string, WorkspaceFile> = {};
          const revs: Record<string, number> = {};

          for (const [name, f] of Object.entries(local.files)) {
            loadedFiles[name] = {
              name: f.name,
              content: f.content,
              type: f.type,
              language: f.language || detectLanguage(name),
            };
            revs[name] = f.rev || 1;
          }

          fileRevs.current = revs;
          for (const [name, f] of Object.entries(loadedFiles)) snapshot[name] = f.content;
          setFiles(loadedFiles);
          setRev(local.rev || 1);
          setBestScore(local.bestScore);
          setLastSavedAt(local.lastLocalSaveAt);
          setSyncStatus(local.syncStatus || "local");
          setIsLateSync(Boolean(local.isLateSync));
          if (local.conflict) setConflict(local.conflict);
          if (local.projetId) projetIdRef.current = local.projetId;
        } else {
          // Premier accès : enregistrement du starter dans IndexedDB
          const initialBufferFiles: Record<string, BufferFile> = {};
          for (const [name, content] of Object.entries(starterFilesRef.current)) {
            initialBufferFiles[name] = {
              name,
              content,
              type: "text",
              language: detectLanguage(name),
              rev: 1,
              updatedAt: Date.now(),
            };
            fileRevs.current[name] = 1;
            snapshot[name] = content;
          }

          const newBuffer: ProjectBuffer = {
            exerciseId,
            files: initialBufferFiles,
            rev: 1,
            syncStatus: "local",
            lastLocalSaveAt: Date.now(),
          };

          await saveToBuffer(newBuffer);
          setLastSavedAt(newBuffer.lastLocalSaveAt);
        }

        // Vérifier si l'élève est connecté pour lier au cloud Supabase
        await checkRemoteSync(exerciseId, snapshot);
      } catch (err) {
        console.warn("[BufferSync] Erreur d'initialisation du tampon local :", err);
      } finally {
        if (!isCancelled) setIsLoaded(true);
      }
    }

    void initBuffer();

    return () => {
      isCancelled = true;
    };
  }, [exerciseId, checkRemoteSync]);

  // 6. Gestion de l'état réseau (en ligne / hors-ligne)
  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true;
      if (syncStatus === "offline" || syncStatus === "pending") {
        void triggerSync();
      }
    };

    const handleOffline = () => {
      isOnline.current = false;
      setSyncStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncStatus, triggerSync]);

  // 6. Modification du contenu d'un fichier (frappe clavier)
  const updateFileContent = useCallback(
    (fileName: string, newContent: string) => {
      setFiles((prev) => {
        const target = prev[fileName];
        if (!target) return prev;
        return {
          ...prev,
          [fileName]: { ...target, content: newContent },
        };
      });

      // Écriture locale instantanée (< 100ms)
      persistToLocalBuffer({ syncStatus: "pending" });

      // Programmation sync distante debounce
      scheduleRemoteSync();
    },
    [persistToLocalBuffer, scheduleRemoteSync],
  );

  // 7. Ajout d'un nouveau fichier ou ressource
  const addNewFile = useCallback(
    (newFile: WorkspaceFile) => {
      fileRevs.current[newFile.name] = 0;
      setFiles((prev) => ({
        ...prev,
        [newFile.name]: newFile,
      }));
      persistToLocalBuffer({ syncStatus: "pending" });
      scheduleRemoteSync();
    },
    [persistToLocalBuffer, scheduleRemoteSync],
  );

  // 8. Suppression d'un fichier
  const removeFile = useCallback(
    (fileName: string) => {
      if (["index.html", "style.css", "script.js"].includes(fileName)) return;
      setFiles((prev) => {
        const next = { ...prev };
        delete next[fileName];
        return next;
      });
      delete fileRevs.current[fileName];
      persistToLocalBuffer({ syncStatus: "pending" });
      scheduleRemoteSync();
    },
    [persistToLocalBuffer, scheduleRemoteSync],
  );

  // 9. Mise à jour de la meilleure note
  const updateBestScore = useCallback(
    (score: number) => {
      setBestScore((prev) => {
        if (prev === undefined || score > prev) {
          persistToLocalBuffer({ bestScore: score });
          return score;
        }
        return prev;
      });
    },
    [persistToLocalBuffer],
  );

  // 10. Résolution explicite de conflit (aucun écrasement silencieux)
  const resolveConflict = async (action: "keep_local" | "keep_remote") => {
    if (!conflict) return;

    if (action === "keep_remote") {
      // Adopter la version du serveur
      setFiles((prev) => {
        const existing = prev[conflict.fileName];
        if (!existing) return prev;
        return {
          ...prev,
          [conflict.fileName]: { ...existing, content: conflict.remoteContent },
        };
      });
      fileRevs.current[conflict.fileName] = conflict.remoteRev;
      syncedContent.current[conflict.fileName] = conflict.remoteContent;
      setRev(conflict.remoteRev);
      setConflict(null);
      setSyncStatus("synced");

      await persistToLocalBuffer({
        syncStatus: "synced",
        rev: conflict.remoteRev,
        conflict: null,
      });
    } else {
      // Forcer la version locale par rapport à la révision distante actuelle (T-18)
      let nextRev = conflict.remoteRev + 1;
      if (projetIdRef.current) {
        const res = await sauvegarderFichierDistant(
          projetIdRef.current,
          conflict.fileName,
          conflict.localContent,
          conflict.remoteRev,
        );
        if (res.ok && res.newRev) {
          nextRev = res.newRev;
          syncedContent.current[conflict.fileName] = conflict.localContent;
        }
      }

      fileRevs.current[conflict.fileName] = nextRev;
      setRev(nextRev);
      setConflict(null);
      setSyncStatus("synced");
      await persistToLocalBuffer({
        syncStatus: "synced",
        rev: nextRev,
        conflict: null,
      });
    }
  };

  return {
    files,
    setFiles,
    updateFileContent,
    addNewFile,
    removeFile,
    syncStatus,
    rev,
    lastSavedAt,
    bestScore,
    updateBestScore,
    conflict,
    resolveConflict,
    isLateSync,
    setIsLateSync,
    triggerManualSync: triggerSync,
    isLoaded,
  };
}
