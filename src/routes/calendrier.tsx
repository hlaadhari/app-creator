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
  anonymiserReservationsPourEleve,
  traduireErreurReservationTp,
} from "@/lib/tp/tp-reservation-service";
import { SeatPicker } from "@/components/tp/SeatPicker";
import { TpSessionManager } from "@/components/tp/TpSessionManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SproutLogo } from "@/components/SproutLogo";
import { AuthModal } from "@/components/AuthModal";
import { AppHeader, MAIN_CONTENT_ID } from "@/components/layout/AppHeader";
import {
  Calendar,
  Clock,
  ArrowLeft,
  RefreshCw,
  Monitor,
  AlertCircle,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Users,
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
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const isTeacherOrAdmin = role === "enseignant" || role === "admin";
  const [viewMode, setViewMode] = useState<"supervision" | "eleve">("supervision");

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

  const currentUserId = user?.id ?? null;

  const myReservation = useMemo(() => {
    if (!selectedSession || !currentUserId) return null;
    return (
      reservations.find(
        (r) => r.sessionId === selectedSession.id && r.studentId === currentUserId,
      ) ?? null
    );
  }, [selectedSession, reservations, currentUserId]);

  const seatGrid: SeatInfo[] = useMemo(() => {
    if (!selectedSession) return [];
    return buildSeatGrid(
      selectedSession,
      anonymiserReservationsPourEleve(reservations, currentUserId),
    );
  }, [selectedSession, reservations, currentUserId]);

  const handleSelectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setErrorMessage(null);
    try {
      const res = await getTpReservations(sessionId);
      setReservations(res);
    } catch {
      setErrorMessage("Impossible de charger l'occupation des postes pour cette séance.");
    }
  };

  const handleRequestReservation = async (seatNumber: number) => {
    if (!selectedSession) return;
    if (!currentUserId) {
      setErrorMessage(
        "Veuillez vous connecter avec votre compte élève pour réserver un poste de TP.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const studentName = profile
      ? `${profile.prenom || ""} ${profile.nom || ""}`.trim()
      : user?.email || undefined;

    try {
      const result = await requestSeatReservation({
        sessionId: selectedSession.id,
        seatNumber,
        studentId: currentUserId,
        studentName,
      });

      if (result.success) {
        const res = await getTpReservations(selectedSession.id);
        const created = result.reservation;
        if (
          created &&
          !res.some((r) => r.id === created.id || r.seatNumber === created.seatNumber)
        ) {
          setReservations([...res, created]);
        } else {
          setReservations(res);
        }
      } else {
        setErrorMessage(
          result.error ||
            "Impossible d'enregistrer votre demande de réservation. Veuillez réessayer.",
        );
      }
    } catch (err) {
      setErrorMessage(traduireErreurReservationTp(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!selectedSession) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await cancelReservation(reservationId, currentUserId ?? undefined);
      if (result.success) {
        const res = await getTpReservations(selectedSession.id);
        setReservations(res.filter((r) => r.id !== reservationId));
      } else {
        setErrorMessage(result.error || "Impossible d'annuler la demande de réservation.");
      }
    } catch (err) {
      setErrorMessage(traduireErreurReservationTp(err));
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
      <AppHeader
        current="calendrier"
        subtitle="Planning TP & Postes"
        actions={
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
        }
      />

      {/* Contenu principal */}
      <main id={MAIN_CONTENT_ID} className="flex-1 mx-auto max-w-6xl w-full px-6 py-8">
        {/* Bandeau de bascule Enseignant / Admin : Supervision & Validation vs Vue Élève */}
        {isTeacherOrAdmin && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    Mode Supervision Enseignant / Admin
                  </span>
                  <Badge className="bg-primary/15 text-primary border border-primary/30 font-mono text-[10px]">
                    Validation des postes TP
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visualisez quel élève occupe chaque poste, validez ou refusez les demandes
                  d'inscription au TP en attente et gérez la capacité de la salle.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-background/80 p-1 rounded-lg border shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("supervision")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === "supervision"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Valider les demandes & Postes</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("eleve");
                  void refreshData();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === "eleve"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Vue Élève</span>
              </button>
            </div>
          </div>
        )}

        {isTeacherOrAdmin && viewMode === "supervision" ? (
          <TpSessionManager teacherId={user?.id} />
        ) : (
          <>
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
              <div
                role="alert"
                data-testid="tp-reservation-error"
                className="mb-6 flex items-center gap-2 p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs"
              >
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
          </>
        )}
      </main>
    </div>
  );
}
