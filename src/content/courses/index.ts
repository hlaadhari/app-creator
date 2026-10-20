import html5Raw from "./course-html5.html?raw";
import css3Raw from "./course-css3.html?raw";
import jsRaw from "./course-js.html?raw";
import phpRaw from "./course-php.html?raw";
import sqlRaw from "./course-sql.html?raw";

export interface CourseSection {
  id: string;
  title: string;
}

export interface CourseModule {
  id: "html5" | "css3" | "js" | "php" | "sql";
  badge: string;
  title: string;
  shortTitle: string;
  description: string;
  rawHtml: string;
  iconName: "FileCode" | "Palette" | "Braces" | "Server" | "Database";
  sections: CourseSection[];
}

export const COURSE_MODULES: CourseModule[] = [
  {
    id: "html5",
    badge: "Module 1",
    title: "HTML5 & Structuration Web Sémantique",
    shortTitle: "HTML5",
    description:
      "Squelette de document, balises sémantiques, multimédia, tableaux et formulaires interactifs.",
    rawHtml: html5Raw,
    iconName: "FileCode",
    sections: [
      { id: "structure-base", title: "1. Structure d'un document HTML5" },
      { id: "balises-semantiques", title: "2. Balises sémantiques de structure" },
      { id: "contenu-media", title: "3. Balises de contenu & Multimédia" },
      { id: "tableaux", title: "4. Tableaux de données" },
      { id: "formulaires", title: "5. Formulaires interactifs" },
      { id: "cadres-conteneurs", title: "6. Cadres, Conteneurs & Événements" },
      { id: "evenements-html", title: "7. Attributs d'Événements HTML" },
    ],
  },
  {
    id: "css3",
    badge: "Module 2",
    title: "CSS3 & Mise en Forme Visuelle",
    shortTitle: "CSS3",
    description:
      "Sélecteurs, modèle de boîte (Box Model), positionnement, typographie, arrière-plans et transitions.",
    rawHtml: css3Raw,
    iconName: "Palette",
    sections: [
      { id: "selecteurs-css", title: "1. Sélecteurs & Priorités" },
      { id: "modele-boite", title: "2. Modèle de Boîte (Box Model)" },
      { id: "positionnement", title: "3. Positionnement & Agencement" },
      { id: "typographie-couleurs", title: "4. Typographie & Couleurs" },
      { id: "arriere-plans", title: "5. Arrière-plans & Gradients" },
      { id: "transitions-transformations", title: "6. Transformations & Transitions" },
    ],
  },
  {
    id: "js",
    badge: "Module 3",
    title: "JavaScript & DOM Client",
    shortTitle: "JavaScript",
    description:
      "Contrôles de formulaire, manipulation du DOM, conversion de types, chaînes et patron verif().",
    rawHtml: jsRaw,
    iconName: "Braces",
    sections: [
      { id: "js-inclusion", title: "1. Inclusion du script JavaScript" },
      { id: "js-dialogues", title: "2. Boîtes de dialogue & Entrées / Sorties" },
      { id: "js-dom", title: "3. Manipulation des Éléments du DOM" },
      { id: "js-conversion", title: "4. Fonctions de Validation & Conversion" },
      { id: "js-strings", title: "5. Manipulation des Chaînes de Caractères" },
      { id: "js-objets", title: "6. Objets Prédéfinis : Math & Date" },
      { id: "js-verif", title: "7. Patron Canonique de la Fonction verif()" },
    ],
  },
  {
    id: "php",
    badge: "Module 4",
    title: "PHP 8.2 & Traitement Serveur",
    shortTitle: "PHP / MySQLi",
    description:
      "Récupération HTTP, superglobales, traitement des chaînes et interfaçage procédural MySQLi.",
    rawHtml: phpRaw,
    iconName: "Server",
    sections: [
      { id: "php-syntaxe", title: "1. Structure de Base & Syntaxe PHP" },
      { id: "php-formulaires", title: "2. Récupération des Données de Formulaire" },
      { id: "php-chaines", title: "3. Fonctions Natives Essentielles" },
      { id: "php-mysqli", title: "4. Interfaçage MySQLi Procédural" },
      { id: "php-patron", title: "5. Patron Canonique d'Insertion & Consultation" },
    ],
  },
  {
    id: "sql",
    badge: "Module 5",
    title: "Bases de Données & Langage SQL",
    shortTitle: "SQL (MySQL)",
    description:
      "Types de données, contraintes d'intégrité, LDD, LMD, requêtes SELECT et fonctions d'agrégation.",
    rawHtml: sqlRaw,
    iconName: "Database",
    sections: [
      { id: "sql-types", title: "1. Types de Données SGBD (MySQL)" },
      { id: "sql-contraintes", title: "2. Contraintes d'Intégrité" },
      { id: "sql-ldd", title: "3. Langage de Définition de Données (LDD)" },
      { id: "sql-lmd", title: "4. Langage de Manipulation de Données (LMD)" },
      { id: "sql-lid", title: "5. Langage d'Interrogation de Données (LID / SELECT)" },
    ],
  },
];
