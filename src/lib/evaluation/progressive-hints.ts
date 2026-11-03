/**
 * Module d'indices progressifs à 3 niveaux pour l'évaluation formative (Issue #133 / PED-06)
 *
 * Niveau 1 : Rappel de notion (Conceptuel)
 * Niveau 2 : Piste ciblée (Syntaxique)
 * Niveau 3 : Extrait de code proche sans livrer la réponse finale
 */

export interface RawCriterionHints {
  id?: unknown;
  code?: unknown;
  titre?: unknown;
  label?: unknown;
  type?: unknown;
  fichier?: unknown;
  fail_message?: unknown;
  fail?: unknown;
  selector?: unknown;
  css_property?: unknown;
  expected_value?: unknown;
  function_name?: unknown;
  sonde?: {
    type?: string;
    selector?: string;
    property?: string;
    expectedValue?: string;
    table?: string;
    [key: string]: unknown;
  };
  indices?: unknown;
  hints?: unknown;
  [key: string]: unknown;
}

export function genererIndicesProgressifs(c: RawCriterionHints): [string, string, string] {
  // 1. Si des indices explicites sont déjà définis
  const rawList = Array.isArray(c.indices) ? c.indices : Array.isArray(c.hints) ? c.hints : null;

  if (rawList && rawList.length >= 3) {
    return [String(rawList[0]), String(rawList[1]), String(rawList[2])];
  }

  const titre = String(c.titre || c.label || c.fail_message || "").toLowerCase();
  const selector = String(c.selector || c.sonde?.selector || "");
  const prop = String(c.css_property || c.sonde?.property || "").toLowerCase();
  const fnName = String(c.function_name || "");
  const sondeType = String(c.sonde?.type || c.type || "");

  // Catégorie 1 : CSS Display / Alignement
  if (prop === "display" || titre.includes("alignement") || titre.includes("inline-block")) {
    return [
      "La propriété CSS 'display' détermine le type de boîte généré par un élément pour son agencement dans le flux du document.",
      `Sur le sélecteur '${selector || ".classe"}', spécifiez 'display: inline-block;' pour combiner alignement horizontal et dimensions fixes.`,
      `${selector || ".bloc"} {\n  display: inline-block;\n  vertical-align: top;\n}`,
    ];
  }

  // Catégorie 2 : CSS Dimensions & Modèle de boîte (width, margin, padding)
  if (
    prop === "width" ||
    prop.includes("margin") ||
    prop.includes("padding") ||
    titre.includes("largeur")
  ) {
    return [
      "Le modèle de boîte CSS (Box Model) contrôle les dimensions du contenu, les marges intérieures (padding) et extérieures (margin).",
      `Attribuez la dimension requise avec la propriété CSS adéquate (ex: width: 250px) sur '${selector || "l'élément"}'.`,
      `${selector || ".element"} {\n  width: 250px;\n  box-sizing: border-box;\n}`,
    ];
  }

  // Catégorie 3 : CSS Bordures & Coins arrondis
  if (prop.includes("border") || titre.includes("bordure") || titre.includes("arrondi")) {
    return [
      "Les styles de bordure permettent de délimiter visuellement un composant. Les coins arrondis adoucissent l'interface.",
      `Utilisez les propriétés 'border' (style, épaisseur, couleur) et 'border-radius' pour définir le rayon de courbure sur '${selector || "le bloc"}'.`,
      `${selector || ".carte"} {\n  border: 2px solid #0066cc;\n  border-radius: 8px;\n}`,
    ];
  }

  // Catégorie 4 : CSS Transitions & Hover
  if (prop.includes("transition") || titre.includes("transition") || titre.includes("hover")) {
    return [
      "Les transitions CSS permettent d'animer avec fluidité les changements de propriétés lors d'une interaction utilisateur.",
      `Déclarez 'transition: all 0.3s ease;' sur l'élément de base, puis appliquez la transformation ou nouvelle couleur dans la pseudo-classe ':hover'.`,
      `h1 {\n  transition: all 0.3s ease;\n}\nh1:hover {\n  transform: scale(1.05);\n}`,
    ];
  }

  // Catégorie 5 : Validation JavaScript de CIN / Longueur / Numérique
  if (
    fnName ||
    titre.includes("cin") ||
    titre.includes("validation js") ||
    sondeType === "js_test_cas"
  ) {
    return [
      "La validation de formulaire côté client intercepte la soumission, contrôle les règles de gestion et alerte l'utilisateur en cas d'erreur.",
      `Dans la fonction '${fnName || "verif"}()', récupérez la valeur du champ, vérifiez sa longueur (.length) et contrôlez le format avec une boucle ou une RegExp.`,
      `function ${fnName || "verif"}() {\n  const val = document.getElementById("champ").value;\n  if (val.length !== 8 || isNaN(val)) return false;\n  return true;\n}`,
    ];
  }

  // Catégorie 6 : PHP & MySQLi (Connexion, Requêtes, Insertion, Agrégation)
  if (
    sondeType === "php_mysqli_check" ||
    titre.includes("php") ||
    titre.includes("mysqli") ||
    titre.includes("insertion")
  ) {
    return [
      "En PHP procédural, les interactions avec MySQL s'effectuent via les fonctions de l'extension MySQLi en nettoyant les paramètres POST.",
      "Récupérez les valeurs transmises dans '$_POST', sécurisez-les avec mysqli_real_escape_string() et exécutez la requête via mysqli_query().",
      "$cnx = mysqli_connect('localhost', 'root', '', 'bdd');\n$sql = \"INSERT INTO table (col) VALUES ('$val')\";\n$res = mysqli_query($cnx, $sql);",
    ];
  }

  // Catégorie 7 : Schéma SQL relationnel / LDD (CREATE TABLE, PRIMARY KEY, FOREIGN KEY, CHECK)
  if (
    sondeType === "sql_table_check" ||
    (titre.includes("sql") && !titre.includes("mysqli")) ||
    titre.includes("table") ||
    titre.includes("clé")
  ) {
    return [
      "Le Langage de Définition de Données (LDD) formalise les entités et garantit l'intégrité relationnelle via les clés et contraintes de domaine.",
      "Spécifiez la table avec ses types de colonnes, 'PRIMARY KEY', 'FOREIGN KEY (...) REFERENCES ...' et 'CHECK (...)'.",
      "CREATE TABLE exemple (\n  id INT PRIMARY KEY,\n  valeur INT NOT NULL CHECK (valeur >= 0),\n  FOREIGN KEY (ref_id) REFERENCES autre(id)\n);",
    ];
  }

  // Piste par défaut générique
  return [
    `Révisez la consigne demandée pour le critère : ${c.titre || c.label || "Vérification requise"}.`,
    `Vérifiez le fichier ciblé '${c.fichier || "principal"}' et conformez-vous strictement aux noms d'identifiants et syntaxes attendus.`,
    "Consultez les exemples similaires fournis dans le cours et appliquez la structure minimale demandée.",
  ];
}
