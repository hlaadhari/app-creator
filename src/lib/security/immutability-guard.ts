/**
 * Labo STI - Immutability UI Helper (T-08 & T-09, PRD §12, docs/SECURITY.md)
 *
 * ⚠️ AVERTISSEMENT D'ARCHITECTURE (TEC-11 / Principe « Zéro Confiance Côté Client ») :
 * Ces fonctions servent uniquement à refléter les règles d'immuabilité dans l'interface client.
 * L'immuabilité réelle des versions publiées (`sujet_versions`) et des `snapshots` d'examen
 * est garantie côté serveur par les triggers PostgreSQL (`protect_published_version`,
 * `protect_published_children`, `empecher_modification_snapshot`) et les RPC `security definer`.
 */

export interface SnapshotRecord {
  id: string;
  eleve_id: string;
  projet_id: string;
  empreinte_sha256: string;
  scelle_le: string;
}

export interface SujetVersionRecord {
  id: string;
  sujet_id: string;
  numero: number;
  publiee: boolean;
  enonce_markdown: string;
}

export class ImmutabilityViolationError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = "IMMUTABILITY_VIOLATION") {
    super(message);
    this.name = "ImmutabilityViolationError";
    this.code = code;
  }
}

/**
 * Gardien de la table des snapshots (T-08).
 * Lève une exception si une mise à jour ou suppression est tentée sur un snapshot existant.
 */
export function verifierMutationSnapshot(
  action: "INSERT" | "UPDATE" | "DELETE",
  existingSnapshot?: SnapshotRecord,
): void {
  if (action === "UPDATE") {
    throw new ImmutabilityViolationError(
      "Violation de sécurité T-08 : Un snapshot scellé est strictement immuable et ne peut pas être modifié.",
      "SNAPSHOT_IMMUTABLE_UPDATE",
    );
  }

  if (action === "DELETE") {
    throw new ImmutabilityViolationError(
      "Violation de sécurité T-08 : Un snapshot scellé ne peut jamais être supprimé pour des raisons d'audit et de preuve.",
      "SNAPSHOT_IMMUTABLE_DELETE",
    );
  }

  if (action === "INSERT" && existingSnapshot) {
    throw new ImmutabilityViolationError(
      "Violation de sécurité T-08 : Un snapshot avec cet identifiant existe déjà.",
      "SNAPSHOT_ALREADY_EXISTS",
    );
  }
}

/**
 * Gardien des versions de sujet (T-09).
 * Lève une exception si une mise à jour ou suppression est tentée sur une version publiée.
 */
export function verifierMutationSujetVersion(
  version: SujetVersionRecord,
  action: "UPDATE" | "DELETE",
): void {
  if (version.publiee) {
    if (action === "UPDATE") {
      throw new ImmutabilityViolationError(
        `Violation de sécurité T-09 : La version ${version.numero} est publiée et ne peut être modifiée. Vous devez créer la version ${version.numero + 1}.`,
        "PUBLISHED_VERSION_IMMUTABLE_UPDATE",
      );
    }

    if (action === "DELETE") {
      throw new ImmutabilityViolationError(
        `Violation de sécurité T-09 : La version ${version.numero} est publiée et ne peut pas être supprimée car des élèves y sont potentiellement rattachés.`,
        "PUBLISHED_VERSION_IMMUTABLE_DELETE",
      );
    }
  }
}
