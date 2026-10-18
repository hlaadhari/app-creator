import React from "react";
import { CheckCircle2, Clock, Play, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ExamSession } from "@/lib/exam/types";

export interface ExamWaitingRoomProps {
  session: ExamSession;
  isTeacher?: boolean;
  connectedStudentsCount?: number;
  onKickoff?: () => void;
  className?: string;
}

export function ExamWaitingRoom({
  session,
  isTeacher = false,
  connectedStudentsCount = 1,
  onKickoff,
  className = "",
}: ExamWaitingRoomProps) {
  return (
    <Card className={`max-w-xl mx-auto border shadow-md bg-card text-card-foreground ${className}`}>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
          <Clock className="h-6 w-6 animate-pulse" />
        </div>
        <Badge variant="outline" className="mx-auto mb-1 text-xs">
          Salle d'Attente Synchronisée Realtime
        </Badge>
        <CardTitle className="text-xl font-bold">{session.titre}</CardTitle>
        <CardDescription className="text-xs">
          Durée réglementaire : {session.dureeMin} minutes • Horloge serveur stricte (PRD F-49 à
          F-53)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {/* Statut de présence */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40 text-xs">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-medium">Élèves connectés dans la salle :</span>
          </div>
          <span className="font-bold text-sm font-mono text-primary">{connectedStudentsCount}</span>
        </div>

        {/* Consignes officielles */}
        <div className="space-y-2 rounded-lg border p-3 bg-muted/20 text-xs">
          <h4 className="font-semibold text-foreground flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Règles officielles de l'épreuve :
          </h4>
          <ul className="space-y-1.5 text-muted-foreground pl-1">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Minuteur certifié :</strong> Le temps imparti est comptabilisé exclusivement
                par l'horloge du serveur Supabase.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Aides désactivées :</strong> Le tuteur IA et le système d'indices sont
                rigoureusement masqués durant l'épreuve.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Verrouillage absolu :</strong> À l'expiration du délai, l'éditeur bascule en
                lecture seule et tout nouvel enregistrement est refusé (T-06).
              </span>
            </li>
          </ul>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-2">
        {isTeacher ? (
          <Button
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            onClick={onKickoff}
          >
            <Play className="h-4 w-4 fill-current" />
            Donner le coup d'envoi simultané à la classe
          </Button>
        ) : (
          <div className="w-full p-3 rounded-md bg-primary/10 text-primary text-center text-xs font-medium animate-pulse">
            En attente du coup d'envoi simultané par votre enseignant...
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
