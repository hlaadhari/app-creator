/**
 * Référentiel Officiel des Compétences du Bac STI (STI2D / SIN / NSI)
 * et Définitions des Badges Pédagogiques (PRD Domaine 6, Jalon M7)
 */

import type {
  Competence,
  CompetenceCategory,
  BadgeDefinition,
} from "./types";

export const CATEGORY_LABELS: Record<CompetenceCategory, string> = {
  HTML: "HTML & Balisage Sémantique",
  CSS: "CSS & Design Adaptatif",
  JAVASCRIPT: "JavaScript & DOM Client",
  PHP: "PHP & Traitement Serveur",
  SQL: "SQL & Bases Relationnelles",
  ALGO_ARCHI: "Algorithmique & Architecture",
};

export const OFFICIAL_COMPETENCES: Competence[] = [
  // --- DOMAINE HTML (4) ---
  {
    id: "HTML.STRUCT",
    code: "HTML.STRUCT",
    libelle: "Structure globale du document HTML5",
    description: "Concevoir une arborescence valide (doctype, html, head, meta, body).",
    categorie: "HTML",
    ordre: 1,
  },
  {
    id: "HTML.SEMANTIC",
    code: "HTML.SEMANTIC",
    libelle: "Balises de structure et sémantique",
    description: "Employer les balises sémantiques adaptées (header, nav, main, article, section, footer).",
    categorie: "HTML",
    ordre: 2,
  },
  {
    id: "HTML.FORM",
    code: "HTML.FORM",
    libelle: "Formulaires interactifs et champs de saisie",
    description: "Concevoir des formulaires avec labels, inputs typés, boutons et attributs requis.",
    categorie: "HTML",
    ordre: 3,
  },
  {
    id: "HTML.MEDIA",
    code: "HTML.MEDIA",
    libelle: "Liens hypertextes et ressources multimédias",
    description: "Intégrer liens hypertextes (a), ancres, images avec texte alternatif et médias.",
    categorie: "HTML",
    ordre: 4,
  },

  // --- DOMAINE CSS (5) ---
  {
    id: "CSS.SELECTORS",
    code: "CSS.SELECTORS",
    libelle: "Sélecteurs, classes et pseudo-classes",
    description: "Cibler précisément les éléments du DOM via sélecteurs de balises, classes, ID et pseudo-classes.",
    categorie: "CSS",
    ordre: 10,
  },
  {
    id: "CSS.BOXMODEL",
    code: "CSS.BOXMODEL",
    libelle: "Modèle de boîte et propriétés visuelles",
    description: "Maîtriser marges, padding, bordures, couleurs, arrondis et dimensions.",
    categorie: "CSS",
    ordre: 11,
  },
  {
    id: "CSS.FLEX",
    code: "CSS.FLEX",
    libelle: "Mise en page flexible (Flexbox)",
    description: "Gérer l'alignement et la répartition unidimensionnelle (justify-content, align-items, flex-direction).",
    categorie: "CSS",
    ordre: 12,
  },
  {
    id: "CSS.GRID",
    code: "CSS.GRID",
    libelle: "Grille bidimensionnelle (CSS Grid)",
    description: "Structurer des gabarits multi-colonnes et lignes avec gap et grid-template.",
    categorie: "CSS",
    ordre: 13,
  },
  {
    id: "CSS.RESPONSIVE",
    code: "CSS.RESPONSIVE",
    libelle: "Design adaptatif et Media Queries",
    description: "Adapter l'interface aux terminaux mobiles et tablettes avec règles @media.",
    categorie: "CSS",
    ordre: 14,
  },

  // --- DOMAINE JAVASCRIPT (5) ---
  {
    id: "JS.SYNTAX",
    code: "JS.SYNTAX",
    libelle: "Variables, conditions et boucles JS",
    description: "Manipuler structures conditionnelles, boucles et types de données fondamentaux.",
    categorie: "JAVASCRIPT",
    ordre: 20,
  },
  {
    id: "JS.DOM",
    code: "JS.DOM",
    libelle: "Sélection et modification dynamique du DOM",
    description: "Manipuler le texte, les attributs et les classes d'éléments avec querySelector et classList.",
    categorie: "JAVASCRIPT",
    ordre: 21,
  },
  {
    id: "JS.EVENTS",
    code: "JS.EVENTS",
    libelle: "Gestion des événements utilisateur",
    description: "Attacher des écouteurs addEventListener (click, submit, input) avec gestion des événements.",
    categorie: "JAVASCRIPT",
    ordre: 22,
  },
  {
    id: "JS.VALIDATION",
    code: "JS.VALIDATION",
    libelle: "Contrôle de saisie et validation côté client",
    description: "Vérifier la validité des champs (formats, regex, contraintes, messages d'erreur).",
    categorie: "JAVASCRIPT",
    ordre: 23,
  },
  {
    id: "JS.ASYNC",
    code: "JS.ASYNC",
    libelle: "Traitements temporels et asynchrones",
    description: "Utiliser temporisateurs (setTimeout) et requêtes asynchrones pour dynamiser l'interface.",
    categorie: "JAVASCRIPT",
    ordre: 24,
  },

  // --- DOMAINE PHP (5) ---
  {
    id: "PHP.SYNTAX",
    code: "PHP.SYNTAX",
    libelle: "Fondamentaux et scripts PHP",
    description: "Écrire des scripts PHP structurés avec variables, boucles et fonctions personnalisées.",
    categorie: "PHP",
    ordre: 30,
  },
  {
    id: "PHP.SUPERGLOBALS_POST",
    code: "PHP.SUPERGLOBALS_POST",
    libelle: "Récupération et traitement HTTP POST / GET",
    description: "Traiter les requêtes avec $_POST, $_GET, assainir et valider les données reçues.",
    categorie: "PHP",
    ordre: 31,
  },
  {
    id: "PHP.SESSIONS",
    code: "PHP.SESSIONS",
    libelle: "Gestion de l'état et sessions utilisateur",
    description: "Maintenir l'état de connexion via session_start() et le tableau superglobal $_SESSION.",
    categorie: "PHP",
    ordre: 32,
  },
  {
    id: "PHP.DB_CONNECT",
    code: "PHP.DB_CONNECT",
    libelle: "Connexion et requêtes PDO / MySQLi",
    description: "Exécuter des requêtes SQL sécurisées (requêtes préparées) depuis PHP.",
    categorie: "PHP",
    ordre: 33,
  },
  {
    id: "PHP.ROUTING",
    code: "PHP.ROUTING",
    libelle: "Navigation et redirections serveur",
    description: "Gérer les en-têtes HTTP de redirection (header Location) et l'inclusion de gabarits.",
    categorie: "PHP",
    ordre: 34,
  },

  // --- DOMAINE SQL (5) ---
  {
    id: "SQL.DDL",
    code: "SQL.DDL",
    libelle: "Création de tables et schéma relationnel (LDD)",
    description: "Définir des tables CREATE TABLE avec contraintes PRIMARY KEY, FOREIGN KEY, NOT NULL.",
    categorie: "SQL",
    ordre: 40,
  },
  {
    id: "SQL.DML_INSERT",
    code: "SQL.DML_INSERT",
    libelle: "Insertion et mise à jour de données",
    description: "Insérer des données fiables (INSERT INTO) et mettre à jour des enregistrements (UPDATE).",
    categorie: "SQL",
    ordre: 41,
  },
  {
    id: "SQL.SELECT_BASIC",
    code: "SQL.SELECT_BASIC",
    libelle: "Interrogation et filtrage de données",
    description: "Extraire et trier des données (SELECT, FROM, WHERE, ORDER BY, LIMIT).",
    categorie: "SQL",
    ordre: 42,
  },
  {
    id: "SQL.JOIN",
    code: "SQL.JOIN",
    libelle: "Jointures multi-tables relationnelles",
    description: "Combiner plusieurs tables par des jointures relationnelles (INNER JOIN, LEFT JOIN).",
    categorie: "SQL",
    ordre: 43,
  },
  {
    id: "SQL.AGGREGATE",
    code: "SQL.AGGREGATE",
    libelle: "Fonctions d'agrégation et regroupements",
    description: "Calculer des statistiques et regrouper les données (COUNT, SUM, AVG, GROUP BY, HAVING).",
    categorie: "SQL",
    ordre: 44,
  },

  // --- DOMAINE ALGO & ARCHITECTURE (2) ---
  {
    id: "ALGO.LOGIC",
    code: "ALGO.LOGIC",
    libelle: "Raisonnement logique et décomposition",
    description: "Décomposer un énoncé technique en étapes unitaires vérifiables.",
    categorie: "ALGO_ARCHI",
    ordre: 50,
  },
  {
    id: "ARCHI.FULLSTACK",
    code: "ARCHI.FULLSTACK",
    libelle: "Architecture Web Client-Serveur-Base",
    description: "Articuler de bout en bout l'interface, le backend serveur et la persistance relationnelle.",
    categorie: "ALGO_ARCHI",
    ordre: 51,
  },
];

export const OFFICIAL_BADGES: BadgeDefinition[] = [
  {
    id: "PREMIERS_PAS",
    titre: "Premiers Pas",
    description: "Valider avec succès son tout premier critère d'évaluation.",
    icone: "Sparkles",
    categorie: "Général",
    seuilPoints: 2,
  },
  {
    id: "ARCHITECTE_HTML",
    titre: "Architecte Web",
    description: "Atteindre au moins 70% de maîtrise sur les compétences HTML.",
    icone: "FileCode",
    categorie: "HTML",
    seuilPoints: 10,
  },
  {
    id: "STYLISTE_CSS",
    titre: "Styliste CSS",
    description: "Maîtriser les sélecteurs, le modèle de boîte et la mise en page flexbox (>= 70%).",
    icone: "Palette",
    categorie: "CSS",
    seuilPoints: 15,
  },
  {
    id: "DOM_MASTER",
    titre: "Maître du DOM",
    description: "Valider les interactions JavaScript dynamiques et la gestion des événements.",
    icone: "Zap",
    categorie: "JavaScript",
    seuilPoints: 15,
  },
  {
    id: "ARTISAN_PHP",
    titre: "Artisan PHP",
    description: "Traiter avec succès un formulaire HTTP POST et des requêtes côté serveur.",
    icone: "Server",
    categorie: "PHP",
    seuilPoints: 20,
  },
  {
    id: "EXPLORATEUR_SQL",
    titre: "Explorateur SQL",
    description: "Créer des tables relationnelles et interroger des bases avec SELECT.",
    icone: "Database",
    categorie: "SQL",
    seuilPoints: 20,
  },
  {
    id: "MAJOR_BAC_BLANC",
    titre: "Major de Promo",
    description: "Obtenir une note supérieure ou égale à 16/20 sur une épreuve d'examen blanc officiel.",
    icone: "Trophy",
    categorie: "Examen",
    seuilPoints: 16,
  },
  {
    id: "PERSEVERANT",
    titre: "Persévérant",
    description: "Valider un critère exigeant après 3 tentatives infructueuses ou plus.",
    icone: "ShieldCheck",
    categorie: "Mental",
    seuilPoints: 5,
  },
];

/**
 * Règles heuristiques de correspondance critères -> compétences
 * Permet de relier tout critère d'un sujet aux compétences du Bac STI
 */
export function inferCompetenceForCriterion(
  criterionId: string,
  criterionLabel: string,
  exerciseId?: string,
): string {
  const normId = (criterionId || "").toLowerCase();
  const normLabel = (criterionLabel || "").toLowerCase();
  const normEx = (exerciseId || "").toLowerCase();

  // 1. SQL
  const isSql =
    normEx.includes("sql") ||
    normLabel.includes("sql") ||
    normId.includes("sql") ||
    normId.includes("count") ||
    normLabel.includes("count") ||
    normLabel.includes("jointure") ||
    normLabel.includes("join") ||
    normLabel.includes("table") ||
    normLabel.includes("select") ||
    normLabel.includes("agrég") ||
    normLabel.includes("agreg") ||
    normLabel.includes("group by");

  if (isSql) {
    if (normLabel.includes("join") || normLabel.includes("jointure")) return "SQL.JOIN";
    if (
      normLabel.includes("count") ||
      normLabel.includes("group by") ||
      normLabel.includes("somme") ||
      normLabel.includes("avg") ||
      normLabel.includes("agrégation") ||
      normLabel.includes("agregation")
    ) {
      return "SQL.AGGREGATE";
    }
    if (normLabel.includes("insert") || normLabel.includes("insertion")) return "SQL.DML_INSERT";
    if (
      normLabel.includes("create") ||
      normLabel.includes("primary key") ||
      normLabel.includes("cle") ||
      normLabel.includes("table")
    ) {
      return "SQL.DDL";
    }
    return "SQL.SELECT_BASIC";
  }

  // 2. PHP (Spécifique aux traitements serveur)
  const isPhp =
    normEx.includes("php") ||
    normLabel.includes("php") ||
    normId.includes("php") ||
    normLabel.includes("$_post") ||
    normLabel.includes("$_get") ||
    normLabel.includes("session") ||
    normLabel.includes("redirection") ||
    (normLabel.includes("post") && !normLabel.includes("poste"));

  if (isPhp) {
    if (normLabel.includes("session")) return "PHP.SESSIONS";
    if (normLabel.includes("pdo") || normLabel.includes("mysqli")) return "PHP.DB_CONNECT";
    if (normLabel.includes("redirection") || normLabel.includes("location") || normLabel.includes("header")) {
      return "PHP.ROUTING";
    }
    if (normLabel.includes("post") || normLabel.includes("traitement")) return "PHP.SUPERGLOBALS_POST";
    return "PHP.SYNTAX";
  }

  // 3. JavaScript
  const isJs =
    normEx.includes("js") ||
    normEx.includes("javascript") ||
    normEx.includes("compteur") ||
    normEx.includes("cin") ||
    normId.includes("click") ||
    normId.includes("clic") ||
    normId.includes("cin") ||
    normLabel.includes("click") ||
    normLabel.includes("clic") ||
    normLabel.includes("javascript") ||
    normLabel.includes("js") ||
    normLabel.includes("validation") ||
    normLabel.includes("valide") ||
    normLabel.includes("cin") ||
    normLabel.includes("evenement") ||
    normLabel.includes("événement") ||
    normLabel.includes("total");

  if (isJs) {
    if (
      normLabel.includes("valide") ||
      normLabel.includes("validation") ||
      normLabel.includes("format") ||
      normLabel.includes("longueur") ||
      normLabel.includes("chiffre") ||
      normLabel.includes("regex") ||
      normLabel.includes("cin") ||
      normId.includes("cin")
    ) {
      return "JS.VALIDATION";
    }
    if (
      normLabel.includes("clic") ||
      normLabel.includes("click") ||
      normLabel.includes("submit") ||
      normLabel.includes("bouton") ||
      normLabel.includes("écouteur") ||
      normLabel.includes("ecouteur") ||
      normId.includes("click") ||
      normId.includes("clic")
    ) {
      return "JS.EVENTS";
    }
    if (
      normLabel.includes("classe") ||
      normLabel.includes("texte") ||
      normLabel.includes("dom") ||
      normLabel.includes("total") ||
      normId.includes("max")
    ) {
      return "JS.DOM";
    }
    return "JS.SYNTAX";
  }

  // 4. CSS
  const isCss =
    normEx.includes("mise-en-forme") ||
    normEx.includes("css") ||
    normId.includes("bg") ||
    normId.includes("color") ||
    normId.includes("radius") ||
    normId.includes("padding") ||
    normId.includes("flex") ||
    normId.includes("grid") ||
    normId.includes("mob") ||
    normLabel.includes("css") ||
    normLabel.includes("flex") ||
    normLabel.includes("grid") ||
    normLabel.includes("responsive") ||
    normLabel.includes("media") ||
    normLabel.includes("mobile") ||
    normLabel.includes("couleur") ||
    normLabel.includes("fond") ||
    normLabel.includes("arrondi") ||
    normLabel.includes("centré") ||
    normLabel.includes("padding") ||
    normLabel.includes("marge");

  if (isCss) {
    if (
      normLabel.includes("responsive") ||
      normLabel.includes("media") ||
      normLabel.includes("mobile") ||
      normId.includes("mob")
    ) {
      return "CSS.RESPONSIVE";
    }
    if (normLabel.includes("flex") || normId.includes("flex")) return "CSS.FLEX";
    if (normLabel.includes("grid")) return "CSS.GRID";
    if (
      normId.includes("bg") ||
      normId.includes("radius") ||
      normId.includes("padding") ||
      normLabel.includes("fond") ||
      normLabel.includes("marge") ||
      normLabel.includes("padding") ||
      normLabel.includes("arrondi") ||
      normLabel.includes("centré")
    ) {
      return "CSS.BOXMODEL";
    }
    return "CSS.SELECTORS";
  }

  // 5. HTML
  if (normId.includes("form") || normLabel.includes("formulaire") || normLabel.includes("input") || normLabel.includes("select")) {
    return "HTML.FORM";
  }
  if (normId.includes("mail") || normLabel.includes("lien") || normLabel.includes("href") || normLabel.includes("image") || normLabel.includes("mailto")) {
    return "HTML.MEDIA";
  }
  if (
    normId.includes("article") ||
    normLabel.includes("article") ||
    normLabel.includes("section") ||
    normLabel.includes("nav") ||
    normLabel.includes("header") ||
    normLabel.includes("footer")
  ) {
    return "HTML.SEMANTIC";
  }

  return "HTML.STRUCT";
}

/**
 * Retourne la liste des compétences ciblées par un sujet donné
 */
export function getCompetencesForSubject(
  exerciseId: string,
  criteriaIdsOrLabels: Array<{ id: string; label: string }>,
): Competence[] {
  const competenceIds = new Set<string>();

  for (const c of criteriaIdsOrLabels) {
    const compId = inferCompetenceForCriterion(c.id, c.label, exerciseId);
    competenceIds.add(compId);
  }

  // Si c'est un examen blanc (ex: Module C), associer les compétences clés transversales
  if (exerciseId.includes("bac") || exerciseId.includes("examen")) {
    competenceIds.add("ARCHI.FULLSTACK");
  }

  return OFFICIAL_COMPETENCES.filter((c) => competenceIds.has(c.id));
}
