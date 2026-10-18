import * as React from "react";
import {
  HardDrive,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  CloudOff,
  Loader2,
  Clock,
  RefreshCw,
} from "lucide-react";
import type { SyncStatus } from "@/lib/storage/types";

interface SyncStatusBarProps {
  status: SyncStatus;
  rev: number;
  lastSavedAt: number | null;
  cursorPos: { line: number; col: number };
  activeFileName: string;
  isLateSync?: boolean;
  onConflictClick?: () => void;
  onManualSync?: () => void;
}

export function SyncStatusBar({
  status,
  rev,
  lastSavedAt,
  cursorPos,
  activeFileName,
  isLateSync = false,
  onConflictClick,
  onManualSync,
}: SyncStatusBarProps) {
  // Formatage de l'horodatage
  const formatTime = (ts: number | null) => {
    if (!ts) return "Non sauvegardé";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getStatusBadge = () => {
    switch (status) {
      case "syncing":
        return (
          <span className="flex items-center gap-1.5 text-blue-500 font-medium">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Synchronisation...</span>
          </span>
        );
      case "synced":
        return (
          <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            <span>Synchronisé cloud (rev {rev})</span>
          </span>
        );
      case "conflict":
        return (
          <button
            type="button"
            onClick={onConflictClick}
            className="flex items-center gap-1.5 text-amber-500 hover:text-amber-600 font-semibold cursor-pointer animate-pulse underline"
            title="Cliquer pour résoudre le conflit de révision"
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Conflit détecté (cliquer)</span>
          </button>
        );
      case "offline":
        return (
          <span className="flex items-center gap-1.5 text-amber-500">
            <CloudOff className="h-3 w-3" />
            <span>Hors-ligne (tampon IndexedDB actif)</span>
          </span>
        );
      case "error":
        return (
          <button
            type="button"
            onClick={onManualSync}
            className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
            title="Réessayer la synchronisation"
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Erreur réseau (réessayer)</span>
          </button>
        );
      case "local":
      case "pending":
      default:
        return (
          <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
            <HardDrive className="h-3 w-3" />
            <span>Tampon local garanti (IndexedDB)</span>
          </span>
        );
    }
  };

  return (
    <footer className="h-6 shrink-0 bg-background border-t border-border px-3 flex items-center justify-between text-[11px] text-muted-foreground select-none">
      <div className="flex items-center gap-4">
        {/* Statut de synchronisation */}
        <div className="flex items-center gap-2">
          {getStatusBadge()}
        </div>

        {/* Tolérance de synchronisation tardive (PRD F-20, F-52) */}
        {isLateSync && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium text-[10px]" title="Modifications enregistrées localement après l'échéance ou pendant une coupure, tolérées avec marquage d'audit">
            <Clock className="h-2.5 w-2.5" />
            Sync tardive tolérée
          </span>
        )}

        {/* Dernier horodatage local */}
        <span className="text-muted-foreground/80">
          Enregistré : {formatTime(lastSavedAt)}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Curseur et fichier actif */}
        <span>
          {activeFileName}
        </span>
        <span className="font-mono">
          Ln {cursorPos.line}, Col {cursorPos.col}
        </span>
        <span>UTF-8</span>
        <span className="font-semibold text-foreground/80">Labo STI v3.1</span>
      </div>
    </footer>
  );
}
