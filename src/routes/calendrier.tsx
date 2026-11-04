import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/supabase/auth";
import {
  type TpSession,
  type TpReservation,
  type SeatInfo,
  getTpSessions,
  getTpReservations,
  requestSeatReservation,
  cancelReservation,
  buildSeatGrid,
  canAccessIde,
} from "@/lib/tp/tp-reservation-service";
import { SeatPicker } from "@/components/tp/SeatPicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SproutLogo } from "@/components/SproutLogo";
import { AuthModal } from "@/components/AuthModal";
import {
  Calendar,
  Clock,
  ArrowLeft,
  RefreshCw,
  Monitor,
  AlertCircle,
  GraduationCap,
  BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/calendrier")({
  head: () => ({
    meta: [
      { title: "Planning des Séances TP & Réservation de Postes – Labo STI" },
      {
        name: "description",
        content:
          "Réservation de postes en salle de TP et validation d'accès par l'enseignant pour le Bac STI.",
      },
    ],
  }),
  component: CalendrierPage,
});

function CalendrierPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<TpSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [reservations, setReservations] = useState<TpReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const allSessions = await getTpSessions();
      setSessions(allSessions);
      if (allSessions.length > 0) {
        const active = allSessions.find((s) => s.id === selectedSessionId) || allSessions[0];
        if (active) {
          setSelectedSessionId(active.id);
          const res = await getTpReservations(active.id);
          setReservations(res);
        }
      }
    } catch {
      setErrorMessage("Erreur lors de la récupération des séances de TP.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    getTpSessions()
      .then(async (allSessions) => {
        if (!isMounted) return;
        setSessions(allSessions);
        if (allSessions.length > 0) {
          const active = allSessions[0];
          if (active) {
            setSelectedSessionId(active.id);
            const res = await getTpReservations(active.id);
            if (isMounted) setReservations(res);
          }
        }
      })
      .catch(() => {
        if (isMounted) setErrorMessage("Erreur lors de la récupération des séances de TP.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? sessions[0] ?? null,
    [sessions, selectedSessionId],
  );

  const myReservation = useMemo(() => {
    if (!selectedSession) return null;
    const currentUserId = user?.id || "demo-s1"; // Mode démo / visiteur
    return (
      reservations.find(
        (r) => r.sessionId === selectedSession.id && r.studentId === currentUserId,
      ) ?? null
    );
  }, [selectedSession, reservations, user]);

  const seatGrid: SeatInfo[] = useMemo(() => {
    if (!selectedSession) return [];
    return buildSeatGrid(selectedSession, reservations);
  }, [selectedSession, reservations]);

  const handleSelectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setErrorMessage(null);
    const res = await getTpReservations(sessionId);
    setReservations(res);
  };

  const handleRequestReservation = async (seatNumber: number) => {
    if (!selectedSession) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const studentId = user?.id || "demo-s1";
    const studentName = profile
      ? `${profile.prenom || ""} ${profile.nom || ""}`.trim()
      : user?.email || "Élève Invité";

    try {
      const result = await requestSeatReservation({
        sessionId: selectedSession.id,
        seatNumber,
        studentId,
        studentName,
      });

      if (result.success) {
        const res = await getTpReservations(selectedSession.id);
        setReservations(res);
      } else if (result.error) {
        setErrorMessage(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!selectedSession) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await cancelReservation(reservationId, user?.id);
      if (result.success) {
        const res = await getTpReservations(selectedSession.id);
        setReservations(res);
      } else if (result.error) {
        setErrorMessage(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLaunchIde = () => {
    if (!myReservation || !canAccessIde(myReservation)) {
      setErrorMessage("Accès bloqué : votre poste n'a pas encore été validé par l'enseignant.");
      return;
    }

    const targetSubject = selectedSession?.sujetId || "bac2025_sujet";
    navigate({
      to: "/sujet/$id",
      params: { id: targetSubject },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* En-tête de navigation */}
      <header className="border-b px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Accueil</span>
          </Link>
          <span className="text-muted-foreground">/</span>
          <SproutLogo size="sm" subtitle="Planning TP & Postes" />
        </div>

        <div className="flex items-center gap-3">
          <Link to="/cours">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-foreground border-border hover:bg-accent/40"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Mémento STI</span>
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={refreshData}
            disabled={isLoading || isSubmitting}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>

          <AuthModal />
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              Réservation de Poste en Salle de TP
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Choisissez un poste informatique dans la salle de TP. L'accès à l'IDE d'épreuve est
            définitivement débloqué une fois votre demande approuvée par votre enseignant.
          </p>
        </div>

        {/* Message d'erreur s'il y a lieu */}
        {errorMessage && (
          <div className="mb-6 flex items-center gap-2 p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Sélecteur de séances de TP */}
        {sessions.length > 0 && selectedSession ? (
          <div className="space-y-6">
            {/* Barre de sélection de séance */}
            <div className="p-4 rounded-lg border bg-card/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Séance :
                </span>
                <select
                  value={selectedSession.id}
                  onChange={(e) => handleSelectSession(e.target.value)}
                  className="bg-background border rounded-md px-3 py-1.5 text-sm font-medium focus:ring-1 focus:ring-primary outline-hidden"
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
                    ? "🔴 Session En Direct"
                    : selectedSession.status === "scheduled"
                      ? "Session Planifiée"
                      : "Session Clôturée"}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>
                  {new Date(selectedSession.startTime).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(selectedSession.endTime).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* Sélecteur de siège interactif */}
            <SeatPicker
              session={selectedSession}
              seats={seatGrid}
              myReservation={myReservation}
              onRequestReservation={handleRequestReservation}
              onCancelReservation={handleCancelReservation}
              onLaunchIde={handleLaunchIde}
              isSubmitting={isSubmitting}
            />
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>Chargement du planning de TP...</span>
              </div>
            ) : (
              <div>Aucune séance de TP programmée pour le moment.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
