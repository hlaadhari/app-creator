import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOptionalAuth } from "@/lib/supabase/auth";
import {
  demanderAccesEnseignant,
  deriverEtatDemandeEnseignant,
  getMaDemandeEnseignant,
  type MaDemandeEnseignant,
} from "@/lib/supabase/teacher-requests";

/**
 * Formulaire de demande d'accès enseignant, affiché à un élève connecté.
 * Une demande en attente remplace le formulaire ; une demande refusée affiche le motif.
 * Si une demande figure comme acceptée alors que le rôle dans `user_roles` est toujours `eleve`,
 * propose la resynchronisation ou signale l'incohérence (#200).
 */
export function TeacherAccessRequest() {
  const auth = useOptionalAuth();
  const [demande, setDemande] = useState<MaDemandeEnseignant | null>(null);
  const [chargement, setChargement] = useState(true);
  const [actualisationDroits, setActualisationDroits] = useState(false);
  const [resyncTente, setResyncTente] = useState(false);
  const [etablissement, setEtablissement] = useState("");
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setDemande(await getMaDemandeEnseignant());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger votre demande.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const handleVerifierStatut = async () => {
    setActualisationDroits(true);
    try {
      await Promise.all([charger(), auth ? auth.refreshProfile() : Promise.resolve()]);
      setResyncTente(true);
    } finally {
      setActualisationDroits(false);
    }
  };

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const res = await demanderAccesEnseignant(etablissement, message);
    setEnvoi(false);
    if (!res.success) {
      setErreur(res.error ?? "Envoi impossible.");
      return;
    }
    setEtablissement("");
    setMessage("");
    setResyncTente(false);
    await charger();
  };

  if (chargement) {
    return <p className="text-xs text-muted-foreground">Chargement de votre demande…</p>;
  }

  const roleReel = auth?.role ?? "eleve";
  const etatEffectif = deriverEtatDemandeEnseignant(demande, roleReel, resyncTente);

  if (etatEffectif === "habilite") {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-600 dark:text-emerald-400 space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Demande acceptée : votre habilitation enseignant est validée.</span>
        </div>
      </div>
    );
  }

  if (etatEffectif === "en_attente" && demande) {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-left text-xs space-y-2">
        <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
          <Clock className="w-4 h-4" />
          Demande en attente de validation
        </div>
        <p className="text-muted-foreground">
          Établissement : {demande.etablissement}. Envoyée le{" "}
          {new Date(demande.createdAt).toLocaleDateString()}. Un administrateur la traitera
          prochainement.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleVerifierStatut()}
          disabled={actualisationDroits}
          className="h-7 text-xs gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${actualisationDroits ? "animate-spin" : ""}`} />
          {actualisationDroits ? "Vérification…" : "Vérifier le statut et actualiser mes droits"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer} className="space-y-3 text-left">
      {etatEffectif === "refusee" && demande && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1"
        >
          <div className="flex items-center gap-2 font-semibold text-destructive">
            <XCircle className="w-4 h-4" />
            Votre dernière demande a été refusée
          </div>
          {demande.motifRefus && (
            <p className="text-muted-foreground">Motif : {demande.motifRefus}</p>
          )}
          <p className="text-muted-foreground">Vous pouvez en déposer une nouvelle ci-dessous.</p>
        </div>
      )}
      {(etatEffectif === "acceptee_role_manquant" || etatEffectif === "incoherence_role") && (
        <div
          role="alert"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-2"
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {etatEffectif === "incoherence_role"
                ? "Incohérence détectée : votre rôle effectif est toujours « élève »"
                : "Synchronisation requise : votre rôle actuel dans user_roles est « élève »"}
            </span>
          </div>
          <p className="text-muted-foreground">
            {etatEffectif === "incoherence_role"
              ? "Une demande antérieure figure comme acceptée, mais votre compte ne possède pas le rôle enseignant dans user_roles (habilitation non appliquée ou révoquée). Signalez cette incohérence à un administrateur ou déposez une nouvelle demande ci-dessous."
              : "Une demande antérieure figure comme acceptée, mais votre rôle actif est toujours « élève ». Resynchronisez vos droits ou déposez une nouvelle demande ci-dessous."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleVerifierStatut()}
            disabled={actualisationDroits}
            className="h-7 text-xs gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actualisationDroits ? "animate-spin" : ""}`} />
            {actualisationDroits
              ? "Resynchronisation…"
              : etatEffectif === "incoherence_role"
                ? "Réessayer la synchronisation"
                : "Resynchroniser mes droits"}
          </Button>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="demande-etablissement" className="text-xs font-medium">
          Établissement
        </label>
        <Input
          id="demande-etablissement"
          value={etablissement}
          onChange={(e) => setEtablissement(e.target.value)}
          placeholder="Lycée, ville"
          maxLength={200}
          required
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="demande-message" className="text-xs font-medium">
          Message pour l'administrateur (facultatif)
        </label>
        <Textarea
          id="demande-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Matière enseignée, classes concernées…"
          maxLength={1000}
          rows={3}
        />
      </div>

      {erreur && (
        <p role="alert" className="text-xs text-destructive">
          {erreur}
        </p>
      )}

      <Button type="submit" size="sm" className="w-full" disabled={envoi || !etablissement.trim()}>
        {envoi ? "Envoi…" : "Demander l'accès enseignant"}
      </Button>
    </form>
  );
}
