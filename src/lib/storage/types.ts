export type SyncStatus =
  | "local" // Sauvegardé uniquement dans IndexedDB local (ex: anonyme ou hors-ligne)
  | "pending" // Modifié localement, en attente de synchronisation distante
  | "syncing" // Synchronisation distante en cours vers Supabase
  | "synced" // Parfaitement synchronisé avec Supabase
  | "conflict" // Conflit de révision (version serveur plus récente)
  | "offline" // Réseau déconnecté, buffer local actif
  | "error"; // Erreur lors de la synchronisation

export interface BufferFile {
  name: string;
  content: string;
  type: "text" | "asset";
  language?: "html" | "css" | "javascript" | "php" | "sql" | undefined;
  rev: number;
  updatedAt: number;
  dataBase64?: string | undefined;
}

export interface ConflictData {
  fileName: string;
  localContent: string;
  remoteContent: string;
  localRev: number;
  remoteRev: number;
  remoteUpdatedAt?: string | undefined;
}

export interface ProjectBuffer {
  exerciseId: string;
  userId?: string | null | undefined;
  projetId?: string | null | undefined;
  files: Record<string, BufferFile>;
  bestScore?: number | undefined;
  rev: number;
  syncStatus: SyncStatus;
  lastLocalSaveAt: number;
  lastServerSyncAt?: number | null | undefined;
  isLateSync?: boolean | undefined; // PRD F-20, F-52 : Tolérance de synchronisation tardive (examen / coupure)
  conflict?: ConflictData | null | undefined;
}
