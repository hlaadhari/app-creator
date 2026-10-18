import { useState, useEffect, useRef, useCallback } from "react";
import type { WorkspaceFile } from "@/components/workspace/types";
import type { ProjectBuffer, BufferFile, SyncStatus, ConflictData } from "./types";
import { getFromBuffer, saveToBuffer } from "./indexeddb";
import {
  getOrCreateProjet,
  sauvegarderFichierDistant,
  chargerFichiersDistants,
} from "@/lib/supabase/projets";
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
}

export function useBufferSync({ exerciseId, starterFiles }: UseBufferSyncOptions) {
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
  const isOnline = useRef<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  // 1. Initialisation depuis le tampon local IndexedDB
  useEffect(() => {
    let isCancelled = false;

    async function initBuffer() {
      try {
        const local = await getFromBuffer(exerciseId);
        if (isCancelled) return;

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
          for (const [name, content] of Object.entries(starterFiles)) {
            initialBufferFiles[name] = {
              name,
              content,
              type: "text",
              language: detectLanguage(name),
              rev: 1,
              updatedAt: Date.now(),
            };
            fileRevs.current[name] = 1;
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
        checkRemoteSync(exerciseId);
      } catch (err) {
        console.warn("[BufferSync] Erreur d'initialisation du tampon local :", err);
      } finally {
        if (!isCancelled) setIsLoaded(true);
      }
    }

    initBuffer();

    return () => {
      isCancelled = true;
    };
  }, [exerciseId]);

  // 2. Gestion de l'état réseau (en ligne / hors-ligne)
  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true;
      if (syncStatus === "offline" || syncStatus === "pending") {
        triggerSync();
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
  }, [syncStatus]);

  // 3. Vérification distante lors de la connexion
  const checkRemoteSync = async (exId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Mode invité

      const pId = await getOrCreateProjet(exId);
      if (!pId) return;
      projetIdRef.current = pId;

      // Charger les fichiers distants
      const remoteFiles = await chargerFichiersDistants(pId);
      if (remoteFiles && remoteFiles.length > 0) {
        // Vérifier d'éventuelles différences
        for (const rf of remoteFiles) {
          const currentRev = fileRevs.current[rf.chemin] || 1;
          if (rf.rev > currentRev) {
            // Version distante plus récente
            setConflict({
              fileName: rf.chemin,
              localContent: files[rf.chemin]?.content || "",
              remoteContent: rf.contenu,
              localRev: currentRev,
              remoteRev: rf.rev,
              remoteUpdatedAt: rf.updated_at,
            });
            setSyncStatus("conflict");
            return;
          }
        }
        setSyncStatus("synced");
      }
    } catch {
      // Ignorer si offline
    }
  };

  // 4. Déclenchement de la synchronisation asynchrone vers Supabase (avec debounce 1s)
  const scheduleRemoteSync = useCallback(() => {
    if (pendingSyncTimer.current) {
      clearTimeout(pendingSyncTimer.current);
    }

    pendingSyncTimer.current = setTimeout(() => {
      triggerSync();
    }, 1000);
  }, [files]);

  // Synchronisation effective
  const triggerSync = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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

    setSyncStatus("syncing");

    try {
      let maxRev = rev;
      let hadConflict = false;

      for (const [name, file] of Object.entries(files)) {
        if (file.type !== "text") continue; // On ne synchronise que les fichiers texte en phase actuelle

        const expectedRev = fileRevs.current[name] || 1;
        const res = await sauvegarderFichierDistant(pId, name, file.content, expectedRev);

        if (res.conflict) {
          hadConflict = true;
          setConflict({
            fileName: name,
            localContent: file.content,
            remoteContent: res.remoteContent || "",
            localRev: expectedRev,
            remoteRev: res.remoteRev || expectedRev + 1,
          });
          setSyncStatus("conflict");
          break;
        }

        if (res.ok && res.newRev) {
          fileRevs.current[name] = res.newRev;
          if (res.newRev > maxRev) maxRev = res.newRev;
        }
      }

      if (!hadConflict) {
        setRev(maxRev);
        setSyncStatus("synced");

        // Sauvegarder l'état synchronisé dans IndexedDB
        persistToLocalBuffer({
          syncStatus: "synced",
          rev: maxRev,
          lastServerSyncAt: Date.now(),
        });
      }
    } catch {
      setSyncStatus("error");
    }
  };

  // 5. Écriture immédiate locale (< 100ms) dans IndexedDB
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
          rev: fileRevs.current[name] || 1,
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
    [exerciseId, files, bestScore, rev, syncStatus, isLateSync, conflict]
  );

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
    [persistToLocalBuffer, scheduleRemoteSync]
  );

  // 7. Ajout d'un nouveau fichier ou ressource
  const addNewFile = useCallback(
    (newFile: WorkspaceFile) => {
      fileRevs.current[newFile.name] = 1;
      setFiles((prev) => ({
        ...prev,
        [newFile.name]: newFile,
      }));
      persistToLocalBuffer({ syncStatus: "pending" });
      scheduleRemoteSync();
    },
    [persistToLocalBuffer, scheduleRemoteSync]
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
    [persistToLocalBuffer, scheduleRemoteSync]
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
    [persistToLocalBuffer]
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
      setRev(conflict.remoteRev);
      setConflict(null);
      setSyncStatus("synced");

      await persistToLocalBuffer({
        syncStatus: "synced",
        rev: conflict.remoteRev,
        conflict: null,
      });
    } else {
      // Forcer la version locale avec incrémentation de révision
      const forcedRev = conflict.remoteRev + 1;
      fileRevs.current[conflict.fileName] = forcedRev;
      setRev(forcedRev);
      setConflict(null);

      if (projetIdRef.current) {
        await sauvegarderFichierDistant(
          projetIdRef.current,
          conflict.fileName,
          conflict.localContent,
          forcedRev
        );
      }

      setSyncStatus("synced");
      await persistToLocalBuffer({
        syncStatus: "synced",
        rev: forcedRev,
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
