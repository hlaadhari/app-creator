/**
 * Garde-fous Stricts & Sécurité Anti-Triche du Tuteur Pédagogique (PRD §15, F-56, T-06)
 *
 * Règles inviolables :
 * 1. Neutralisation matérielle totale en mode examen (isExamMode = true ou sujet d'examen).
 * 2. Refus absolu de fournir du code solution complet ou de faire le travail à la place de l'élève.
 * 3. Filtrage systématique des réponses pour bloquer toute fuite involontaire de code exécutable complet.
 */

import { isExamSubject } from "@/lib/evaluation/hints-service";
import type { GuardrailCheckResult, TutorContext } from "./types";

// Motifs de sollicitation directe de solution (tentative de triche ou raccourci)
const CHEAT_PATTERNS: RegExp[] = [
  /donne[- ]moi\s+(le\s+)?(code|script|corrig[eé]|la\s+solution)/i,
  /donne[- ]moi\s+(la\s+)?r[eé]ponse/i,
  /[eé]cris[- ]moi\s+(le\s+)?(code|script|la\s+solution)/i,
  /fais\s+(le\s+travail|l'exercice|le\s+tp|le\s+sujet)\s+(pour\s+moi|[aà]\s+ma\s+place)/i,
  /r[eé]sous(\s+tout)?\s+(l'exercice|le\s+probl[eè]me|le\s+crit[eè]re)/i,
  /solution\s+compl[eè]te/i,
  /code\s+complet\s+(de\s+|pour\s+)/i,
  /copier[- ]coller\s+(la\s+solution|le\s+code)/i,
  /give\s+me\s+(the\s+)?(solution|code|answer)/i,
  /write\s+(the\s+)?(code|solution)\s+for\s+me/i,
  /solve\s+(this|the)\s+(exercise|problem)/i,
];

/**
 * Vérifie si le mode examen est actif (T-06, F-56)
 */
export function estNeutraliseEnExamen(context: TutorContext): boolean {
  return context.isExamMode || isExamSubject(context.sujetId);
}

/**
 * Valide la requête de l'élève au regard des garde-fous pédagogiques et anti-triche
 */
export function verifierRequeteEleve(prompt: string, context: TutorContext): GuardrailCheckResult {
  // 1. Règle absolue : neutralisation stricte en examen (T-06)
  if (estNeutraliseEnExamen(context)) {
    return {
      autorise: false,
      motif: "MODE_EXAMEN",
      messageRefus:
        "Le Tuteur Pédagogique est neutralisé et inaccessible en session d'examen (PRD F-56, T-06). Aucune aide interactive n'est autorisée pendant l'épreuve.",
    };
  }

  // 2. Détection des demandes de solution directe / triche
  const cleanPrompt = prompt.trim();
  const matchTriche = CHEAT_PATTERNS.some((pattern) => pattern.test(cleanPrompt));

  if (matchTriche) {
    return {
      autorise: false,
      motif: "DEMANDE_SOLUTION_BRUTE",
      messageRefus:
        "En tant que tuteur pédagogique Labo STI, je ne peux pas écrire le code à votre place ni vous donner la solution brute. Mon rôle est de vous guider pas à pas par des questions pour que vous trouviez la solution par vous-même. Que cherchez-vous à réaliser précisément à cette étape ?",
    };
  }

  return {
    autorise: true,
  };
}

/**
 * Filtre les réponses du tuteur pour garantir l'absence de fuite de code solution complet.
 * Si un bloc de code supérieur à 3 lignes est détecté, il est remplacé par un squelette conceptuel.
 */
export function filtrerReponseTuteur(reponse: string): {
  reponseFiltree: string;
  fuiteDetectee: boolean;
} {
  let fuiteDetectee = false;

  // Détecter les blocs de code markdown (```lang ... ```)
  const codeBlockRegex = /```([a-z]*)\n([\s\S]*?)```/gi;

  const reponseFiltree = reponse.replace(codeBlockRegex, (match, lang, codeContent: string) => {
    const lines = codeContent.trim().split("\n");
    // Si le bloc contient plus de 3 lignes de code implémenté, c'est considéré comme une fuite de solution
    if (lines.length > 3) {
      fuiteDetectee = true;
      return `\n> *[Structure indicative masquée par le garde-fous anti-triche]*\n\`\`\`${lang || "text"}\n// Réfléchissez à l'organisation de cette logique sans recopier de solution toute faite :\n// 1. Déclarer la variable ou cibler l'élément\n// 2. Appliquer la condition ou l'écouteur d'événement\n\`\`\`\n`;
    }
    return match;
  });

  return {
    reponseFiltree,
    fuiteDetectee,
  };
}
