/**
 * Labo STI - Moteur de Scellement Cryptographique des Snapshots (PRD F-54, F-55, T-08, §10)
 *
 * Fige la copie élève dans un snapshot immuable certifié par empreinte SHA-256 canonique.
 */

import {
  type SnapshotFichierManifeste,
  type SnapshotBaseManifeste,
  type SnapshotManifeste,
  type VerificationIntegriteResult,
} from "./types";
import { creerArchiveZip, type ArchiveFileEntry } from "@/lib/export/archive-exporter";

/**
 * Calcule l'empreinte SHA-256 canonique (hexadécimal 64 caractères)
 * Fonctionne dans tous les environnements standards (Navigateur Web Crypto, Node >= 18, Bun).
 */
export async function computeSha256(data: string | Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = typeof data === "string" ? encoder.encode(data) : data;
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", buffer as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Normalise un chemin de fichier pour garantir le déterminisme de l'arborescence
 */
export function normaliserCheminFichier(chemin: string): string {
  return chemin
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .trim();
}

/**
 * Sérialise un objet JSON avec des clés triées récursivement pour un hachage canonique strict
 */
export function serialiserJsonCanonique(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return "[" + obj.map(serialiserJsonCanonique).join(",") + "]";
  }

  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map((key) => {
    const val = (obj as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${serialiserJsonCanonique(val)}`;
  });

  return "{" + pairs.join(",") + "}";
}

export interface CreerSnapshotInput {
  sujetId: string;
  versionId: string;
  eleveId: string;
  projetId: string;
  passageId?: string | null;
  fichiers: Record<string, string | Uint8Array>;
  baseDonnees?: {
    tables: string[];
    dumpSql: string;
  } | null;
  horodatageServeur?: string;
}

/**
 * Scelle cryptographiquement une copie d'examen en calculant les empreintes SHA-256
 * de chaque fichier et l'empreinte racine composite du manifeste.
 */
export async function scellerSnapshot(input: CreerSnapshotInput): Promise<SnapshotManifeste> {
  const horodatageServeur = input.horodatageServeur || new Date().toISOString();
  const fichiersNormalises: SnapshotFichierManifeste[] = [];

  // 1. Trier les fichiers par chemin normalisé alphabétique
  const chemins = Object.keys(input.fichiers).sort((a, b) =>
    normaliserCheminFichier(a).localeCompare(normaliserCheminFichier(b))
  );

  const encoder = new TextEncoder();

  for (const cheminBrut of chemins) {
    const chemin = normaliserCheminFichier(cheminBrut);
    const contenu = input.fichiers[cheminBrut] ?? "";
    const bytes = typeof contenu === "string" ? encoder.encode(contenu) : contenu;
    const sha256 = await computeSha256(bytes);

    fichiersNormalises.push({
      chemin,
      taille: bytes.byteLength,
      sha256,
    });
  }

  // 2. Traitement de la base de données SQL si présente
  let baseManifeste: SnapshotBaseManifeste | null = null;
  if (input.baseDonnees && input.baseDonnees.dumpSql.trim().length > 0) {
    const dumpBytes = encoder.encode(input.baseDonnees.dumpSql);
    const sha256 = await computeSha256(dumpBytes);
    baseManifeste = {
      tables: [...input.baseDonnees.tables].sort(),
      dumpSql: input.baseDonnees.dumpSql,
      sha256,
      taille: dumpBytes.byteLength,
    };
  }

  // 3. Construction de l'objet de scellement canonique
  const payloadSansRoot = {
    versionSpec: "1.0" as const,
    sujetId: input.sujetId,
    versionId: input.versionId,
    eleveId: input.eleveId,
    projetId: input.projetId,
    passageId: input.passageId ?? null,
    horodatageServeur,
    fichiers: fichiersNormalises,
    baseDonnees: baseManifeste,
  };

  const jsonCanonique = serialiserJsonCanonique(payloadSansRoot);
  const rootHash = await computeSha256(jsonCanonique);

  return {
    ...payloadSansRoot,
    rootHash,
  };
}

/**
 * Vérifie l'intégrité cryptographique complète d'un snapshot
 * Détecte toute falsification, suppression, altération d'octet ou modification de métadonnées.
 */
export async function verifierIntegriteSnapshot(
  manifeste: SnapshotManifeste,
  fichiers: Record<string, string | Uint8Array>,
  dumpSql?: string | null
): Promise<VerificationIntegriteResult> {
  const erreurs: string[] = [];
  const encoder = new TextEncoder();
  let fichiersVerifies = 0;

  // Créer un index normalisé des fichiers fournis
  const indexFichiers: Record<string, string | Uint8Array> = {};
  for (const [k, v] of Object.entries(fichiers)) {
    indexFichiers[normaliserCheminFichier(k)] = v;
  }

  // 1. Vérifier chaque fichier déclaré dans le manifeste
  for (const item of manifeste.fichiers) {
    const contenu = indexFichiers[item.chemin];
    if (contenu === undefined) {
      erreurs.push(`Fichier manquant dans le bundle : ${item.chemin}`);
      continue;
    }

    const bytes = typeof contenu === "string" ? encoder.encode(contenu) : contenu;
    if (bytes.byteLength !== item.taille) {
      erreurs.push(
        `Altération de taille pour "${item.chemin}" : attendu ${item.taille} octets, trouvé ${bytes.byteLength}`
      );
    }

    const sha256Calcule = await computeSha256(bytes);
    if (sha256Calcule !== item.sha256) {
      erreurs.push(
        `Empreinte SHA-256 invalide pour "${item.chemin}" (altération de contenu détectée)`
      );
    } else {
      fichiersVerifies++;
    }
  }

  // 2. Vérifier si des fichiers supplémentaires non autorisés ont été injectés
  const cheminsManifeste = new Set(manifeste.fichiers.map((f) => f.chemin));
  for (const chemin of Object.keys(indexFichiers)) {
    if (!cheminsManifeste.has(chemin)) {
      erreurs.push(`Fichier intempestif non répertorié dans le manifeste scellé : ${chemin}`);
    }
  }

  // 3. Vérifier le dump SQL
  if (manifeste.baseDonnees) {
    if (!dumpSql || dumpSql.trim().length === 0) {
      erreurs.push("Dump SQL manquant alors qu'une base de données est scellée dans le manifeste");
    } else {
      const dumpBytes = encoder.encode(dumpSql);
      const sha256Dump = await computeSha256(dumpBytes);
      if (sha256Dump !== manifeste.baseDonnees.sha256) {
        erreurs.push("Empreinte SHA-256 du dump SQL invalide (base altérée)");
      }
    }
  }

  // 4. Recalculer le hash racine canonique à partir des fichiers réels du bundle
  const cheminsReels = Object.keys(indexFichiers).sort();
  const fichiersReels: SnapshotFichierManifeste[] = [];
  for (const ch of cheminsReels) {
    const c = indexFichiers[ch] ?? "";
    const b = typeof c === "string" ? encoder.encode(c) : c;
    const sha = await computeSha256(b);
    fichiersReels.push({
      chemin: ch,
      taille: b.byteLength,
      sha256: sha,
    });
  }

  let baseReelle: SnapshotBaseManifeste | null = null;
  if (dumpSql && dumpSql.trim().length > 0) {
    const dumpBytes = encoder.encode(dumpSql);
    const sha256Dump = await computeSha256(dumpBytes);
    baseReelle = {
      tables: manifeste.baseDonnees?.tables ? [...manifeste.baseDonnees.tables].sort() : [],
      dumpSql,
      sha256: sha256Dump,
      taille: dumpBytes.byteLength,
    };
  }

  const payloadReel = {
    versionSpec: manifeste.versionSpec,
    sujetId: manifeste.sujetId,
    versionId: manifeste.versionId,
    eleveId: manifeste.eleveId,
    projetId: manifeste.projetId,
    passageId: manifeste.passageId ?? null,
    horodatageServeur: manifeste.horodatageServeur,
    fichiers: fichiersReels,
    baseDonnees: baseReelle,
  };

  const jsonCanonique = serialiserJsonCanonique(payloadReel);
  const hashCalcule = await computeSha256(jsonCanonique);

  if (hashCalcule !== manifeste.rootHash) {
    erreurs.push(
      `Sceau cryptographique racine corrompu : attendu ${manifeste.rootHash}, calculé ${hashCalcule}`
    );
  }

  return {
    valide: erreurs.length === 0,
    hashCalcule,
    hashAttendu: manifeste.rootHash,
    fichiersVerifies,
    erreurs,
  };
}

/**
 * Construit l'archive ZIP officielle scellée SW_<NCIN>.zip
 */
export function creerArchiveSnapshotZip(
  numeroCin: string,
  manifeste: SnapshotManifeste,
  fichiers: Record<string, string | Uint8Array>,
  dumpSql?: string
): Uint8Array {
  const racine = `Travail_Eleve/SW_${numeroCin}/`;
  const entries: ArchiveFileEntry[] = [];

  // 1. Fichiers sources de l'élève
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    entries.push({
      path: `${racine}${normaliserCheminFichier(chemin)}`,
      content: contenu,
    });
  }

  // 2. Dump SQL si présent
  if (dumpSql && dumpSql.trim().length > 0) {
    entries.push({
      path: `${racine}database.sql`,
      content: dumpSql,
    });
  }

  // 3. Manifeste JSON scellé
  entries.push({
    path: `${racine}manifest.json`,
    content: JSON.stringify(manifeste, null, 2),
  });

  // 4. Fichier CHECKSUM.sha256 officiel
  entries.push({
    path: `${racine}CHECKSUM.sha256`,
    content: `${manifeste.rootHash}  SW_${numeroCin}.bundle\n`,
  });

  return creerArchiveZip(entries);
}
