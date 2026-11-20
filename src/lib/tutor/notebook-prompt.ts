/**
 * Construction déterministe d'une question contextualisée pour Gemini Notebook (Issue #294).
 *
 * - Ajoute systématiquement la consigne pédagogique Bac STI (Tunisie).
 * - Exclut toute donnée personnelle (nom, prénom, CIN, email, identifiant d'élève).
 * - Limite l'extrait de code à 60 lignes et la question totale à ~4 000 caractères.
 */

export const CONSIGNE_TUTEUR_NOTEBOOK =
  "Tu es un tuteur du Bac STI (Tunisie). Explique sans donner la solution complète. PHP en MySQLi procédural uniquement.";

export const MAX_NOTEBOOK_CODE_LINES = 60;
export const MAX_NOTEBOOK_PROMPT_LENGTH = 4000;

export interface ContexteNotebookCours {
  source: "cours";
  moduleActif: string;
  question: string;
}

export interface ContexteNotebookAtelier {
  source: "atelier";
  titreSujet: string;
  critereEchoue?: {
    code?: string | undefined;
    titre?: string | undefined;
    message?: string | undefined;
  } | null;
  fichierActif?: string | undefined;
  contenuFichier?: string | undefined;
  ligneCible?: number | undefined;
  question: string;
}

export interface ContexteNotebookCorrection {
  source: "correction";
  titreEpreuve: string;
  questionId: string;
  intituleQuestion: string;
  typeErreur?: string | undefined;
  question: string;
}

export type ContexteQuestionNotebook =
  ContexteNotebookCours | ContexteNotebookAtelier | ContexteNotebookCorrection;

/**
 * Supprime les données personnelles potentielles (e-mails, numéros CIN tunisiens à 8 chiffres,
 * identifiants UUID) avant copie vers un service externe.
 */
export function nettoyerDonneesPersonnelles(texte: string): string {
  return (
    texte
      // Adresses e-mail
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[email masqué]")
      // UUID v4 / identifiants techniques
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id masqué]")
      // Mentions explicites de CIN / Nom / Prénom saisis en clair
      .replace(/\b(?:cin|n°\s*cin)\s*[:=]?\s*\d{8}\b/gi, "CIN : [masqué]")
      .replace(/\b(?:nom|prénom|prenom)\s*[:=]\s*[^\n,;]{2,40}/gi, "[identité masquée]")
  );
}

/**
 * Extrait au maximum 60 lignes d'un fichier, centrées autour de `ligneCible` si fournie.
 */
function extraireExtraitCode(contenu: string, ligneCible?: number): string {
  const lignes = contenu.replace(/\r\n/g, "\n").split("\n");
  if (lignes.length <= MAX_NOTEBOOK_CODE_LINES) {
    return lignes.join("\n").trim();
  }

  let debut = 0;
  if (typeof ligneCible === "number" && ligneCible > 0) {
    const centre = Math.min(Math.max(ligneCible - 1, 0), lignes.length - 1);
    debut = Math.max(0, centre - Math.floor(MAX_NOTEBOOK_CODE_LINES / 2));
    if (debut + MAX_NOTEBOOK_CODE_LINES > lignes.length) {
      debut = Math.max(0, lignes.length - MAX_NOTEBOOK_CODE_LINES);
    }
  }

  const fin = Math.min(lignes.length, debut + MAX_NOTEBOOK_CODE_LINES);
  const extrait = lignes.slice(debut, fin).join("\n").trim();
  const prefix = debut > 0 ? `// ... (${debut} lignes précédentes omises)\n` : "";
  const suffix =
    fin < lignes.length ? `\n// ... (${lignes.length - fin} lignes suivantes omises)` : "";
  return `${prefix}${extrait}${suffix}`;
}

function detecterLangageBloc(fichier?: string): string {
  if (!fichier) return "";
  const lower = fichier.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".js")) return "javascript";
  if (lower.endsWith(".php")) return "php";
  if (lower.endsWith(".sql")) return "sql";
  return "";
}

/**
 * Construit le texte complet à copier dans le presse-papiers avant ouverture de Gemini Notebook.
 */
export function construireQuestionNotebook(contexte: ContexteQuestionNotebook): string {
  const questionPropre = nettoyerDonneesPersonnelles(contexte.question.trim());
  const questionFinale =
    questionPropre || "Peux-tu m'expliquer cette notion et m'aider à avancer étape par étape ?";

  if (contexte.source === "cours") {
    const parties = [
      CONSIGNE_TUTEUR_NOTEBOOK,
      "",
      `Module actif : ${nettoyerDonneesPersonnelles(contexte.moduleActif)}`,
      `Ma question : ${questionFinale}`,
    ];
    return tronquerProprement(parties.join("\n"), MAX_NOTEBOOK_PROMPT_LENGTH);
  }

  if (contexte.source === "correction") {
    const parties = [
      CONSIGNE_TUTEUR_NOTEBOOK,
      "",
      `Épreuve : ${nettoyerDonneesPersonnelles(contexte.titreEpreuve)}`,
      `Question : ${nettoyerDonneesPersonnelles(contexte.questionId)} — ${nettoyerDonneesPersonnelles(contexte.intituleQuestion)}`,
    ];
    if (contexte.typeErreur) {
      parties.push(`Type d'erreur identifié : ${nettoyerDonneesPersonnelles(contexte.typeErreur)}`);
    }
    parties.push(`Ma question : ${questionFinale}`);
    return tronquerProprement(parties.join("\n"), MAX_NOTEBOOK_PROMPT_LENGTH);
  }

  // Source : atelier
  const entete: string[] = [
    CONSIGNE_TUTEUR_NOTEBOOK,
    "",
    `Sujet : ${nettoyerDonneesPersonnelles(contexte.titreSujet)}`,
  ];

  if (contexte.critereEchoue) {
    const parts: string[] = [];
    if (contexte.critereEchoue.code) parts.push(`[${contexte.critereEchoue.code}]`);
    if (contexte.critereEchoue.titre) parts.push(contexte.critereEchoue.titre);
    if (parts.length > 0) {
      entete.push(`Critère en échec : ${nettoyerDonneesPersonnelles(parts.join(" "))}`);
    }
    if (contexte.critereEchoue.message) {
      entete.push(
        `Message d'évaluation : ${nettoyerDonneesPersonnelles(contexte.critereEchoue.message)}`,
      );
    }
  }

  const pied = `\nMa question : ${questionFinale}`;
  const enteteTexte = entete.join("\n");

  if (!contexte.contenuFichier || !contexte.contenuFichier.trim()) {
    return tronquerProprement(`${enteteTexte}${pied}`, MAX_NOTEBOOK_PROMPT_LENGTH);
  }

  const lang = detecterLangageBloc(contexte.fichierActif);
  const labelFichier = contexte.fichierActif
    ? `\nExtrait du fichier actif (${nettoyerDonneesPersonnelles(contexte.fichierActif)}) :\n`
    : "\nExtrait du code actif :\n";

  let extrait = nettoyerDonneesPersonnelles(
    extraireExtraitCode(contexte.contenuFichier, contexte.ligneCible),
  );

  const overhead =
    enteteTexte.length +
    labelFichier.length +
    lang.length +
    10 /* ```lang\n...\n``` */ +
    pied.length;
  const budgetCode = Math.max(200, MAX_NOTEBOOK_PROMPT_LENGTH - overhead);

  if (extrait.length > budgetCode) {
    const suffix = "\n// ... [extrait tronqué]";
    extrait = `${extrait.slice(0, Math.max(0, budgetCode - suffix.length)).trimEnd()}${suffix}`;
  }

  const resultat = `${enteteTexte}${labelFichier}\`\`\`${lang}\n${extrait}\n\`\`\`${pied}`;
  return tronquerProprement(resultat, MAX_NOTEBOOK_PROMPT_LENGTH);
}

function tronquerProprement(texte: string, maxLen: number): string {
  if (texte.length <= maxLen) return texte;
  const suffix = "\n[...]";
  return `${texte.slice(0, Math.max(0, maxLen - suffix.length)).trimEnd()}${suffix}`;
}
