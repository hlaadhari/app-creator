/**
 * Labo STI - Types des Snapshots et du Rejouage de Référence (PRD §10, §11, F-54, F-55, T-08)
 */

export interface SnapshotFichierManifeste {
  chemin: string;
  taille: number;
  sha256: string;
}

export interface SnapshotBaseManifeste {
  tables: string[];
  dumpSql: string;
  sha256: string;
  taille: number;
}

export interface SnapshotManifeste {
  versionSpec: "1.0";
  sujetId: string;
  versionId: string;
  eleveId: string;
  projetId: string;
  passageId?: string | null;
  horodatageServeur: string;
  fichiers: SnapshotFichierManifeste[];
  baseDonnees?: SnapshotBaseManifeste | null;
  rootHash: string; // Hash SHA-256 canonique de l'ensemble du bundle
}

export interface SnapshotRecord {
  id: string;
  projet_id: string;
  passage_id?: string | null;
  eleve_id: string;
  version_id: string;
  date: string;
  hash: string;
  manifeste: SnapshotManifeste;
  storage_archive_path: string;
}

export interface VerificationIntegriteResult {
  valide: boolean;
  hashCalcule: string;
  hashAttendu: string;
  fichiersVerifies: number;
  erreurs: string[];
}

export interface RubriqueCritereNote {
  critereId: string;
  code: string;
  label: string;
  pointsMax: number;
  pointsAuto: number;
  pointsAjustes: number;
  valide: boolean;
  message: string;
  commentaireProf?: string;
}

export interface GrilleNotationOfficielle {
  criteres: RubriqueCritereNote[];
  totalPointsMax: number;
  totalPointsAuto: number;
  totalPointsAjustes: number;
  noteAuto20: number;
  noteFinale20: number;
}

export interface NoteHistoriqueEntry {
  modifieLe: string;
  modifiePar: string;
  ancienneNote: number;
  nouvelleNote: number;
  justification: string;
}

export interface NoteOfficielleRecord {
  id: string;
  passage_id?: string | null;
  snapshot_id: string;
  note_auto: number;
  note_finale: number;
  grille: GrilleNotationOfficielle;
  justification: string;
  corrige_par: string;
  historique: NoteHistoriqueEntry[];
  created_at: string;
  updated_at: string;
}

export interface ReplayExecutionResult {
  snapshotId: string;
  rootHash: string;
  grille: GrilleNotationOfficielle;
  reproductible: boolean;
  dureeMs: number;
  rejoueLe: string;
  journal: string[];
}
