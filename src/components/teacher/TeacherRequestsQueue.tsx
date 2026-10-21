import React, { useState } from "react";
import { Check, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  adminTraiterDemandeEnseignant,
  type DemandeEnseignant,
} from "@/lib/supabase/teacher-requests";

interface TeacherRequestsQueueProps {
  demandes: DemandeEnseignant[];
  onProcessed: (message: string) => void;
}

/**
 * File des demandes d'accès enseignant (administrateurs) : acceptation en un clic,
 * refus avec motif obligatoire (affiché ensuite au demandeur).
 */
export function TeacherRequestsQueue({ demandes, onProcessed }: TeacherRequestsQueueProps) {
  const enAttente = demandes.filter((d) => d.statut === "en_attente");
  const [aRefuser, setARefuser] = useState<DemandeEnseignant | null>(null);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  if (enAttente.length === 0) return null;

  const accepter = async (d: DemandeEnseignant) => {
    setOccupe(true);
    const res = await adminTraiterDemandeEnseignant(d.id, true);
    setOccupe(false);
    onProcessed(
      res.success
        ? `Demande acceptée : ${d.prenom} ${d.nom} est maintenant enseignant.`
        : (res.error ?? "Erreur lors du traitement de la demande."),
    );
  };

  const refuser = async () => {
    if (!aRefuser) return;
    setErreur(null);
    setOccupe(true);
    const res = await adminTraiterDemandeEnseignant(aRefuser.id, false, motif);
    setOccupe(false);
    if (!res.success) {
      setErreur(res.error ?? "Erreur lors du refus.");
      return;
    }
    const nom = `${aRefuser.prenom} ${aRefuser.nom}`;
    setARefuser(null);
    setMotif("");
    onProcessed(`Demande de ${nom} refusée.`);
  };

  return (
    <>
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            <span>Demandes d'accès Enseignant à valider ({enAttente.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {enAttente.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 border rounded p-3 bg-card"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="font-semibold text-sm">
                  {d.prenom} {d.nom}
                </div>
                <div className="text-xs text-muted-foreground font-mono">{d.email}</div>
                <div className="text-xs">Établissement : {d.etablissement}</div>
                {d.message && (
                  <div className="text-[11px] text-muted-foreground whitespace-pre-line">
                    {d.message}
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground">
                  Demandée le {new Date(d.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={occupe}
                  onClick={() => void accepter(d)}
                  className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accepter</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={occupe}
                  onClick={() => {
                    setErreur(null);
                    setMotif("");
                    setARefuser(d);
                  }}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Refuser</span>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog
        open={aRefuser !== null}
        onOpenChange={(ouvert) => {
          if (!ouvert) setARefuser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande ?</DialogTitle>
            <DialogDescription>
              {aRefuser &&
                `${aRefuser.prenom} ${aRefuser.nom} verra ce motif et pourra déposer une nouvelle demande.`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Motif du refus (5 caractères minimum)"
            aria-label="Motif du refus"
            rows={3}
          />
          {erreur && (
            <p role="alert" className="text-xs text-destructive">
              {erreur}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setARefuser(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={occupe || motif.trim().length < 5}
              onClick={() => void refuser()}
            >
              Refuser la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
