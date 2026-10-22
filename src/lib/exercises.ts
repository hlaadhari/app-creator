import { contentSubjects } from "./content/all-subjects";

export type FileName = string;
export type Files = Record<string, string>;

export type Criterion = {
  id: string;
  label: string;
  points: number;
  /** Message affiché en cas d'échec */
  fail: string;
  /**
   * Faux quand le critère n'a aucune vérification automatique réelle (sonde absente, trop
   * générale ou non exécutable ici). Il n'est alors jamais validé et n'entre pas dans la note.
   */
  automatique?: boolean;
  /** Page du projet sur laquelle le critère est évalué (la page principale par défaut). */
  fichier?: string;
  check: (doc: Document, win: Window) => boolean;
};

export type Exercise = {
  id: string;
  title: string;
  level: "Facile" | "Moyen" | "Difficile";
  competence: string;
  module?: string;
  dureeMinutes?: number;
  tags?: string[];
  examMode?: boolean;
  bareme?: number;
  statement: string[];
  enonceMarkdown?: string;
  starter: Files;
  criteria: Criterion[];
  hints: string[];
};

const css = (win: Window, el: Element | null, prop: string) =>
  el ? win.getComputedStyle(el).getPropertyValue(prop).trim() : "";

export const initialExercises: Exercise[] = [
  {
    id: "carte-profil",
    title: "Carte de profil",
    level: "Facile",
    competence: "HTML – structure sémantique",
    statement: [
      "Créez une carte de présentation dans un élément <article> de classe « carte ».",
      "Elle contient un titre <h1> avec votre prénom, un paragraphe de présentation et une liste <ul> d'au moins 3 loisirs.",
      "Ajoutez un lien <a> vers votre e-mail (mailto:).",
    ],
    starter: {
      "index.html": `<!DOCTYPE html>\n<html lang="fr">\n<head>\n  <meta charset="UTF-8">\n  <title>Profil</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <!-- Votre carte ici -->\n\n  <script src="script.js"></script>\n</body>\n</html>\n`,
      "style.css": `body {\n  font-family: sans-serif;\n}\n`,
      "script.js": `// Pas de JavaScript nécessaire pour ce sujet\n`,
    },
    criteria: [
      {
        id: "article",
        label: 'Un <article class="carte"> existe',
        points: 2,
        fail: "Aucun élément <article> avec la classe « carte » trouvé.",
        check: (d) => !!d.querySelector("article.carte"),
      },
      {
        id: "h1",
        label: "Un <h1> non vide dans la carte",
        points: 2,
        fail: "Le titre <h1> est absent ou vide dans la carte.",
        check: (d) => !!d.querySelector("article.carte h1")?.textContent?.trim(),
      },
      {
        id: "p",
        label: "Un paragraphe de présentation",
        points: 1,
        fail: "Ajoutez un <p> contenant du texte dans la carte.",
        check: (d) => !!d.querySelector("article.carte p")?.textContent?.trim(),
      },
      {
        id: "ul",
        label: "Une liste d'au moins 3 loisirs",
        points: 3,
        fail: "La liste <ul> doit contenir au moins 3 <li>.",
        check: (d) => d.querySelectorAll("article.carte ul > li").length >= 3,
      },
      {
        id: "mail",
        label: "Un lien mailto:",
        points: 2,
        fail: "Aucun lien dont le href commence par « mailto: ».",
        check: (d) => !!d.querySelector('article.carte a[href^="mailto:"]'),
      },
    ],
    hints: [
      'Commencez par écrire <article class="carte"> … </article> dans le <body>.',
      "Une liste s'écrit <ul><li>…</li><li>…</li></ul>.",
      'Un lien e-mail : <a href="mailto:moi@exemple.fr">Me contacter</a>.',
    ],
  },
  {
    id: "mise-en-forme",
    title: "Mise en forme d'un bouton",
    level: "Moyen",
    competence: "CSS – sélecteurs et propriétés",
    statement: [
      "Un bouton d'id « valider » est fourni dans la page.",
      "En CSS, donnez-lui une couleur de fond rgb(0, 102, 204), un texte blanc, des coins arrondis et une marge intérieure (padding) non nulle.",
      "Le titre <h1> doit être centré.",
    ],
    starter: {
      "index.html": `<!DOCTYPE html>\n<html lang="fr">\n<head>\n  <meta charset="UTF-8">\n  <title>Bouton</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Inscription</h1>\n  <button id="valider">Valider</button>\n  <script src="script.js"></script>\n</body>\n</html>\n`,
      "style.css": `/* Vos règles ici */\n`,
      "script.js": `\n`,
    },
    criteria: [
      {
        id: "bg",
        label: "Fond du bouton rgb(0, 102, 204)",
        points: 3,
        fail: "La couleur de fond de #valider n'est pas rgb(0, 102, 204) (#0066cc).",
        check: (d, w) =>
          css(w, d.getElementById("valider"), "background-color") === "rgb(0, 102, 204)",
      },
      {
        id: "color",
        label: "Texte du bouton en blanc",
        points: 2,
        fail: "La couleur du texte de #valider doit être blanche.",
        check: (d, w) => css(w, d.getElementById("valider"), "color") === "rgb(255, 255, 255)",
      },
      {
        id: "radius",
        label: "Coins arrondis",
        points: 2,
        fail: "Ajoutez un border-radius supérieur à 0.",
        check: (d, w) =>
          parseFloat(
            css(w, d.getElementById("valider"), "border-top-left-radius") ||
              css(w, d.getElementById("valider"), "border-radius"),
          ) > 0,
      },
      {
        id: "padding",
        label: "Padding non nul",
        points: 1,
        fail: "Ajoutez un padding au bouton.",
        check: (d, w) => parseFloat(css(w, d.getElementById("valider"), "padding-top")) > 0,
      },
      {
        id: "center",
        label: "Titre centré",
        points: 2,
        fail: "Le <h1> doit avoir text-align: center.",
        check: (d, w) => css(w, d.querySelector("h1"), "text-align") === "center",
      },
    ],
    hints: [
      "Le sélecteur d'un id s'écrit #valider { … }.",
      "background-color: #0066cc; équivaut à rgb(0, 102, 204).",
      "Pour centrer un texte : text-align: center;",
    ],
  },
  {
    id: "compteur",
    title: "Compteur de clics",
    level: "Difficile",
    competence: "JavaScript – DOM et événements",
    statement: [
      'La page contient un bouton #plus et un <span id="total"> qui affiche 0.',
      "En JavaScript, chaque clic sur #plus augmente la valeur affichée de 1.",
      "Lorsque le total atteint 5, ajoutez la classe « max » au span.",
    ],
    starter: {
      "index.html": `<!DOCTYPE html>\n<html lang="fr">\n<head>\n  <meta charset="UTF-8">\n  <title>Compteur</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <p>Total : <span id="total">0</span></p>\n  <button id="plus">+1</button>\n  <script src="script.js"></script>\n</body>\n</html>\n`,
      "style.css": `.max {\n  color: red;\n  font-weight: bold;\n}\n`,
      "script.js": `// Récupérez les éléments puis ajoutez un écouteur d'événement\n`,
    },
    criteria: [
      {
        id: "click1",
        label: "Un clic affiche 1",
        points: 4,
        fail: "Après un clic sur #plus, #total devrait afficher 1.",
        check: (d) => {
          const b = d.getElementById("plus") as HTMLButtonElement | null;
          const t = d.getElementById("total");
          if (!b || !t) return false;
          b.click();
          return t.textContent?.trim() === "1";
        },
      },
      {
        id: "click5",
        label: "Cinq clics affichent 5",
        points: 3,
        fail: "Après 5 clics au total, #total devrait afficher 5.",
        check: (d) => {
          const b = d.getElementById("plus") as HTMLButtonElement | null;
          const t = d.getElementById("total");
          if (!b || !t) return false;
          for (let i = 0; i < 4; i++) b.click();
          return t.textContent?.trim() === "5";
        },
      },
      {
        id: "max",
        label: "Classe « max » à 5",
        points: 3,
        fail: "À 5, le span #total doit avoir la classe « max ».",
        check: (d) => !!d.getElementById("total")?.classList.contains("max"),
      },
    ],
    hints: [
      'document.getElementById("plus") renvoie le bouton.',
      'bouton.addEventListener("click", () => { … }) réagit aux clics.',
      'Gardez une variable let total = 0; puis span.textContent = total; et span.classList.add("max").',
    ],
  },
];

export const exercises: Exercise[] = [
  ...initialExercises.map((e) => ({
    ...e,
    module: "Initiation",
    dureeMinutes: 15,
    tags: [e.competence.split(" – ")[0] || "Web"],
  })),
  ...contentSubjects,
];

export const getExercise = (id: string) => exercises.find((e) => e.id === id);

/** Assemble les fichiers en un document unique pour l'aperçu. */
export function buildDocument(files: Files): string {
  // Déterminer le fichier HTML principal (ex: index.html, location.html, Don.html, evaluation.html)
  const htmlKey =
    files["index.html"] !== undefined
      ? "index.html"
      : (Object.keys(files).find((k) => k.endsWith(".html")) ?? "index.html");
  let html = files[htmlKey] ?? "<!DOCTYPE html><html><body></body></html>";

  // Récupérer et concaténer toutes les feuilles CSS
  const cssParts = Object.entries(files)
    .filter(([k]) => k.endsWith(".css"))
    .map(([, v]) => v)
    .join("\n");
  const style = cssParts ? `<style>\n${cssParts}\n</style>` : "";

  // Récupérer et concaténer tous les scripts JS
  const jsParts = Object.entries(files)
    .filter(([k]) => k.endsWith(".js"))
    .map(([, v]) => v)
    .join("\n");
  const script = jsParts
    ? `<script>\n${jsParts.replace(/<\/script>/gi, "<" + "/script>")}\n</script>`
    : "";

  if (style) {
    if (html.includes("</head>")) {
      html = html.replace(/<\/head>/i, `${style}\n</head>`);
    } else {
      html = `${style}\n${html}`;
    }
  }

  if (script) {
    if (html.includes("</body>")) {
      html = html.replace(/<\/body>/i, `${script}\n</body>`);
    } else {
      html = `${html}\n${script}`;
    }
  }

  return html;
}

export type Result = {
  id: string;
  label: string;
  points: number;
  ok: boolean;
  /** Faux : aucune vérification automatique réelle n'existe pour ce critère. */
  automatique: boolean;
  message: string;
};

export const MESSAGE_NON_VERIFIABLE =
  "Vérification automatique indisponible : ce critère sera évalué par votre enseignant.";

export function runCriteria(criteria: Criterion[], doc: Document, win: Window): Result[] {
  return criteria.map((c) => {
    const automatique = c.automatique !== false;
    let ok = false;
    // Échec par défaut : un critère sans vérification réelle n'est jamais validé.
    if (automatique) {
      try {
        ok = c.check(doc, win);
      } catch {
        ok = false;
      }
    }
    return {
      id: c.id,
      label: c.label,
      points: c.points,
      ok,
      automatique,
      message: !automatique ? MESSAGE_NON_VERIFIABLE : ok ? "Validé" : c.fail,
    };
  });
}

export function score(results: Result[]) {
  const total = results.reduce((s, r) => s + r.points, 0);
  const got = results.reduce((s, r) => s + (r.ok ? r.points : 0), 0);
  const verifiable = results.reduce((s, r) => s + (r.automatique ? r.points : 0), 0);
  return {
    got,
    total,
    /** Points de critères vérifiables automatiquement. */
    verifiable,
    /** Points de critères sans vérification automatique : jamais comptés dans la note. */
    nonVerifiable: total - verifiable,
    // Note prudente sur le total : les points non vérifiables ne sont jamais gagnés d'office.
    note20: total ? Math.round((got / total) * 200) / 10 : 0,
  };
}
