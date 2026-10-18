/**
 * Labo STI - Exportateur d'archive de projet élève SW_xxxxx.zip (PRD §8.2, F-28)
 *
 * Génère une archive ZIP standardisée sans dépendance externe lourde, contenant
 * l'arborescence officielle Travail_Eleve/SW_<numéro>/ avec fichiers sources, dump SQL et manifest.
 */

// Table CRC32 standard
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function calculerCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    const byte = data[i] ?? 0;
    crc = (crc >>> 8) ^ (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ArchiveFileEntry {
  path: string;
  content: string | Uint8Array;
}

export interface ProjectArchiveOptions {
  numeroCin: string;
  files: Record<string, string | Uint8Array>;
  sqlDump?: string;
  manifest?: Record<string, unknown>;
}

/**
 * Construit un buffer ZIP binaire standardisé (PKZIP format, méthode STORE 0x0000)
 */
export function creerArchiveZip(entries: ArchiveFileEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const fileRecords: Array<{
    pathBytes: Uint8Array;
    contentBytes: Uint8Array;
    crc: number;
    offset: number;
  }> = [];

  let currentOffset = 0;
  const localHeadersParts: Uint8Array[] = [];

  for (const entry of entries) {
    const pathBytes = encoder.encode(entry.path.replace(/\\/g, "/"));
    const contentBytes =
      typeof entry.content === "string" ? encoder.encode(entry.content) : entry.content;
    const crc = calculerCrc32(contentBytes);

    // En-tête local de fichier (30 octets + longueur du nom de fichier)
    const localHeader = new Uint8Array(30 + pathBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true); // Signature local file header
    view.setUint16(4, 20, true); // Version nécessaire pour extraire (2.0)
    view.setUint16(6, 0, true); // General purpose bit flag
    view.setUint16(8, 0, true); // Méthode de compression (0 = STORE)
    view.setUint16(10, 0, true); // Heure de modif (00:00:00)
    view.setUint16(12, 0, true); // Date de modif (1980-00-00)
    view.setUint32(14, crc, true); // CRC-32
    view.setUint32(18, contentBytes.length, true); // Taille compressée
    view.setUint32(22, contentBytes.length, true); // Taille non compressée
    view.setUint16(26, pathBytes.length, true); // Longueur nom de fichier
    view.setUint16(28, 0, true); // Longueur champ extra

    localHeader.set(pathBytes, 30);

    localHeadersParts.push(localHeader, contentBytes);

    fileRecords.push({
      pathBytes,
      contentBytes,
      crc,
      offset: currentOffset,
    });

    currentOffset += localHeader.length + contentBytes.length;
  }

  // Central directory
  const centralDirStartOffset = currentOffset;
  const centralDirParts: Uint8Array[] = [];

  for (const rec of fileRecords) {
    const cdHeader = new Uint8Array(46 + rec.pathBytes.length);
    const view = new DataView(cdHeader.buffer);

    view.setUint32(0, 0x02014b50, true); // Signature central directory header
    view.setUint16(4, 20, true); // Version made by (2.0)
    view.setUint16(6, 20, true); // Version needed to extract (2.0)
    view.setUint16(8, 0, true); // Bit flag
    view.setUint16(10, 0, true); // Méthode de compression (0 = STORE)
    view.setUint16(12, 0, true); // Heure
    view.setUint16(14, 0, true); // Date
    view.setUint32(16, rec.crc, true); // CRC-32
    view.setUint32(20, rec.contentBytes.length, true); // Taille compressée
    view.setUint32(24, rec.contentBytes.length, true); // Taille non compressée
    view.setUint16(28, rec.pathBytes.length, true); // Longueur nom de fichier
    view.setUint16(30, 0, true); // Longueur extra
    view.setUint16(32, 0, true); // Longueur commentaire
    view.setUint16(34, 0, true); // Numéro de disque
    view.setUint16(36, 0, true); // Attributs internes
    view.setUint32(38, 0, true); // Attributs externes
    view.setUint32(42, rec.offset, true); // Offset local header

    cdHeader.set(rec.pathBytes, 46);
    centralDirParts.push(cdHeader);
    currentOffset += cdHeader.length;
  }

  const centralDirSize = currentOffset - centralDirStartOffset;

  // End of central directory record (22 octets)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // Signature EOCD
  eocdView.setUint16(4, 0, true); // Numéro de ce disque
  eocdView.setUint16(6, 0, true); // Disque de départ
  eocdView.setUint16(8, fileRecords.length, true); // Entrées de ce disque
  eocdView.setUint16(10, fileRecords.length, true); // Nombre total d'entrées
  eocdView.setUint32(12, centralDirSize, true); // Taille du répertoire central
  eocdView.setUint32(16, centralDirStartOffset, true); // Offset de départ du répertoire central
  eocdView.setUint16(20, 0, true); // Longueur commentaire ZIP

  // Assemblage final du buffer
  const totalLength =
    localHeadersParts.reduce((acc, p) => acc + p.length, 0) +
    centralDirParts.reduce((acc, p) => acc + p.length, 0) +
    eocd.length;

  const out = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of [...localHeadersParts, ...centralDirParts, eocd]) {
    out.set(part, pos);
    pos += part.length;
  }

  return out;
}

/**
 * Génère l'archive officielle SW_<NCIN>.zip pour un projet élève
 */
export function exporterProjetEleveZip(options: ProjectArchiveOptions): {
  filename: string;
  data: Uint8Array;
  entryCount: number;
} {
  const ncin = (options.numeroCin || "00000000").trim();
  const rootDir = `Travail_Eleve/SW_${ncin}`;
  const entries: ArchiveFileEntry[] = [];

  // Fichiers du projet (HTML, CSS, JS, PHP, images)
  for (const [relPath, content] of Object.entries(options.files)) {
    const cleanPath = relPath.replace(/^Travail_Eleve\/SW_[^/]+\//, "");
    entries.push({
      path: `${rootDir}/${cleanPath}`,
      content,
    });
  }

  // Dump SQL de la base locale si présent
  if (options.sqlDump) {
    entries.push({
      path: `${rootDir}/db/dump.sql`,
      content: options.sqlDump,
    });
  }

  // Métadonnées manifest.json
  const manifestData = options.manifest || {
    cin: ncin,
    exportedAt: new Date().toISOString(),
    generator: "Labo STI v3.1",
    fileCount: Object.keys(options.files).length,
  };
  entries.push({
    path: `${rootDir}/manifest.json`,
    content: JSON.stringify(manifestData, null, 2),
  });

  const zipData = creerArchiveZip(entries);

  return {
    filename: `SW_${ncin}.zip`,
    data: zipData,
    entryCount: entries.length,
  };
}

/**
 * Déclenche le téléchargement du fichier ZIP dans le navigateur de l'élève
 */
export function declencherTelechargementZip(data: Uint8Array, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const blob = new Blob([data as unknown as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
