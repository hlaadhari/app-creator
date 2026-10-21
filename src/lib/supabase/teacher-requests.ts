/**
 * Labo STI - Demande d'accès enseignant (PRD §4.1, SECURITY T-03)
 * Un élève dépose une demande ; un administrateur l'accepte ou la refuse avec un motif.
 */

import { supabase } from "@/integrations/supabase/client";
import { messageErreurAdmin } from "@/lib/supabase/admin";

export type StatutDemande = "en_attente" | "acceptee" | "refusee";

export interface DemandeEnseignant {
  id: string;
  userId: string;
  email: string;
  nom: string;
  prenom: string;
  etablissement: string;
  message: string;
  statut: StatutDemande;
  motifRefus: string | null;
  createdAt: string;
  traiteeAt: string | null;
}

export interface MaDemandeEnseignant {
  id: string;
  etablissement: string;
  statut: StatutDemande;
  motifRefus: string | null;
  createdAt: string;
}

const MESSAGES_ERREUR_DEMANDE: Record<string, string> = {
  non_connecte: "Connectez-vous pour envoyer une demande.",
  deja_enseignant: "Votre compte a déjà accès à l'espace enseignant.",
  etablissement_requis: "Indiquez votre établissement.",
  demande_deja_en_attente: "Une demande est déjà en attente de validation.",
  demande_introuvable_ou_traitee: "Cette demande a déjà été traitée ou n'existe plus.",
  motif_refus_requis: "Indiquez un motif de refus d'au moins 5 caractères.",
};

function messageErreurDemande(message?: string): string {
  const code = Object.keys(MESSAGES_ERREUR_DEMANDE).find((c) => message?.includes(c));
  return code ? (MESSAGES_ERREUR_DEMANDE[code] as string) : messageErreurAdmin(message);
}

function enStatut(valeur: string): StatutDemande {
  return valeur === "acceptee" || valeur === "refusee" ? valeur : "en_attente";
}

/**
 * Dépose une demande d'accès enseignant pour l'utilisateur connecté.
 */
export async function demanderAccesEnseignant(
  etablissement: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc("demander_acces_enseignant", {
    _etablissement: etablissement,
    _message: message,
  });
  if (error) {
    return { success: false, error: messageErreurDemande(error.message) };
  }
  return { success: true };
}

/**
 * Dernière demande de l'utilisateur connecté (null s'il n'en a jamais déposé).
 */
export async function getMaDemandeEnseignant(): Promise<MaDemandeEnseignant | null> {
  const { data, error } = await supabase
    .from("demandes_enseignant")
    .select("id, etablissement, statut, motif_refus, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(messageErreurDemande(error.message));
  }
  if (!data) return null;
  return {
    id: data.id,
    etablissement: data.etablissement,
    statut: enStatut(data.statut),
    motifRefus: data.motif_refus,
    createdAt: data.created_at,
  };
}

/**
 * Liste des demandes (administrateurs) : en attente d'abord, puis les plus récentes.
 */
export async function adminListerDemandesEnseignant(): Promise<DemandeEnseignant[]> {
  const { data, error } = await supabase.rpc("admin_lister_demandes_enseignant");
  if (error) {
    throw new Error(messageErreurDemande(error.message));
  }
  return (data ?? []).map((d) => ({
    id: d.id,
    userId: d.user_id,
    email: d.email,
    nom: d.nom,
    prenom: d.prenom,
    etablissement: d.etablissement,
    message: d.message,
    statut: enStatut(d.statut),
    motifRefus: d.motif_refus,
    createdAt: d.created_at,
    traiteeAt: d.traitee_at,
  }));
}

/**
 * Accepte (le compte devient enseignant) ou refuse (motif obligatoire) une demande.
 */
export async function adminTraiterDemandeEnseignant(
  demandeId: string,
  accepter: boolean,
  motif?: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc("admin_traiter_demande_enseignant", {
    _demande_id: demandeId,
    _accepter: accepter,
    ...(motif !== undefined ? { _motif: motif } : {}),
  });
  if (error) {
    return { success: false, error: messageErreurDemande(error.message) };
  }
  return { success: true };
}
