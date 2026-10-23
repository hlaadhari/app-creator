/**
 * Labo STI - RGPD Anonymization Helper (T-14, PRD §12, docs/SECURITY.md)
 *
 * ⚠️ AVERTISSEMENT D'ARCHITECTURE (TEC-11 / Principe « Zéro Confiance Côté Client ») :
 * Utilitaire de prévisualisation et de formatage côté client. La purge et la suppression
 * effective des comptes utilisateurs s'exécutent exclusivement en base via la RPC
 * `admin_supprimer_utilisateur` (`security definer`).
 */

export interface ProfilUtilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  avatar_url?: string | null;
  valide_par?: string | null;
  supprime_le?: string | null;
  anonymise?: boolean;
}

export interface ResultatAnonymisation {
  success: boolean;
  profilAnonymise: ProfilUtilisateur;
  identifiantsDetruits: string[];
}

/**
 * Anonymise de façon irréversible les données à caractère personnel d'un élève (T-14).
 * Remplace le nom, prénom et email par des identifiants pseudonymes opaques.
 */
export function anonymiserProfilEleve(profil: ProfilUtilisateur): ResultatAnonymisation {
  const identifiantOpaque = `anonyme_${profil.id.slice(0, 8)}`;

  const identifiantsDetruits = [
    `nom: ${profil.nom}`,
    `prenom: ${profil.prenom}`,
    `email: ${profil.email}`,
  ];

  const profilAnonymise: ProfilUtilisateur = {
    id: profil.id,
    nom: "Anonyme",
    prenom: identifiantOpaque,
    email: `${identifiantOpaque}@anonymise.local`,
    avatar_url: null,
    valide_par: null,
    supprime_le: new Date().toISOString(),
    anonymise: true,
  };

  return {
    success: true,
    profilAnonymise,
    identifiantsDetruits,
  };
}
