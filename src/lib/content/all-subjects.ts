import type { Exercise, Criterion } from "../exercises";

interface RawProbe {
  type?: string;
  selector?: string;
  minCount?: number;
  property?: string;
  expectedValue?: string;
  isGreaterThanZero?: boolean;
  checkSelector?: string;
  [key: string]: unknown;
}

interface RawCriterion {
  id?: string;
  code?: string;
  titre?: string;
  label?: string;
  points: number;
  fail_message?: string;
  fail?: string;
  sonde?: RawProbe;
  [key: string]: unknown;
}

function makeProbeCheck(
  probe: RawProbe | null | undefined,
): (doc: Document, win: Window) => boolean {
  return (doc: Document, win: Window) => {
    if (!probe) return true;
    try {
      if (probe.type === "dom_selector") {
        if (!probe.selector) return false;
        const els = doc.querySelectorAll(probe.selector);
        if (probe.minCount && els.length < probe.minCount) return false;
        return els.length > 0;
      }
      if (probe.type === "css_property") {
        if (!probe.selector || !probe.property) return false;
        const el = doc.querySelector(probe.selector);
        if (!el) return false;
        const val = win.getComputedStyle(el).getPropertyValue(probe.property).trim();
        if (probe.expectedValue) return val.includes(probe.expectedValue);
        if (probe.isGreaterThanZero) return parseFloat(val) > 0;
        return val.length > 0;
      }
      if (probe.type === "js_eval") {
        if (probe.checkSelector) {
          const el = doc.querySelector(probe.checkSelector);
          return !!el;
        }
        return true;
      }
      return true;
    } catch {
      return false;
    }
  };
}

export interface SubjectContentItem extends Exercise {
  module: string;
  dureeMinutes: number;
  tags: string[];
  examMode?: boolean;
  bareme?: number;
  enonceMarkdown: string;
}

const rawSubjects = [
  {
    id: "ex-html-css-01",
    title: "Mise en forme & Transitions CSS3",
    level: "Facile",
    competence: "CSS3 • Box-Model • Hover",
    module: "Module A",
    dureeMinutes: 20,
    tags: ["CSS3", "Box-Model", "Hover"],
    examMode: false,
    bareme: 20,
    statement: [
      "**Alignement et Modèle de Boîte (`.L1`)** :",
      "Configurez les blocs de classe `.L1` pour qu'ils s'affichent sous la forme de blocs en ligne avec `display: inline-block`.",
      "Définissez une largeur fixe `width: 250px`.",
      "Ajoutez une marge extérieure de `margin: 10px` et un espacement intérieur `padding: 15px`.",
      "**Style des Boutons et Cartes (`.b1`)** :",
      "Ajoutez une bordure solide de 2px de couleur `#0066cc` (`border: 2px solid #0066cc`).",
      "Appliquez un rayon de courbure aux coins de `border-radius: 8px`.",
      "Définissez une couleur d'arrière-plan claire `background-color: #f0f7ff`.",
      "**Transition Fluide sur le Titre Principal (`h1`)** :",
      "Sur l'élément `h1`, configurez une transition fluide sur toutes les propriétés : `transition: all 0.3s ease`.",
      "Centrez le titre avec `text-align: center`.",
      "**Effet Interactif au Survol (`h1:hover`)** :",
      "Au survol (`:hover`), la couleur du texte devient `#0066cc`.",
      "Le titre subit un léger agrandissement avec la transformation `transform: scale(1.05)`.",
    ],
    enonceMarkdown:
      "# Mise en forme & Transitions CSS3\n\n## Contexte\n\nDans le cadre de l'épreuve pratique du Baccalauréat STI, vous devez concevoir l'interface d'un tableau de bord de laboratoire. La structure HTML est déjà fournie dans `index.html`. Votre mission consiste à appliquer la feuille de style dans `style.css`.\n\n---\n\n## Consignes\n\n1. **Alignement et Modèle de Boîte (`.L1`)** :\n   - Configurez les blocs de classe `.L1` pour qu'ils s'affichent sous la forme de blocs en ligne avec `display: inline-block`.\n   - Définissez une largeur fixe `width: 250px`.\n   - Ajoutez une marge extérieure de `margin: 10px` et un espacement intérieur `padding: 15px`.\n\n2. **Style des Boutons et Cartes (`.b1`)** :\n   - Ajoutez une bordure solide de 2px de couleur `#0066cc` (`border: 2px solid #0066cc`).\n   - Appliquez un rayon de courbure aux coins de `border-radius: 8px`.\n   - Définissez une couleur d'arrière-plan claire `background-color: #f0f7ff`.\n\n3. **Transition Fluide sur le Titre Principal (`h1`)** :\n   - Sur l'élément `h1`, configurez une transition fluide sur toutes les propriétés : `transition: all 0.3s ease`.\n   - Centrez le titre avec `text-align: center`.\n\n4. **Effet Interactif au Survol (`h1:hover`)** :\n   - Au survol (`:hover`), la couleur du texte devient `#0066cc`.\n   - Le titre subit un léger agrandissement avec la transformation `transform: scale(1.05)`.\n",
    starter: {
      "index.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Laboratoire STI - Tableau de Bord</title>\n    <link rel="stylesheet" href="style.css" />\n  </head>\n  <body>\n    <header>\n      <h1>Laboratoire STI2D</h1>\n    </header>\n\n    <main>\n      <div class="L1 b1">\n        <h2>Station Météo</h2>\n        <p>Mesure de température et pression atmosphérique.</p>\n      </div>\n\n      <div class="L1 b1">\n        <h2>Bras Robotique</h2>\n        <p>Contrôle cinématique et servomoteurs.</p>\n      </div>\n\n      <div class="L1 b1">\n        <h2>Banc Optique</h2>\n        <p>Focalisation laser et capteurs CCD.</p>\n      </div>\n    </main>\n  </body>\n</html>\n',
      "style.css":
        "/* ==========================================================================\n   Exercice : Mise en forme & Transitions CSS3\n   Complétez les règles ci-dessous conformément aux consignes.\n   ========================================================================== */\n\nbody {\n  font-family: sans-serif;\n  margin: 20px;\n}\n\n/* 1. Titre h1 et transition */\nh1 {\n  /* Vos règles ici */\n}\n\nh1:hover {\n  /* Vos règles au survol ici */\n}\n\n/* 2. Blocs .L1 */\n.L1 {\n  /* Vos règles d'alignement ici */\n}\n\n/* 3. Style .b1 */\n.b1 {\n  /* Vos bordures et styles ici */\n}\n",
    },
    hints: [
      "Consultez l'énoncé officiel et les consignes du Mise en forme & Transitions CSS3.",
      "Respectez strictement la nomenclature des fonctions et IDs demandés : index.html, style.css.",
      "Vérifiez les points d'arrêt et la conformité des types/formats de données.",
    ],
    rawCriteria: [
      {
        id: "c1_display_inline_block",
        titre: "Alignement .L1 en ligne (inline-block)",
        points: 4,
        fail_message:
          "Les éléments de classe .L1 doivent avoir la propriété display: inline-block.",
        selector: ".L1",
        css_property: "display",
        expected_value: "inline-block",
      },
      {
        id: "c2_width",
        titre: "Largeur définie sur .L1 (250px)",
        points: 3,
        fail_message: "Les éléments .L1 doivent avoir une largeur fixée à 250px.",
        selector: ".L1",
        css_property: "width",
        expected_value: "250px",
      },
      {
        id: "c3_border",
        titre: "Bordure sur .b1 (2px solid #0066cc)",
        points: 4,
        fail_message: "La classe .b1 doit avoir une bordure solide de 2px en #0066cc.",
        selector: ".b1",
        css_property: "border-style",
        expected_value: "solid",
      },
      {
        id: "c4_border_radius",
        titre: "Coins arrondis sur .b1 (border-radius)",
        points: 3,
        fail_message: "La classe .b1 doit posséder un border-radius de 8px.",
        selector: ".b1",
        css_property: "border-radius",
        expected_value: "8px",
      },
      {
        id: "c5_transition",
        titre: "Transition fluide sur h1",
        points: 3,
        fail_message: "Le titre h1 doit définir une transition CSS.",
        selector: "h1",
        css_property: "transition-duration",
        expected_value: "0.3s",
      },
      {
        id: "c6_hover_rule",
        titre: "Règle de survol h1:hover",
        points: 3,
        fail_message:
          "La feuille de style doit comporter la pseudo-classe h1:hover avec une transformation ou couleur.",
        css_rule_contains: "h1:hover",
      },
    ],
  },
  {
    id: "ex-js-01",
    title: "Validation JS - Contrôle CIN & Chaînes",
    level: "Facile",
    competence: "JavaScript • DOM • RegExp",
    module: "Module A",
    dureeMinutes: 25,
    tags: ["JavaScript", "DOM", "RegExp"],
    examMode: false,
    bareme: 20,
    statement: [
      "**Récupération de la Valeur** :",
      "Récupérez la valeur saisie dans le champ d'identifiant `cin` (ou `document.f.cin.value`).",
      "**Contrôle de Longueur Exacte** :",
      "Le numéro CIN doit comporter **exactement 8 caractères** (`cin.length === 8`).",
      'Si la longueur est différente de 8, affichez une alerte avec `alert("Le CIN doit comporter exactement 8 chiffres")` et retournez `false`.',
      "**Contrôle Numérique Strict** :",
      "Le numéro CIN ne doit contenir que des chiffres décimaux (`0` à `9`).",
      "Si le champ contient des lettres, espaces ou symboles, affichez un message d'erreur et retournez `false`.",
      "Vous pouvez utiliser une expression régulière (ex: `/^[0-9]{8}$/`) ou tester la composition caractère par caractère.",
      "**Validation Positive** :",
      "Si toutes les conditions sont remplies, la fonction retourne `true`.",
    ],
    enonceMarkdown:
      "# Validation JS – Contrôle CIN & Chaînes de Caractères\n\n## Contexte\n\nDans les épreuves pratiques d'informatique du Baccalauréat STI, la saisie sécurisée des identifiants élèves ou candidats impose une validation rigoureuse côté client en JavaScript avant toute soumission au serveur.\n\nLe formulaire fourni dans `formulaire.html` contient un champ de saisie avec l'identifiant `cin` et un bouton de validation déclenchant la fonction `verif()`.\n\n---\n\n## Consignes\n\nDans le fichier `controle.js`, implémentez la fonction `verif()` :\n\n1. **Récupération de la Valeur** :\n   - Récupérez la valeur saisie dans le champ d'identifiant `cin` (ou `document.f.cin.value`).\n\n2. **Contrôle de Longueur Exacte** :\n   - Le numéro CIN doit comporter **exactement 8 caractères** (`cin.length === 8`).\n   - Si la longueur est différente de 8, affichez une alerte avec `alert(\"Le CIN doit comporter exactement 8 chiffres\")` et retournez `false`.\n\n3. **Contrôle Numérique Strict** :\n   - Le numéro CIN ne doit contenir que des chiffres décimaux (`0` à `9`).\n   - Si le champ contient des lettres, espaces ou symboles, affichez un message d'erreur et retournez `false`.\n   - Vous pouvez utiliser une expression régulière (ex: `/^[0-9]{8}$/`) ou tester la composition caractère par caractère.\n\n4. **Validation Positive** :\n   - Si toutes les conditions sont remplies, la fonction retourne `true`.\n",
    starter: {
      "controle.js":
        "// ==========================================================================\n// Exercice : Contrôle de saisie CIN en JavaScript\n// Écrivez la fonction verif() conformément aux consignes.\n// ==========================================================================\n\nfunction verif() {\n  // 1. Récupérer la valeur du champ #cin\n\n  // 2. Vérifier que la longueur est exactement égale à 8\n\n  // 3. Vérifier que la chaîne ne contient que des chiffres\n\n  // 4. Retourner true si valide, false sinon\n  return false;\n}\n",
      "formulaire.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Inscription STI - Contrôle Candidat</title>\n  </head>\n  <body>\n    <h1>Identification du Candidat</h1>\n\n    <form name="f" action="enregistrer.php" method="post" onsubmit="return verif();">\n      <label for="cin">Numéro CIN (8 chiffres) :</label>\n      <input type="text" id="cin" name="cin" placeholder="Ex: 09876543" />\n      <button type="submit" id="btnValider">Valider</button>\n    </form>\n\n    <script src="controle.js"></script>\n  </body>\n</html>\n',
    },
    hints: [
      "Consultez l'énoncé officiel et les consignes du Validation JS - Contrôle CIN & Chaînes.",
      "Respectez strictement la nomenclature des fonctions et IDs demandés : formulaire.html, controle.js.",
      "Vérifiez les points d'arrêt et la conformité des types/formats de données.",
    ],
    rawCriteria: [
      {
        id: "c1_verif_exists",
        titre: "Déclaration de la fonction verif()",
        points: 4,
        fail_message: "La fonction verif() doit être déclarée dans controle.js.",
        type: "js_function_exists",
        function_name: "verif",
      },
      {
        id: "c2_length_control",
        titre: "Contrôle de la longueur (.length === 8)",
        points: 4,
        fail_message:
          "Le code doit utiliser la propriété .length pour contrôler que le CIN comporte 8 caractères.",
        type: "code_contains",
        patterns: [".length", "8"],
      },
      {
        id: "c3_reject_short",
        titre: "Rejet des saisies trop courtes",
        points: 4,
        fail_message:
          "La fonction verif() doit retourner false si le CIN comporte moins de 8 caractères (ex: '12345').",
        type: "js_test_execution",
        input_cin: "12345",
        expected_return: false,
      },
      {
        id: "c4_reject_alpha",
        titre: "Rejet des caractères non numériques",
        points: 4,
        fail_message:
          "La fonction verif() doit retourner false si le CIN contient des lettres ou symboles (ex: '1234567A').",
        type: "js_test_execution",
        input_cin: "1234567A",
        expected_return: false,
      },
      {
        id: "c5_accept_valid",
        titre: "Validation positive pour 8 chiffres",
        points: 4,
        fail_message:
          "La fonction verif() doit retourner true pour un numéro CIN valide (ex: '09876543').",
        type: "js_test_execution",
        input_cin: "09876543",
        expected_return: true,
      },
    ],
  },
  {
    id: "ex-sql-01",
    title: "Commandes LDD & Contraintes d'Intégrité",
    level: "Facile",
    competence: "SQL • LDD • CREATE TABLE",
    module: "Module A",
    dureeMinutes: 20,
    tags: ["SQL", "LDD", "CREATE TABLE"],
    examMode: false,
    bareme: 20,
    statement: [
      "**Champs de la table `mesure`** :",
      "`id_mesure` : Entier (`INT`), auto-incrémenté, constituant la **clé primaire** (`PRIMARY KEY`).",
      "`id_capteur` : Entier (`INT`), obligatoire (`NOT NULL`).",
      "`valeur` : Nombre décimal (`DECIMAL(6,2)` ou `FLOAT`), obligatoire (`NOT NULL`).",
      "`date_mesure` : Horodatage (`DATETIME`), avec pour valeur par défaut la date/heure courante (`DEFAULT CURRENT_TIMESTAMP`).",
      "**Clé Étrangère (`FOREIGN KEY`)** :",
      "Le champ `id_capteur` fait référence à la clé primaire `id_capteur` de la table `capteur` (`REFERENCES capteur(id_capteur)`).",
      "**Contrainte de Domaine (`CHECK`)** :",
      "La valeur mesurée doit être comprise entre **-50** et **150** degrés inclus (`CHECK (valeur >= -50 AND valeur <= 150)` ou `CHECK (valeur BETWEEN -50 AND 150)`).",
    ],
    enonceMarkdown:
      "# Commandes LDD & Contraintes d'Intégrité (SQL)\n\n## Contexte\n\nDans le cadre de la gestion automatisée d'un laboratoire de sciences et technologies industrielles, les relevés des capteurs environnementaux doivent être archivés dans une base de données relationnelle MySQL/MariaDB.\n\nLa table des capteurs est déjà définie :\n\n```sql\nCREATE TABLE capteur (\n  id_capteur INT AUTO_INCREMENT PRIMARY KEY,\n  designation VARCHAR(50) NOT NULL,\n  salle VARCHAR(20) NOT NULL\n);\n```\n\n---\n\n## Consignes\n\nDans le fichier `schema.sql`, écrivez l'instruction de création en Langage de Définition de Données (LDD) de la table `mesure` répondant au cahier des charges suivant :\n\n1. **Champs de la table `mesure`** :\n   - `id_mesure` : Entier (`INT`), auto-incrémenté, constituant la **clé primaire** (`PRIMARY KEY`).\n   - `id_capteur` : Entier (`INT`), obligatoire (`NOT NULL`).\n   - `valeur` : Nombre décimal (`DECIMAL(6,2)` ou `FLOAT`), obligatoire (`NOT NULL`).\n   - `date_mesure` : Horodatage (`DATETIME`), avec pour valeur par défaut la date/heure courante (`DEFAULT CURRENT_TIMESTAMP`).\n\n2. **Clé Étrangère (`FOREIGN KEY`)** :\n   - Le champ `id_capteur` fait référence à la clé primaire `id_capteur` de la table `capteur` (`REFERENCES capteur(id_capteur)`).\n\n3. **Contrainte de Domaine (`CHECK`)** :\n   - La valeur mesurée doit être comprise entre **-50** et **150** degrés inclus (`CHECK (valeur >= -50 AND valeur <= 150)` ou `CHECK (valeur BETWEEN -50 AND 150)`).\n",
    starter: {
      "schema.sql":
        "-- ==============================================================================\n-- Schéma Relationnel : Laboratoire STI\n-- ==============================================================================\n\n-- Table parente fournie\nCREATE TABLE capteur (\n  id_capteur INT AUTO_INCREMENT PRIMARY KEY,\n  designation VARCHAR(50) NOT NULL,\n  salle VARCHAR(20) NOT NULL\n);\n\n-- Écrivez ci-dessous l'instruction CREATE TABLE pour la table 'mesure'\n-- conformément aux consignes (clé primaire, clé étrangère et contrainte CHECK).\n",
    },
    hints: [
      "Consultez l'énoncé officiel et les consignes du Commandes LDD & Contraintes d'Intégrité.",
      "Respectez strictement la nomenclature des fonctions et IDs demandés : schema.sql.",
      "Vérifiez les points d'arrêt et la conformité des types/formats de données.",
    ],
    rawCriteria: [
      {
        id: "c1_create_table",
        titre: "Création de la table mesure",
        points: 4,
        fail_message: "L'instruction CREATE TABLE mesure est requise.",
        sql_pattern: "CREATE\\s+TABLE\\s+`?mesure`?",
      },
      {
        id: "c2_primary_key",
        titre: "Clé primaire id_mesure",
        points: 4,
        fail_message: "La table mesure doit définir id_mesure comme clé primaire (PRIMARY KEY).",
        sql_pattern: "PRIMARY\\s+KEY",
      },
      {
        id: "c3_foreign_key",
        titre: "Clé étrangère vers capteur(id_capteur)",
        points: 4,
        fail_message:
          "Une contrainte FOREIGN KEY (id_capteur) REFERENCES capteur(id_capteur) doit être spécifiée.",
        sql_pattern:
          'FOREIGN\\s+KEY\\s*\\([`"]?id_capteur[`"]?\\)\\s*REFERENCES\\s+[`"]?capteur[`"]?\\s*\\([`"]?id_capteur[`"]?\\)',
      },
      {
        id: "c4_check_constraint",
        titre: "Contrainte CHECK de plage de température (-50 à 150)",
        points: 4,
        fail_message: "Une contrainte CHECK doit restreindre la valeur entre -50 et 150 degrés.",
        sql_pattern: "CHECK\\s*\\([\\s\\S]*?valeur[\\s\\S]*?-50[\\s\\S]*?150[\\s\\S]*?\\)",
      },
      {
        id: "c5_not_null",
        titre: "Contraintes d'intégrité NOT NULL",
        points: 4,
        fail_message:
          "Les champs obligatoires id_capteur et valeur doivent être déclarés NOT NULL.",
        sql_pattern: "NOT\\s+NULL",
      },
    ],
  },
  {
    id: "tp-fs-01",
    title: "Formulaire de Don pour les Lycées",
    level: "Moyen",
    competence: "HTML5 • CSS3 • JavaScript • PHP • MySQLi",
    module: "Module B",
    dureeMinutes: 45,
    tags: ["HTML5", "CSS3", "JavaScript", "PHP", "MySQLi"],
    examMode: false,
    bareme: 20,
    statement: [
      "Créez un titre principal `<h1>` : « Soutien aux Laboratoires de Lycée – Formulaire de Don ».",
      "Insérez un formulaire d'identifiant `fDon` pointant vers `enregistrer.php` avec la méthode `POST`.",
      "Regroupez les champs dans un `<fieldset>` avec une légende `<legend>` : « Informations sur le Donateur et le Matériel ».",
      "Les champs obligatoires sont :",
      '**Nom du donateur** : champ texte `id="nom"` (non vide).',
      '**Type de donateur** : boutons radio `name="type_user"` avec les valeurs : « Élève », « Enseignant », « Parent », « Entreprise ».',
      '**Lycée bénéficiaire** : liste déroulante `<select id="lycee">` proposant au moins 3 lycées (ex: Lycée Pilote, Lycée Technique, Lycée Ibn Khaldoun).',
      '**Article matériel** : liste déroulante `<select id="article">` proposant :',
      "Ordinateur (Prix unitaire : 800 DT)",
      "Imprimante 3D (Prix unitaire : 1200 DT)",
      "Casque VR (Prix unitaire : 500 DT)",
      "Carte Microcontrôleur (Prix unitaire : 60 DT)",
      '**Quantité** : champ numérique `id="qte"` (entier supérieur à 0).',
      'Bouton de soumission `id="btnValider"`.',
      "Centrage du formulaire avec une largeur maximale de `600px` et marges automatiques (`margin: 20px auto`).",
      "Bordure arrondie sur le `<fieldset>` (`border: 2px solid #0066cc; border-radius: 10px; padding: 20px`).",
      "Style soigné des labels et champs (`display: block` ou mise en tableau avec espacement).",
      'Bouton `id="btnValider"` mis en valeur (couleur de fond `#0066cc`, texte blanc, padding, coins arrondis, effet au survol).',
      "Implémentez la fonction `calculerMontant()` :",
      "Déclenchée lors du changement de l'article ou de la modification de la quantité.",
      'Multiplie le prix unitaire de l\'article sélectionné par la quantité saisie et met à jour le champ `id="montant"`.',
      'Implémentez la fonction `test1()` appelée lors de la soumission du formulaire (`onsubmit="return test1();"`) :',
      "Vérifie que le nom comporte au moins 3 caractères.",
      "Vérifie qu'un type de donateur est coché.",
      "Vérifie qu'un lycée et un article sont sélectionnés.",
      "Vérifie que la quantité est un entier positif (`qte > 0`).",
      "Retourne `true` si le formulaire est valide, `false` avec un message d'alerte explicite sinon.",
      'Établissez la connexion avec le serveur MySQL/MariaDB (`mysqli_connect("localhost", "root", "", "labo_db")`).',
      "Récupérez et assainissez les données transmises via `$_POST`.",
      "Préparez et exécutez la requête d'insertion :",
      "Affichez un message de confirmation formaté contenant le nom du donateur, l'établissement bénéficiaire et le montant total du don.",
    ],
    enonceMarkdown:
      '# TP de Synthèse Full-Stack : Formulaire de Don pour les Lycées\n\n## Contexte\n\nAfin de moderniser les équipements des laboratoires de sciences et technologies (ateliers robotiques, imprimantes 3D, microcontrôleurs), une association de parents et d\'anciens élèves met en place une plateforme de don matériel à destination des établissements scolaires.\n\nVotre travail consiste à réaliser une application web complète (Front-End & Back-End) conforme aux exigences de l\'épreuve pratique du Baccalauréat STI.\n\n---\n\n## 1. Structure HTML & Présentation (`Don.html` & `mesStyles.css`)\n\nDans la page `Don.html` liée à la feuille de style `mesStyles.css` :\n\n- Créez un titre principal `<h1>` : « Soutien aux Laboratoires de Lycée – Formulaire de Don ».\n- Insérez un formulaire d\'identifiant `fDon` pointant vers `enregistrer.php` avec la méthode `POST`.\n- Regroupez les champs dans un `<fieldset>` avec une légende `<legend>` : « Informations sur le Donateur et le Matériel ».\n- Les champs obligatoires sont :\n  1. **Nom du donateur** : champ texte `id="nom"` (non vide).\n  2. **Type de donateur** : boutons radio `name="type_user"` avec les valeurs : « Élève », « Enseignant », « Parent », « Entreprise ».\n  3. **Lycée bénéficiaire** : liste déroulante `<select id="lycee">` proposant au moins 3 lycées (ex: Lycée Pilote, Lycée Technique, Lycée Ibn Khaldoun).\n  4. **Article matériel** : liste déroulante `<select id="article">` proposant :\n     - Ordinateur (Prix unitaire : 800 DT)\n     - Imprimante 3D (Prix unitaire : 1200 DT)\n     - Casque VR (Prix unitaire : 500 DT)\n     - Carte Microcontrôleur (Prix unitaire : 60 DT)\n  5. **Quantité** : champ numérique `id="qte"` (entier supérieur à 0).\n  6. **Montant total estimé** : champ texte en lecture seule `id="montant"` calculé automatiquement (`prix_unitaire * quantite`).\n- Bouton de soumission `id="btnValider"`.\n\nDans `mesStyles.css` :\n\n- Centrage du formulaire avec une largeur maximale de `600px` et marges automatiques (`margin: 20px auto`).\n- Bordure arrondie sur le `<fieldset>` (`border: 2px solid #0066cc; border-radius: 10px; padding: 20px`).\n- Style soigné des labels et champs (`display: block` ou mise en tableau avec espacement).\n- Bouton `id="btnValider"` mis en valeur (couleur de fond `#0066cc`, texte blanc, padding, coins arrondis, effet au survol).\n\n---\n\n## 2. Validation & Calcul Dynamique (`controles.js`)\n\nDans le fichier `controles.js` :\n\n- Implémentez la fonction `calculerMontant()` :\n  - Déclenchée lors du changement de l\'article ou de la modification de la quantité.\n  - Multiplie le prix unitaire de l\'article sélectionné par la quantité saisie et met à jour le champ `id="montant"`.\n- Implémentez la fonction `test1()` appelée lors de la soumission du formulaire (`onsubmit="return test1();"`) :\n  - Vérifie que le nom comporte au moins 3 caractères.\n  - Vérifie qu\'un type de donateur est coché.\n  - Vérifie qu\'un lycée et un article sont sélectionnés.\n  - Vérifie que la quantité est un entier positif (`qte > 0`).\n  - Retourne `true` si le formulaire est valide, `false` avec un message d\'alerte explicite sinon.\n\n---\n\n## 3. Base de Données & Enregistrement PHP (`db/init.sql` & `enregistrer.php`)\n\nLa table `don` est initialisée via le script `db/init.sql` :\n\n```sql\nCREATE TABLE IF NOT EXISTS don (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  nom VARCHAR(60) NOT NULL,\n  type_user VARCHAR(30) NOT NULL,\n  lycee VARCHAR(60) NOT NULL,\n  article VARCHAR(50) NOT NULL,\n  qte INT NOT NULL CHECK (qte > 0),\n  montant DECIMAL(10,2) NOT NULL CHECK (montant > 0),\n  date_don DATETIME DEFAULT CURRENT_TIMESTAMP\n);\n```\n\nDans le script PHP `enregistrer.php` :\n\n1. Établissez la connexion avec le serveur MySQL/MariaDB (`mysqli_connect("localhost", "root", "", "labo_db")`).\n2. Récupérez et assainissez les données transmises via `$_POST`.\n3. Préparez et exécutez la requête d\'insertion :\n   ```sql\n   INSERT INTO don (nom, type_user, lycee, article, qte, montant)\n   VALUES (\'...\', \'...\', \'...\', \'...\', ..., ...);\n   ```\n4. Affichez un message de confirmation formaté contenant le nom du donateur, l\'établissement bénéficiaire et le montant total du don.\n',
    starter: {
      "controles.js":
        "// ==========================================================================\n// TP Full-Stack : Contrôles JavaScript\n// ==========================================================================\n\nfunction calculerMontant() {\n  // À compléter : calcule prix_unitaire * quantite et affecte le résultat au champ #montant\n}\n\nfunction test1() {\n  // À compléter : valide les champs du formulaire avant soumission\n  return false;\n}\n",
      "Don.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Soutien aux Laboratoires de Lycée – Formulaire de Don</title>\n    <link rel="stylesheet" href="mesStyles.css" />\n  </head>\n  <body>\n    <h1>Soutien aux Laboratoires de Lycée – Formulaire de Don</h1>\n\n    <!-- Formulaire à compléter -->\n    <form id="fDon" name="fDon" action="enregistrer.php" method="post" onsubmit="return test1();">\n      <fieldset>\n        <legend>Informations sur le Donateur et le Matériel</legend>\n\n        <div>\n          <label for="nom">Nom du donateur :</label>\n          <input type="text" id="nom" name="nom" />\n        </div>\n\n        <!-- Type de donateur (radio) -->\n        <div>\n          <span>Type de donateur :</span>\n          <label><input type="radio" name="type_user" value="Élève" /> Élève</label>\n          <label><input type="radio" name="type_user" value="Enseignant" /> Enseignant</label>\n          <label><input type="radio" name="type_user" value="Parent" /> Parent</label>\n          <label><input type="radio" name="type_user" value="Entreprise" /> Entreprise</label>\n        </div>\n\n        <!-- Lycée -->\n        <div>\n          <label for="lycee">Lycée bénéficiaire :</label>\n          <select id="lycee" name="lycee">\n            <option value="">-- Sélectionnez un établissement --</option>\n            <option value="Lycée Pilote">Lycée Pilote</option>\n            <option value="Lycée Technique">Lycée Technique</option>\n            <option value="Lycée Ibn Khaldoun">Lycée Ibn Khaldoun</option>\n          </select>\n        </div>\n\n        <!-- Article -->\n        <div>\n          <label for="article">Article matériel :</label>\n          <select id="article" name="article" onchange="calculerMontant()">\n            <option value="">-- Sélectionnez un équipement --</option>\n            <option value="Ordinateur" data-prix="800">Ordinateur (800 DT)</option>\n            <option value="Imprimante 3D" data-prix="1200">Imprimante 3D (1200 DT)</option>\n            <option value="Casque VR" data-prix="500">Casque VR (500 DT)</option>\n            <option value="Carte Microcontrôleur" data-prix="60">\n              Carte Microcontrôleur (60 DT)\n            </option>\n          </select>\n        </div>\n\n        <!-- Quantité -->\n        <div>\n          <label for="qte">Quantité :</label>\n          <input type="number" id="qte" name="qte" min="1" value="1" oninput="calculerMontant()" />\n        </div>\n\n        <!-- Montant total estimé -->\n        <div>\n          <label for="montant">Montant estimé (DT) :</label>\n          <input type="text" id="montant" name="montant" readonly placeholder="0.00" />\n        </div>\n\n        <div class="actions">\n          <button type="submit" id="btnValider">Valider mon don</button>\n        </div>\n      </fieldset>\n    </form>\n\n    <script src="controles.js"></script>\n  </body>\n</html>\n',
      "enregistrer.php":
        '<?php\n// ==============================================================================\n// TP Full-Stack : Traitement et Insertion PHP / MySQLi\n// ==============================================================================\n\n// 1. Connexion à la base de données\n$cnx = mysqli_connect("localhost", "root", "", "labo_db");\n\nif (!$cnx) {\n    die("Erreur de connexion : " . mysqli_connect_error());\n}\n\n// 2. Récupérer les données POST\n\n// 3. Préparer et exécuter la requête d\'insertion INSERT INTO don\n\n// 4. Afficher le message de confirmation\nmysqli_close($cnx);\n?>\n',
      "mesStyles.css":
        "/* ==========================================================================\n   TP Full-Stack : Formulaire de Don\n   Feuille de style à compléter conformément aux consignes.\n   ========================================================================== */\n\nbody {\n  font-family: sans-serif;\n  background-color: #f8fafc;\n}\n\n/* 1. Titre */\nh1 {\n  /* Vos règles ici */\n}\n\n/* 2. Formulaire et Fieldset */\n#fDon {\n  /* Vos règles de centrage ici */\n}\n\nfieldset {\n  /* Vos règles de bordure et padding ici */\n}\n\n/* 3. Bouton */\n#btnValider {\n  /* Vos règles pour le bouton ici */\n}\n",
      "db/init.sql":
        "-- ==============================================================================\n-- Initialisation Base de Données - TP Formulaire de Don (tp-fs-01)\n-- ==============================================================================\n\nCREATE TABLE IF NOT EXISTS don (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  nom VARCHAR(60) NOT NULL,\n  type_user VARCHAR(30) NOT NULL,\n  lycee VARCHAR(60) NOT NULL,\n  article VARCHAR(50) NOT NULL,\n  qte INT NOT NULL CHECK (qte > 0),\n  montant DECIMAL(10,2) NOT NULL CHECK (montant > 0),\n  date_don DATETIME DEFAULT CURRENT_TIMESTAMP\n);\n",
    },
    hints: [
      "Consultez l'énoncé officiel et les consignes du Formulaire de Don pour les Lycées.",
      "Respectez strictement la nomenclature des fonctions et IDs demandés : Don.html, mesStyles.css, controles.js, enregistrer.php.",
      "Vérifiez les points d'arrêt et la conformité des types/formats de données.",
    ],
    rawCriteria: [
      {
        id: "c1_form_structure",
        titre: "Structure du formulaire HTML5 et fieldset",
        points: 3,
        fail_message:
          "Le formulaire doit avoir id='fDon', action='enregistrer.php', method='post' et comporter un <fieldset>.",
        selector: "form#fDon fieldset",
        expected_attributes: {
          action: "enregistrer.php",
          method: "post",
        },
      },
      {
        id: "c2_css_layout",
        titre: "Mise en page CSS3 et centrage du formulaire",
        points: 3,
        fail_message:
          "La feuille mesStyles.css doit définir une largeur maximale de 600px et des marges automatiques pour #fDon.",
        css_rule_contains: "#fDon",
      },
      {
        id: "c3_js_calculation",
        titre: "Calcul dynamique du montant estimé",
        points: 4,
        fail_message:
          "La fonction calculerMontant() doit multiplier le prix unitaire de l'article par la quantité.",
        js_function: "calculerMontant",
      },
      {
        id: "c4_js_validation",
        titre: "Validation de saisie test1() avant envoi",
        points: 4,
        fail_message:
          "La fonction test1() doit contrôler la longueur du nom (≥ 3 caractères), le type donateur et la quantité > 0.",
        js_function: "test1",
      },
      {
        id: "c5_db_table",
        titre: "Table MySQL 'don' avec contraintes CHECK",
        points: 3,
        fail_message:
          "La table don doit comporter une clé primaire id, qte INT et montant DECIMAL avec contraintes CHECK positives.",
        sql_pattern: "CREATE\\s+TABLE[\\s\\S]*?don[\\s\\S]*?montant",
      },
      {
        id: "c6_php_insert",
        titre: "Insertion sécurisée des données en PHP/MySQLi",
        points: 3,
        fail_message:
          "Le script enregistrer.php doit exécuter la requête INSERT INTO don avec les valeurs du formulaire.",
        php_pattern: "INSERT\\s+INTO\\s+don",
      },
    ],
  },
  {
    id: "tp-fs-02",
    title: "Consultation Météo & Agrégations (Bac 2021)",
    level: "Moyen",
    competence: "HTML5 • JavaScript • PHP • MySQLi • SQL-Aggregation",
    module: "Module B",
    dureeMinutes: 60,
    tags: ["HTML5", "JavaScript", "PHP", "MySQLi", "SQL-Aggregation"],
    examMode: false,
    bareme: 20,
    statement: [
      "Méthode `POST`, pointant vers `meteo.php`, appelant la fonction `return test2();` à la soumission.",
      'Une liste déroulante `<select id="station" name="station">` proposant :',
      "Option 0 : « -- Choisir une station -- » (valeur vide)",
      "Option 1 : « Station Nord (Tunis) » (valeur `1`)",
      "Option 2 : « Station Sahel (Sousse) » (valeur `2`)",
      "Option 3 : « Station Sud (Sfax) » (valeur `3`)",
      'Un champ pour l\'année d\'observation `<input type="number" id="annee" name="annee" min="2020" max="2026" placeholder="2026">`.',
      'Un bouton de soumission `<button type="submit" id="btnConsulter">Afficher les statistiques</button>`.',
      "Vérifie qu'une station a bien été sélectionnée (valeur différente de chaîne vide).",
      "Vérifie que l'année saisie est comprise entre `2020` et `2026`.",
      "En cas d'erreur, affiche un message avec `alert()` et retourne `false`.",
      "Retourne `true` si toutes les données sont valides.",
      "Table `station (id_station, nom_station, ville, altitude)`.",
      "Table `mesure (id_mesure, id_station, temperature, humidite, date_mesure)`.",
      "Connexion au serveur MySQL via `mysqli_connect()`.",
      'Récupération des paramètres `$_POST["station"]` et `$_POST["annee"]`.',
      "Exécution d'une requête SQL d'agrégation calculant :",
      "Le nom de la station (`nom_station`).",
      "La température moyenne (`AVG(temperature)` arrondie à 1 décimale).",
      "La température maximale (`MAX(temperature)`).",
      "La température minimale (`MIN(temperature)`).",
      "Le taux moyen d'humidité (`AVG(humidite)`).",
      "Requête regroupée par station (`GROUP BY s.nom_station`).",
      "Affichage des résultats dans un tableau HTML propre et structuré.",
    ],
    enonceMarkdown:
      '# TP de Synthèse Full-Stack : Consultation Météo & Agrégations (Bac 2021)\n\n## Contexte\n\nDans le cadre d\'un réseau régional de stations météo connectées, les relevés de température et d\'humidité sont stockés de façon continue dans une base de données MySQL. L\'objectif est de développer une interface permettant aux techniciens d\'interroger la base et de calculer les indicateurs statistiques (moyenne, minimum, maximum) par station.\n\n---\n\n## 1. Interface de Consultation (`consultation.html`)\n\nCréez le formulaire dans `consultation.html` :\n\n- Méthode `POST`, pointant vers `meteo.php`, appelant la fonction `return test2();` à la soumission.\n- Une liste déroulante `<select id="station" name="station">` proposant :\n  - Option 0 : « -- Choisir une station -- » (valeur vide)\n  - Option 1 : « Station Nord (Tunis) » (valeur `1`)\n  - Option 2 : « Station Sahel (Sousse) » (valeur `2`)\n  - Option 3 : « Station Sud (Sfax) » (valeur `3`)\n- Un champ pour l\'année d\'observation `<input type="number" id="annee" name="annee" min="2020" max="2026" placeholder="2026">`.\n- Un bouton de soumission `<button type="submit" id="btnConsulter">Afficher les statistiques</button>`.\n\n---\n\n## 2. Validation Côté Client (`controle.js`)\n\nDans `controle.js`, écrivez la fonction `test2()` :\n\n- Vérifie qu\'une station a bien été sélectionnée (valeur différente de chaîne vide).\n- Vérifie que l\'année saisie est comprise entre `2020` et `2026`.\n- En cas d\'erreur, affiche un message avec `alert()` et retourne `false`.\n- Retourne `true` si toutes les données sont valides.\n\n---\n\n## 3. Base de Données (`db/init.sql`)\n\nLes tables `station` et `mesure` sont initialisées avec des relevés de température et d\'humidité :\n\n- Table `station (id_station, nom_station, ville, altitude)`.\n- Table `mesure (id_mesure, id_station, temperature, humidite, date_mesure)`.\n\n---\n\n## 4. Traitement & Agrégations Statistiques (`meteo.php`)\n\nDans `meteo.php` :\n\n1. Connexion au serveur MySQL via `mysqli_connect()`.\n2. Récupération des paramètres `$_POST["station"]` et `$_POST["annee"]`.\n3. Exécution d\'une requête SQL d\'agrégation calculant :\n   - Le nom de la station (`nom_station`).\n   - La température moyenne (`AVG(temperature)` arrondie à 1 décimale).\n   - La température maximale (`MAX(temperature)`).\n   - La température minimale (`MIN(temperature)`).\n   - Le taux moyen d\'humidité (`AVG(humidite)`).\n   - Requête regroupée par station (`GROUP BY s.nom_station`).\n4. Affichage des résultats dans un tableau HTML propre et structuré.\n',
    starter: {
      "consultation.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Consultation Météo Régionale</title>\n  </head>\n  <body>\n    <h1>Consultation Météo Régionale – Synthèse Statistique</h1>\n\n    <!-- Formulaire de sélection -->\n    <form id="fMeteo" name="fMeteo" action="meteo.php" method="post" onsubmit="return test2();">\n      <div>\n        <label for="station">Station Météo :</label>\n        <select id="station" name="station">\n          <option value="">-- Choisir une station --</option>\n          <option value="1">Station Nord (Tunis)</option>\n          <option value="2">Station Sahel (Sousse)</option>\n          <option value="3">Station Sud (Sfax)</option>\n        </select>\n      </div>\n\n      <div>\n        <label for="annee">Année d\'observation :</label>\n        <input type="number" id="annee" name="annee" min="2020" max="2026" placeholder="2026" />\n      </div>\n\n      <div>\n        <button type="submit" id="btnConsulter">Afficher les statistiques</button>\n      </div>\n    </form>\n\n    <script src="controle.js"></script>\n  </body>\n</html>\n',
      "controle.js":
        "// ==========================================================================\n// TP Météo : Validation JavaScript\n// ==========================================================================\n\nfunction test2() {\n  // À compléter :\n  // 1. Vérifier qu'une station est sélectionnée\n  // 2. Vérifier que l'année est un entier entre 2020 et 2026\n  return false;\n}\n",
      "meteo.php":
        '<?php\n// ==============================================================================\n// TP Météo : Traitement PHP & Agrégations SQL\n// ==============================================================================\n\n// 1. Connexion au serveur MySQL\n$cnx = mysqli_connect("localhost", "root", "", "meteo_db");\n\n// 2. Récupérer les paramètres POST\n\n// 3. Exécuter la requête d\'agrégation (AVG, MAX, MIN, GROUP BY)\n\n// 4. Afficher les résultats sous forme de tableau HTML\nmysqli_close($cnx);\n?>\n',
      "db/init.sql":
        "-- ==============================================================================\n-- Initialisation Base de Données - TP Météo & Agrégations (tp-fs-02)\n-- ==============================================================================\n\nCREATE TABLE IF NOT EXISTS station (\n  id_station INT AUTO_INCREMENT PRIMARY KEY,\n  nom_station VARCHAR(50) NOT NULL,\n  ville VARCHAR(50) NOT NULL,\n  altitude INT DEFAULT 0\n);\n\nCREATE TABLE IF NOT EXISTS mesure (\n  id_mesure INT AUTO_INCREMENT PRIMARY KEY,\n  id_station INT NOT NULL,\n  temperature DECIMAL(4,1) NOT NULL,\n  humidite INT NOT NULL CHECK (humidite BETWEEN 0 AND 100),\n  date_mesure DATETIME DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (id_station) REFERENCES station(id_station) ON DELETE CASCADE\n);\n\n-- Données initiales de test\nINSERT INTO station (id_station, nom_station, ville, altitude) VALUES\n(1, 'Station Nord', 'Tunis', 10),\n(2, 'Station Sahel', 'Sousse', 15),\n(3, 'Station Sud', 'Sfax', 8);\n\nINSERT INTO mesure (id_station, temperature, humidite, date_mesure) VALUES\n(1, 22.5, 65, '2026-05-01 08:00:00'),\n(1, 28.0, 50, '2026-05-01 14:00:00'),\n(1, 20.0, 70, '2026-05-01 20:00:00'),\n(2, 24.0, 60, '2026-05-01 08:00:00'),\n(2, 30.5, 45, '2026-05-01 14:00:00'),\n(3, 26.0, 55, '2026-05-01 08:00:00'),\n(3, 33.0, 40, '2026-05-01 14:00:00');\n",
    },
    hints: [
      "Consultez l'énoncé officiel et les consignes du Consultation Météo & Agrégations (Bac 2021).",
      "Respectez strictement la nomenclature des fonctions et IDs demandés : consultation.html, controle.js, meteo.php.",
      "Vérifiez les points d'arrêt et la conformité des types/formats de données.",
    ],
    rawCriteria: [
      {
        id: "c1_form_selection",
        titre: "Formulaire de sélection de station météo",
        points: 4,
        fail_message:
          "Le formulaire doit contenir la liste déroulante #station et le champ numérique #annee.",
        selector: "form#fMeteo select#station, form#fMeteo input#annee",
      },
      {
        id: "c2_js_test2",
        titre: "Fonction de contrôle test2()",
        points: 4,
        fail_message:
          "La fonction test2() doit valider la sélection d'une station et une année comprise entre 2020 et 2026.",
        js_function: "test2",
      },
      {
        id: "c3_db_schema",
        titre: "Schéma relationnel station et mesure",
        points: 4,
        fail_message:
          "Le script init.sql doit créer les tables station et mesure avec clé étrangère et contraintes.",
        sql_pattern: "CREATE\\s+TABLE[\\s\\S]*?station[\\s\\S]*?CREATE\\s+TABLE[\\s\\S]*?mesure",
      },
      {
        id: "c4_sql_aggregation",
        titre: "Requête SQL d'agrégation statistique (AVG, MAX, MIN, GROUP BY)",
        points: 4,
        fail_message:
          "La requête PHP doit utiliser AVG(temperature), MAX(temperature), MIN(temperature) et GROUP BY.",
        php_pattern: "SELECT[\\s\\S]*?AVG\\([\\s\\S]*?GROUP\\s+BY",
      },
      {
        id: "c5_html_table_render",
        titre: "Restitution des résultats dans un tableau HTML",
        points: 4,
        fail_message:
          "Le résultat doit être affiché sous forme d'un tableau HTML <table> avec mise en forme des valeurs.",
        php_pattern: "<table>[\\s\\S]*?<th>[\\s\\S]*?<td>",
      },
    ],
  },
  {
    id: "exam-bac2023-location-habits",
    title: "Bac 2023 - Location d'Habits Traditionnels",
    level: "Difficile",
    competence: "Bac STI • HTML5 • CSS3 • JavaScript • PHP • MySQLi • Examen Blanc",
    module: "Module C",
    dureeMinutes: 90,
    tags: ["Bac STI", "HTML5", "CSS3", "JavaScript", "PHP", "MySQLi", "Examen Blanc"],
    examMode: true,
    bareme: 20,
    statement: [
      "Sujet officiel du Bac Pratique STI 2023 : gestion de la location d'habits avec validation client, vérification de disponibilité, enregistrement SQL et mise à jour de stock.",
    ],
    enonceMarkdown:
      "# Épreuve Pratique du Baccalauréat STI 2023\n\n## Sujet : Gestion de la Location d'Habits Traditionnels\n\n**Durée :** 1 heure 30 minutes (90 minutes)  \n**Coefficient :** 1.5  \n**Note Maximale :** 20 points (Mode Examen)\n\n---\n\n## Contexte et Présentation\n\nUne maison de haute couture et de confection artisanale met en place une application web locale pour informatiser la gestion de location de ses habits traditionnels de cérémonie (Jebba, Caftan, Keswa...).\n\nPour assurer ce service, l'application s'appuie sur une base de données relationnelle nommée `bd2023`, composée des trois tables suivantes :\n\n1. **`client`** : `cin` (clé primaire, 8 chiffres), `nom` (chaîne max 30 car.), `prenom` (chaîne max 30 car.), `tel` (chaîne de 8 chiffres).\n2. **`habit`** : `id_habit` (clé primaire, entier auto-incrémenté), `description` (chaîne max 100 car.), `taille` (S, M, L, XL), `prix_jour` (décimal > 0), `disponible` ('O' ou 'N', défaut 'O').\n3. **`location`** : `id_loc` (clé primaire auto-incrémentée), `cin` (clé étrangère référant à `client`), `id_habit` (clé étrangère référant à `habit`), `date_loc` (date de début de location), `duree` (nombre de jours entier strictement positif).\n\n---\n\n## Travail Demandé\n\nL'arborescence de travail remise à l'élève doit respecter impérativement le nommage : `SW_<NCIN>/` (où `<NCIN>` est le numéro de carte d'identité nationale de l'élève).\n\n### 1. Formulaire HTML & Feuilles de Styles (4 points)\n\n- Créer la page Web `location.html` contenant un formulaire permettant de saisir :\n  - Le numéro de CIN du client (`id=\"cin\"`, `name=\"cin\"`).\n  - La sélection de l'habit souhaité (`id=\"id_habit\"`, `name=\"id_habit\"`).\n  - La date de location (`id=\"date_loc\"`, `name=\"date_loc\"`).\n  - La durée de location en jours (`id=\"duree\"`, `name=\"duree\"`).\n  - Un bouton d'envoi (`type=\"submit\"`) et un bouton de réinitialisation (`type=\"reset\"`).\n- Associer la feuille de styles CSS `mesStyles.css` pour mettre en valeur les éléments (`body`, `fieldset`, `legend`, `table` ou alignements CSS, et boutons).\n\n### 2. Validation Côté Client en JavaScript (5 points)\n\nDans le fichier `controls.js`, programmer la fonction `verif2()` qui est exécutée lors de la soumission du formulaire (`onsubmit=\"return verif2()\"`), assurant les contrôles stricts suivants :\n\n- Le champ CIN doit comporter **exactement 8 chiffres** (non vide, numérique entier).\n- L'habit doit obligatoirement être sélectionné (sélection distincte de l'option par défaut).\n- La date de location doit être renseignée.\n- La durée doit être un entier **strictement supérieur à zéro** (≥ 1).\n- Si l'un des contrôles échoue, une boîte de dialogue explicite s'affiche (`alert(...)`) et la soumission est annulée (`return false`).\n\n### 3. Traitement Côté Serveur en PHP (11 points)\n\nDans le script `location.php` :\n\n- Établir la connexion avec le serveur MySQL/MariaDB (`localhost`, `root`, ``, `bd2023`). En cas d'échec, interrompre l'exécution avec un message explicite.\n- Récupérer les données transmises par la méthode `POST`.\n- Vérifier si le client existe dans la table `client`. Si le client n'existe pas, afficher un message d'erreur invitant à l'enregistrement préalable.\n- Vérifier la disponibilité de l'habit sélectionné dans la table `habit` (`disponible = 'O'`). Si l'habit est déjà loué (`disponible = 'N'`), avertir l'utilisateur.\n- Si le client existe et que l'habit est disponible :\n  1. Insérer un nouvel enregistrement dans la table `location`.\n  2. Mettre à jour l'habit en passant son statut à indisponible (`UPDATE habit SET disponible = 'N' WHERE id_habit = ...`).\n  3. Afficher un message de confirmation récapitulant les détails de la location et le montant estimé (`prix_jour * duree`).\n\n---\n\n## Barème Officiel de Notation (sur 20 points)\n\n| Partie         | Critère Évalué                                                       | Points     |\n| -------------- | -------------------------------------------------------------------- | ---------- |\n| **Front-End**  | Formulaire HTML5 sémantique (`location.html`)                        | 2 pts      |\n| **Front-End**  | Intégration et mise en page CSS3 (`mesStyles.css`)                   | 2 pts      |\n| **JavaScript** | Contrôle du CIN et de la sélection de l'habit                        | 2.5 pts    |\n| **JavaScript** | Contrôle de la date et de la durée dans `verif2()`                   | 2.5 pts    |\n| **PHP & SQL**  | Connexion MySQLi et réception des paramètres POST                    | 4 pts      |\n| **PHP & SQL**  | Vérification client/disponibilité et requête `INSERT INTO location`  | 4 pts      |\n| **PHP & SQL**  | Requête `UPDATE habit SET disponible='N'` et affichage récapitulatif | 3 pts      |\n| **Total**      | **Note Globale Bac Pratique**                                        | **20 pts** |\n",
    starter: {
      "controls.js":
        "/**\n * Bac STI 2023 - Contrôle du formulaire de location d'habits\n * Fonction verif2() à compléter par l'élève\n */\nfunction verif2() {\n  // 1. Contrôle du numéro CIN (exactement 8 chiffres)\n  // 2. Contrôle de la sélection de l'habit (choix obligatoire)\n  // 3. Contrôle de la date de location (non vide)\n  // 4. Contrôle de la durée (entier strictement supérieur à 0)\n\n  return true;\n}\n",
      "location.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Location d\'Habits - Bac 2023</title>\n    <link rel="stylesheet" href="mesStyles.css" />\n    <script src="controls.js"></script>\n  </head>\n  <body>\n    <header>\n      <h1>Location d\'Habits Traditionnels</h1>\n    </header>\n\n    <main>\n      <!-- Formulaire à compléter par l\'élève -->\n      <form method="POST" action="location.php" onsubmit="return verif2();">\n        <fieldset>\n          <legend>Formulaire de Location</legend>\n          <table>\n            <tr>\n              <td><label for="cin">Numéro CIN (8 chiffres) :</label></td>\n              <td><input type="text" id="cin" name="cin" maxlength="8" /></td>\n            </tr>\n            <tr>\n              <td><label for="id_habit">Habit à louer :</label></td>\n              <td>\n                <select id="id_habit" name="id_habit">\n                  <option value="">-- Sélectionner un habit --</option>\n                  <option value="1">Jebba Soie Blanche (Taille L - 45 DT/j)</option>\n                  <option value="2">Caftan Royal Doré (Taille M - 75 DT/j)</option>\n                  <option value="3">Costume Traditionnel Brodé (Taille XL - 60 DT/j)</option>\n                </select>\n              </td>\n            </tr>\n            <tr>\n              <td><label for="date_loc">Date de location :</label></td>\n              <td><input type="date" id="date_loc" name="date_loc" /></td>\n            </tr>\n            <tr>\n              <td><label for="duree">Durée (jours) :</label></td>\n              <td><input type="number" id="duree" name="duree" min="1" /></td>\n            </tr>\n            <tr>\n              <td colspan="2" style="text-align: center">\n                <input type="submit" value="Enregistrer la location" />\n                <input type="reset" value="Annuler" />\n              </td>\n            </tr>\n          </table>\n        </fieldset>\n      </form>\n    </main>\n  </body>\n</html>\n',
      "location.php":
        "<?php\n// Bac STI 2023 - Script d'enregistrement de la location\n// À compléter par l'élève\n\n// 1. Connexion au serveur MySQL (bd2023)\n\n// 2. Récupération des paramètres transmis par POST (cin, id_habit, date_loc, duree)\n\n// 3. Vérification de l'existence du client dans la table client\n\n// 4. Vérification de la disponibilité de l'habit dans la table habit\n\n// 5. Enregistrement dans la table location et mise à jour de la table habit\n?>\n",
      "mesStyles.css":
        "/* Feuille de style initiale à enrichir par l'élève */\nbody {\n  font-family: Arial, sans-serif;\n  margin: 20px;\n  background-color: #f7f9fa;\n  color: #333;\n}\n\nh1 {\n  color: #0b3954;\n  text-align: center;\n}\n\nfieldset {\n  width: 600px;\n  margin: 0 auto;\n  padding: 15px;\n  border: 2px solid #0b3954;\n  border-radius: 8px;\n  background-color: #ffffff;\n}\n\nlegend {\n  font-weight: bold;\n  color: #0b3954;\n  padding: 0 10px;\n}\n",
      "db/init.sql":
        "-- Schéma de base de données : bd2023 (Bac STI 2023)\n-- Gestion de la Location d'Habits Traditionnels\n\nCREATE TABLE IF NOT EXISTS client (\n    cin VARCHAR(8) PRIMARY KEY,\n    nom VARCHAR(30) NOT NULL,\n    prenom VARCHAR(30) NOT NULL,\n    tel VARCHAR(8) NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS habit (\n    id_habit INT PRIMARY KEY AUTO_INCREMENT,\n    description VARCHAR(100) NOT NULL,\n    taille VARCHAR(5) NOT NULL,\n    prix_jour DECIMAL(6,2) NOT NULL,\n    disponible CHAR(1) DEFAULT 'O' CHECK (disponible IN ('O', 'N'))\n);\n\nCREATE TABLE IF NOT EXISTS location (\n    id_loc INT PRIMARY KEY AUTO_INCREMENT,\n    cin VARCHAR(8) NOT NULL,\n    id_habit INT NOT NULL,\n    date_loc DATE NOT NULL,\n    duree INT NOT NULL CHECK (duree > 0),\n    FOREIGN KEY (cin) REFERENCES client(cin),\n    FOREIGN KEY (id_habit) REFERENCES habit(id_habit)\n);\n\n-- Données initiales d'amorce pour les tests de conformité\nINSERT INTO client (cin, nom, prenom, tel) VALUES\n('08765432', 'Ben Ali', 'Sami', '98123456'),\n('12345678', 'Trabelsi', 'Amira', '22456789');\n\nINSERT INTO habit (id_habit, description, taille, prix_jour, disponible) VALUES\n(1, 'Jebba Soie Blanche Traditionnelle', 'L', 45.00, 'O'),\n(2, 'Caftan Royal Doré Haute Couture', 'M', 75.00, 'O'),\n(3, 'Costume Traditionnel Brodé', 'XL', 60.00, 'N');\n",
    },
    hints: [
      "Consultez l'énoncé officiel et les consignes du Bac 2023 - Location d'Habits Traditionnels.",
      "Respectez strictement la nomenclature des fonctions et IDs demandés : location.html, mesStyles.css, controls.js, location.php.",
      "Vérifiez les points d'arrêt et la conformité des types/formats de données.",
    ],
    rawCriteria: [
      {
        id: "EX23-01",
        code: "HTML-01",
        titre: "Structure du formulaire de location (HTML5)",
        description:
          "Le formulaire location.html doit comporter les champs cin, id_habit, date_loc, duree et la méthode POST vers location.php.",
        points: 2,
        ordre: 1,
        sonde: {
          type: "dom_selector",
          selector:
            'form[method="POST" i][action="location.php"] input#cin, form select#id_habit, form input#date_loc, form input#duree',
          minCount: 4,
        },
        fail_message:
          "Le formulaire location.html ne contient pas tous les champs requis (cin, id_habit, date_loc, duree) ou n'envoie pas en POST vers location.php.",
      },
      {
        id: "EX23-02",
        code: "CSS-01",
        titre: "Liaison et mise en forme CSS3",
        description:
          "La feuille mesStyles.css doit styliser le conteneur fieldset avec bordure, padding et coins arrondis.",
        points: 2,
        ordre: 2,
        sonde: {
          type: "css_property",
          selector: "fieldset",
          property: "border-width",
          isGreaterThanZero: true,
        },
        fail_message:
          "La feuille mesStyles.css n'applique pas les styles attendus sur le fieldset.",
      },
      {
        id: "EX23-03",
        code: "JS-01",
        titre: "Contrôle JS du CIN dans verif2()",
        description:
          "La fonction verif2() doit valider que le champ CIN contient exactement 8 chiffres.",
        points: 2.5,
        ordre: 3,
        sonde: {
          type: "js_eval",
          checkSelector: "#cin",
        },
        fail_message:
          "La fonction verif2() ne valide pas correctement la longueur et le format à 8 chiffres du CIN.",
      },
      {
        id: "EX23-04",
        code: "JS-02",
        titre: "Contrôle JS sélection habit, date et durée",
        description:
          "La fonction verif2() doit refuser la soumission si aucun habit n'est choisi, si la date est vide ou si la durée est inférieure ou égale à zéro.",
        points: 2.5,
        ordre: 4,
        sonde: {
          type: "js_eval",
          checkSelector: "#duree",
        },
        fail_message:
          "La fonction verif2() ne valide pas la sélection de l'habit, la date ou la durée strictement positive.",
      },
      {
        id: "EX23-05",
        code: "PHP-01",
        titre: "Connexion MySQLi et réception des paramètres POST",
        description:
          "Le script location.php doit établir la connexion à bd2023 et extraire les variables cin, id_habit, date_loc et duree.",
        points: 4,
        ordre: 5,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "Connexion MySQLi ou extraction des paramètres POST incorrecte dans location.php.",
      },
      {
        id: "EX23-06",
        code: "SQL-01",
        titre: "Vérification client et insertion dans location",
        description:
          "Le script doit vérifier l'existence du client et insérer un nouvel enregistrement dans la table location.",
        points: 4,
        ordre: 6,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "La vérification du client ou la requête INSERT INTO location est manquante ou incorrecte.",
      },
      {
        id: "EX23-07",
        code: "SQL-02",
        titre: "Mise à jour de disponibilité et affichage récapitulatif",
        description:
          "Le script doit exécuter UPDATE habit SET disponible = 'N' et afficher le montant total calculé.",
        points: 3,
        ordre: 7,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "La mise à jour de la disponibilité dans habit ou le récapitulatif de location est manquant.",
      },
    ],
  },
  {
    id: "exam-bac2018-test-drive",
    title: "Bac 2018 - Évaluation & Essai Test Drive",
    level: "Difficile",
    competence:
      "Bac STI • HTML5 • CSS3 • JavaScript • PHP • MySQLi • Examen Blanc • SQL-Multicritères",
    module: "Module C",
    dureeMinutes: 90,
    tags: [
      "Bac STI",
      "HTML5",
      "CSS3",
      "JavaScript",
      "PHP",
      "MySQLi",
      "Examen Blanc",
      "SQL-Multicritères",
    ],
    examMode: true,
    bareme: 20,
    statement: [
      "Sujet officiel du Bac Pratique STI 2018 : évaluation de véhicules d'essai avec formulaire de notation multi-critères, validation JS, et enregistrement/calcul de moyenne en PHP/MySQLi.",
    ],
    enonceMarkdown:
      '# Épreuve Pratique du Baccalauréat STI 2018\n\n## Sujet : Système d\'Évaluation et d\'Essai Automobile (Test Drive)\n\n**Durée :** 1 heure 30 minutes (90 minutes)  \n**Coefficient :** 1.5  \n**Note Maximale :** 20 points (Mode Examen)\n\n---\n\n## Contexte et Présentation\n\nUn concessionnaire automobile propose à ses clients potentiels d\'essayer des voitures neuves avant tout achat. À l\'issue de chaque essai (Test Drive), le client remplit une fiche d\'évaluation pour noter les performances du véhicule selon plusieurs critères : le confort, la conduite et la sécurité.\n\nPour informatiser ce processus, une base de données relationnelle est mise en œuvre avec trois tables :\n\n1. **`voiture`** : `immatriculation` (clé primaire, chaîne max 20 car.), `marque` (chaîne max 30 car.), `modele` (chaîne max 30 car.), `energie` (Essence, Diesel, Hybride, Électrique), `disponible` (\'O\' ou \'N\', défaut \'O\').\n2. **`client`** : `cin` (clé primaire, 8 chiffres), `nom` (chaîne max 30 car.), `prenom` (chaîne max 30 car.), `permis` (numéro de permis de conduire).\n3. **`evaluation`** : `id_eval` (clé primaire auto-incrémentée), `cin` (clé étrangère référant à `client`), `immatriculation` (clé étrangère référant à `voiture`), `date_test` (date de l\'essai), `note_confort` (entier compris entre 1 et 5), `note_conduite` (entier compris entre 1 et 5), `note_securite` (entier compris entre 1 et 5), `commentaire` (texte libre facultatif).\n\n---\n\n## Travail Demandé\n\nL\'arborescence de travail doit respecter le dossier normalisé : `SW_<NCIN>/`.\n\n### 1. Formulaire HTML & Mise en Page CSS (4 points)\n\n- Créer la page Web `evaluation.html` contenant :\n  - Le champ CIN du client (`id="cin"`, `name="cin"`, max 8 caractères).\n  - La sélection du véhicule essayé (`id="immatriculation"`, `name="immatriculation"`).\n  - La date de l\'essai (`id="date_test"`, `name="date_test"`).\n  - Trois champs numériques pour les notes :\n    - Confort (`id="note_confort"`, `name="note_confort"`, min: 1, max: 5).\n    - Conduite (`id="note_conduite"`, `name="note_conduite"`, min: 1, max: 5).\n    - Sécurité (`id="note_securite"`, `name="note_securite"`, min: 1, max: 5).\n  - Une zone de texte pour un commentaire éventuel (`id="commentaire"`, `name="commentaire"`).\n  - Un bouton d\'envoi vers `evaluer.php` (`type="submit"`) et un bouton de réinitialisation (`type="reset"`).\n- Créer et lier la feuille de styles CSS `mesStyles.css` pour assurer une présentation claire (mise en tableau ou alignement soigné, couleurs contrastées, boutons stylisés).\n\n### 2. Contrôle Côté Client en JavaScript (5 points)\n\nDans le fichier `controle.js`, implémenter la fonction `test()` appelée lors de la soumission du formulaire (`onsubmit="return test();"`) :\n\n- Vérifier que le champ CIN comporte **exactement 8 chiffres**.\n- Vérifier qu\'un véhicule a été sélectionné dans la liste déroulante.\n- Vérifier que la date de l\'essai est renseignée.\n- Vérifier que chaque note (confort, conduite, sécurité) est un nombre entier **compris entre 1 et 5 inclus**.\n- En cas d\'erreur de saisie, afficher un message d\'alerte (`alert(...)`) et annuler l\'envoi (`return false`).\n\n### 3. Traitement Serveur & Agrégation en PHP (11 points)\n\nDans le script `evaluer.php` :\n\n- Établir la connexion à la base de données MySQLi (`localhost`, `root`, ``, base de test).\n- Récupérer et valider les paramètres transmis par `POST`.\n- Vérifier que le client (`cin`) et la voiture (`immatriculation`) existent dans la base.\n- Insérer l\'évaluation dans la table `evaluation`.\n- Calculer la moyenne générale attribuée lors de ce test : `(note_confort + note_conduite + note_securite) / 3`.\n- Exécuter une requête SQL d\'agrégation (`AVG`) pour calculer la moyenne historique de ce modèle de voiture sur l\'ensemble des essais passés.\n- Afficher un bilan d\'évaluation complet avec les moyennes obtenues.\n\n---\n\n## Barème Officiel de Notation (sur 20 points)\n\n| Partie         | Critère Évalué                                                  | Points     |\n| -------------- | --------------------------------------------------------------- | ---------- |\n| **Front-End**  | Formulaire HTML5 sémantique (`evaluation.html`)                 | 2 pts      |\n| **Front-End**  | Feuille de styles et ergonomie (`mesStyles.css`)                | 2 pts      |\n| **JavaScript** | Validation du CIN et sélection de voiture                       | 2.5 pts    |\n| **JavaScript** | Contrôle des notes multi-critères (1 à 5) et date dans `test()` | 2.5 pts    |\n| **PHP & SQL**  | Connexion MySQLi et réception des paramètres POST               | 4 pts      |\n| **PHP & SQL**  | Vérifications préalables et insertion dans `evaluation`         | 4 pts      |\n| **PHP & SQL**  | Requêtes d\'agrégation (`AVG`) et récapitulatif des notes        | 3 pts      |\n| **Total**      | **Note Globale Bac Pratique**                                   | **20 pts** |\n',
    starter: {
      "controle.js":
        "/**\n * Bac STI 2018 - Contrôle du formulaire Test Drive\n * Fonction test() à compléter par l'élève\n */\nfunction test() {\n  // 1. Contrôle du champ CIN (8 chiffres obligatoires)\n  // 2. Contrôle de la sélection de la voiture\n  // 3. Contrôle de la date de l'essai\n  // 4. Contrôle des notes (confort, conduite, sécurité comprises entre 1 et 5)\n\n  return true;\n}\n",
      "evaluation.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Test Drive - Évaluation Véhicule</title>\n    <link rel="stylesheet" href="mesStyles.css" />\n    <script src="controle.js"></script>\n  </head>\n  <body>\n    <header>\n      <h1>Fiche d\'Évaluation Essai Véhicule (Test Drive)</h1>\n    </header>\n\n    <main>\n      <form method="POST" action="evaluer.php" onsubmit="return test();">\n        <fieldset>\n          <legend>Informations de l\'Essai</legend>\n          <table>\n            <tr>\n              <td><label for="cin">Numéro CIN (8 chiffres) :</label></td>\n              <td><input type="text" id="cin" name="cin" maxlength="8" /></td>\n            </tr>\n            <tr>\n              <td><label for="immatriculation">Véhicule testé :</label></td>\n              <td>\n                <select id="immatriculation" name="immatriculation">\n                  <option value="">-- Choisir une voiture --</option>\n                  <option value="198-TN-1234">Peugeot 208 GT-Line (Essence)</option>\n                  <option value="210-TN-5678">Renault Clio 5 Intens (Diesel)</option>\n                  <option value="225-TN-9999">Volkswagen Golf 8 Style (Hybride)</option>\n                </select>\n              </td>\n            </tr>\n            <tr>\n              <td><label for="date_test">Date de l\'essai :</label></td>\n              <td><input type="date" id="date_test" name="date_test" /></td>\n            </tr>\n            <tr>\n              <td><label for="note_confort">Note Confort (1 à 5) :</label></td>\n              <td><input type="number" id="note_confort" name="note_confort" min="1" max="5" /></td>\n            </tr>\n            <tr>\n              <td><label for="note_conduite">Note Conduite (1 à 5) :</label></td>\n              <td>\n                <input type="number" id="note_conduite" name="note_conduite" min="1" max="5" />\n              </td>\n            </tr>\n            <tr>\n              <td><label for="note_securite">Note Sécurité (1 à 5) :</label></td>\n              <td>\n                <input type="number" id="note_securite" name="note_securite" min="1" max="5" />\n              </td>\n            </tr>\n            <tr>\n              <td><label for="commentaire">Commentaires :</label></td>\n              <td><textarea id="commentaire" name="commentaire" rows="3" cols="30"></textarea></td>\n            </tr>\n            <tr>\n              <td colspan="2" style="text-align: center">\n                <input type="submit" value="Enregistrer l\'évaluation" />\n                <input type="reset" value="Réinitialiser" />\n              </td>\n            </tr>\n          </table>\n        </fieldset>\n      </form>\n    </main>\n  </body>\n</html>\n',
      "evaluer.php":
        "<?php\n// Bac STI 2018 - Enregistrement et calcul des évaluations Test Drive\n// Script à compléter par l'élève\n\n// 1. Connexion au serveur MySQLi\n\n// 2. Récupération des données POST (cin, immatriculation, date_test, note_confort, note_conduite, note_securite, commentaire)\n\n// 3. Vérification de l'existence du client et de la voiture\n\n// 4. Insertion dans la table evaluation\n\n// 5. Calcul des moyennes et affichage du récapitulatif\n?>\n",
      "mesStyles.css":
        "/* Styles initiaux Test Drive */\nbody {\n  font-family: Arial, sans-serif;\n  margin: 20px;\n  background-color: #f8f9fa;\n  color: #212529;\n}\n\nh1 {\n  text-align: center;\n  color: #c0392b;\n}\n\nfieldset {\n  width: 620px;\n  margin: 0 auto;\n  padding: 15px;\n  border: 2px solid #c0392b;\n  border-radius: 8px;\n  background-color: #ffffff;\n}\n\nlegend {\n  font-weight: bold;\n  color: #c0392b;\n  padding: 0 10px;\n}\n",
      "db/init.sql":
        "-- Schéma de base de données : bd_testdrive (Bac STI 2018)\n-- Système d'Évaluation et d'Essai Automobile\n\nCREATE TABLE IF NOT EXISTS voiture (\n    immatriculation VARCHAR(20) PRIMARY KEY,\n    marque VARCHAR(30) NOT NULL,\n    modele VARCHAR(30) NOT NULL,\n    energie VARCHAR(15) NOT NULL,\n    disponible CHAR(1) DEFAULT 'O' CHECK (disponible IN ('O', 'N'))\n);\n\nCREATE TABLE IF NOT EXISTS client (\n    cin VARCHAR(8) PRIMARY KEY,\n    nom VARCHAR(30) NOT NULL,\n    prenom VARCHAR(30) NOT NULL,\n    permis VARCHAR(15) NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS evaluation (\n    id_eval INT PRIMARY KEY AUTO_INCREMENT,\n    cin VARCHAR(8) NOT NULL,\n    immatriculation VARCHAR(20) NOT NULL,\n    date_test DATE NOT NULL,\n    note_confort INT NOT NULL CHECK (note_confort BETWEEN 1 AND 5),\n    note_conduite INT NOT NULL CHECK (note_conduite BETWEEN 1 AND 5),\n    note_securite INT NOT NULL CHECK (note_securite BETWEEN 1 AND 5),\n    commentaire TEXT,\n    FOREIGN KEY (cin) REFERENCES client(cin),\n    FOREIGN KEY (immatriculation) REFERENCES voiture(immatriculation)\n);\n\n-- Données initiales d'amorce\nINSERT INTO client (cin, nom, prenom, permis) VALUES\n('09876543', 'Gharbi', 'Karim', 'B-123456'),\n('01234567', 'Mejri', 'Salma', 'B-654321');\n\nINSERT INTO voiture (immatriculation, marque, modele, energie, disponible) VALUES\n('198-TN-1234', 'Peugeot', '208 GT-Line', 'Essence', 'O'),\n('210-TN-5678', 'Renault', 'Clio 5 Intens', 'Diesel', 'O'),\n('225-TN-9999', 'Volkswagen', 'Golf 8 Style', 'Hybride', 'O');\n\nINSERT INTO evaluation (cin, immatriculation, date_test, note_confort, note_conduite, note_securite, commentaire) VALUES\n('09876543', '198-TN-1234', '2023-05-10', 4, 5, 4, 'Très bonne tenue de route et moteur dynamique'),\n('01234567', '198-TN-1234', '2023-05-12', 5, 4, 5, 'Conduite agréable et insonorisation remarquable');\n",
    },
    hints: [
      "Consultez l'énoncé officiel et les consignes du Bac 2018 - Évaluation & Essai Test Drive.",
      "Respectez strictement la nomenclature des fonctions et IDs demandés : evaluation.html, mesStyles.css, controle.js, evaluer.php.",
      "Vérifiez les points d'arrêt et la conformité des types/formats de données.",
    ],
    rawCriteria: [
      {
        id: "EX18-01",
        code: "HTML-01",
        titre: "Formulaire d'évaluation d'essai (HTML5)",
        description:
          "Le formulaire evaluation.html doit comporter les champs cin, immatriculation, date_test, note_confort, note_conduite, note_securite et envoyer en POST vers evaluer.php.",
        points: 2,
        ordre: 1,
        sonde: {
          type: "dom_selector",
          selector:
            'form[method="POST" i][action="evaluer.php"] input#cin, form select#immatriculation, form input#date_test, form input#note_confort, form input#note_conduite, form input#note_securite',
          minCount: 6,
        },
        fail_message:
          "Le formulaire evaluation.html ne comporte pas l'ensemble des champs requis pour l'évaluation ou n'envoie pas en POST vers evaluer.php.",
      },
      {
        id: "EX18-02",
        code: "CSS-01",
        titre: "Styles et mise en page Test Drive",
        description:
          "La feuille mesStyles.css doit appliquer des règles de présentation sur le fieldset et les boutons.",
        points: 2,
        ordre: 2,
        sonde: {
          type: "css_property",
          selector: "fieldset",
          property: "border-width",
          isGreaterThanZero: true,
        },
        fail_message:
          "La feuille mesStyles.css n'applique pas les styles attendus sur le formulaire d'évaluation.",
      },
      {
        id: "EX18-03",
        code: "JS-01",
        titre: "Validation JS du CIN et de la voiture dans test()",
        description:
          "La fonction test() doit vérifier que le champ CIN comporte exactement 8 chiffres et qu'un véhicule est sélectionné.",
        points: 2.5,
        ordre: 3,
        sonde: {
          type: "js_eval",
          checkSelector: "#cin",
        },
        fail_message:
          "La fonction test() ne valide pas le format 8 chiffres du CIN ou la sélection obligatoire du véhicule.",
      },
      {
        id: "EX18-04",
        code: "JS-02",
        titre: "Contrôle des notes multi-critères et de la date",
        description:
          "La fonction test() doit vérifier que la date est renseignée et que chaque note (confort, conduite, sécurité) est comprise entre 1 et 5 inclus.",
        points: 2.5,
        ordre: 4,
        sonde: {
          type: "js_eval",
          checkSelector: "#note_confort",
        },
        fail_message:
          "La fonction test() ne valide pas les bornes [1..5] des notes ou la présence de la date.",
      },
      {
        id: "EX18-05",
        code: "PHP-01",
        titre: "Connexion MySQLi et extraction des paramètres POST",
        description:
          "Le script evaluer.php doit se connecter à MySQLi et récupérer les variables postées avec validation.",
        points: 4,
        ordre: 5,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "Connexion MySQLi ou extraction des paramètres POST invalide dans evaluer.php.",
      },
      {
        id: "EX18-06",
        code: "SQL-01",
        titre: "Insertion de l'évaluation dans la table evaluation",
        description:
          "Le script doit vérifier l'existence du client et de la voiture puis exécuter la requête INSERT INTO evaluation.",
        points: 4,
        ordre: 6,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "L'insertion dans la table evaluation ou la vérification client/voiture est absente ou erronée.",
      },
      {
        id: "EX18-07",
        code: "SQL-02",
        titre: "Calcul de moyennes et requête d'agrégation multi-critères",
        description:
          "Le script doit calculer la moyenne du test et exécuter une requête SQL d'agrégation AVG() pour restituer les moyennes globales.",
        points: 3,
        ordre: 7,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "La requête d'agrégation AVG() ou le calcul de moyenne est manquant dans evaluer.php.",
      },
    ],
  },
  {
    id: "exam-bac2025-droits-acces",
    title: "Bac 2025 - Droits d'Accès aux Documents Partagés",
    level: "Difficile",
    competence: "Bac STI • HTML5 • CSS3 • JavaScript • PHP • MySQLi • Examen Blanc • Session 2025",
    module: "Module C",
    dureeMinutes: 120,
    tags: [
      "Bac STI",
      "HTML5",
      "CSS3",
      "JavaScript",
      "PHP",
      "MySQLi",
      "Examen Blanc",
      "Session 2025",
    ],
    examMode: true,
    bareme: 20,
    statement: [
      "Épreuve pratique du Bac STI, session 2025 : gestion des droits d'accès (écriture, lecture, impression) aux documents partagés d'une société, avec ajout d'utilisateur, attribution et affichage des droits.",
    ],
    enonceMarkdown:
      "# Épreuve Pratique du Baccalauréat STI — Session 2025\n\n## Sujet : Droits d'accès aux documents partagés (Futura Horizon AI)\n\n**Durée :** 2 heures (120 minutes)  \n**Coefficient :** 1.2  \n**Note Maximale :** 20 points (Mode Examen)\n\n---\n\n## Contexte\n\nLe service informatique de la société **Futura Horizon AI** souhaite un site Web pour gérer les droits d'accès aux documents partagés sur son serveur. Le site doit permettre :\n\n- d'ajouter un utilisateur ;\n- d'attribuer des droits d'accès à un utilisateur pour un document ;\n- d'afficher les droits d'accès relatifs à un document.\n\nLe dossier de travail se nomme `SW<numéro d'inscription>`. Les ressources fournies sont : `tables.sql`, `logo.png`, `mesStyles.css`, `mesControles.js`, `droit.html`, `affichage.html` et `affichage.php`.\n\nReprésentation textuelle de la base (nommée `bd2025` dans la plateforme) :\n\n```\nDocument    (idDoc, nomDoc, dateCreation)\nUtilisateur (idUtil, nomPrenom)\nDroit       (idDoc#, idUtil#, ecriture, lecture, impression)\n```\n\n| Champ                               | Type et contrainte                                          |\n| ----------------------------------- | ----------------------------------------------------------- |\n| `idDoc`                             | Chaîne de 5 caractères                                      |\n| `nomDoc`                            | Chaîne de 50 caractères                                     |\n| `dateCreation`                      | Date et heure                                               |\n| `idUtil`                            | Chaîne de 4 caractères                                      |\n| `nomPrenom`                         | Chaîne de 50 caractères                                     |\n| `ecriture`, `lecture`, `impression` | Caractère non vide : `O` si le droit est accordé, `N` sinon |\n\n---\n\n## Travail Demandé\n\n### Partie A : base de données\n\n1. Créer la base de données.\n2. Importer `tables.sql` (tables `document` et `utilisateur`).\n3. Créer la table `droit` conformément à la représentation textuelle.\n4. Créer les relations entre les tables.\n5. Exporter la base au format SQL dans le dossier de travail.\n\n### Partie B : documents Web\n\nConsignes : les fonctions JavaScript vont dans `mesControles.js`, les règles CSS dans `mesStyles.css`, toutes les pages sont liées à `mesStyles.css`, `utilisateur.html` et `droit.html` sont liées à `mesControles.js`, et le bouton « Annuler » de chaque formulaire réinitialise les champs.\n\n**1. Page `index.html`**\n\n- Un `<header>` avec l'image `logo.png` et le titre de niveau 1 « Les droits d'accès aux documents partagés ».\n- Un `<main>` avec une navigation `<nav>` (trois liens, chacun sur sa ligne : Ajout d'un utilisateur, Attribution des droits d'accès, Affichage des droits d'accès) et une zone d'affichage `<section>` qui contient par défaut `utilisateur.html`.\n- Un `<footer>` avec « Copyright - Futura Horizon AI - 2025 ».\n- Mise en forme : `h1` et `footer` sur fond bleu, texte blanc centré ; liens avec une ombre rouge (décalage 5px / 5px, flou 3px) et en italique lorsqu'ils sont actifs.\n\n**2. Page `utilisateur.html`** : formulaire d'ajout (identifiant, nom et prénom, boutons Ajouter et Annuler).\n\n- Le bouton « Ajouter » appelle la fonction `verif1` et le fichier `ajout.php`.\n- Boutons centrés ; `fieldset` avec bordure de 2 pixels en pointillé.\n- `verif1` : l'identifiant est une chaîne de longueur 4 qui commence par `U` suivie de 3 chiffres ; le nom et prénom ne contient que des lettres et des espaces, sur 5 à 50 caractères (utiliser la fonction `alpha` fournie).\n- `ajout.php` : insère l'utilisateur puis affiche « Utilisateur ajouté avec succès », ou « Erreur d'insertion des données » dans le cas contraire.\n\n**3. Page `droit.html`** : attribution des droits.\n\n- Champ « Identifiant de l'utilisateur » obligatoire ; le bouton « Enregistrer » appelle `verif2` et `droit.php`.\n- Les cases « Ecriture », « Lecture » et « Impression » appellent respectivement `choix1`, `choix2` et `choix3`.\n- `verif2` : sélection obligatoire d'un document et d'au moins un droit.\n- `choix1` coche « Lecture » si « Ecriture » est cochée ; `choix2` décoche « Ecriture » et « Impression » si « Lecture » est décochée ; `choix3` coche « Lecture » si « Impression » est cochée.\n- `droit.php` affiche « Erreur : Utilisateur inexistant » si l'identifiant n'existe pas ; sinon il met à jour les droits (message « Mise à jour des droits d'accès réussie ») si l'utilisateur en a déjà pour ce document, ou les insère (message « Insertion des droits d'accès réussie »).\n\n**4. Page `affichage.html`** : le bouton « Afficher » appelle `affichage.php`, qui complète l'affichage : titre « Les droits d'accès relatifs au document : <nomDoc> », puis une ligne par utilisateur (nom et prénom, écriture, lecture, impression).\n\n---\n\n## Barème Officiel\n\n| Partie    | Critère Évalué                                   | Points        |\n| --------- | ------------------------------------------------ | ------------- |\n| **A**     | Base de données (5 tâches de 0,25 pt)            | 1,25 pts      |\n| **A**     | Respect des consignes                            | 0,5 pt        |\n| **B-1**   | Page `index.html` (structure)                    | 2 pts         |\n| **B-1**   | Mise en forme de l'index                         | 1,25 pts      |\n| **B-2**   | Formulaire `utilisateur.html`                    | 1,25 pts      |\n| **B-2**   | Mise en forme du formulaire                      | 0,75 pt       |\n| **B-2**   | Fonction `verif1`                                | 1 pt          |\n| **B-2**   | Fichier `ajout.php`                              | 2 pts         |\n| **B-3**   | Page `droit.html`                                | 1,75 pts      |\n| **B-3**   | Fonctions `verif2`, `choix1`, `choix2`, `choix3` | 2 pts         |\n| **B-3**   | Fichier `droit.php`                              | 4,25 pts      |\n| **B-4**   | Page `affichage.html`                            | 0,25 pt       |\n| **B-4**   | Fichier `affichage.php`                          | 1,75 pts      |\n| **Total** | **Note Globale Bac Pratique**                    | **20 points** |\n",
    starter: {
      "index.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Droits d\'accès - Futura Horizon AI</title>\n    <!-- À compléter : liaison avec mesStyles.css, header / main (nav + section) / footer -->\n  </head>\n  <body></body>\n</html>\n',
      "utilisateur.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Ajout d\'un utilisateur - Futura Horizon AI</title>\n    <!-- À compléter : liaisons avec mesStyles.css et mesControles.js, formulaire d\'ajout -->\n  </head>\n  <body></body>\n</html>\n',
      "droit.html":
        '<!DOCTYPE html>\n<html>\n  <head>\n    <title>Attribution des droits d\'accès - Futura Horizon AI</title>\n  </head>\n  <body>\n    <form action="" method="">\n      <fieldset>\n        <legend>Attribution des droits d\'accès à un document</legend>\n        <label>Identifiant de l\'utilisateur :</label>\n        <input id="" name="" type="text" /> <br />\n        <label>Nom du document :</label>\n        <select id="" name="" size="1">\n          <option value="" selected>Sélectionner un document</option>\n          <option value="D0001">Liste employés.pdf</option>\n          <option value="D0002">Demande de congés.docx</option>\n          <option value="D0003">Réclamation ouvriers.docx</option>\n          <option value="D0004">Statistiques2024.xlsx</option></select\n        ><br />\n        <label>Droit(s) accordé(s) :</label>\n        <input id="" name="" type="checkbox" />Ecriture\n        <input id="" name="" type="checkbox" />Lecture\n        <input id="" name="" type="checkbox" />Impression <br /><br />\n        <div id="divbt">\n          <input name="bt1" type="submit" value="Enregistrer" />&nbsp;&nbsp;<input\n            name="bt2"\n            type="reset"\n            value="Annuler"\n          />\n        </div>\n      </fieldset>\n    </form>\n  </body>\n</html>\n',
      "affichage.html":
        '<!DOCTYPE html>\n<html>\n  <head>\n    <title>Affichage des droits d’accès - Futura Horizon AI</title>\n  </head>\n  <body>\n    <form action="" method="">\n      <fieldset>\n        <legend>Les droits d\'accès d\'un document</legend>\n        <label>Nom du document :</label>\n        <select id="doc" name="doc" size="1">\n          <option value="" selected>Sélectionner un document</option>\n          <option value="D0001">Liste employés.pdf</option>\n          <option value="D0002">Demande de congés.docx</option>\n          <option value="D0003">Réclamation ouvriers.docx</option>\n          <option value="D0004">Statistiques2024.xlsx</option>\n        </select>\n        <br />\n        <br />\n        <div id="divbt">\n          <input name="" type="submit" value="Afficher" />&nbsp;&nbsp;<input\n            name=""\n            type="reset"\n            value="Annuler"\n          />\n        </div>\n      </fieldset>\n    </form>\n  </body>\n</html>\n',
      "mesStyles.css":
        '#divbt {\n  text-align: right;\n}\n\nh1 {\n  position: relative;\n  left: 75px;\n  width: 95%;\n  height: 60px;\n  padding: 20px 0px 0px 0px;\n}\n\nimg {\n  width: 70px;\n  height: 80px;\n  position: fixed;\n  margin: 0px 0px 20px 0px;\n}\n\nnav {\n  height: 450px;\n  position: fixed;\n  width: 30%;\n}\n\nsection {\n  width: 70%;\n  height: 450px;\n  position: relative;\n  left: 25%;\n  border-radius: 3px;\n  box-shadow: 2px 5px 10px black;\n}\n\niframe {\n  width: 100%;\n  height: 100%;\n}\n\nfooter {\n  margin: 20px 0px 0px 0px;\n}\n\nlabel {\n  width: 180px;\n  display: inline-block;\n  margin: 10px;\n}\n\nlegend {\n  font-weight: bold;\n}\n\ninput[type="text"] {\n  width: 172px;\n}\n',
      "mesControles.js":
        'function alpha(ch) {\n  let cp = 0;\n  ch = ch.toUpperCase();\n  let valid = true;\n  do {\n    if ((ch[cp] >= "A" && ch[cp] <= "Z") || ch[cp] == " ") {\n      cp = cp + 1;\n    } else {\n      valid = false;\n    }\n  } while (valid == true && cp < ch.length);\n  return valid;\n}\n',
      "ajout.php":
        "<?php\n// Ajout d'un utilisateur : insertion dans la table utilisateur\n// À compléter par le candidat\n?>\n",
      "droit.php":
        "<?php\n// Attribution des droits d'accès : insertion ou mise à jour dans la table droit\n// À compléter par le candidat\n?>\n",
      "affichage.php":
        '<?php\n\n\n$doc=$_POST["doc"];\n$req="select nomdoc from document where (iddoc=\'$doc\')";\n$res=mysqli_query($con,$req)or die(mysqli_error($con));\n//Affichage du nom du document sélectionné dans la page affichage.html\nif (mysqli_num_rows($res)!=0)\n{\t$enreg=mysqli_fetch_array($res);\n\techo "<h2>Les droits d\'accès relatifs au document : ". $enreg["nomdoc"]."</h2><br>";\n}\n\n ?>',
      "db/init.sql":
        "-- Base bd2025 (Bac STI 2025) : droits d'accès aux documents partagés\n-- Version complète : tables fournies (document, utilisateur) + table droit et ses relations.\n\nCREATE TABLE `document` (\n  `idDoc` varchar(5) NOT NULL,\n  `nomDoc` varchar(50) NOT NULL DEFAULT '',\n  `dateCreation` datetime NOT NULL,\n  PRIMARY KEY (`idDoc`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\nINSERT INTO `document` (`idDoc`, `nomDoc`, `dateCreation`) VALUES\n('D0001', 'Liste employés.pdf', '2025-02-15 09:14:39');\nINSERT INTO `document` (`idDoc`, `nomDoc`, `dateCreation`) VALUES\n('D0002', 'Demande de congés.docx', '2021-10-09 08:10:09');\nINSERT INTO `document` (`idDoc`, `nomDoc`, `dateCreation`) VALUES\n('D0003', 'Réclamation ouvriers.docx', '2022-02-07 11:00:29');\nINSERT INTO `document` (`idDoc`, `nomDoc`, `dateCreation`) VALUES\n('D0004', 'Statistiques2024.xlsx', '2025-01-31 07:00:20');\n\nCREATE TABLE `utilisateur` (\n  `idUtil` varchar(4) NOT NULL,\n  `nomPrenom` varchar(50) NOT NULL DEFAULT '',\n  PRIMARY KEY (`idUtil`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\nINSERT INTO `utilisateur` (`idUtil`, `nomPrenom`) VALUES\n('U001', 'Ali GAFSI');\nINSERT INTO `utilisateur` (`idUtil`, `nomPrenom`) VALUES\n('U002', 'Mohamed SOUSSI');\nINSERT INTO `utilisateur` (`idUtil`, `nomPrenom`) VALUES\n('U003', 'Karima TOUNSI');\nINSERT INTO `utilisateur` (`idUtil`, `nomPrenom`) VALUES\n('U004', 'Kamel SFAXI');\nINSERT INTO `utilisateur` (`idUtil`, `nomPrenom`) VALUES\n('U005', 'Houda JANDOUBI');\nINSERT INTO `utilisateur` (`idUtil`, `nomPrenom`) VALUES\n('U006', 'Taoufik BEJI');\n\nCREATE TABLE `droit` (\n  `idDoc` varchar(5) NOT NULL,\n  `idUtil` varchar(4) NOT NULL,\n  `ecriture` char(1) NOT NULL,\n  `lecture` char(1) NOT NULL,\n  `impression` char(1) NOT NULL,\n  PRIMARY KEY (`idDoc`, `idUtil`),\n  CONSTRAINT `fk_droit_document` FOREIGN KEY (`idDoc`) REFERENCES `document` (`idDoc`),\n  CONSTRAINT `fk_droit_utilisateur` FOREIGN KEY (`idUtil`) REFERENCES `utilisateur` (`idUtil`),\n  CONSTRAINT `ck_droit_valeurs` CHECK (`ecriture` IN ('O','N') AND `lecture` IN ('O','N') AND `impression` IN ('O','N'))\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n-- Jeu d'essai (le droit d'écriture ou d'impression suppose le droit de lecture)\nINSERT INTO `droit` (`idDoc`, `idUtil`, `ecriture`, `lecture`, `impression`) VALUES\n('D0001', 'U001', 'O', 'O', 'O');\nINSERT INTO `droit` (`idDoc`, `idUtil`, `ecriture`, `lecture`, `impression`) VALUES\n('D0001', 'U002', 'N', 'O', 'N');\nINSERT INTO `droit` (`idDoc`, `idUtil`, `ecriture`, `lecture`, `impression`) VALUES\n('D0002', 'U003', 'N', 'O', 'O');\n",
    },
    hints: [
      "Consultez l'énoncé officiel et les consignes du sujet : Bac 2025 - Droits d'Accès aux Documents Partagés.",
      "Respectez strictement les noms de fichiers, de champs et de fonctions demandés : index.html, utilisateur.html, droit.html, affichage.html, mesStyles.css, mesControles.js, ajout.php, droit.php, affichage.php.",
      "Vérifiez les messages affichés et les cas limites (valeurs vides, doublons, identifiants inexistants).",
    ],
    rawCriteria: [
      {
        id: "EX25-01",
        code: "BD-01",
        titre: "Base de données : création, import, table droit et relations",
        description:
          "La base bd2025 est créée, tables.sql importé, la table droit créée avec sa clé primaire composée et ses deux clés étrangères, puis la base exportée.",
        points: 1.25,
        ordre: 1,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "La table droit, ses clés ou ses relations avec document et utilisateur sont absentes ou incorrectes.",
      },
      {
        id: "EX25-02",
        code: "CONS-01",
        titre: "Respect des consignes (nommage et liaisons CSS)",
        description:
          "Les pages HTML sont reliées à mesStyles.css et les fichiers portent les noms demandés.",
        points: 0.5,
        ordre: 2,
        sonde: {
          type: "dom_selector",
          selector: 'link[rel="stylesheet"][href="mesStyles.css"]',
        },
        fail_message:
          "Une page n'est pas reliée à mesStyles.css ou un fichier ne porte pas le nom demandé.",
      },
      {
        id: "EX25-03",
        code: "HTML-01",
        titre: "Page index : structure header, nav, section, footer",
        description:
          "index.html contient l'en-tête (logo et titre h1), la navigation avec trois liens, la zone d'affichage section et le pied de page.",
        points: 2,
        ordre: 3,
        sonde: {
          type: "dom_selector",
          selector: "header img, header h1, main nav a, main section, footer",
          minCount: 7,
        },
        fail_message:
          "La structure de index.html (header avec logo et h1, nav avec 3 liens, section, footer) est incomplète.",
      },
      {
        id: "EX25-04",
        code: "CSS-01",
        titre: "Mise en forme de l'index (titre, pied de page, liens)",
        description:
          "Les éléments h1 et footer ont un fond bleu, un texte blanc centré ; les liens ont une ombre rouge de 5px 5px 3px et sont en italique lorsqu'ils sont actifs.",
        points: 1.25,
        ordre: 4,
        sonde: {
          type: "css_property",
          selector: "h1",
          property: "background-color",
          expectedValue: "blue",
        },
        fail_message: "Les règles CSS de h1, footer ou des liens ne respectent pas l'énoncé.",
      },
      {
        id: "EX25-05",
        code: "HTML-02",
        titre: "Page utilisateur.html : formulaire d'ajout",
        description:
          "Le formulaire envoie en POST vers ajout.php, contient les champs idUtil et nomPrenom et les boutons Ajouter et Annuler, et appelle verif1.",
        points: 1.25,
        ordre: 5,
        sonde: {
          type: "dom_selector",
          selector:
            'form[action="ajout.php"][onsubmit*="verif1"] input#idUtil, form input#nomPrenom, form input[type="submit"], form input[type="reset"]',
          minCount: 4,
        },
        fail_message:
          "Le formulaire utilisateur.html n'appelle pas verif1 ou ajout.php, ou il manque un champ ou un bouton.",
      },
      {
        id: "EX25-06",
        code: "CSS-02",
        titre: "Mise en forme du formulaire (fieldset en pointillé, boutons centrés)",
        description: "Le fieldset a une bordure de 2px en pointillé et les boutons sont centrés.",
        points: 0.75,
        ordre: 6,
        sonde: {
          type: "css_property",
          selector: "fieldset",
          property: "border-style",
          expectedValue: "dotted",
        },
        fail_message:
          "La bordure du fieldset n'est pas en pointillé ou les boutons ne sont pas centrés.",
      },
      {
        id: "EX25-07",
        code: "JS-01",
        titre: "Contrôle verif1 : identifiant et nom et prénom",
        description:
          "verif1 exige un identifiant U suivi de 3 chiffres et un nom et prénom alphabétique de 5 à 50 caractères, en utilisant alpha.",
        points: 1,
        ordre: 7,
        sonde: {
          type: "js_eval",
          checkSelector: "#idUtil",
        },
        fail_message:
          "verif1 ne contrôle pas correctement l'identifiant (U + 3 chiffres) ou le nom et prénom (5 à 50 lettres).",
      },
      {
        id: "EX25-08",
        code: "PHP-01",
        titre: "ajout.php : insertion de l'utilisateur et messages",
        description:
          "Le script insère l'utilisateur puis affiche « Utilisateur ajouté avec succès », ou « Erreur d'insertion des données » en cas d'échec.",
        points: 2,
        ordre: 8,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "ajout.php n'insère pas l'utilisateur ou n'affiche pas les messages demandés.",
      },
      {
        id: "EX25-09",
        code: "HTML-03",
        titre: "Page droit.html : champs, champ obligatoire, appels de fonctions",
        description:
          "Le champ identifiant est obligatoire, le formulaire appelle verif2 et droit.php, et chaque case appelle choix1, choix2 ou choix3.",
        points: 1.75,
        ordre: 9,
        sonde: {
          type: "dom_selector",
          selector:
            'form[action="droit.php"][onsubmit*="verif2"] input[required], input[type="checkbox"][onclick*="choix1"], input[type="checkbox"][onclick*="choix2"], input[type="checkbox"][onclick*="choix3"]',
          minCount: 4,
        },
        fail_message:
          "droit.html : champ obligatoire, appel de verif2 / droit.php ou appels de choix1, choix2, choix3 manquants.",
      },
      {
        id: "EX25-10",
        code: "JS-02",
        titre: "Fonctions verif2, choix1, choix2 et choix3",
        description:
          "verif2 impose un document et au moins un droit ; choix1 et choix3 cochent Lecture ; choix2 décoche Écriture et Impression quand Lecture est décochée.",
        points: 2,
        ordre: 10,
        sonde: {
          type: "js_eval",
          checkSelector: "#lecture",
        },
        fail_message:
          "verif2 ou les fonctions choix1, choix2, choix3 ne respectent pas les règles de cohérence entre les droits.",
      },
      {
        id: "EX25-11",
        code: "PHP-02",
        titre: "droit.php : utilisateur inexistant, mise à jour ou insertion des droits",
        description:
          "Le script distingue trois cas : utilisateur inexistant, droits déjà attribués (UPDATE) ou nouveaux droits (INSERT), avec le message correspondant.",
        points: 4.25,
        ordre: 11,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "droit.php ne gère pas correctement l'existence de l'utilisateur, la mise à jour ou l'insertion des droits.",
      },
      {
        id: "EX25-12",
        code: "HTML-04",
        titre: "Page affichage.html : appel de affichage.php",
        description: "Le bouton Afficher envoie le formulaire vers affichage.php.",
        points: 0.25,
        ordre: 12,
        sonde: {
          type: "dom_selector",
          selector: 'form[action="affichage.php"] select#doc',
        },
        fail_message: "affichage.html n'appelle pas affichage.php.",
      },
      {
        id: "EX25-13",
        code: "PHP-03",
        titre: "affichage.php : droits des utilisateurs pour le document choisi",
        description:
          "Le script affiche le titre avec le nom du document puis, pour chaque utilisateur, son nom et ses droits d'écriture, de lecture et d'impression.",
        points: 1.75,
        ordre: 13,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "affichage.php n'affiche pas la liste des droits selon le format demandé (jointure droit / utilisateur).",
      },
    ],
  },
  {
    id: "exam-bac2026-bijoux-aurythia",
    title: "Bac 2026 - Bijoux Aurythia (Session de 8h30)",
    level: "Difficile",
    competence: "Bac STI • HTML5 • CSS3 • JavaScript • PHP • MySQLi • Examen Blanc • Session 2026",
    module: "Module C",
    dureeMinutes: 120,
    tags: [
      "Bac STI",
      "HTML5",
      "CSS3",
      "JavaScript",
      "PHP",
      "MySQLi",
      "Examen Blanc",
      "Session 2026",
    ],
    examMode: true,
    bareme: 20,
    statement: [
      "Épreuve pratique du Bac STI, session 2026 (8h30) : site de la société Aurythia pour ajouter un bijou et sa composition, enregistrer l'évaluation d'un expert et lister les bijoux originaux.",
    ],
    enonceMarkdown:
      "# Épreuve Pratique du Baccalauréat STI — Session 2026 (8h30)\n\n## Sujet : Aurythia, l'art des bijoux\n\n**Durée :** 2 heures (120 minutes)  \n**Coefficient :** 1.2  \n**Note Maximale :** 20 points (Mode Examen)\n\n---\n\n## Contexte\n\n**Aurythia** fabrique des bijoux. Elle souhaite un site Web pour :\n\n- ajouter un bijou et sa composition ;\n- enregistrer l'évaluation d'un bijou par un expert ;\n- afficher la liste des bijoux originaux.\n\nRessources fournies : `bijoux.jpg`, `ajout.html`, `bijoux.sql`, `mesStyles.css`, `mesControles.js` (fonction `nettoyage`). Le dossier de travail se nomme `SW<numéro d'inscription>`.\n\nReprésentation textuelle de la base (nommée `bd2026_bijoux` dans la plateforme) :\n\n```\nbijou       (idBij, description, prixVente, poids)\nmetal       (idMet, nomMet)\ncomposition (idBij#, idMet#)\nexpert      (idExp, nomExp, mail)\nevaluation  (idExp#, idBij#, finition, originalite, commentaire, dateEv)\n```\n\n| Champ         | Type et propriété(s)                  |\n| ------------- | ------------------------------------- |\n| `idBij`       | Chaîne de 5 caractères                |\n| `description` | Chaîne de 100 caractères              |\n| `prixVente`   | Entier (dinars)                       |\n| `poids`       | Entier (grammes)                      |\n| `idMet`       | Caractère                             |\n| `nomMet`      | Chaîne de 50 caractères, unique       |\n| `idExp`       | Chaîne de 3 caractères                |\n| `nomExp`      | Chaîne de 50 caractères, unique       |\n| `mail`        | Chaîne de 100 caractères, unique      |\n| `finition`    | Entier : note du critère « Finition » |\n| `originalite` | Caractère : `O` (oui) ou `N` (non)    |\n| `commentaire` | Chaîne de 200 caractères              |\n| `dateEv`      | Date et heure de l'évaluation         |\n\n---\n\n## Travail Demandé\n\n### Étape 1 : base de données\n\n1. Créer la base de données.\n2. Importer `bijoux.sql`.\n3. Définir les clés primaires des différentes tables, créer la table `evaluation` et établir les relations entre les tables.\n4. Exporter la base au format SQL dans le dossier de travail.\n\n### Étape 2 : documents Web\n\nConsignes : les fonctions JavaScript vont dans `mesControles.js`, les règles CSS dans `mesStyles.css`, toutes les pages sont liées à `mesStyles.css`, `ajout.html` et `evaluation.html` sont liées à `mesControles.js`, et le bouton « Annuler » de chaque formulaire réinitialise les champs.\n\n**1. Page `index.html`**\n\n- `<header>` : un titre `<h1>` « Aurythia : l'art des bijoux » et une navigation `<nav>` sur une seule ligne avec les liens « Ajout d'un bijou » (`ajout.html`), « Evaluation d'un bijou » (`evaluation.html`) et « Liste des bijoux originaux » (`liste.php`).\n- `<main>` : une `<section>` (zone d'affichage, `ajout.html` par défaut) et un `<aside>` à droite avec l'image `bijoux.jpg`.\n- `<footer>` : liste à puces « Numéro Bleu : 82 10 00 00 » et « Email : admin@Aurythia.ai ».\n- Mise en forme : `h1` en Arial, première lettre de chaque mot en majuscule, fond `#053860` ; `header` et `footer` sur fond `#053860` ; liens, `header` et `footer` en blanc (`#FFFFFF`) ; `nav` avec 15px de marge intérieure ; `section` et `aside` sur la même ligne ; puces carrées pour les `ul`.\n\n**2. Page `ajout.html`**\n\n- Le bouton « Enregistrer » appelle `valide1` et `ajout.php` ; le champ « Description » est obligatoire.\n- Les `fieldset` « Détails » et « Composition » ont une bordure double `#0000FF` de 3px ; les deux boutons ont une ombre bleue décalée de 5px (horizontalement et verticalement).\n- `valide1` : identifiant = deux lettres alphabétiques suivies de trois chiffres ; prix de vente supérieur ou égal à 100 ; au moins un métal sélectionné (l'arrière-plan de la composition devient rouge si elle est invalide).\n- `ajout.php` : insère le bijou dans `bijou` et ses métaux dans `composition` ; affiche « Ajout effectué avec succès » ou « Erreur d'insertion ».\n\n**3. Page `evaluation.html`** : formulaire d'évaluation (identifiant du bijou, expert, finition, originalité, commentaire).\n\n- Experts (attribut `value`) : Chokri Sfaxi `A22`, Mohamed Jerbi `A23`, Radhia Gafsi `A24`. Finition de type `number`. Originalité : `O` pour OUI, `N` pour NON. Le bouton « Enregistrer » appelle `valide2` et `evaluation.php`.\n- Les légendes « Evaluation d'un bijou » et « Critères d'évaluation » sont en gras et italique ; les boutons ont la même mise en forme qu'à la question 2.\n- `valide2` : même contrôle d'identifiant qu'en 2 ; expert obligatoire ; finition = entier de 1 à 5 ; originalité obligatoire ; commentaire = au moins deux mots séparés par des espaces, chacun uniquement formé de lettres (utiliser `nettoyage`).\n- `evaluation.php` : affiche « Bijou inexistant » si l'identifiant est inconnu ; « Bijou déjà évalué par cet expert » si l'évaluation existe ; sinon enregistre l'évaluation (`dateEv` = date et heure système) et affiche « Evaluation enregistrée avec succès ».\n\n**4. Page `liste.php`** : liste des bijoux originaux (évaluations dont `originalite` vaut `O`), avec colonnes Identifiant, Description et Moyenne (Finition), la moyenne portant sur ces évaluations.\n\n---\n\n## Barème Officiel\n\n| Partie        | Critère Évalué                                                                | Points        |\n| ------------- | ----------------------------------------------------------------------------- | ------------- |\n| **Étape 1**   | Manipulation de la base de données                                            | 1,75 pts      |\n| **Étape 2-1** | Page `index.html` : structure (2) et mise en forme (2)                        | 4 pts         |\n| **Étape 2-2** | Ajout d'un bijou : HTML (1,25), CSS (1), `valide1` (1,75), `ajout.php` (1,75) | 5,75 pts      |\n| **Étape 2-3** | Évaluation : HTML (1,75), CSS (0,5), `valide2` (2,5), `evaluation.php` (2,5)  | 7,25 pts      |\n| **Étape 2-4** | Page `liste.php`                                                              | 1,25 pts      |\n| **Total**     | **Note Globale Bac Pratique**                                                 | **20 points** |\n",
    starter: {
      "index.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Aurythia : l\'art des bijoux</title>\n    <!-- À compléter : liaison avec mesStyles.css, header (h1 + nav), main (section + aside), footer -->\n  </head>\n  <body></body>\n</html>\n',
      "ajout.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />\n    <title>Ajout d\'un nouveau bijou</title>\n    <!-- liaison avec mesControles.js -->\n    <!-- liaison avec mesStyles.css -->\n  </head>\n  <body>\n    <form>\n      <!-- appel de la fonction js et du fichier php  -->\n      <fieldset id="principal">\n        <legend>Ajout d\'un bijou</legend>\n        <fieldset>\n          <legend>Détails</legend>\n          <label> Identifiant : </label>\n          <input name="idBij" type="text" id="idBij" /><br /><br />\n          <label> Description : </label>\n          <input name="desc" type="text" id="desc" /><br /><br />\n          <label> Prix de vente : </label>\n          <input name="prix" type="number" id="prix" />\n          <label> dinars </label><br /><br />\n          <label> Poids : </label>\n          <input name="poids" type="number" id="poids" value="1" />\n          <label> gramme(s)</label><br />\n        </fieldset>\n        <fieldset>\n          <legend>Composition</legend>\n          <input name="c1" type="checkbox" id="c1" value="A" /> Argent\n          <input name="c2" type="checkbox" id="c2" value="R" /> Or\n          <input name="c3" type="checkbox" id="c3" value="P" /> Platine\n        </fieldset>\n        <br />\n        <div class="bt">\n          <input type="reset" id="exit" value="Annuler" />\n          <input type="submit" id="save" value="Enregistrer" />\n        </div>\n      </fieldset>\n    </form>\n  </body>\n</html>\n',
      "evaluation.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Evaluation d\'un bijou</title>\n    <!-- À compléter : liaisons avec mesStyles.css et mesControles.js, formulaire d\'évaluation -->\n  </head>\n  <body></body>\n</html>\n',
      "mesStyles.css":
        "/* Ajouter à partir de la ligne suivante, les règles CSS demandées */\n\n/* Il est conseillé de ne pas modifier les règles CSS ci-après  */\nh1 {\n  text-align: center;\n}\n\nnav {\n  width: 100%;\n  height: 30%;\n  text-align: center;\n}\n\nmain {\n  width: 100%;\n  height: 480px;\n}\n\nsection {\n  width: 70%;\n  height: 100%;\n}\n\naside {\n  width: 30%;\n  height: 100%;\n}\n\nimg {\n  width: 100%;\n  height: 100%;\n}\n\niframe {\n  width: 100%;\n  height: 100%;\n}\n\nfooter {\n  width: 100%;\n  height: 70px;\n  margin: -16px 0px 0px 0px;\n}\n\nlabel {\n  display: inline-block;\n  width: 150px;\n}\n\n.bt {\n  text-align: right;\n}\n",
      "mesControles.js":
        '/* la fonction "nettoyage" permet d’effacer les espaces de début et de fin\nainsi que les espaces superflus de la chaîne ch */\nfunction nettoyage(ch) {\n  ch = ch.trim();\n  while (ch.indexOf("  ") != -1) {\n    ch = ch.replace("  ", " "); /* remplacer deux espaces par une seule espace */\n  }\n  return ch;\n}\n',
      "ajout.php":
        "<?php\n// Ajout d'un bijou et de sa composition (tables bijou et composition)\n// À compléter par le candidat\n?>\n",
      "evaluation.php":
        "<?php\n// Enregistrement de l'évaluation d'un bijou par un expert\n// À compléter par le candidat\n?>\n",
      "liste.php":
        "<?php\n// Liste des bijoux originaux avec la moyenne des notes de finition\n// À compléter par le candidat\n?>\n",
      "db/init.sql":
        "-- Base bd2026_bijoux (Bac STI 2026) : société de bijoux Aurythia\n-- Version complète : tables fournies + clés primaires + table evaluation et relations.\n\nCREATE TABLE `bijou` (\n  `idBij` varchar(5) NOT NULL,\n  `description` varchar(100) NOT NULL,\n  `prixVente` int NOT NULL,\n  `poids` int NOT NULL,\n  PRIMARY KEY (`idBij`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\nCREATE TABLE `metal` (\n  `idMet` varchar(1) NOT NULL,\n  `nomMet` varchar(50) NOT NULL,\n  PRIMARY KEY (`idMet`),\n  CONSTRAINT C1 UNIQUE (`nomMet`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\nCREATE TABLE `composition` (\n  `idBij` varchar(5) NOT NULL,\n  `idMet` varchar(1) NOT NULL,\n  PRIMARY KEY (`idBij`, `idMet`),\n  CONSTRAINT `fk_composition_bijou` FOREIGN KEY (`idBij`) REFERENCES `bijou` (`idBij`),\n  CONSTRAINT `fk_composition_metal` FOREIGN KEY (`idMet`) REFERENCES `metal` (`idMet`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\nCREATE TABLE `expert` (\n  `idExp` varchar(3) NOT NULL,\n  `nomExp` varchar(50) NOT NULL,\n  `mail` varchar(100) NOT NULL,\n  PRIMARY KEY (`idExp`),\n  CONSTRAINT C2 UNIQUE (`nomExp`),\n  CONSTRAINT C3 UNIQUE (`mail`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\nCREATE TABLE `evaluation` (\n  `idExp` varchar(3) NOT NULL,\n  `idBij` varchar(5) NOT NULL,\n  `finition` int NOT NULL,\n  `originalite` char(1) NOT NULL,\n  `commentaire` varchar(200) NOT NULL,\n  `dateEv` datetime NOT NULL,\n  PRIMARY KEY (`idExp`, `idBij`),\n  CONSTRAINT `fk_evaluation_expert` FOREIGN KEY (`idExp`) REFERENCES `expert` (`idExp`),\n  CONSTRAINT `fk_evaluation_bijou` FOREIGN KEY (`idBij`) REFERENCES `bijou` (`idBij`),\n  CONSTRAINT `ck_evaluation_originalite` CHECK (`originalite` IN ('O','N'))\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\nINSERT INTO `expert` (`idExp`, `nomExp`, `mail`) VALUES\n('A22', 'Chokri Sfaxi', 'Chokrisfaxi@gmail.com');\nINSERT INTO `expert` (`idExp`, `nomExp`, `mail`) VALUES\n('A23', 'Mohamed Jerbi', 'MohamedJerbi@gmail.com');\nINSERT INTO `expert` (`idExp`, `nomExp`, `mail`) VALUES\n('A24', 'Radhia Gafsi', 'RadhiaGafsi@gmail.com');\n\nINSERT INTO `metal` (`idMet`, `nomMet`) VALUES\n('A', 'Argent');\nINSERT INTO `metal` (`idMet`, `nomMet`) VALUES\n('R', 'Or');\nINSERT INTO `metal` (`idMet`, `nomMet`) VALUES\n('P', 'Platine');\n\nINSERT INTO `bijou` (`idBij`, `description`, `prixVente`, `poids`) VALUES\n('bg123', 'bague', 2000, 5);\nINSERT INTO `bijou` (`idBij`, `description`, `prixVente`, `poids`) VALUES\n('co789', 'colier', 5000, 10);\nINSERT INTO `bijou` (`idBij`, `description`, `prixVente`, `poids`) VALUES\n('bg124', 'bague avec diamant', 3500, 7);\n\nINSERT INTO `composition` (`idBij`, `idMet`) VALUES\n('bg123', 'R');\nINSERT INTO `composition` (`idBij`, `idMet`) VALUES\n('bg123', 'A');\nINSERT INTO `composition` (`idBij`, `idMet`) VALUES\n('co789', 'P');\nINSERT INTO `composition` (`idBij`, `idMet`) VALUES\n('bg124', 'R');\n\n-- Jeu d'essai : évaluations d'experts\nINSERT INTO `evaluation` (`idExp`, `idBij`, `finition`, `originalite`, `commentaire`, `dateEv`) VALUES\n('A22', 'bg123', 4, 'O', 'Belle finition', '2026-05-10 10:15:00');\nINSERT INTO `evaluation` (`idExp`, `idBij`, `finition`, `originalite`, `commentaire`, `dateEv`) VALUES\n('A23', 'bg123', 5, 'O', 'Tres original', '2026-05-11 09:00:00');\nINSERT INTO `evaluation` (`idExp`, `idBij`, `finition`, `originalite`, `commentaire`, `dateEv`) VALUES\n('A22', 'co789', 3, 'N', 'Modele classique', '2026-05-12 14:30:00');\nINSERT INTO `evaluation` (`idExp`, `idBij`, `finition`, `originalite`, `commentaire`, `dateEv`) VALUES\n('A24', 'bg124', 2, 'O', 'Design audacieux', '2026-05-12 16:45:00');\n",
    },
    hints: [
      "Consultez l'énoncé officiel et les consignes du sujet : Bac 2026 - Bijoux Aurythia (Session de 8h30).",
      "Respectez strictement les noms de fichiers, de champs et de fonctions demandés : index.html, ajout.html, evaluation.html, mesStyles.css, mesControles.js, ajout.php, evaluation.php, liste.php.",
      "Vérifiez les messages affichés et les cas limites (valeurs vides, doublons, identifiants inexistants).",
    ],
    rawCriteria: [
      {
        id: "EX26B-01",
        code: "BD-01",
        titre: "Base de données : clés primaires, table evaluation et relations",
        description:
          "Les clés primaires de toutes les tables sont définies, la table evaluation est créée et les relations entre les tables sont établies, puis la base est exportée.",
        points: 1.75,
        ordre: 1,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "Une clé primaire, la table evaluation ou une relation (clé étrangère) est absente ou incorrecte.",
      },
      {
        id: "EX26B-02",
        code: "HTML-01",
        titre: "Page index : titre, navigation, section, aside et pied de page",
        description:
          "index.html contient le titre h1, la navigation avec trois liens, la section (ajout.html par défaut), l'aside avec bijoux.jpg et le footer avec une liste à puces de deux éléments.",
        points: 2,
        ordre: 2,
        sonde: {
          type: "dom_selector",
          selector:
            'header h1, header nav a, main section iframe, main aside img[src="bijoux.jpg"], footer ul li',
          minCount: 8,
        },
        fail_message:
          "La structure de index.html (h1, nav avec 3 liens, section, aside avec image, footer avec liste) est incomplète.",
      },
      {
        id: "EX26B-03",
        code: "CSS-01",
        titre: "Mise en forme de l'index",
        description:
          "h1 en Arial avec majuscule à chaque mot et fond #053860 ; header et footer sur fond #053860 ; liens, header et footer en blanc ; nav avec 15px de marge intérieure ; section et aside sur la même ligne ; puces carrées.",
        points: 2,
        ordre: 3,
        sonde: {
          type: "css_property",
          selector: "h1",
          property: "text-transform",
          expectedValue: "capitalize",
        },
        fail_message:
          "Une des règles CSS de l'index (h1, header, footer, a, nav, section, aside, ul) est absente ou incorrecte.",
      },
      {
        id: "EX26B-04",
        code: "HTML-02",
        titre: "Page ajout.html : liaisons, appels et champ obligatoire",
        description:
          "La page est liée à mesControles.js et mesStyles.css, le bouton Enregistrer appelle valide1 et ajout.php, et le champ Description est obligatoire.",
        points: 1.25,
        ordre: 4,
        sonde: {
          type: "dom_selector",
          selector:
            'script[src="mesControles.js"], link[href="mesStyles.css"], form[action="ajout.php"][onsubmit*="valide1"], input#desc[required]',
          minCount: 4,
        },
        fail_message:
          "ajout.html n'est pas liée aux fichiers demandés, n'appelle pas valide1 / ajout.php ou le champ Description n'est pas obligatoire.",
      },
      {
        id: "EX26B-05",
        code: "CSS-02",
        titre: "Mise en forme du formulaire d'ajout",
        description:
          "Les fieldset Détails et Composition ont une bordure double #0000FF de 3px et les deux boutons une ombre bleue décalée de 5px.",
        points: 1,
        ordre: 5,
        sonde: {
          type: "css_property",
          selector: "fieldset fieldset",
          property: "border-style",
          expectedValue: "double",
        },
        fail_message:
          "Les fieldset n'ont pas la bordure double bleue de 3px ou les boutons n'ont pas l'ombre bleue.",
      },
      {
        id: "EX26B-06",
        code: "JS-01",
        titre: "Fonction valide1 : identifiant, prix et composition",
        description:
          "valide1 contrôle l'identifiant (deux lettres et trois chiffres), le prix (supérieur ou égal à 100) et la sélection d'au moins un métal, avec un arrière-plan rouge sur la composition invalide.",
        points: 1.75,
        ordre: 6,
        sonde: {
          type: "js_eval",
          checkSelector: "#composition",
        },
        fail_message:
          "valide1 ne contrôle pas correctement l'identifiant, le prix ou la composition.",
      },
      {
        id: "EX26B-07",
        code: "PHP-01",
        titre: "ajout.php : insertion dans bijou et composition",
        description:
          "Le script insère le bijou puis ses métaux, et affiche « Ajout effectué avec succès » ou « Erreur d'insertion ».",
        points: 1.75,
        ordre: 7,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "ajout.php n'insère pas le bijou et sa composition ou n'affiche pas les messages demandés.",
      },
      {
        id: "EX26B-08",
        code: "HTML-03",
        titre: "Page evaluation.html : formulaire d'évaluation",
        description:
          "Le formulaire contient la liste des experts (A22, A23, A24), un champ Finition de type number, l'originalité en O / N, un commentaire, et appelle valide2 et evaluation.php.",
        points: 1.75,
        ordre: 8,
        sonde: {
          type: "dom_selector",
          selector:
            'form[action="evaluation.php"][onsubmit*="valide2"] select option[value="A22"], option[value="A23"], option[value="A24"], input[type="number"]#finition, input[type="radio"][value="O"], input[type="radio"][value="N"]',
          minCount: 6,
        },
        fail_message:
          "evaluation.html : experts, champ Finition number, choix d'originalité O / N ou appel de valide2 / evaluation.php manquant.",
      },
      {
        id: "EX26B-09",
        code: "CSS-03",
        titre: "Mise en forme de la page d'évaluation",
        description:
          "Les légendes sont en gras et en italique et les boutons reprennent la mise en forme de la page d'ajout.",
        points: 0.5,
        ordre: 9,
        sonde: {
          type: "css_property",
          selector: "legend",
          property: "font-style",
          expectedValue: "italic",
        },
        fail_message:
          "Les légendes ne sont pas en gras et italique ou les boutons n'ont pas la même mise en forme qu'à la question 2.",
      },
      {
        id: "EX26B-10",
        code: "JS-02",
        titre: "Fonction valide2 : contrôles de l'évaluation",
        description:
          "valide2 contrôle l'identifiant, l'expert, la finition (entier de 1 à 5), l'originalité et le commentaire (au moins deux mots composés uniquement de lettres, via nettoyage).",
        points: 2.5,
        ordre: 10,
        sonde: {
          type: "js_eval",
          checkSelector: "#commentaire",
        },
        fail_message: "valide2 ne contrôle pas correctement l'un des champs de l'évaluation.",
      },
      {
        id: "EX26B-11",
        code: "PHP-02",
        titre: "evaluation.php : bijou inexistant, déjà évalué ou enregistrement",
        description:
          "Le script distingue les trois cas (bijou inexistant, bijou déjà évalué par l'expert, nouvelle évaluation avec la date et l'heure système) et affiche le message correspondant.",
        points: 2.5,
        ordre: 11,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "evaluation.php ne gère pas correctement l'existence du bijou, le doublon d'évaluation ou l'insertion avec dateEv.",
      },
      {
        id: "EX26B-12",
        code: "PHP-03",
        titre: "liste.php : bijoux originaux et moyenne de la finition",
        description:
          "La page affiche, pour les bijoux originaux (originalite = 'O'), l'identifiant, la description et la moyenne de la finition.",
        points: 1.25,
        ordre: 12,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "liste.php n'affiche pas les bijoux originaux avec la moyenne de la finition (AVG avec GROUP BY).",
      },
    ],
  },
  {
    id: "exam-bac2026-croisieres-marivana",
    title: "Bac 2026 - Croisières Marivana Voyages (Session de 12h30)",
    level: "Difficile",
    competence: "Bac STI • HTML5 • CSS3 • JavaScript • PHP • MySQLi • Examen Blanc • Session 2026",
    module: "Module C",
    dureeMinutes: 120,
    tags: [
      "Bac STI",
      "HTML5",
      "CSS3",
      "JavaScript",
      "PHP",
      "MySQLi",
      "Examen Blanc",
      "Session 2026",
    ],
    examMode: true,
    bareme: 20,
    statement: [
      "Épreuve pratique du Bac STI, session 2026 (12h30) : site de la compagnie Marivana Voyages pour consulter les croisières disponibles et réserver des places.",
    ],
    enonceMarkdown:
      "# Épreuve Pratique du Baccalauréat STI — Session 2026 (12h30)\n\n## Sujet : Marivana Voyages, croisières et réservations\n\n**Durée :** 2 heures (120 minutes)  \n**Coefficient :** 1.2  \n**Note Maximale :** 20 points (Mode Examen)\n\n---\n\n## Contexte\n\n**Marivana Voyages** organise des voyages maritimes à bord de ses navires. La compagnie souhaite un site Web pour :\n\n- consulter la liste des croisières disponibles ;\n- réserver des places pour une croisière.\n\nRessources fournies : `croisiere.sql`, `photo.html`, `croisiere.html`, `styles2.css`, `connexion.php`, `navire.png` et les images `img1.png` à `img8.png`. Le dossier de travail se nomme `SW<numéro d'inscription>`.\n\nReprésentation textuelle de la base (nommée `bd2026_croisieres` dans la plateforme) :\n\n```\nnavire      (idNav, nomNav, capacite)\ndestination (idDes, nomDes)\ncroisiere   (idCro, libCro, duree, prix, dateDepart, idDes#, idNav#)\nclient      (idCl, nomCl, telCl)\nreservation (idCl#, idCro#, dateRes, nbPlace)\n```\n\n| Champ        | Type et propriété(s)                     |\n| ------------ | ---------------------------------------- |\n| `idNav`      | Chaîne de 3 caractères                   |\n| `nomNav`     | Chaîne de 100 caractères, unique         |\n| `capacite`   | Entier (nombre de places)                |\n| `idDes`      | Entier                                   |\n| `nomDes`     | Chaîne de 100 caractères, unique         |\n| `idCro`      | Chaîne de 5 caractères                   |\n| `libCro`     | Chaîne de 100 caractères, unique         |\n| `duree`      | Entier (jours)                           |\n| `prix`       | Entier (dinars, prix d'une place)        |\n| `dateDepart` | Date                                     |\n| `idCl`       | Chaîne de 10 caractères                  |\n| `nomCl`      | Chaîne de 100 caractères (nom et prénom) |\n| `telCl`      | Entier                                   |\n| `dateRes`    | Date et heure                            |\n| `nbPlace`    | Entier                                   |\n\n---\n\n## Travail Demandé\n\n### Étape 1 : base de données\n\n1. Créer la base de données.\n2. Importer `croisiere.sql`.\n3. Créer la table `reservation` conformément à la description des champs.\n4. Établir les relations entre les tables.\n5. Exporter la base au format SQL dans le dossier de travail.\n\n### Étape 2 : documents Web\n\nConsignes : les fonctions JavaScript vont dans un nouveau fichier `controles2.js`, les règles CSS dans `styles2.css`, toutes les pages sont liées à `styles2.css`, `croisiere.html` et `reservation.html` sont liées à `controles2.js`, et le bouton « Annuler » de chaque formulaire réinitialise les champs.\n\n**1. Page `index.html`**\n\n- `<header>` : un `<span>` « Marivana Voyages » et une image `navire.png`.\n- `<main>` : une navigation `<nav>` (liens « Album photos » vers `photo.html`, « Nos croisières » vers `croisiere.html`, « Réservation » vers `reservation.html`) et une `<section>` affichant `photo.html` par défaut.\n- Mise en forme : le texte a une marge de 30px en haut et à gauche et une taille de police de 60px ; l'image a des coins arrondis (rayon 50%) ; le texte et l'image ont une transparence de 0.5 et se trouvent sur la même ligne, le texte à 100px du bord gauche de son conteneur et l'image à 100px du bord droit.\n\n**2. Page `photo.html`** (album publicitaire)\n\n- Ajouter à `<figure>` la légende « Avec Marivana Voyages, embarquez pour une aventure inoubliable ! » et un pied de page « Contacts : 82 200 200/ croisiere@maritime.tn ».\n- Au survol, une image est agrandie 2 fois avec une transition de 3 secondes ; le texte du pied de page et la figure sont centrés ; le texte du pied de page a une ombre `#FFFFFF` décalée de 5px.\n\n**3. Page `croisiere.html`** : recherche des croisières d'une destination sur une période.\n\n- Le bouton « Chercher » appelle `verif1` et `croisiere.php`. Destinations (attribut `value`) : Alexandrie `1`, Barcelone `2`, Beyrouth `3`. Ajouter trois cases à cocher (Durée, Prix, Capacité) au fieldset « Informations supplémentaires à afficher ».\n- `verif1` : destination obligatoire ; Date 1 strictement supérieure à la date système ; Date 2 strictement supérieure à Date 1.\n- `connexion.php` : à modifier pour établir la connexion au serveur et à la base.\n- `croisiere.php` : inclut `connexion.php` ; affiche « Aucune croisière programmée pour cette période » s'il n'y a aucun résultat, sinon un tableau (Croisière, Navire, Départ, puis Durée, Prix et Capacité seulement si cochées) trié par date de départ croissante. La mise en forme du tableau n'est pas demandée.\n\n**4. Page `reservation.html`**\n\n- Formulaire : type d'identifiant, identifiant, nom et prénom, téléphone (type `tel`), croisière (Eclat méditerranéen `101`, Perle d'Azur `102`, Riviera des Mers `103`), nombre de places de 1 à 10 avec un élément `<output id=\"nb\">` affichant « 1/10 ». Chaque changement du nombre de places appelle `nombres` ; le bouton « Valider » appelle `verif2` et `reservation.php`.\n- `nombres` : affiche dans `nb` la valeur du nombre de places suivie de `/10`.\n- `verif2` : type d'identifiant obligatoire ; identifiant = une lettre suivie de 9 chiffres pour un passeport, 8 chiffres pour un CIN ; nom et prénom = lettres et espaces uniquement, au moins 7 lettres.\n- `reservation.php` : supprime les espaces de début et de fin du nom et met en majuscule la première lettre de chaque mot ; affiche « Réservation déjà faite » si le client a déjà réservé cette croisière ; sinon crée le client s'il n'existe pas, enregistre la réservation (`dateRes` = date et heure système) et affiche « Réservation enregistrée dans l'attente de confirmation ».\n\n---\n\n## Barème Officiel\n\n| Partie        | Critère Évalué                                                                        | Points        |\n| ------------- | ------------------------------------------------------------------------------------- | ------------- |\n| **Étape 1**   | Manipulation de la base de données                                                    | 1,5 pts       |\n| **Étape 2-1** | Page `index.html` : structure (1,5) et mise en forme (1,5)                            | 3 pts         |\n| **Étape 2-2** | Album photos : HTML (0,5) et CSS (1)                                                  | 1,5 pts       |\n| **Étape 2-3** | Recherche : HTML (1,25), `verif1` (1,5), `connexion.php` (0,5), `croisiere.php` (2,5) | 5,75 pts      |\n| **Étape 2-4** | Réservation : HTML (2), `nombres` et `verif2` (2,25), `reservation.php` (4)           | 8,25 pts      |\n| **Total**     | **Note Globale Bac Pratique**                                                         | **20 points** |\n",
    starter: {
      "index.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Marivana Voyages</title>\n    <!-- À compléter : liaison avec styles2.css, header (span + img), main (nav + section) -->\n  </head>\n  <body></body>\n</html>\n',
      "photo.html":
        '<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <title>Album photos</title>\n    <link rel="stylesheet" href="styles2.css" />\n  </head>\n  <body>\n    <figure>\n      <img src="img1.png" class="photo" />\n      <img src="img2.png" class="photo" />\n      <img src="img3.png" class="photo" />\n      <img src="img4.png" class="photo" />\n      <br />\n      <img src="img5.png" class="photo" />\n      <img src="img6.png" class="photo" />\n      <img src="img7.png" class="photo" />\n      <img src="img8.png" class="photo" />\n    </figure>\n  </body>\n</html>\n',
      "croisiere.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Recherche de croisières</title>\n    <link rel="stylesheet" href="styles2.css" />\n    <script src="controles2.js"></script>\n  </head>\n  <body>\n    <form>\n      <!-- appel de la fonction js et du fichier php  -->\n      <fieldset>\n        <legend>Recherche de croisières</legend>\n        <label> Destination : </label>\n        <select>\n          <option selected>Choisir une destination</option>\n          <!-- les destinations  -->\n        </select>\n        <fieldset>\n          <legend>Date de départ entre</legend>\n          <label> Date 1 : </label>\n          <input type="date" id="DD" name="DD" /><br />\n          <label> Date 2 : </label>\n          <input type="date" id="DF" name="DF" /><br />\n        </fieldset>\n        <br />\n        <fieldset>\n          <legend>Informations supplémentaires à afficher</legend>\n          <!-- trois cases à cocher  -->\n        </fieldset>\n        <br />\n        <div>\n          <input type="reset" value="Annuler" />\n          <input type="submit" value="Chercher" />\n        </div>\n      </fieldset>\n    </form>\n  </body>\n</html>\n',
      "reservation.html":
        '<!doctype html>\n<html lang="fr">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Réservation d\'une croisière</title>\n    <!-- À compléter : liaisons avec styles2.css et controles2.js, formulaire de réservation -->\n  </head>\n  <body></body>\n</html>\n',
      "styles2.css":
        "/* Ajouter à partir de la ligne suivante, les règles CSS demandées */\n\n/* Il est conseillé de ne pas modifier les règles CSS ci-après  */\nheader {\n  padding: 10px;\n  height: 150px;\n}\n\nfooter {\n  font-style: italic;\n  font-weight: bold;\n}\n\nbody {\n  background-color: #c6d6eb;\n}\n\nnav {\n  height: 50px;\n}\n\n.photo {\n  height: 140px;\n  width: 200px;\n}\n\nsection {\n  height: 500px;\n}\niframe {\n  width: 100%;\n  height: 500px;\n}\n\na {\n  display: inline-block;\n  border: 3px solid white;\n  background-color: black;\n  width: 32.5%;\n  height: 40px;\n  color: white;\n  padding: 15px 0 0 0;\n}\n\nlabel {\n  display: inline-block;\n  width: 110px;\n}\n",
      "controles2.js":
        "/* Fonctions JavaScript à développer par le candidat : verif1, nombres et verif2 */\n",
      "connexion.php":
        '<?php\n$serveur ="localhost";\n$utilisateur = "root";\n$motdepasse = "";\n$nombase = "";\n\n?>',
      "croisiere.php":
        "<?php\n// Recherche des croisières par destination et période\n// À compléter par le candidat (inclure connexion.php)\n?>\n",
      "reservation.php":
        "<?php\n// Réservation d'une croisière\n// À compléter par le candidat (inclure connexion.php)\n?>\n",
      "db/init.sql":
        "-- Base bd2026_croisieres (Bac STI 2026, session de 12h30) : Marivana Voyages\n-- Version complète : tables fournies + relations + table reservation.\n\nCREATE TABLE `navire` (\n  `idNav` varchar(3) NOT NULL,\n  `nomNav` varchar(100) DEFAULT NULL,\n  `capacite` int NOT NULL,\n  PRIMARY KEY (`idNav`),\n  UNIQUE KEY `nomNav` (`nomNav`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\nINSERT INTO `navire` (`idNav`, `nomNav`, `capacite`) VALUES\n('1', 'Tanit', 3200);\nINSERT INTO `navire` (`idNav`, `nomNav`, `capacite`) VALUES\n('2', 'Carthage', 2208);\n\nCREATE TABLE `destination` (\n  `idDes` int NOT NULL,\n  `nomDes` varchar(100) NOT NULL,\n  PRIMARY KEY (`idDes`),\n  UNIQUE KEY `nomDes` (`nomDes`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\nINSERT INTO `destination` (`idDes`, `nomDes`) VALUES\n(1, 'Alexandrie');\nINSERT INTO `destination` (`idDes`, `nomDes`) VALUES\n(2, 'Barcelone');\nINSERT INTO `destination` (`idDes`, `nomDes`) VALUES\n(3, 'Beyrouth');\n\nCREATE TABLE `croisiere` (\n  `idCro` varchar(5) NOT NULL,\n  `libCro` varchar(100) NOT NULL,\n  `duree` int NOT NULL,\n  `prix` int NOT NULL,\n  `dateDepart` date NOT NULL,\n  `idDes` int NOT NULL,\n  `idNav` varchar(3) NOT NULL,\n  PRIMARY KEY (`idCro`),\n  UNIQUE KEY `libCro` (`libCro`),\n  CONSTRAINT `fk_croisiere_destination` FOREIGN KEY (`idDes`) REFERENCES `destination` (`idDes`),\n  CONSTRAINT `fk_croisiere_navire` FOREIGN KEY (`idNav`) REFERENCES `navire` (`idNav`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\nINSERT INTO `croisiere` (`idCro`, `libCro`, `duree`, `prix`, `dateDepart`, `idDes`, `idNav`) VALUES\n('101', 'Eclat méditerranéen', 3, 1200, '2026-05-18', 1, '1');\nINSERT INTO `croisiere` (`idCro`, `libCro`, `duree`, `prix`, `dateDepart`, `idDes`, `idNav`) VALUES\n('102', 'Perle d’Azur', 5, 2000, '2026-05-16', 3, '2');\nINSERT INTO `croisiere` (`idCro`, `libCro`, `duree`, `prix`, `dateDepart`, `idDes`, `idNav`) VALUES\n('103', 'Riviera des Mers', 5, 3000, '2026-05-17', 2, '1');\nINSERT INTO `croisiere` (`idCro`, `libCro`, `duree`, `prix`, `dateDepart`, `idDes`, `idNav`) VALUES\n('104', 'Nil et Delta', 4, 1500, '2026-06-20', 1, '2');\n\nCREATE TABLE `client` (\n  `idCl` varchar(10) NOT NULL,\n  `nomCl` varchar(100) NOT NULL,\n  `telCl` int NOT NULL,\n  PRIMARY KEY (`idCl`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\nINSERT INTO `client` (`idCl`, `nomCl`, `telCl`) VALUES\n('01234567', 'Najla Soussi', 99998888);\nINSERT INTO `client` (`idCl`, `nomCl`, `telCl`) VALUES\n('A123456789', 'Kamel Nebli', 22111222);\n\nCREATE TABLE `reservation` (\n  `idCl` varchar(10) NOT NULL,\n  `idCro` varchar(5) NOT NULL,\n  `dateRes` datetime NOT NULL,\n  `nbPlace` int NOT NULL,\n  PRIMARY KEY (`idCl`, `idCro`),\n  CONSTRAINT `fk_reservation_client` FOREIGN KEY (`idCl`) REFERENCES `client` (`idCl`),\n  CONSTRAINT `fk_reservation_croisiere` FOREIGN KEY (`idCro`) REFERENCES `croisiere` (`idCro`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n-- Jeu d'essai\nINSERT INTO `reservation` (`idCl`, `idCro`, `dateRes`, `nbPlace`) VALUES\n('01234567', '101', '2026-05-10 11:00:00', 2);\n",
    },
    hints: [
      "Consultez l'énoncé officiel et les consignes du sujet : Bac 2026 - Croisières Marivana Voyages (Session de 12h30).",
      "Respectez strictement les noms de fichiers, de champs et de fonctions demandés : index.html, photo.html, croisiere.html, reservation.html, styles2.css, controles2.js, connexion.php, croisiere.php, reservation.php.",
      "Vérifiez les messages affichés et les cas limites (valeurs vides, doublons, identifiants inexistants).",
    ],
    rawCriteria: [
      {
        id: "EX26C-01",
        code: "BD-01",
        titre: "Base de données : table reservation et relations",
        description:
          "La table reservation est créée conformément à la description (clé primaire composée) et les relations entre les tables sont établies, puis la base est exportée.",
        points: 1.5,
        ordre: 1,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "La table reservation, sa clé primaire ou les clés étrangères entre les tables sont absentes ou incorrectes.",
      },
      {
        id: "EX26C-02",
        code: "HTML-01",
        titre: "Page index : en-tête, navigation et zone d'affichage",
        description:
          "index.html contient le span « Marivana Voyages », l'image navire.png, la navigation avec trois liens et la section qui affiche photo.html par défaut.",
        points: 1.5,
        ordre: 2,
        sonde: {
          type: "dom_selector",
          selector: 'header span, header img[src="navire.png"], main nav a, main section',
          minCount: 6,
        },
        fail_message:
          "La structure de index.html (span, image navire.png, nav avec 3 liens, section) est incomplète.",
      },
      {
        id: "EX26C-03",
        code: "CSS-01",
        titre: "Mise en forme de l'en-tête",
        description:
          "Le texte a une marge de 30px en haut et à gauche et une police de 60px ; l'image a des coins arrondis à 50% ; texte et image ont une transparence de 0.5 et se trouvent sur la même ligne (texte à 100px du bord gauche, image à 100px du bord droit).",
        points: 1.5,
        ordre: 3,
        sonde: {
          type: "css_property",
          selector: "header img",
          property: "opacity",
          expectedValue: "0.5",
        },
        fail_message:
          "Une des règles CSS de l'en-tête (marge, police, arrondi, transparence, disposition) est absente ou incorrecte.",
      },
      {
        id: "EX26C-04",
        code: "HTML-02",
        titre: "Page photo.html : légende et pied de page",
        description:
          "L'élément figure contient une légende figcaption avec le texte demandé et la page contient un pied de page avec les contacts.",
        points: 0.5,
        ordre: 4,
        sonde: {
          type: "dom_selector",
          selector: "figure figcaption, footer",
          minCount: 2,
        },
        fail_message:
          "photo.html ne contient pas la légende de figure ou le pied de page demandés.",
      },
      {
        id: "EX26C-05",
        code: "CSS-02",
        titre: "Effet de survol des photos et mise en forme du pied de page",
        description:
          "Au survol, les images sont agrandies deux fois avec une transition de 3 secondes ; le pied de page et la figure sont centrés ; le texte du pied de page a une ombre #FFFFFF de 5px.",
        points: 1,
        ordre: 5,
        sonde: {
          type: "css_property",
          selector: "footer",
          property: "text-align",
          expectedValue: "center",
        },
        fail_message:
          "Le survol des images (scale 2, transition 3s) ou la mise en forme du pied de page ne respecte pas l'énoncé.",
      },
      {
        id: "EX26C-06",
        code: "HTML-03",
        titre: "Page croisiere.html : destinations, cases à cocher, appels",
        description:
          "Le formulaire appelle verif1 et croisiere.php, la liste contient Alexandrie (1), Barcelone (2) et Beyrouth (3) et le fieldset contient trois cases à cocher.",
        points: 1.25,
        ordre: 6,
        sonde: {
          type: "dom_selector",
          selector:
            'form[action="croisiere.php"][onsubmit*="verif1"] select option[value="1"], option[value="2"], option[value="3"], input[type="checkbox"]',
          minCount: 6,
        },
        fail_message:
          "croisiere.html : destinations, trois cases à cocher ou appel de verif1 / croisiere.php manquants.",
      },
      {
        id: "EX26C-07",
        code: "JS-01",
        titre: "Fonction verif1 : destination et dates",
        description:
          "verif1 impose une destination, une Date 1 strictement supérieure à la date système et une Date 2 strictement supérieure à la Date 1.",
        points: 1.5,
        ordre: 7,
        sonde: {
          type: "js_eval",
          checkSelector: "#DD",
        },
        fail_message:
          "verif1 ne contrôle pas la destination ou l'ordre des dates (Date 1 > aujourd'hui, Date 2 > Date 1).",
      },
      {
        id: "EX26C-08",
        code: "PHP-01",
        titre: "connexion.php : connexion au serveur et à la base",
        description:
          "Le fichier établit la connexion avec mysqli_connect en renseignant le nom de la base.",
        points: 0.5,
        ordre: 8,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message: "connexion.php n'établit pas la connexion à la base de données.",
      },
      {
        id: "EX26C-09",
        code: "PHP-02",
        titre: "croisiere.php : recherche, tri et informations supplémentaires",
        description:
          "Le script inclut connexion.php, affiche le message d'absence de croisière ou un tableau trié par date de départ croissante, avec les colonnes Durée, Prix et Capacité uniquement si elles sont cochées.",
        points: 2.5,
        ordre: 9,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "croisiere.php ne filtre pas sur la destination et la période, ne trie pas par date ou n'affiche pas les colonnes optionnelles correctement.",
      },
      {
        id: "EX26C-10",
        code: "HTML-04",
        titre: "Page reservation.html : formulaire de réservation",
        description:
          "Le formulaire contient le type d'identifiant, l'identifiant, le nom, un téléphone de type tel, la liste des croisières (101, 102, 103), un nombre de places de 1 à 10, un élément output d'identifiant nb, et appelle nombres, verif2 et reservation.php.",
        points: 2,
        ordre: 10,
        sonde: {
          type: "dom_selector",
          selector:
            'form[action="reservation.php"][onsubmit*="verif2"] input[type="tel"], option[value="101"], option[value="102"], option[value="103"], output#nb, input[name="nbPlace"][min="1"][max="10"][onchange*="nombres"]',
          minCount: 6,
        },
        fail_message:
          "reservation.html : champ tel, croisières, nombre de places 1 à 10, output nb ou appels de nombres / verif2 / reservation.php manquants.",
      },
      {
        id: "EX26C-11",
        code: "JS-02",
        titre: "Fonctions nombres et verif2",
        description:
          "nombres affiche la valeur suivie de /10 dans l'élément nb ; verif2 impose un type d'identifiant, un identifiant adapté (lettre + 9 chiffres pour un passeport, 8 chiffres pour un CIN) et un nom d'au moins 7 lettres.",
        points: 2.25,
        ordre: 11,
        sonde: {
          type: "js_eval",
          checkSelector: "#nb",
        },
        fail_message:
          "nombres n'affiche pas la valeur suivie de /10 ou verif2 ne contrôle pas correctement l'identifiant ou le nom.",
      },
      {
        id: "EX26C-12",
        code: "PHP-03",
        titre: "reservation.php : nettoyage du nom, doublon, client, réservation",
        description:
          "Le script nettoie le nom (espaces et majuscules), refuse une réservation déjà faite, crée le client s'il n'existe pas, enregistre la réservation avec la date et l'heure système et affiche le message de confirmation.",
        points: 4,
        ordre: 12,
        sonde: {
          type: "dom_selector",
          selector: "body",
        },
        fail_message:
          "reservation.php ne gère pas correctement le nettoyage du nom, le doublon de réservation, la création du client ou l'insertion avec dateRes.",
      },
    ],
  },
];

export const contentSubjects: SubjectContentItem[] = rawSubjects.map((item) => ({
  id: item.id,
  title: item.title,
  level: item.level as "Facile" | "Moyen" | "Difficile",
  competence: item.competence,
  module: item.module,
  dureeMinutes: item.dureeMinutes,
  tags: item.tags,
  examMode: item.examMode,
  bareme: item.bareme,
  statement: item.statement,
  enonceMarkdown: item.enonceMarkdown,
  starter: item.starter,
  hints: item.hints,
  criteria: item.rawCriteria.map((c: RawCriterion) => ({
    id: (c.id as string) || (c.code as string) || "crit",
    label: (c.titre as string) || (c.label as string) || "Critère",
    points: c.points,
    fail: (c.fail_message as string) || (c.fail as string) || "Critère non satisfait",
    check: makeProbeCheck(c.sonde || c),
  })),
}));
