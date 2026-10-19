/**
 * Moteur Socratique & Maïeutique du Tuteur Pédagogique Labo STI (PRD §15, F-56, T-06)
 *
 * Fonctionnement :
 * - Analyse le contexte de travail (fichier actif, critères en échec, question de l'élève).
 * - Formule des questions de réflexion et de diagnostic ciblées.
 * - Ne fournit jamais le code final, mais oriente vers les concepts du référentiel Bac STI.
 */

import { verifierRequeteEleve, filtrerReponseTuteur, estNeutraliseEnExamen } from "./guardrails";
import type { TutorContext, TutorMessage, TutorResponse } from "./types";

/**
 * Réponses maïeutiques prédéfinies basées sur les domaines et compétences clés
 */
function genererReponseMaieutique(
  prompt: string,
  context: TutorContext,
): { texte: string; followUps: string[]; relatedCritere?: string } {
  const p = prompt.toLowerCase();
  const failedCriteria = (context.activeCriteria || []).filter((c) => !c.ok);
  const targetCritere = context.selectedCriterionCode
    ? context.activeCriteria?.find(
        (c) => c.code === context.selectedCriterionCode || c.id === context.selectedCriterionCode,
      )
    : failedCriteria[0];

  // 1. Si l'élève interroge sur un critère en échec spécifique ou demande pourquoi ça ne marche pas
  if (/crit[eè]re|pourquoi|[eé]choue|marche pas|erreur/.test(p)) {
    if (targetCritere) {
      const code = targetCritere.code || targetCritere.id;
      const label = targetCritere.label;

      if (
        code.includes("VALID") ||
        label.toLowerCase().includes("validation") ||
        label.toLowerCase().includes("cin")
      ) {
        return {
          texte: `Intéressons-nous au critère **${label}** (${code}).\n\nPour que la validation fonctionne comme attendu :\n1. À quel moment votre fonction de contrôle est-elle appelée (au clic sur le bouton, ou à la soumission du formulaire via l'événement \`submit\`) ?\n2. Quelle méthode JavaScript permet d'interrompre l'envoi du formulaire si la condition n'est pas remplie ?\n3. Avez-vous vérifié la longueur et le format des caractères avec \`.length\` ou une expression régulière ?`,
          followUps: [
            "Comment écouter l'événement submit ?",
            "Comment empêcher la soumission par défaut ?",
            "Vérifier la longueur de la saisie",
          ],
          relatedCritere: code,
        };
      }

      if (code.includes("CSS") || code.includes("STYLE") || label.toLowerCase().includes("css")) {
        return {
          texte: `Examinons le critère de mise en page **${label}**.\n\nRegardez votre fichier de style :\n1. Votre sélecteur cible-t-il bien la classe ou l'identifiant exact de l'élément visé ?\n2. Quel modèle d'affichage avez-vous appliqué au conteneur parent (\`display: flex\` ou \`display: grid\`) ?\n3. Quelle propriété régit l'alignement le long de l'axe principal ?`,
          followUps: [
            "Quelle différence entre justify-content et align-items ?",
            "Comment vérifier mon sélecteur dans le navigateur ?",
          ],
          relatedCritere: code,
        };
      }

      if (
        code.includes("SQL") ||
        label.toLowerCase().includes("sql") ||
        label.toLowerCase().includes("jointure")
      ) {
        return {
          texte: `Observons votre requête pour le critère **${label}**.\n\n1. De quelles tables proviennent les colonnes demandées ?\n2. Quelle clause SQL permet de relier la clé primaire d'une table à la clé étrangère de l'autre ?\n3. Avez-vous exécuté la requête dans le panneau Base de Données pour observer les lignes retournées ?`,
          followUps: [
            "Quelle est la syntaxe d'une jointure INNER JOIN ?",
            "Comment tester ma requête dans SQLite ?",
          ],
          relatedCritere: code,
        };
      }

      return {
        texte: `Le critère actuellement non validé est : **${label}**.\n\nPour progresser sans bloquer :\n- Quelle est l'attente principale formulée dans l'énoncé pour ce critère ?\n- Dans quel fichier (${context.activeFile || "index.html"}) cette modification doit-elle s'effectuer ?\n- Que constatez-vous lorsque vous observez la prévisualisation ?`,
        followUps: ["Où se situe l'erreur dans mon code ?", "Que demande exactement ce critère ?"],
        relatedCritere: code,
      };
    }
  }

  // 2. Questions portant sur le DOM ou JavaScript
  if (
    p.includes("dom") ||
    p.includes("javascript") ||
    p.includes("script") ||
    p.includes("bouton") ||
    p.includes("click")
  ) {
    return {
      texte: `En JavaScript pour le Web, l'interaction repose sur trois piliers :\n1. **Sélectionner** l'élément dans le document (ex: \`document.querySelector(...) \` ou \`document.getElementById(...)\`). Avez-vous vérifié l'ID ou la classe de votre cible ?\n2. **Écouter** l'action de l'utilisateur avec \`addEventListener\`. Quel événement surveillez-vous ?\n3. **Agir** en modifiant le DOM ou le style.\n\nÀ laquelle de ces trois étapes pensez-vous que votre script s'interrompt ?`,
      followUps: [
        "Comment vérifier si mon élément est trouvé ?",
        "Comment afficher un message d'erreur dans la console ?",
      ],
    };
  }

  // 3. Questions portant sur les formulaires HTML
  if (
    p.includes("form") ||
    p.includes("formulaire") ||
    p.includes("input") ||
    p.includes("champ")
  ) {
    return {
      texte: `Pour qu'un formulaire HTML soit valide et accessible selon les normes Bac STI :\n- Chaque champ de saisie \`<input>\` possède-t-il un attribut \`name\` et un \`id\` correspondant à un \`<label for="...">\` ?\n- Avez-vous choisi le bon type d'input (\`text\`, \`number\`, \`email\`, etc.) ?\n- Comment le bouton d'envoi est-il typé (\`type="submit"\`) ?\n\nQue contient votre balise \`<form>\` pour le moment ?`,
      followUps: ["À quoi sert l'attribut name ?", "Comment lier un label à un input ?"],
    };
  }

  // 4. Questions générales de méthode ou démarrage
  return {
    texte: `Je suis là pour vous accompagner dans la réflexion méthodologique.\n\nPour avancer méthodiquement :\n1. Avez-vous exécuté la vérification pour repérer précisément les critères déjà validés et ceux restant à résoudre ?\n2. Sur quelle partie de l'énoncé souhaitez-vous focaliser votre attention ?\n3. Décrivez-moi avec vos propres mots ce que le programme doit exécuter à cette étape.`,
    followUps: [
      "Pourquoi ce critère échoue ?",
      "Rappelle-moi les critères prioritaires",
      "Comment tester mon code pas-à-pas ?",
    ],
  };
}

/**
 * Traite une interaction élève avec le tuteur pédagogique
 */
export async function interagirAvecTuteur(
  prompt: string,
  context: TutorContext,
): Promise<TutorResponse> {
  const timestamp = new Date().toISOString();
  const id = `tutor-msg-${Date.now()}`;

  // 1. Vérification des garde-fous stricts
  const check = verifierRequeteEleve(prompt, context);
  if (!check.autorise) {
    const isExam = estNeutraliseEnExamen(context);
    return {
      blocked: true,
      reason: isExam ? "MODE_EXAMEN_ACTIF" : "TENTATIVE_TRICHE",
      message: {
        id,
        role: "assistant",
        content: check.messageRefus || "Requête non autorisée par les règles pédagogiques.",
        timestamp,
        isWarning: true,
      },
    };
  }

  // 2. Génération de la réponse socratique maïeutique
  const { texte, followUps, relatedCritere } = genererReponseMaieutique(prompt, context);

  // 3. Filtrage anti-fuite de code
  const { reponseFiltree, fuiteDetectee } = filtrerReponseTuteur(texte);

  const tutorMessage: TutorMessage = {
    id,
    role: "assistant",
    content: reponseFiltree,
    timestamp,
    suggestedFollowUps: followUps,
    ...(relatedCritere ? { relatedCriterionCode: relatedCritere } : {}),
    ...(fuiteDetectee ? { isWarning: true } : {}),
  };

  return {
    blocked: false,
    message: tutorMessage,
  };
}
