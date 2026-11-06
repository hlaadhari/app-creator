import React, { useState, useEffect, useMemo } from "react";
import {
  type TpSession,
  type TpReservation,
  type SeatInfo,
  getTpSessions,
  getTpReservations,
  createTpSession,
  updateTpSessionCapacity,
  updateTpSessionStatus,
  approveReservation,
  rejectReservation,
  batchApproveReservations,
  buildSeatGrid,
} from "@/lib/tp/tp-reservation-service";
import { ApprovalList } from "./ApprovalList";
import { SeatGridAdmin } from "./SeatGridAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Monitor,
  Plus,
  RefreshCw,
  Users,
  Calendar,
  AlertTriangle,
  Play,
  CheckSquare,
  Settings,
} from "lucide-react";

interface TpSessionManagerProps {
  currentClassId?: string | undefined;
  teacherId?: string | undefined;
}

export function TpSessionManager({ currentClassId, teacherId }: TpSessionManagerProps) {
  const [sessions, setSessions] = useState<TpSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [reservations, setReservations] = useState<TpReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Formulaire création
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMaxSeats, setNewMaxSeats] = useState(18);
  const [newSujetId, setNewSujetId] = useState("bac2025_sujet");

  // Édition de capacité
  const [isEditingCapacity, setIsEditingCapacity] = useState(false);
  const [editedCapacity, setEditedCapacity] = useState(18);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const sess = await getTpSessions(currentClassId);
      setSessions(sess);
      if (sess.length > 0) {
        const active = sess.find((s) => s.id === selectedSessionId) || sess[0];
        if (active) {
          setSelectedSessionId(active.id);
          setEditedCapacity(active.maxSeats);
          const res = await getTpReservations(active.id);
          setReservations(res);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getTpSessions(currentClassId)
      .then(async (sess) => {
        if (!isMounted) return;
        setSessions(sess);
        if (sess.length > 0) {
          const active = sess[0];
          if (active) {
            setSelectedSessionId(active.id);
            setEditedCapacity(active.maxSeats);
            const res = await getTpReservations(active.id);
            if (isMounted) setReservations(res);
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [currentClassId]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? sessions[0] ?? null,
    [sessions, selectedSessionId],
  );

  const seatGrid: SeatInfo[] = useMemo(() => {
    if (!selectedSession) return [];
    return buildSeatGrid(selectedSession, reservations);
  }, [selectedSession, reservations]);

  const approvedCount = useMemo(
    () => reservations.filter((r) => r.status === "approved").length,
    [reservations],
  );

  const handleSelectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const target = sessions.find((s) => s.id === sessionId);
    if (target) {
      setEditedCapacity(target.maxSeats);
    }
    const res = await getTpReservations(sessionId);
    setReservations(res);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsProcessing(true);
    try {
      const created = await createTpSession({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        classId: currentClassId,
        sujetId: newSujetId,
        maxSeats: Number(newMaxSeats) || 18,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3 * 3600000).toISOString(),
        createdBy: teacherId,
      });

      setSessions((prev) => [created, ...prev]);
      setSelectedSessionId(created.id);
      setReservations([]);
      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCapacity = async () => {
    if (!selectedSession) return;
    setIsProcessing(true);
    try {
      const result = await updateTpSessionCapacity(selectedSession.id, editedCapacity);
      if (result.success) {
        setSessions((prev) =>
          prev.map((s) => (s.id === selectedSession.id ? { ...s, maxSeats: result.maxSeats } : s)),
        );
        setIsEditingCapacity(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleLiveStatus = async () => {
    if (!selectedSession) return;
    const nextStatus = selectedSession.status === "live" ? "completed" : "live";
    setIsProcessing(true);
    try {
      const result = await updateTpSessionStatus(selectedSession.id, nextStatus);
      if (result.success) {
        setSessions((prev) =>
          prev.map((s) => (s.id === selectedSession.id ? { ...s, status: nextStatus } : s)),
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (reservationId: string) => {
    setIsProcessing(true);
    try {
      const result = await approveReservation(reservationId);
      if (result.success && selectedSession) {
        const res = await getTpReservations(selectedSession.id);
        setReservations(res);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (reservationId: string) => {
    setIsProcessing(true);
    try {
      const result = await rejectReservation(reservationId);
      if (result.success && selectedSession) {
        const res = await getTpReservations(selectedSession.id);
        setReservations(res);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchApprove = async () => {
    if (!selectedSession) return;
    setIsProcessing(true);
    try {
      await batchApproveReservations(selectedSession.id);
      const res = await getTpReservations(selectedSession.id);
      setReservations(res);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
        <span>Chargement des sessions de TP et des réservations de postes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barre d'action supérieure */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            <span>Gestion des Séances & Attribution des Postes TP</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configurez la capacité limite de chaque salle et validez les demandes d'accès aux
            postes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading || isProcessing}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Actualiser</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-1.5 text-xs bg-primary text-primary-foreground cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Créer un créneau TP</span>
          </Button>
        </div>
      </div>

      {/* Sélecteur de session active */}
      {sessions.length > 0 && selectedSession && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border bg-card">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Séance active :
              </span>
              <select
                value={selectedSession.id}
                onChange={(e) => handleSelectSession(e.target.value)}
                className="bg-background border rounded-md px-2.5 py-1 text-sm font-medium focus:ring-1 focus:ring-primary outline-hidden"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.maxSeats} postes)
                  </option>
                ))}
              </select>

              <Badge
                variant={
                  selectedSession.status === "live"
                    ? "default"
                    : selectedSession.status === "scheduled"
                      ? "outline"
                      : "secondary"
                }
                className="text-xs font-mono capitalize"
              >
                {selectedSession.status === "live"
                  ? "🔴 En cours"
                  : selectedSession.status === "scheduled"
                    ? "Planifiée"
                    : "Terminée"}
              </Badge>
            </div>
            {selectedSession.description && (
              <p className="text-xs text-muted-foreground mt-1">{selectedSession.description}</p>
            )}
          </div>

          {/* Configuration Capacité Limite & Statut Direct */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-muted/40 text-xs">
              <span className="text-muted-foreground">Capacité :</span>
              {isEditingCapacity ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={editedCapacity}
                    onChange={(e) => setEditedCapacity(Number(e.target.value))}
                    className="h-7 w-16 text-center text-xs font-mono p-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveCapacity}
                    disabled={isProcessing}
                    className="h-7 px-2 text-[11px] bg-primary text-primary-foreground cursor-pointer"
                  >
                    OK
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-foreground">
                    {selectedSession.maxSeats} postes
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingCapacity(true)}
                    className="text-primary hover:underline text-[11px] ml-1 cursor-pointer"
                  >
                    Modifier
                  </button>
                </div>
              )}
            </div>

            <Button
              size="sm"
              variant={selectedSession.status === "live" ? "destructive" : "default"}
              onClick={handleToggleLiveStatus}
              disabled={isProcessing}
              className="gap-1.5 text-xs cursor-pointer"
            >
              {selectedSession.status === "live" ? (
                <>
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>Clôturer le TP</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Démarrer la session en direct</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Modal création créneau TP */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-foreground mb-1">Créer une Séance de TP</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Fixez le titre, le sujet et la capacité limite de postes pour vos élèves.
            </p>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Titre de la séance TP *
                </label>
                <Input
                  required
                  placeholder="Ex: TP Bac STI 2025 - Épreuve Pratique B12"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Description / Consignes de salle
                </label>
                <Input
                  placeholder="Ex: Salle Informatique B12 - Durée 1h30"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Nombre max de sièges *
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={newMaxSeats}
                    onChange={(e) => setNewMaxSeats(Number(e.target.value))}
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    (Ex: 12, 18 ou 25)
                  </span>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Sujet support
                  </label>
                  <select
                    value={newSujetId}
                    onChange={(e) => setNewSujetId(e.target.value)}
                    className="w-full bg-background border rounded-md px-2.5 py-2 text-xs focus:ring-1 focus:ring-primary outline-hidden"
                  >
                    <option value="bac2025_sujet">Bac 2025 (AgVoy)</option>
                    <option value="bac2024_sujet">Bac 2024 (Locations)</option>
                    <option value="bac2023_sujet">Bac 2023 (Véhicules)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isProcessing || !newTitle.trim()}
                  className="bg-primary text-primary-foreground"
                >
                  Créer la séance
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contenu principal : Panneau de validation des demandes & Plan de salle */}
      {selectedSession ? (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            <ApprovalList
              reservations={reservations}
              maxSeats={selectedSession.maxSeats}
              approvedCount={approvedCount}
              onApprove={handleApprove}
              onReject={handleReject}
              onBatchApprove={handleBatchApprove}
              isProcessing={isProcessing}
            />
          </div>

          <div className="lg:col-span-6 space-y-6">
            <SeatGridAdmin
              session={selectedSession}
              seats={seatGrid}
              onApproveSeat={handleApprove}
              onRejectSeat={handleReject}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Aucune séance de TP configurée. Cliquez sur "Créer un créneau TP" pour débuter.
        </div>
      )}
    </div>
  );
}
