import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  demanderAccesEnseignant,
  getMaDemandeEnseignant,
  type MaDemandeEnseignant,
} from "@/lib/supabase/teacher-requests";

/**
 * Formulaire de demande d'accès enseignant, affiché à un élève connecté.
 * Une demande en attente remplace le formulaire ; une demande refusée affiche le motif.
 */
export function TeacherAccessRequest() {
  const [demande, setDemande] = useState<MaDemandeEnseignant | null>(null);
  const [chargement, setChargement] = useState(true);
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
    await charger();
  };

  if (chargement) {
    return <p className="text-xs text-muted-foreground">Chargement de votre demande…</p>;
  }

  if (demande?.statut === "en_attente") {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-left text-xs space-y-1">
        <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
          <Clock className="w-4 h-4" />
          Demande en attente de validation
        </div>
        <p className="text-muted-foreground">
          Établissement : {demande.etablissement}. Envoyée le{" "}
          {new Date(demande.createdAt).toLocaleDateString()}. Un administrateur la traitera
          prochainement ; reconnectez-vous ensuite.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer} className="space-y-3 text-left">
      {demande?.statut === "refusee" && (
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
      {demande?.statut === "acceptee" && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          Demande acceptée : reconnectez-vous pour accéder à l'espace enseignant.
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
