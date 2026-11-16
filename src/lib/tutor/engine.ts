/**
 * Moteur Socratique & Maïeutique du Tuteur Pédagogique Labo STI (PRD §15, F-56, T-06)
 *
 * Fonctionnement :
 * - Analyse le contexte de travail réel (contenu du fichier `fileContent`, fichier actif, critères en échec, question de l'élève).
 * - Fournit un diagnostic progressif en 4 paliers :
 *   1. Observation concrète du code soumis (`fileContent`)
 *   2. Rappel du concept et question socratique ciblée
 *   3. Exemple générique de syntaxe (≤ 3 lignes pour respecter le filtre anti-fuite)
 *   4. Orientation vers la fiche correspondante dans `/cours`
 * - En cas de question hors sujet ou de simple salutation, affiche un repli honnête explicite.
 */

import { queryNotebookKnowledgeBase } from "@/content/notebook-sti";
import { verifierRequeteEleve, filtrerReponseTuteur, estNeutraliseEnExamen } from "./guardrails";
import type { TutorContext, TutorMessage, TutorResponse } from "./types";

/**
 * Analyse statique légère du code soumis par l'élève (`context.fileContent`)
 * afin de produire un diagnostic spécifique aux symptômes présents dans son fichier.
 */
function diagnostiquerCodeEleve(
  fileContent: string | undefined,
  activeFile: string | undefined,
  domain: "js_valid" | "js_dom" | "css" | "sql" | "php" | "html" | "generic",
): string {
  const code = (fileContent ?? "").trim();
  const fileLabel = activeFile || "votre fichier actif";

  if (!code) {
    return `**Diagnostic de \`${fileLabel}\`** : votre fichier est actuellement vide. Commencez par déclarer la structure ou la fonction demandée dans l'énoncé.`;
  }

  if (domain === "js_valid") {
    const hasSelector = /getElementById|querySelector|forms\[/i.test(code);
    const hasValue = /\.value\b/.test(code);
    const hasLengthOrRegex = /\.length\b|\/.*\/\.test\(|new RegExp/i.test(code);
    const hasDigitCheck = /isNaN\s*\(|\/.*\\d.*\/|\/.*\[0-9\].*\//i.test(code);
    const hasBlockReturn = /return\s+false|preventDefault\s*\(/i.test(code);

    if (!hasSelector) {
      return `**Diagnostic de \`${fileLabel}\`** : aucune sélection de champ (\`document.getElementById(...)\` ou \`document.querySelector(...)\`) n'est détectée dans votre code actuel.`;
    }
    if (!hasValue) {
      return `**Diagnostic de \`${fileLabel}\`** : vous ciblez un élément du DOM (\`${code.slice(0, 60)}${code.length > 60 ? "..." : ""}\`), mais vous ne lisez pas encore la valeur saisie via la propriété \`.value\`.`;
    }
    if (!hasLengthOrRegex) {
      return `**Diagnostic de \`${fileLabel}\`** : vous récupérez bien \`.value\`, mais votre code ne vérifie pas encore la longueur attendue (\`.length !== 8\`) ni un motif RegExp.`;
    }
    if (!hasDigitCheck) {
      return `**Diagnostic de \`${fileLabel}\`** : la longueur est testée, mais il manque le contrôle numérique (\`isNaN(valeur)\`) pour garantir que la saisie ne contient que des chiffres.`;
    }
    if (!hasBlockReturn) {
      return `**Diagnostic de \`${fileLabel}\`** : vos conditions de validation sont présentes, mais votre fonction ne renvoie pas \`return false;\` (ou \`event.preventDefault()\`) pour bloquer l'envoi du formulaire en cas d'erreur.`;
    }
    return `**Diagnostic de \`${fileLabel}\`** : votre script comporte la lecture de \`.value\`, le test de format et \`return false;\`. Vérifiez que l'identifiant passé à \`getElementById\` correspond exactement à l'\`id\` du HTML et que \`<form>\` appelle bien \`onsubmit="return ...;"\`.`;
  }

  if (domain === "js_dom") {
    const hasSelector = /getElementById|querySelector/i.test(code);
    const hasListener = /addEventListener|onclick|onsubmit|onchange|oninput/i.test(code);
    if (!hasSelector) {
      return `**Diagnostic de \`${fileLabel}\`** : aucun sélecteur DOM (\`getElementById\` / \`querySelector\`) n'est encore présent dans votre script.`;
    }
    if (!hasListener) {
      return `**Diagnostic de \`${fileLabel}\`** : vous sélectionnez un élément DOM, mais aucun écouteur d'événement (\`addEventListener\` ou attribut \`onsubmit\`) n'y est rattaché pour réagir à l'action de l'utilisateur.`;
    }
    return `**Diagnostic de \`${fileLabel}\`** : la sélection et l'écoute d'événement sont présentes. Vérifiez le nom exact de l'événement (\`"click"\`, \`"submit"\`, \`"input"\`) et l'élément ciblé.`;
  }

  if (domain === "css") {
    const hasFlexOrGrid = /display\s*:\s*(flex|grid|inline-block)/i.test(code);
    const hasAlign = /justify-content|align-items|margin\s*:\s*[^;]*auto|text-align/i.test(code);
    if (!hasFlexOrGrid) {
      return `**Diagnostic de \`${fileLabel}\`** : aucune propriété de disposition (\`display: flex\`, \`display: grid\` ou \`display: inline-block\`) n'a été détectée dans votre feuille de style.`;
    }
    if (!hasAlign) {
      return `**Diagnostic de \`${fileLabel}\`** : le mode d'affichage est défini, mais il manque les propriétés d'alignement (\`justify-content\`, \`align-items\` ou \`margin: 0 auto\`).`;
    }
    return `**Diagnostic de \`${fileLabel}\`** : les règles de disposition et d'alignement sont présentes. Vérifiez que votre sélecteur (\`.classe\` ou \`#id\`) correspond exactement à l'attribut HTML.`;
  }

  if (domain === "sql") {
    const hasSelectOrCreate = /\b(SELECT|CREATE\s+TABLE|INSERT|UPDATE|DELETE)\b/i.test(code);
    const hasJoin = /\b(JOIN|INNER\s+JOIN|LEFT\s+JOIN)\b/i.test(code);
    const hasOn = /\bON\b/i.test(code);
    if (!hasSelectOrCreate) {
      return `**Diagnostic de \`${fileLabel}\`** : aucune instruction SQL principale (\`SELECT\`, \`CREATE TABLE\`, \`INSERT\`, \`UPDATE\`) n'est détectée.`;
    }
    if (!hasJoin) {
      return `**Diagnostic de \`${fileLabel}\`** : votre requête n'utilise pas encore de clause de jointure (\`INNER JOIN\` ou \`LEFT JOIN\`) pour relier les tables entre elles.`;
    }
    if (!hasOn) {
      return `**Diagnostic de \`${fileLabel}\`** : vous avez écrit \`JOIN\`, mais il manque la condition de liaison \`ON tableA.cle = tableB.cle\`.`;
    }
    return `**Diagnostic de \`${fileLabel}\`** : la jointure \`JOIN ... ON\` est présente. Vérifiez les noms des colonnes sélectionnées et l'éventuel regroupement \`GROUP BY\`.`;
  }

  if (domain === "php") {
    const hasConnect = /mysqli_connect/i.test(code);
    const hasQuery = /mysqli_query/i.test(code);
    if (!hasConnect) {
      return `**Diagnostic de \`${fileLabel}\`** : la connexion \`mysqli_connect("localhost", "root", "", ...)\` est absente de votre script PHP.`;
    }
    if (!hasQuery) {
      return `**Diagnostic de \`${fileLabel}\`** : la connexion est ouverte, mais aucune requête n'est exécutée via \`mysqli_query($cnx, $sql)\`.`;
    }
    return `**Diagnostic de \`${fileLabel}\`** : \`mysqli_connect\` et \`mysqli_query\` sont présents. Vérifiez le test de résultat (\`mysqli_num_rows\` pour \`SELECT\` ou \`mysqli_affected_rows\` pour \`INSERT\`/\`UPDATE\`).`;
  }

  if (domain === "html") {
    const hasForm = /<form\b/i.test(code);
    const hasOnsubmit = /onsubmit\s*=\s*["']return\b/i.test(code);
    if (hasForm && !hasOnsubmit) {
      return `**Diagnostic de \`${fileLabel}\`** : votre balise \`<form>\` est présente mais ne contient pas \`onsubmit="return verif();"\` pour bloquer l'envoi en cas d'erreur JS.`;
    }
    const hasMailtoHref = /<a\b[^>]*href\s*=\s*["']mailto:/i.test(code);
    const hasRawMailtoOrMailTag =
      /<mail\b/i.test(code) || (/mailto:/i.test(code) && !hasMailtoHref);
    if (hasRawMailtoOrMailTag) {
      return `**Diagnostic de \`${fileLabel}\`** : vous utilisez \`mailto:\` (ou une balise \`<Mail>\` non valide) sans passer par une balise de lien \`<a href="mailto:...">\`.`;
    }
    if (hasMailtoHref) {
      return `**Diagnostic de \`${fileLabel}\`** : votre lien \`<a href="mailto:...">\` est bien déclaré. Vérifiez le texte visible entre \`<a>\` et \`</a>\`.`;
    }
  }

  return `**Diagnostic de \`${fileLabel}\`** (${code.split("\n").length} ligne(s)) : examinez l'instruction où les données sont lues et transformées avant l'affichage ou le retour.`;
}

/**
 * Réponses maïeutiques basées sur le diagnostic réel du code, les critères et la base de connaissances STI
 */
function genererReponseMaieutique(
  prompt: string,
  context: TutorContext,
): { texte: string; followUps: string[]; relatedCritere?: string } {
  const p = prompt.toLowerCase().trim();
  const failedCriteria = (context.activeCriteria || []).filter((c) => !c.ok);
  const targetCritere = context.selectedCriterionCode
    ? context.activeCriteria?.find(
        (c) => c.code === context.selectedCriterionCode || c.id === context.selectedCriterionCode,
      )
    : failedCriteria[0];

  // 1. Si l'élève interroge sur un critère en échec spécifique ou demande pourquoi son code ne marche pas
  if (
    /crit[eè]re|pourquoi|[eé]choue|marche pas|erreur|bloqu[eé]|mon code|corrige|aide-moi sur ce fichier/.test(
      p,
    )
  ) {
    if (targetCritere) {
      const code = targetCritere.code || targetCritere.id;
      const label = targetCritere.label;

      if (
        code.includes("VALID") ||
        label.toLowerCase().includes("validation") ||
        label.toLowerCase().includes("cin")
      ) {
        const diag = diagnostiquerCodeEleve(context.fileContent, context.activeFile, "js_valid");
        return {
          texte: `Intéressons-nous au critère **${label}** (${code}).\n\n1. ${diag}\n2. **Question de réflexion** : à quel moment votre fonction est-elle appelée (via \`onsubmit="return verif();"\` ou \`addEventListener("submit", ...)\`), et quelle instruction interrompt l'envoi si la longueur (\`.length\`) ou le format numérique (\`isNaN\`) est invalide ?\n3. **Syntaxe générique** :\n\`\`\`js\nif (val.length !== 8 || isNaN(val)) { return false; }\n\`\`\`\n4. **Référence** : consultez la fiche **Module 3 — Validation JavaScript** dans \`/cours\`.`,
          followUps: [
            "Comment contrôler un CIN de 8 chiffres en JS ?",
            "Comment écouter l'événement submit avec addEventListener ?",
            "Pourquoi faut-il écrire return false ?",
          ],
          relatedCritere: code,
        };
      }

      if (code.includes("CSS") || code.includes("STYLE") || label.toLowerCase().includes("css")) {
        const diag = diagnostiquerCodeEleve(context.fileContent, context.activeFile, "css");
        return {
          texte: `Examinons le critère de mise en page **${label}** (${code}).\n\n1. ${diag}\n2. **Question de réflexion** : votre sélecteur cible-t-il bien la classe ou l'identifiant exact, et quel modèle d'affichage (\`display: flex\`, \`display: grid\` ou \`display: inline-block\`) avez-vous appliqué au conteneur ?\n3. **Syntaxe générique** :\n\`\`\`css\n.conteneur { display: flex; justify-content: center; }\n\`\`\`\n4. **Référence** : consultez la fiche **Module 2 — CSS3 & Box Model** dans \`/cours\`.`,
          followUps: [
            "Quelle différence entre .L1 et #titre ?",
            "Pourquoi width ne fonctionne pas sur un label sans inline-block ?",
          ],
          relatedCritere: code,
        };
      }

      if (
        code.includes("SQL") ||
        label.toLowerCase().includes("sql") ||
        label.toLowerCase().includes("jointure")
      ) {
        const diag = diagnostiquerCodeEleve(context.fileContent, context.activeFile, "sql");
        return {
          texte: `Observons votre requête pour le critère **${label}** (${code}).\n\n1. ${diag}\n2. **Question de réflexion** : de quelles tables proviennent les colonnes demandées, et quelle clause SQL (\`INNER JOIN ... ON\` ou \`LEFT JOIN ... ON\`) relie la clé primaire à la clé étrangère ?\n3. **Syntaxe générique** :\n\`\`\`sql\nSELECT a.nom FROM tableA a INNER JOIN tableB b ON a.id = b.id;\n\`\`\`\n4. **Référence** : consultez la fiche **Module 5 — BD & SQL** dans \`/cours\`.`,
          followUps: ["Explique la jointure externe LEFT JOIN", "C'est quoi une clé étrangère ?"],
          relatedCritere: code,
        };
      }

      const diag = diagnostiquerCodeEleve(context.fileContent, context.activeFile, "generic");
      return {
        texte: `Le critère actuellement non validé est : **${label}** (${code}).\n\n1. ${diag}\n2. **Question de réflexion** : quelle est l'attente principale formulée dans l'énoncé pour ce critère dans \`${context.activeFile || "index.html"}\`, et que constatez-vous dans l'aperçu ?\n3. **Référence** : consultez les fiches mémento de \`/cours\` pour vérifier la syntaxe attendue.`,
        followUps: ["Où se situe l'erreur dans mon code ?", "Que demande exactement ce critère ?"],
        relatedCritere: code,
      };
    }
  }

  // 2. Questions portant sur le ciblage d'un bouton ou l'interaction DOM en JavaScript
  if (
    p.includes("bouton") ||
    p.includes("cibler") ||
    (p.includes("dom") && !p.includes("addeventlistener"))
  ) {
    const diag = diagnostiquerCodeEleve(context.fileContent, context.activeFile, "js_dom");
    return {
      texte: `En JavaScript pour le Web, l'interaction repose sur trois piliers :\n1. **Sélectionner** l'élément dans le document (ex: \`document.querySelector(...)\` ou \`document.getElementById(...)\`). Avez-vous vérifié l'ID ou la classe de votre cible ?\n2. **Écouter** l'action de l'utilisateur avec \`addEventListener\`. Quel événement surveillez-vous ?\n3. **Agir** en modifiant le DOM ou en validant la saisie.\n\n${diag}\n\nÀ laquelle de ces trois étapes pensez-vous que votre script s'interrompt ?`,
      followUps: [
        "Je n'arrive pas à comprendre addEventListener",
        "Comment contrôler un CIN de 8 chiffres en JS ?",
      ],
    };
  }

  // 3. Recherche dans la base de connaissances du programme officiel STI (SQL, HTML, CSS, JS, PHP)
  const kbMatch = queryNotebookKnowledgeBase(prompt);
  if (!kbMatch.isFallback) {
    const shortSnippet = kbMatch.codeSnippet
      ? kbMatch.codeSnippet.split("\n")[0]?.trim()
      : undefined;
    const snippetBlock = shortSnippet ? `\n\n**Exemple de syntaxe** :\n\`${shortSnippet}\`` : "";
    const htmlDiag =
      kbMatch.id === "kb-html-liens-mailto"
        ? `\n\n${diagnostiquerCodeEleve(context.fileContent, context.activeFile, "html")}`
        : "";
    return {
      texte: `**${kbMatch.title}** *(Réf. \`/cours\` : ${kbMatch.sourceRef})*\n\n${kbMatch.answer}${snippetBlock}${htmlDiag}\n\n**Question pour votre code (\`${context.activeFile || "atelier"}\`)** : comment pouvez-vous appliquer cette règle aux identifiants ou tables de votre exercice actuel ?`,
      followUps: kbMatch.followUps,
    };
  }

  // 4. Questions portant sur les formulaires HTML génériques
  if (
    p.includes("form") ||
    p.includes("formulaire") ||
    p.includes("input") ||
    p.includes("champ")
  ) {
    const diag = diagnostiquerCodeEleve(context.fileContent, context.activeFile, "html");
    return {
      texte: `Pour qu'un formulaire HTML soit valide selon les normes Bac STI :\n- Chaque champ \`<input>\` possède-t-il un attribut \`name\` (pour PHP \`$_POST\`) et un \`id\` (pour JS \`getElementById\`) ?\n- La balise \`<form>\` contient-elle \`onsubmit="return verif();"\` ?\n\n${diag}\n\nQue contient votre balise \`<form>\` pour le moment ? *(Voir aussi le **Module 1 HTML5** dans \`/cours\`)*`,
      followUps: ["À quoi sert l'attribut name ?", "Comment faire un tableau HTML ?"],
    };
  }

  // 5. Questions explicites de méthode ou de démarche de résolution
  if (/m[eé]thode|[eé]tape|comment commencer|d[eé]marrer|tester|priorit/.test(p)) {
    const diag = diagnostiquerCodeEleve(context.fileContent, context.activeFile, "generic");
    return {
      texte: `Voici la démarche méthodique pour avancer sur votre exercice :\n1. ${diag}\n2. Exécutez l'évaluation pour identifier le premier critère en échec (${targetCritere ? `actuellement **${targetCritere.label}**` : "aucun critère en échec détecté"}).\n3. Quelle valeur d'entrée et quelle sortie attendue devez-vous relier à cette étape ? *(Consultez \`/cours\` pour les fiches de syntaxe)*`,
      followUps: [
        "Pourquoi mon critère échoue ?",
        "Comment contrôler un CIN de 8 chiffres en JS ?",
        "Explique la jointure externe LEFT JOIN",
      ],
    };
  }

  // 6. Repli honnête explicite pour toute question hors sujet ou salutation générique ("bonjour", etc.)
  return {
    texte: `Je n'ai pas de fiche sur ce sujet pour répondre précisément à « ${prompt.trim()} ».\n\nJe peux en revanche :\n1. **Diagnostiquer votre code actuel** dans \`${context.activeFile || "votre fichier"}\` si vous me demandez *« Pourquoi mon critère échoue ? »*.\n2. **Expliquer une notion du programme 4ème STI** : essayez un mot-clé précis comme \`clé étrangère\`, \`LEFT JOIN\`, \`tableau HTML\`, \`cardinalité\`, \`LIKE\`, \`pourcentage SQL\`, \`sous-requête IN\`, \`addEventListener\` ou \`mysqli_query\`.\n3. Vous orienter vers la barre de recherche de la page \`/cours\`.`,
    followUps: [
      "Pourquoi mon critère échoue ?",
      "C'est quoi une clé étrangère ?",
      "Explique la jointure externe LEFT JOIN",
      "Comment faire un tableau HTML ?",
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
