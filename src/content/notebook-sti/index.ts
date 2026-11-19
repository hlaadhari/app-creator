import { MEMENTO_CARDS } from "@/content/mementos";

/**
 * Ressources Pédagogiques du Carnet "STI-BAC INFO" (Programme Officiel 4ème STI)
 *
 * Contient :
 * 1. Les 10 capsules vidéo/audio interactives par chapitre et annales Bac (2023–2025 & Annales Blanches 2026)
 * 2. Les jeux de Flashcards de révision rapide (BDR, contraintes, HTML5, CSS3, JS, MySQLi)
 * 3. Les Quiz interactifs de validation de fin de chapitre
 * 4. La base de connaissances indexée pour le Tuteur IA du module /cours
 */

export type NotebookCategoryId = "html5" | "css3" | "js" | "php" | "sql" | "annales";

export interface VideoChapterSlide {
  timestamp: string;
  seconds: number;
  title: string;
  narration: string;
  codeSlide?:
    | {
        language: "html" | "css" | "javascript" | "php" | "sql";
        caption: string;
        code: string;
      }
    | undefined;
}

export interface NotebookVideoCapsule {
  id: string;
  moduleId: NotebookCategoryId;
  title: string;
  subtitle: string;
  duration: string;
  durationSeconds: number;
  badge: string;
  notebookRef: string;
  summary: string;
  keyTakeaways: string[];
  relatedSubjectId?: string | undefined;
  videoUrl?: string | undefined;
  chapters: VideoChapterSlide[];
}

export interface NotebookFlashcard {
  id: string;
  moduleId: NotebookCategoryId;
  tag: string;
  question: string;
  answer: string;
  codeExample?: string | undefined;
  difficulty: "Essentiel" | "Piège Bac" | "Avancé";
}

export interface NotebookQuizQuestion {
  id: string;
  moduleId: NotebookCategoryId;
  question: string;
  codeContext?: string | undefined;
  options: string[];
  correctIndex: number;
  explanation: string;
  notebookSource: string;
}

export interface NotebookKnowledgeSource {
  id: string;
  moduleId: NotebookCategoryId;
  title: string;
  sourceRef: string;
  keywords: string[];
  answer: string;
  codeSnippet?: string | undefined;
  followUps: string[];
  isFallback?: boolean | undefined;
}

/**
 * 1. LES 10 CAPSULES VIDÉO DU CARNET "STI-BAC INFO"
 */
export const NOTEBOOK_VIDEOS: NotebookVideoCapsule[] = [
  {
    id: "vid-html5-formulaires",
    moduleId: "html5",
    title: "Maitriser HTML5 & Formulaires",
    subtitle: "Structure sémantique, attributs name/id et liaison onsubmit avec JavaScript et PHP",
    duration: "06:45",
    durationSeconds: 405,
    badge: "Capsule #1 • HTML5",
    notebookRef: "Carnet STI-BAC INFO • Sources #1 à #42",
    summary:
      "Cette capsule détaille l'architecture complète d'un formulaire d'examen Bac STI : le rôle de l'attribut action vers le script PHP, method=\"post\", le déclencheur onsubmit=\"return verif();\" et la double identification obligatoire id (pour JS) + name (pour $_POST).",
    keyTakeaways: [
      'Toujours écrire onsubmit="return verif();" dans la balise <form> pour pouvoir bloquer l\'envoi.',
      "Chaque champ (<input>, <select>, <textarea>) doit posséder un id (pour document.getElementById) ET un name (pour $_POST).",
      "Les boutons radio d'un même choix partagent le même attribut name mais ont chacun un id distinct.",
      'L\'attribut target="cadre" dans un lien <a> ou un <form> permet de charger la cible dans un <iframe name="cadre">.',
    ],
    chapters: [
      {
        timestamp: "00:00",
        seconds: 0,
        title: "1. Squelette HTML5 & Inclusion des Ressources",
        narration:
          'Au Bac STI, toute page commence par <!DOCTYPE html>, l\'encodage UTF-8, le lien vers mesStyles.css avec <link rel="stylesheet"> et l\'inclusion de controle.js avec <script src="controle.js"></script>.',
        codeSlide: {
          language: "html",
          caption: "En-tête normalisé d'une page d'examen Bac STI",
          code: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Examen Bac STI</title>
  <link rel="stylesheet" href="mesStyles.css">
  <script src="controle.js"></script>
</head>`,
        },
      },
      {
        timestamp: "02:15",
        seconds: 135,
        title: "2. La Balise <form> et le Mécanisme onsubmit",
        narration:
          'La balise <form> relie le client au serveur : action pointe vers le fichier PHP cible, method="post" transmet les valeurs dans $_POST, et onsubmit="return verif();" interrompt l\'envoi si verif() retourne false.',
        codeSlide: {
          language: "html",
          caption: "Déclaration canonique du formulaire",
          code: `<form action="enregistrement.php" method="post" onsubmit="return verif();">
  <fieldset>
    <legend>Identification Client</legend>
    <label for="cin">N° CIN :</label>
    <input type="text" id="cin" name="cin" maxlength="8">
  </fieldset>
</form>`,
        },
      },
      {
        timestamp: "04:30",
        seconds: 270,
        title: "3. Listes déroulantes, Boutons Radio et Iframes",
        narration:
          'Pour une liste <select>, la première <option value="0"> sert d\'invite de choix. Pour les boutons radio, le même attribut name regroupe les choix mutuellement exclusifs.',
        codeSlide: {
          language: "html",
          caption: "Contrôles de sélection et boutons d'action",
          code: `<select id="cat" name="cat">
  <option value="0">-- Choisir une catégorie --</option>
  <option value="1">Traditionnel</option>
</select>

<input type="radio" id="dispO" name="disp" value="O"> Oui
<input type="radio" id="dispN" name="disp" value="N"> Non

<input type="submit" value="Ajouter">
<input type="reset" value="Annuler">`,
        },
      },
    ],
  },
  {
    id: "vid-css3-architecte",
    moduleId: "css3",
    title: "Architecte Web: CSS3 Bac",
    subtitle: "Sélecteurs (.classe, #id), Modèle de Boîte (Box Model) et alignement inline-block",
    duration: "05:50",
    durationSeconds: 350,
    badge: "Capsule #2 • CSS3",
    notebookRef: "Carnet STI-BAC INFO • Sources #43 à #78",
    summary:
      "Maîtrisez les règles CSS3 exigées dans mesStyles.css : la différence entre classe (.L1) et identifiant (#titre), les propriétés du modèle de boîte (width, padding, border, margin) et l'astuce indispensable display: inline-block sur les balises <label>.",
    keyTakeaways: [
      "Une balise <label> est de type inline par défaut : il faut display: inline-block; pour que width: 180px; fonctionne.",
      "Pour centrer horizontalement un bloc (form, fieldset, table) ayant une largeur fixe, utilisez margin: 0 auto;.",
      "Respectez scrupuleusement la casse des sélecteurs (.L1 ≠ .l1) et les unités (px, %, em, rem).",
    ],
    chapters: [
      {
        timestamp: "00:00",
        seconds: 0,
        title: "1. Sélecteurs de Balise, Classe et ID",
        narration:
          "Dans mesStyles.css, un nom de balise cible tous les éléments de ce type (fieldset, label), un point cible une classe (.L1), et un dièse cible un identifiant unique (#titre).",
        codeSlide: {
          language: "css",
          caption: "Les 3 sélecteurs fondamentaux au Bac STI",
          code: `#titre {
  text-align: center;
  color: #1e3a8a;
  text-transform: uppercase;
}

.L1 {
  font-weight: bold;
  background-color: #f1f5f9;
}`,
        },
      },
      {
        timestamp: "02:30",
        seconds: 150,
        title: "2. Modèle de Boîte & Alignement des Formulaires",
        narration:
          "Pour aligner proprement les étiquettes et les champs de saisie comme sur la capture d'écran du sujet, appliquez display: inline-block et une largeur fixe aux balises label.",
        codeSlide: {
          language: "css",
          caption: "Alignement des labels et centrage du formulaire",
          code: `form {
  width: 560px;
  margin: 20px auto;
  padding: 16px;
  border: 2px solid #334155;
  border-radius: 10px;
}

label {
  display: inline-block;
  width: 180px;
  margin-bottom: 10px;
}`,
        },
      },
    ],
  },
  {
    id: "vid-css3-maitriser",
    moduleId: "css3",
    title: "Maitriser CSS3",
    subtitle: "Hiérarchie des sélecteurs, propriétés d'affichage et pièges d'examen Bac STI",
    duration: "06:15",
    durationSeconds: 375,
    badge: "Capsule #3 • CSS3",
    notebookRef: "Carnet STI-BAC INFO • Sources #60 à #78",
    summary:
      "Approfondissement des règles de priorité des sélecteurs (#id > .classe > balise), gestion fine de l'affichage (inline, block, inline-block), mise en forme des tableaux (border-collapse) et pièges classiques de mesStyles.css.",
    keyTakeaways: [
      "Un sélecteur d'identifiant (#titre) est prioritaire sur un sélecteur de classe (.L1), lui-même prioritaire sur un sélecteur de balise.",
      "Pour fusionner les bordures d'un tableau HTML <table>, utilisez border-collapse: collapse;.",
      "Ne confondez pas padding (marge intérieure entre le texte et la bordure) et margin (espace extérieur autour de la boîte).",
    ],
    chapters: [
      {
        timestamp: "00:00",
        seconds: 0,
        title: "1. Hiérarchie des Sélecteurs & Spécificité",
        narration:
          "En CSS3, l'ordre de priorité va de la balise simple (poids 1), à la classe .L1 (poids 10), jusqu'à l'identifiant #titre (poids 100).",
        codeSlide: {
          language: "css",
          caption: "Combinaison de sélecteurs et mise en forme des tableaux",
          code: `table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #334155;
  padding: 8px 12px;
  text-align: center;
}`,
        },
      },
      {
        timestamp: "03:10",
        seconds: 190,
        title: "2. Alignement .L1 / .b1 et Propriétés d'Affichage",
        narration:
          "Les classes .L1 et .b1 utilisées dans les sujets du Bac STI servent à aligner les lignes de formulaire et styliser les boutons d'envoi et d'annulation.",
        codeSlide: {
          language: "css",
          caption: "Classes canoniques .L1 et .b1 d'examen",
          code: `.L1 {
  display: inline-block;
  width: 180px;
  font-weight: bold;
}

.b1 {
  width: 120px;
  padding: 8px;
  border-radius: 6px;
  font-weight: bold;
}`,
        },
      },
    ],
  },
  {
    id: "vid-css3-animations",
    moduleId: "css3",
    title: "Étude de Cas CSS3 : Mise en Forme & Animations",
    subtitle: "Alignement .L1/.b1, effets :hover et transitions transform/opacity",
    duration: "04:40",
    durationSeconds: 280,
    badge: "Capsule #4 • Démo CSS3",
    notebookRef: "Carnet STI-BAC INFO • Sources #79 à #96",
    summary:
      "Démonstration pratique des effets visuels demandés dans les sujets récents (2023–2026) : ombres portées (box-shadow, text-shadow), dégradés linéaires, zoom au survol avec transform: scale() et animation fluide via transition.",
    keyTakeaways: [
      "La propriété transition: transform 0.3s ease; se place sur l'état normal du sélecteur, pas uniquement dans :hover.",
      "transform: scale(1.05) agrandit l'élément de 5 % au survol de la souris.",
      "box-shadow: 0 4px 10px rgba(0,0,0,0.2); crée un relief élégant autour des cadres et boutons.",
    ],
    chapters: [
      {
        timestamp: "00:00",
        seconds: 0,
        title: "1. Ombres portées et Coins arrondis",
        narration:
          "Les propriétés border-radius et box-shadow permettent de moderniser les cadres fieldset et les boutons d'envoi.",
        codeSlide: {
          language: "css",
          caption: "Relief et coins arrondis",
          code: `fieldset {
  border: 1px solid #0284c7;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.15);
  padding: 20px;
}`,
        },
      },
      {
        timestamp: "02:10",
        seconds: 130,
        title: "2. Effet de Survol (:hover) & Transition",
        narration:
          'En combinant transition sur le bouton et transform: scale() sur input[type="submit"]:hover, on obtient l\'effet interactif demandé au barème.',
        codeSlide: {
          language: "css",
          caption: "Animation fluide au survol des boutons et images",
          code: `input[type="submit"], .photo-produit {
  transition: transform 0.3s ease, background-color 0.3s ease;
}

input[type="submit"]:hover {
  transform: scale(1.05);
  background-color: #0369a1;
  cursor: pointer;
}`,
        },
      },
    ],
  },
  {
    id: "vid-js-gardien",
    moduleId: "js",
    title: "JS : Gardien du Formulaire",
    subtitle: "Maîtriser controle.js, l'extraction DOM et les patrons de validation Bac STI",
    duration: "07:20",
    durationSeconds: 440,
    badge: "Capsule #4 • JavaScript",
    notebookRef: "Carnet STI-BAC INFO • Sources #97 à #148",
    summary:
      "Analyse pas-à-pas du fichier controle.js : comment extraire les valeurs du DOM, contrôler un numéro CIN à 8 chiffres (.length, isNaN, premier chiffre '0' ou '1'), vérifier les listes déroulantes (.selectedIndex), les boutons radio (.checked) et les chaînes alphabétiques.",
    keyTakeaways: [
      "Ne jamais oublier return false; juste après alert(...) lorsqu'une condition est invalide.",
      "Un numéro CIN valide a exactement 8 caractères (cin.length === 8), est numérique (!isNaN(cin)) et commence souvent par '0' ou '1'.",
      "Pour une liste déroulante <select>, selectedIndex === 0 indique qu'aucun choix valide n'a été sélectionné.",
      "Pour des boutons radio, si (!r1.checked && !r2.checked), alors aucune option n'est cochée.",
    ],
    chapters: [
      {
        timestamp: "00:00",
        seconds: 0,
        title: "1. Extraction des Valeurs du DOM",
        narration:
          "On utilise document.getElementById('id').value pour les champs texte, .selectedIndex pour les listes déroulantes et .checked pour les cases à cocher ou boutons radio.",
        codeSlide: {
          language: "javascript",
          caption: "Récupération des contrôles dans verif()",
          code: `function verif() {
  var cin = document.getElementById("cin").value;
  var cat = document.getElementById("cat").selectedIndex;
  var rO = document.getElementById("dispO").checked;
  var rN = document.getElementById("dispN").checked;`,
        },
      },
      {
        timestamp: "02:40",
        seconds: 160,
        title: "2. Contrôle du CIN, des Nombres et des Listes",
        narration:
          "Vérifiez la longueur avec .length !== 8, la nature numérique avec isNaN(cin), et l'intervalle d'un entier avec Number(duree) < 1 || Number(duree) > 4.",
        codeSlide: {
          language: "javascript",
          caption: "Validation du CIN et de la liste déroulante",
          code: `  if (cin.length !== 8 || isNaN(cin) || (cin.charAt(0) !== "0" && cin.charAt(0) !== "1")) {
    alert("Le N° CIN doit comporter 8 chiffres commençant par 0 ou 1 !");
    return false;
  }
  if (cat === 0) {
    alert("Veuillez sélectionner une catégorie !");
    return false;
  }`,
        },
      },
      {
        timestamp: "05:10",
        seconds: 310,
        title: "3. Contrôle Alphabétique & Validation Finale",
        narration:
          "Pour vérifier qu'une chaîne ne contient que des lettres, passez-la en majuscules avec .toUpperCase() et testez chaque caractère entre 'A' et 'Z'. Terminez toujours la fonction par return true;.",
        codeSlide: {
          language: "javascript",
          caption: "Fonction auxiliaire alpha() et retour final",
          code: `  if (!rO && !rN) {
    alert("Veuillez choisir la disponibilité !");
    return false;
  }
  return true;
}`,
        },
      },
    ],
  },
  {
    id: "vid-php-mysqli-voyage",
    moduleId: "php",
    title: "PHP & MYSQL : Le Voyage",
    subtitle: "Du formulaire $_POST à l'interfaçage procédural mysqli_* officiel du Bac STI",
    duration: "08:10",
    durationSeconds: 490,
    badge: "Capsule #5 • PHP / MySQLi",
    notebookRef: "Carnet STI-BAC INFO • Sources #149 à #198",
    summary:
      "Suivez le parcours complet d'une requête HTTP POST jusqu'à la base de données MySQL en utilisant exclusivement les fonctions procédurales au programme : mysqli_connect, mysqli_query, mysqli_num_rows, mysqli_fetch_array, mysqli_affected_rows et mysqli_close.",
    keyTakeaways: [
      "Utilisez exclusivement le style procédural mysqli_* (jamais PDO ni $cnx->query).",
      "mysqli_num_rows($res) s'utilise uniquement après un SELECT pour compter les lignes trouvées.",
      "mysqli_affected_rows($cnx) s'utilise après un INSERT, UPDATE ou DELETE pour vérifier l'opération.",
      "Entourez toujours les variables PHP de type chaîne ou date par des apostrophes simples dans la requête SQL : '$cin', '$dateLoc'.",
    ],
    chapters: [
      {
        timestamp: "00:00",
        seconds: 0,
        title: "1. Connexion au SGBD & Récupération $_POST",
        narration:
          'Le script commence par ouvrir la connexion avec mysqli_connect("localhost", "root", "", "bd_examen") puis récupère les champs du formulaire via $_POST[\'nom_champ\'].',
        codeSlide: {
          language: "php",
          caption: "Connexion MySQLi et extraction des données POST",
          code: `<?php
$cnx = mysqli_connect("localhost", "root", "", "bd_bac")
       or die("Erreur de connexion : " . mysqli_connect_error());

$cin     = $_POST["cin"];
$codehab = $_POST["codehab"];
$duree   = $_POST["duree"];
$dateloc = date("Y-m-d");`,
        },
      },
      {
        timestamp: "03:00",
        seconds: 180,
        title: "2. Vérification d'Existence avec SELECT & mysqli_num_rows",
        narration:
          "Avant d'insérer une location ou une réservation, on interroge la base avec SELECT et on inspecte mysqli_num_rows($res) ainsi que l'état de disponibilité via mysqli_fetch_array($res).",
        codeSlide: {
          language: "php",
          caption: "Contrôle métier avant insertion",
          code: `$req1 = "SELECT disponible FROM habit WHERE codehab = $codehab";
$res1 = mysqli_query($cnx, $req1);

if (mysqli_num_rows($res1) == 0) {
    echo "Erreur : Habit inexistant.";
} else {
    $lig = mysqli_fetch_array($res1);
    if ($lig["disponible"] == "N") {
        echo "Erreur : Habit déjà en cours de location.";
    }
}`,
        },
      },
      {
        timestamp: "05:45",
        seconds: 345,
        title: "3. Insertion, Mise à Jour et Affichage HTML",
        narration:
          "Si toutes les conditions sont réunies, on exécute l'INSERT INTO suivi de l'UPDATE, puis on ferme la connexion avec mysqli_close($cnx).",
        codeSlide: {
          language: "php",
          caption: "Enregistrement et mise à jour de l'état",
          code: `$reqIns = "INSERT INTO location (dateloc, codehab, cin, duree)
           VALUES ('$dateloc', $codehab, '$cin', $duree)";
$ok = mysqli_query($cnx, $reqIns);

if ($ok && mysqli_affected_rows($cnx) > 0) {
    mysqli_query($cnx, "UPDATE habit SET disponible = 'N' WHERE codehab = $codehab");
    echo "Location enregistrée avec succès.";
}
mysqli_close($cnx);
?>`,
        },
      },
    ],
  },
  {
    id: "vid-sql-maitriser-bd",
    moduleId: "sql",
    title: "Maitriser BD & SQL",
    subtitle: "Types MySQL, contraintes d'intégrité (PK, FK, CHECK) et requêtes LDD / LMD / LID",
    duration: "07:05",
    durationSeconds: 425,
    badge: "Capsule #6 • BD & SQL",
    notebookRef: "Carnet STI-BAC INFO • Sources #199 à #234",
    summary:
      "Révision complète du langage SQL pour MySQL/MariaDB : création de tables avec clé primaire simple ou composée, clés étrangères avec ON DELETE CASCADE, contraintes CHECK, modifications ALTER TABLE et requêtes d'agrégation GROUP BY / HAVING.",
    keyTakeaways: [
      "Un code composé de chiffres pouvant commencer par 0 (ex: CIN, téléphone) doit être déclaré en CHAR(8) et non en INT.",
      "Une clé primaire composée se déclare en fin de table : PRIMARY KEY (col1, col2).",
      "La clause WHERE filtre les lignes avant regroupement ; la clause HAVING filtre les groupes après GROUP BY sur une fonction d'agrégation (COUNT, SUM, AVG).",
    ],
    chapters: [
      {
        timestamp: "00:00",
        seconds: 0,
        title: "1. Création de Table (LDD) & Contraintes d'Intégrité",
        narration:
          "Lors d'un CREATE TABLE, définissez précisément les types (CHAR, VARCHAR, INT, DECIMAL, DATE) ainsi que les contraintes NOT NULL, DEFAULT, CHECK, PRIMARY KEY et FOREIGN KEY.",
        codeSlide: {
          language: "sql",
          caption: "Table avec clé primaire composée et clés étrangères",
          code: `CREATE TABLE location (
  dateloc DATE NOT NULL,
  numloc INT AUTO_INCREMENT,
  codehab INT NOT NULL,
  cin CHAR(8) NOT NULL,
  duree INT NOT NULL CHECK (duree BETWEEN 1 AND 4),
  PRIMARY KEY (dateloc, numloc),
  FOREIGN KEY (codehab) REFERENCES habit(codehab) ON DELETE CASCADE,
  FOREIGN KEY (cin) REFERENCES client(cin) ON DELETE CASCADE
);`,
        },
      },
      {
        timestamp: "03:30",
        seconds: 210,
        title: "2. Jointures Multi-Tables et Agrégations (LID)",
        narration:
          "Utilisez INNER JOIN ... ON pour relier la clé étrangère à la clé primaire, et GROUP BY accompagné de COUNT() ou SUM() pour les bilans statistiques.",
        codeSlide: {
          language: "sql",
          caption: "Jointure et agrégation avec GROUP BY / HAVING",
          code: `SELECT c.libelle, COUNT(h.codehab) AS nb_habits
FROM categorie c
INNER JOIN habit h ON c.codecat = h.codecat
WHERE h.disponible = 'O'
GROUP BY c.codecat, c.libelle
HAVING COUNT(h.codehab) >= 2
ORDER BY nb_habits DESC;`,
        },
      },
    ],
  },
  {
    id: "vid-annales-bac2025-droits",
    moduleId: "annales",
    title: "Correction Bac 2025 - Droits d'accès",
    subtitle:
      "Corrigé guidé pas-à-pas : gestion des utilisateurs et attribution des droits (lecture, écriture, impression)",
    duration: "09:15",
    durationSeconds: 555,
    badge: "Capsule #7 • Annales 2025",
    notebookRef: "Carnet STI-BAC INFO • Sources #235 à #244 (Session 2025)",
    relatedSubjectId: "exam-bac2025-droits-acces",
    summary:
      "Correction détaillée du sujet officiel Bac STI 2025 (Droits d'accès aux documents partagés) : formulaires utilisateur.html et droit.html, contrôles JavaScript dans mesControles.js et scripts serveur ajout.php, droit.php et affichage.php.",
    keyTakeaways: [
      "Dans mesControles.js, vérifier que l'identifiant utilisateur et le mot de passe respectent les règles de longueur et qu'au moins une case de droit est cochée.",
      "Dans droit.php, convertir l'état des cases à cocher (isset($_POST['lecture']) ? 1 : 0) avant l'insertion ou la mise à jour dans la table des droits.",
      "Dans affichage.php, effectuer une jointure entre les tables utilisateur, document et droit pour afficher le tableau récapitulatif.",
    ],
    chapters: [
      {
        timestamp: "00:00",
        seconds: 0,
        title: "1. Analyse du Schéma BD & Formulaires HTML5",
        narration:
          "Le sujet Bac 2025 s'articule autour de trois tables : utilisateur, document et droit. La page index.html intègre un menu de navigation ciblant un iframe central.",
        codeSlide: {
          language: "html",
          caption: "Formulaire d'attribution des droits (droit.html)",
          code: `<form action="droit.php" method="post" onsubmit="return verifDroit();">
  <label for="iduser">Utilisateur :</label>
  <input type="text" id="iduser" name="iduser">
  <label for="iddoc">Document :</label>
  <select id="iddoc" name="iddoc">
    <option value="0">-- Choisir un document --</option>
  </select>
  <input type="checkbox" id="lec" name="lec" value="1"> Lecture
  <input type="checkbox" id="ecr" name="ecr" value="1"> Écriture
  <input type="submit" value="Valider">
</form>`,
        },
      },
      {
        timestamp: "04:30",
        seconds: 270,
        title: "2. Traitement PHP & Affichage des Droits (droit.php / affichage.php)",
        narration:
          "Côté PHP, on vérifie d'abord l'existence de l'utilisateur dans la base, puis on insère ou met à jour ses droits d'accès sur le document sélectionné.",
        codeSlide: {
          language: "php",
          caption: "Traitement procédural dans droit.php",
          code: `<?php
$cnx = mysqli_connect("localhost", "root", "", "bd_droits");
$iduser = $_POST["iduser"];
$iddoc  = $_POST["iddoc"];
$lec    = isset($_POST["lec"]) ? 1 : 0;
$ecr    = isset($_POST["ecr"]) ? 1 : 0;

$resU = mysqli_query($cnx, "SELECT * FROM utilisateur WHERE iduser = '$iduser'");
if (mysqli_num_rows($resU) == 0) {
    echo "Utilisateur non enregistré !";
} else {
    mysqli_query($cnx, "INSERT INTO droit VALUES ('$iduser', $iddoc, $lec, $ecr)");
    echo "Droits attribués avec succès.";
}
?>`,
        },
      },
    ],
  },
  {
    id: "vid-annales-bac2026-aurythia",
    moduleId: "annales",
    title: "Correction Bac 2026 - Bijoux Aurythia",
    subtitle:
      "Corrigé guidé Annale Blanche 2026 (8h30) : ajout de bijou, évaluation d'expert et liste des pièces originales",
    duration: "09:40",
    durationSeconds: 580,
    badge: "Capsule #8 • Annale Blanche 2026",
    notebookRef: "Carnet STI-BAC INFO • Annale Blanche 2026 (Sujet d'entraînement Code Behi)",
    relatedSubjectId: "exam-bac2026-bijoux-aurythia",
    summary:
      "Correction intégrale du sujet d'entraînement type Bac STI 2026 (Bijoux Aurythia) : validation du code bijou et de sa composition dans mesControles.js, insertion dans ajout.php, enregistrement de l'évaluation d'expert dans evaluation.php et consultation filtrée dans liste.php.",
    keyTakeaways: [
      "Vérifier le format du code bijou (lettres majuscules suivies de chiffres) et la positivité du poids/prix dans mesControles.js.",
      "Dans evaluation.php, contrôler que le bijou existe et que l'expert n'a pas déjà évalué ce même bijou avant l'INSERT.",
      "Dans liste.php, utiliser une jointure avec agrégation AVG(note) pour afficher les bijoux originaux et leur note moyenne.",
    ],
    chapters: [
      {
        timestamp: "00:00",
        seconds: 0,
        title: "1. Contrôles JavaScript (mesControles.js)",
        narration:
          "La fonction verifAjout() contrôle le code du bijou, la sélection du matériau principal et la validité numérique du grammage.",
        codeSlide: {
          language: "javascript",
          caption: "Contrôle du code bijou et de la note d'évaluation",
          code: `function verifEval() {
  var codeBijou = document.getElementById("codeb").value;
  var note = Number(document.getElementById("note").value);
  if (codeBijou.length === 0) {
    alert("Veuillez saisir le code du bijou !");
    return false;
  }
  if (isNaN(note) || note < 1 || note > 20) {
    alert("La note d'évaluation doit être comprise entre 1 et 20 !");
    return false;
  }
  return true;
}`,
        },
      },
      {
        timestamp: "04:50",
        seconds: 290,
        title: "2. Évaluation & Liste des Bijoux Originaux (evaluation.php / liste.php)",
        narration:
          "Dans liste.php, on sélectionne les bijoux authentifiés et on génère un tableau HTML5 structuré avec <table>, <thead> et <tbody>.",
        codeSlide: {
          language: "php",
          caption: "Affichage tabulaire dans liste.php",
          code: `<?php
$cnx = mysqli_connect("localhost", "root", "", "bd_aurythia");
$sql = "SELECT b.codeb, b.designation, AVG(e.note) AS moy
        FROM bijou b
        INNER JOIN evaluation e ON b.codeb = e.codeb
        GROUP BY b.codeb, b.designation";
$res = mysqli_query($cnx, $sql);
while ($lig = mysqli_fetch_array($res)) {
    echo "<tr><td>" . $lig["codeb"] . "</td><td>" . $lig["designation"] . "</td><td>" . $lig["moy"] . "</td></tr>";
}
?>`,
        },
      },
    ],
  },
  {
    id: "vid-annales-projet-fullstack",
    moduleId: "annales",
    title: "Projet Web Full-Stack",
    subtitle:
      "Méthodologie complète d'examen : de la création de la BD SQLite/MySQL jusqu'au test de bout en bout",
    duration: "08:30",
    durationSeconds: 510,
    badge: "Capsule #9 • Full-Stack STI",
    notebookRef: "Carnet STI-BAC INFO • Sources #254 à #260 (Méthodologie Générale)",
    relatedSubjectId: "exam-bac2023-location-habits",
    summary:
      "Comment gérer ses 2 heures d'épreuve pratique au Bac STI sans perdre de points : ordre de réalisation recommandé (1. Base de données SQL, 2. Squelette HTML & CSS, 3. Validation JS, 4. Scripts PHP/MySQLi) et liste de contrôle finale.",
    keyTakeaways: [
      "Étape 1 (20 min) : Créer ou compléter la base de données et insérer le jeu d'essai fourni dans l'énoncé.",
      "Étape 2 (30 min) : Construire les pages HTML5 en soignant la correspondance exacte des id et name avec les scripts JS et PHP.",
      "Étape 3 (30 min) : Écrire controle.js et tester chaque cas d'erreur dans le navigateur avant d'attaquer le PHP.",
      "Étape 4 (40 min) : Coder les scripts PHP procéduraux et vérifier l'impact réel dans les tables avec SELECT.",
    ],
    chapters: [
      {
        timestamp: "00:00",
        seconds: 0,
        title: "1. La Règle d'Or de Cohérence des Identifiants",
        narration:
          "90 % des pannes en examen proviennent d'une faute de frappe entre l'attribut id/name du HTML, l'appel getElementById en JS et la clé $_POST en PHP.",
        codeSlide: {
          language: "html",
          caption: "Alignement parfait HTML ↔ JS ↔ PHP ↔ SQL",
          code: `<!-- HTML : id="codehab" et name="codehab" -->
<input type="text" id="codehab" name="codehab">

<!-- JS : document.getElementById("codehab").value -->
<!-- PHP : $_POST["codehab"] -->
<!-- SQL : WHERE codehab = $codehab -->`,
        },
      },
      {
        timestamp: "04:15",
        seconds: 255,
        title: "2. Checklist de Vérification Finale avant Clôture",
        narration:
          "Vérifiez systématiquement : 1) le blocage du formulaire sur saisie erronée, 2) l'absence d'erreur SQL, 3) la mise à jour effective des tables dans l'onglet Base de données.",
        codeSlide: {
          language: "php",
          caption: "Diagnostic rapide d'une requête SQL en cours de test",
          code: `$res = mysqli_query($cnx, $req) or die("Erreur SQL : " . mysqli_error($cnx));`,
        },
      },
    ],
  },
];

/**
 * GUIDE DE RÉVISION SYNTHÉTIQUE - 4ème BAC STI (Carnet STI-BAC INFO)
 */
export interface RevisionGuideSection {
  id: string;
  title: string;
  badge: string;
  goldenRules: string[];
  essentialSyntax: string;
}

export const REVISION_GUIDE_STI: {
  title: string;
  subtitle: string;
  version: string;
  sections: RevisionGuideSection[];
} = {
  title: "Guide de Révision Synthétique - 4ème Bac STI",
  subtitle: "Récapitulatif structuré du programme officiel STI (HTML5, CSS3, JS, PHP, SQL)",
  version: "Édition Examen Pratique STI",
  sections: [
    {
      id: "guide-html",
      title: "1. HTML5 & Formulaires Interactifs",
      badge: "Module 1 • HTML5",
      goldenRules: [
        'Toujours relier la feuille de style (<link rel="stylesheet" href="mesStyles.css">) et le script (<script src="controle.js"></script>).',
        'Toujours écrire onsubmit="return verif();" sur la balise <form action="...php" method="post">.',
        'Doubler systématiquement id="..." (pour JS) et name="..." (pour $_POST en PHP) sur chaque contrôle.',
      ],
      essentialSyntax: `<form action="traitement.php" method="post" onsubmit="return verif();">
  <label for="cin" class="L1">N° CIN :</label>
  <input type="text" id="cin" name="cin" maxlength="8">
  <input type="submit" value="Valider" class="b1">
</form>`,
    },
    {
      id: "guide-css",
      title: "2. CSS3, Box Model & Animations",
      badge: "Module 2 • CSS3",
      goldenRules: [
        "Appliquer display: inline-block; sur les <label> ou la classe .L1 pour que width fonctionne.",
        "Centrer un formulaire ou un tableau de largeur fixe avec margin: 0 auto;.",
        "Placer transition: transform 0.3s ease; sur l'élément normal et transform: scale(1.05); sur :hover.",
      ],
      essentialSyntax: `.L1 { display: inline-block; width: 160px; font-weight: bold; }
form { width: 550px; margin: 20px auto; padding: 15px; border-radius: 10px; }
.b1 { transition: transform 0.3s ease, opacity 0.3s ease; }
.b1:hover { transform: scale(1.05); opacity: 0.95; }`,
    },
    {
      id: "guide-js",
      title: "3. JavaScript Client & Contrôle DOM (controle.js)",
      badge: "Module 3 • JavaScript",
      goldenRules: [
        "Extraire avec document.getElementById('id').value, .selectedIndex (liste) et .checked (radio/checkbox).",
        "Contrôler un CIN de 8 chiffres avec : if (cin.length !== 8 || isNaN(cin)).",
        "Chaque erreur doit déclencher alert('...') suivi immédiatement de return false;.",
      ],
      essentialSyntax: `function verif() {
  var cin = document.getElementById("cin").value;
  var cat = document.getElementById("cat").selectedIndex;
  if (cin.length !== 8 || isNaN(cin)) { alert("CIN invalide"); return false; }
  if (cat === 0) { alert("Choisir une catégorie"); return false; }
  return true;
}`,
    },
    {
      id: "guide-php",
      title: "4. PHP & Interfaçage MySQLi Procédural",
      badge: "Module 4 • PHP / MySQLi",
      goldenRules: [
        "Utiliser exclusivement les fonctions procédurales : mysqli_connect, mysqli_query, mysqli_num_rows, mysqli_fetch_array, mysqli_affected_rows, mysqli_close.",
        "Entourer les chaînes et dates d'apostrophes simples dans la requête SQL : '$cin', '$date'.",
        "Pour une checkbox : $lec = isset($_POST['lec']) ? 1 : 0;.",
      ],
      essentialSyntax: `<?php
$cnx = mysqli_connect("localhost", "root", "", "bd_examen");
$cin = $_POST["cin"];
$res = mysqli_query($cnx, "SELECT * FROM client WHERE cin = '$cin'");
if (mysqli_num_rows($res) == 0) {
    echo "Client inexistant !";
}
mysqli_close($cnx);
?>`,
    },
    {
      id: "guide-sql",
      title: "5. Bases de Données Relationnelles & SQL (MySQL)",
      badge: "Module 5 • BD & SQL",
      goldenRules: [
        "Utiliser CHAR(8) pour le CIN ou le téléphone afin de conserver le 0 initial.",
        "Déclarer une clé primaire composée en fin de table : PRIMARY KEY (col1, col2).",
        "Utiliser WHERE avant GROUP BY, et HAVING après GROUP BY pour filtrer sur COUNT(), SUM() ou AVG().",
      ],
      essentialSyntax: `CREATE TABLE location (
  dateloc DATE NOT NULL,
  numloc INT AUTO_INCREMENT,
  codehab INT NOT NULL,
  cin CHAR(8) NOT NULL,
  PRIMARY KEY (dateloc, numloc),
  FOREIGN KEY (codehab) REFERENCES habit(codehab) ON DELETE CASCADE
);`,
    },
  ],
};

/**
 * Injecte un extrait de code dans le tampon du projet élève SW_<NCIN> (localStorage + presse-papiers)
 */
export function injectSnippetIntoStudentIde(
  code: string,
  targetFile: string = "index.html",
  ncin: string = "NCIN",
): { projectFolder: string; targetFile: string; timestamp: string } {
  const projectFolder = `SW_${ncin}`;
  const payload = {
    projectFolder,
    targetFile,
    code,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("labo_sti_ide_inject", JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
    try {
      void navigator.clipboard?.writeText(code);
    } catch {
      // Ignore clipboard errors in non-secure context
    }
  }

  return {
    projectFolder,
    targetFile,
    timestamp: payload.timestamp,
  };
}

/**
 * 2. CARTES DE RÉVISION RAPIDE (FLASHCARDS DU CARNET "STI-BAC INFO")
 */
export const NOTEBOOK_FLASHCARDS: NotebookFlashcard[] = [
  // HTML5
  {
    id: "fc-html-01",
    moduleId: "html5",
    tag: "Formulaires HTML5",
    difficulty: "Piège Bac",
    question:
      "Pourquoi un champ <input> doit-il obligatoirement posséder à la fois un attribut id et un attribut name au Bac STI ?",
    answer:
      "L'attribut id permet de cibler l'élément côté client en JavaScript avec document.getElementById('id'), tandis que l'attribut name est indispensable côté serveur pour récupérer la valeur dans le tableau superglobal $_POST['name'] en PHP.",
    codeExample: `<input type="text" id="cin" name="cin" maxlength="8">`,
  },
  {
    id: "fc-html-02",
    moduleId: "html5",
    tag: "Validation Client",
    difficulty: "Piège Bac",
    question:
      'Quelle est la différence entre onsubmit="verif();" et onsubmit="return verif();" dans la balise <form> ?',
    answer:
      'Sans le mot-clé return dans onsubmit="return verif();", le formulaire sera envoyé au serveur PHP même si la fonction JavaScript verif() détecte une erreur et renvoie false !',
    codeExample: `<form action="ajout.php" method="post" onsubmit="return verif();">`,
  },
  {
    id: "fc-html-03",
    moduleId: "html5",
    tag: "Navigation & Cadres",
    difficulty: "Essentiel",
    question:
      "Comment ouvrir le résultat d'un lien <a> ou d'un formulaire <form> à l'intérieur d'un cadre <iframe> présent sur la même page ?",
    answer:
      'On donne un attribut name="zone" à la balise <iframe>, puis on ajoute l\'attribut target="zone" sur le lien <a href="..." target="zone"> ou sur le formulaire <form target="zone">.',
    codeExample: `<a href="ajout.html" target="cadre">Ajouter</a>\n<iframe name="cadre" src="accueil.html"></iframe>`,
  },

  // CSS3
  {
    id: "fc-css-01",
    moduleId: "css3",
    tag: "Box Model",
    difficulty: "Piège Bac",
    question:
      "Pourquoi la propriété width: 160px; n'a-t-elle aucun effet sur une balise <label> par défaut ?",
    answer:
      "Parce que <label> est un élément de type inline par défaut. Il faut impérativement lui ajouter display: inline-block; pour pouvoir lui appliquer une largeur fixe (width) et aligner les champs du formulaire.",
    codeExample: `label {\n  display: inline-block;\n  width: 160px;\n}`,
  },
  {
    id: "fc-css-02",
    moduleId: "css3",
    tag: "Sélecteurs CSS3",
    difficulty: "Essentiel",
    question:
      "Quelle est la différence de syntaxe et d'usage entre .L1 et #titre dans une feuille de style CSS3 ?",
    answer:
      '.L1 est un sélecteur de classe (applicable à plusieurs éléments via class="L1"), tandis que #titre est un sélecteur d\'identifiant unique (applicable à un seul élément via id="titre").',
    codeExample: `#titre { text-align: center; }\n.L1 { background-color: #e2e8f0; }`,
  },
  {
    id: "fc-css-03",
    moduleId: "css3",
    tag: "Animations & Transitions",
    difficulty: "Avancé",
    question:
      "Comment réaliser un zoom fluide de 5 % au survol d'un bouton ou d'une image en CSS3 ?",
    answer:
      "On déclare transition: transform 0.3s ease; sur le sélecteur normal, puis transform: scale(1.05); sur le sélecteur avec la pseudo-classe :hover.",
    codeExample: `button { transition: transform 0.3s ease; }\nbutton:hover { transform: scale(1.05); }`,
  },

  // JavaScript
  {
    id: "fc-js-01",
    moduleId: "js",
    tag: "Contrôle CIN",
    difficulty: "Piège Bac",
    question:
      "Quelle condition JavaScript permet de vérifier qu'une chaîne cin contient exactement 8 chiffres ?",
    answer:
      "On vérifie que sa longueur vaut 8 (cin.length === 8) et qu'elle est exclusivement numérique (!isNaN(cin)). En cas d'erreur, on teste : if (cin.length !== 8 || isNaN(cin)).",
    codeExample: `if (cin.length !== 8 || isNaN(cin)) {\n  alert("CIN invalide !");\n  return false;\n}`,
  },
  {
    id: "fc-js-02",
    moduleId: "js",
    tag: "DOM & Listes",
    difficulty: "Essentiel",
    question:
      'Comment vérifier en JavaScript que l\'utilisateur a bien choisi une option dans une liste déroulante <select id="cat"> dont la première option est un titre ?',
    answer:
      "On utilise la propriété .selectedIndex. Si document.getElementById('cat').selectedIndex === 0, l'utilisateur est resté sur l'option par défaut : on affiche une alerte et on retourne false.",
    codeExample: `if (document.getElementById("cat").selectedIndex === 0) {\n  alert("Choisissez une catégorie !");\n  return false;\n}`,
  },
  {
    id: "fc-js-03",
    moduleId: "js",
    tag: "Boutons Radio",
    difficulty: "Essentiel",
    question:
      'Comment contrôler qu\'au moins un bouton radio parmi deux (id="r1" et id="r2") a été coché ?',
    answer:
      "On inspecte la propriété booléenne .checked de chaque bouton : if (!document.getElementById('r1').checked && !document.getElementById('r2').checked) { return false; }.",
    codeExample: `var r1 = document.getElementById("r1").checked;\nvar r2 = document.getElementById("r2").checked;\nif (!r1 && !r2) return false;`,
  },

  // PHP & MySQLi
  {
    id: "fc-php-01",
    moduleId: "php",
    tag: "MySQLi Procédural",
    difficulty: "Piège Bac",
    question:
      "Quelle fonction MySQLi permet de savoir si une requête SELECT a retourné au moins un enregistrement, et laquelle s'utilise après un INSERT/UPDATE ?",
    answer:
      "Après un SELECT, on utilise mysqli_num_rows($res) sur le résultat de la requête. Après un INSERT, UPDATE ou DELETE, on utilise mysqli_affected_rows($cnx) sur l'identifiant de connexion.",
    codeExample: `$res = mysqli_query($cnx, "SELECT * FROM client WHERE cin='$cin'");\nif (mysqli_num_rows($res) == 0) { ... }`,
  },
  {
    id: "fc-php-02",
    moduleId: "php",
    tag: "Lecture des Résultats",
    difficulty: "Essentiel",
    question:
      "Comment parcourir toutes les lignes retournées par une requête SELECT en PHP MySQLi procédural ?",
    answer:
      "On utilise une boucle while ($lig = mysqli_fetch_array($res)) qui extrait chaque ligne sous forme de tableau associatif et indicé jusqu'à épuisement des résultats.",
    codeExample: `while ($lig = mysqli_fetch_array($res)) {\n  echo $lig["nom"] . "<br>";\n}`,
  },
  {
    id: "fc-php-03",
    moduleId: "php",
    tag: "Superglobales & Dates",
    difficulty: "Essentiel",
    question: "Comment récupérer la date système du serveur au format MySQL (AAAA-MM-JJ) en PHP ?",
    answer:
      "Avec la fonction date('Y-m-d') en PHP (ou directement avec la fonction CURDATE() dans la requête SQL).",
    codeExample: `$dateloc = date("Y-m-d");`,
  },

  // BD & SQL
  {
    id: "fc-sql-01",
    moduleId: "sql",
    tag: "Définitions BDR & Types",
    difficulty: "Piège Bac",
    question:
      "Pourquoi le numéro CIN (8 chiffres) ou un numéro de téléphone doit-il être typé CHAR(8) plutôt que INT dans une base de données relationnelle ?",
    answer:
      "Un entier INT supprime les zéros non significatifs en tête (ex: '07451236' deviendrait 7451236, soit 7 caractères). Le type CHAR(8) garantit une chaîne de longueur fixe de 8 caractères conservant le '0' initial.",
    codeExample: `cin CHAR(8) PRIMARY KEY`,
  },
  {
    id: "fc-sql-02",
    moduleId: "sql",
    tag: "Contraintes d'Intégrité",
    difficulty: "Essentiel",
    question:
      "Quelles sont les 6 contraintes d'intégrité fondamentales en SQL au programme du Bac STI ?",
    answer:
      "1. PRIMARY KEY (unicité + non nullité de l'identifiant)\n2. FOREIGN KEY ... REFERENCES (intégrité référentielle)\n3. NOT NULL (valeur obligatoire)\n4. UNIQUE (interdit les doublons)\n5. DEFAULT (valeur par défaut)\n6. CHECK (condition logique de domaine).",
    codeExample: `disponible CHAR(1) DEFAULT 'O' CHECK (disponible IN ('O', 'N'))`,
  },
  {
    id: "fc-sql-03",
    moduleId: "sql",
    tag: "Agrégation SQL",
    difficulty: "Avancé",
    question:
      "Quelle est la différence entre la clause WHERE et la clause HAVING dans une requête SELECT ?",
    answer:
      "WHERE filtre les lignes individuelles AVANT le regroupement GROUP BY (et ne peut pas contenir de fonction d'agrégation). HAVING filtre les groupes APRÈS GROUP BY (ex: HAVING COUNT(*) > 2).",
    codeExample: `SELECT codecat, COUNT(*) FROM habit WHERE disponible='O' GROUP BY codecat HAVING COUNT(*) >= 2;`,
  },
  {
    id: "fc-sql-04",
    moduleId: "sql",
    tag: "Modélisation & Cardinalités",
    difficulty: "Essentiel",
    question:
      "Comment traduit-on une association de cardinalités 1,N (un élève appartient à une section, une section a plusieurs élèves) dans le schéma relationnel ?",
    answer:
      "La clé primaire du côté « 1 » (section) migre comme clé étrangère dans la table du côté « N » (élève). Aucune table supplémentaire n'est créée.",
    codeExample: `eleve(cin, nom, #code_sec)`,
  },
  {
    id: "fc-sql-05",
    moduleId: "sql",
    tag: "Modélisation & N:M",
    difficulty: "Piège Bac",
    question:
      "Que devient une association N:M (un client loue plusieurs habits, un habit est loué par plusieurs clients) ?",
    answer:
      "Elle devient une table à part. Sa clé primaire est composée des clés étrangères des deux tables associées (souvent complétée par la date), avec les attributs propres de l'association.",
    codeExample: `location(#num_cli, #num_hab, date_loc, duree)`,
  },
  {
    id: "fc-sql-06",
    moduleId: "sql",
    tag: "Sous-requêtes",
    difficulty: "Avancé",
    question:
      "Comment sélectionner les élèves dont la section appartient à un ensemble calculé par une autre requête ?",
    answer:
      "On utilise IN avec une sous-requête entre parenthèses : la requête interne renvoie la liste des valeurs, la requête externe filtre dessus.",
    codeExample: `SELECT nom FROM eleve WHERE code_sec IN (SELECT code_sec FROM section WHERE libelle_sec LIKE '%Info%');`,
  },
  {
    id: "fc-sql-07",
    moduleId: "sql",
    tag: "LIKE & jointures externes",
    difficulty: "Piège Bac",
    question:
      "Quels sont les deux jokers de LIKE, et à quoi sert LEFT JOIN par rapport à INNER JOIN ?",
    answer:
      "% remplace n caractères (0 ou plus), _ remplace exactement un caractère. LEFT JOIN conserve toutes les lignes de la table de gauche même sans correspondance (NULL à droite), alors qu'INNER JOIN ne garde que les lignes appariées.",
    codeExample: `SELECT s.libelle_sec, COUNT(e.cin) FROM section s LEFT JOIN eleve e ON e.code_sec = s.code_sec GROUP BY s.code_sec, s.libelle_sec;`,
  },
  {
    id: "fc-sql-08",
    moduleId: "sql",
    tag: "Pourcentage",
    difficulty: "Avancé",
    question: "Comment calculer en SQL le pourcentage d'élèves ayant une moyenne d'au moins 10 ?",
    answer:
      "On rapporte le nombre d'élèves concernés au total : 100 * SUM(moyenne >= 10) / COUNT(*). La condition booléenne vaut 1 ou 0 en MySQL, donc SUM la compte.",
    codeExample: `SELECT ROUND(100 * SUM(moyenne >= 10) / COUNT(*), 1) FROM eleve;`,
  },
  {
    id: "fc-html-04",
    moduleId: "html5",
    tag: "figure, alt et title",
    difficulty: "Piège Bac",
    question:
      "Quelle balise légende une figure, et quelle est la différence entre les attributs alt et title d'une image ?",
    answer:
      "figcaption légende l'élément figure (la légende d'un tableau est caption). alt est la description alternative de l'image (image absente, lecteur d'écran) ; title est l'infobulle affichée au survol.",
    codeExample:
      '<figure>\n  <img src="robot.jpg" alt="Robot humanoïde" title="Notre robot">\n  <figcaption>Figure 1 : le robot</figcaption>\n</figure>',
  },
  {
    id: "fc-html-05",
    moduleId: "html5",
    tag: "range, hr et événements",
    difficulty: "Essentiel",
    question: 'Que permettent input type="range", la balise hr et l\'événement onfocus ?',
    answer:
      "range propose une valeur dans l'intervalle min-max (curseur). hr trace une ligne horizontale de séparation. onfocus se déclenche quand le champ devient actif ; onblur quand il le quitte ; oninput à chaque modification.",
    codeExample: '<input type="range" min="0" max="5" onfocus="aide()">\n<hr>',
  },
  {
    id: "fc-css-04",
    moduleId: "css3",
    tag: "transform",
    difficulty: "Piège Bac",
    question:
      "Quel est l'effet de transform: skew(15deg, 15deg) et en quoi diffère-t-il de rotate(15deg) ?",
    answer:
      "skew incline l'élément selon les axes X et Y (déformation en parallélogramme) ; rotate le fait tourner autour de son centre sans le déformer. Aucun des deux ne le déplace (c'est translate).",
    codeExample: "img { transform: skew(15deg, 15deg); }\nimg.tourne { transform: rotate(15deg); }",
  },
  {
    id: "fc-css-05",
    moduleId: "css3",
    tag: "border-radius et font-weight",
    difficulty: "Essentiel",
    question:
      "Comment obtenir un cercle à partir d'une boîte carrée et comment mettre un texte en gras ?",
    answer:
      "border-radius: 50% arrondit les coins au maximum : un carré devient un cercle. font-weight: bold (ou bolder) met le texte en gras.",
    codeExample: ".pastille { width: 40px; height: 40px; border-radius: 50%; font-weight: bold; }",
  },
  {
    id: "fc-js-04",
    moduleId: "js",
    tag: "indexOf, substr, charAt",
    difficulty: "Piège Bac",
    question:
      "Que renvoient indexOf, substr et charAt, et quelle erreur fréquente commet-on avec substr ?",
    answer:
      "indexOf(texte, départ) renvoie la position de la première occurrence (-1 si absent). substr(début, longueur) extrait une sous-chaîne : le second paramètre est une longueur, pas une position de fin (contrairement à substring). charAt(i) renvoie le caractère d'indice i.",
    codeExample:
      'let ch = "Tech#Robot#2025";\nlet d = ch.indexOf("#", 0);          // 4\nlet f = ch.indexOf("#", d + 1);      // 10\nlet mot = ch.substr(d + 1, f - d - 1); // "Robot"',
  },
  {
    id: "fc-js-05",
    moduleId: "js",
    tag: "innerHTML et toUpperCase",
    difficulty: "Essentiel",
    question:
      "Quelle différence entre innerHTML et value, et comment mettre la première lettre d'une chaîne en majuscule ?",
    answer:
      "innerHTML affecte un contenu HTML à un conteneur (span, div) ; value lit ou écrit le contenu d'un champ de saisie. Pour la majuscule initiale : ch.replace(ch.charAt(0), ch.charAt(0).toUpperCase()).",
    codeExample:
      'document.getElementById("total").innerHTML = "<b>10</b>/20";\nch = ch.replace(ch.charAt(0), ch.charAt(0).toUpperCase());',
  },
  {
    id: "fc-php-04",
    moduleId: "php",
    tag: "(int) et count",
    difficulty: "Piège Bac",
    question: "Que vaut $X après $X = (int) 2.99; et que retourne count($A) ?",
    answer:
      "(int) tronque la partie décimale sans arrondir : $X vaut 2. count($A) retourne le nombre d'éléments du tableau $A.",
    codeExample:
      "$X = (int) 2.99;          // 2\n$A = array(4, 8, 15);\necho count($A);           // 3",
  },
  {
    id: "fc-php-05",
    moduleId: "php",
    tag: "require et str_replace",
    difficulty: "Essentiel",
    question:
      'Que fait require si le fichier est introuvable, et que fait str_replace("_", " ", $nom) ?',
    answer:
      "require provoque une erreur fatale et arrête le script (include ne produit qu'un avertissement). str_replace remplace toutes les occurrences du premier argument par le deuxième dans la chaîne : les underscores deviennent des espaces.",
    codeExample:
      'require("connexion.php");\n$nom = str_replace("_", " ", "Sidi_Salem"); // "Sidi Salem"',
  },

  // Annales
  {
    id: "fc-annales-01",
    moduleId: "annales",
    tag: "Méthode Bac 2025/2026",
    difficulty: "Piège Bac",
    question:
      "Lors d'une opération de location (Bac 2023) ou de réservation (Bac 2026), quelles sont les deux requêtes SQL successives à exécuter après avoir vérifié la disponibilité ?",
    answer:
      "1) Une requête INSERT INTO pour enregistrer la nouvelle location/réservation.\n2) Une requête UPDATE sur la table parente pour mettre à jour l'état (SET disponible='N' ou SET nbplaces = nbplaces - $nb).",
    codeExample: `mysqli_query($cnx, "INSERT INTO location ...");\nmysqli_query($cnx, "UPDATE habit SET disponible='N' WHERE codehab=$codehab");`,
  },
];

/**
 * 3. QUIZ INTERACTIFS DE VALIDATION PAR CHAPITRE
 */
export const NOTEBOOK_QUIZZES: Record<NotebookCategoryId, NotebookQuizQuestion[]> = {
  html5: [
    {
      id: "qz-html-1",
      moduleId: "html5",
      question:
        "Quelle syntaxe exacte de la balise <form> permet d'envoyer les données vers ajout.php en méthode POST uniquement si la fonction JS verif() renvoie true ?",
      options: [
        '<form action="ajout.php" method="post" onsubmit="verif();">',
        '<form action="ajout.php" method="post" onsubmit="return verif();">',
        '<form href="ajout.php" method="post" onclick="return verif();">',
        '<form action="ajout.php" method="get" onsubmit="return verif()">',
      ],
      correctIndex: 1,
      explanation:
        'L\'attribut action indique le script PHP cible, method="post" envoie les données dans $_POST, et onsubmit="return verif();" utilise la valeur de retour booléenne pour autoriser ou bloquer la soumission.',
      notebookSource: "Carnet STI-BAC INFO • Fiche HTML5 & Formulaires (Source #14)",
    },
    {
      id: "qz-html-2",
      moduleId: "html5",
      question:
        "Quel attribut HTML est indispensable sur un champ <input> pour que sa valeur soit accessible via $_POST['cin'] en PHP ?",
      options: ['id="cin"', 'name="cin"', 'value="cin"', 'for="cin"'],
      correctIndex: 1,
      explanation:
        "Le protocole HTTP construit le tableau associatif $_POST à partir de l'attribut name de chaque champ de formulaire (et non de son id).",
      notebookSource: "Carnet STI-BAC INFO • Pièges Fréquents Bac STI (Source #19)",
    },
    {
      id: "qz-html-3",
      moduleId: "html5",
      question:
        "Pour que deux boutons radio permettent un choix exclusif (Oui ou Non), quelle règle doivent-ils respecter ?",
      options: [
        "Avoir le même attribut id et des attributs name différents",
        "Avoir le même attribut name et des attributs id différents",
        "Avoir le même attribut value",
        "Être placés dans deux formulaires <form> distincts",
      ],
      correctIndex: 1,
      explanation:
        "Le navigateur regroupe les boutons radio qui partagent le même attribut name. L'attribut id doit rester unique dans toute la page HTML pour document.getElementById().",
      notebookSource: "Carnet STI-BAC INFO • Contrôles de Formulaire (Source #28)",
    },
    {
      id: "qz-html-annales-1",
      moduleId: "html5",
      question: "À quoi sert la balise figcaption ?",
      options: [
        "À donner un titre à un tableau",
        "À ajouter une légende à un élément figure",
        "À afficher une infobulle au survol d'une image",
        "À définir le texte alternatif d'une image",
      ],
      correctIndex: 1,
      explanation:
        "figcaption est la légende de figure ; la légende d'un tableau est caption et l'infobulle d'une image est l'attribut title.",
      notebookSource: "Annale Bac 2024 contrôle, exercice 1 (exam-bac2024-controle-ecrit)",
    },
  ],
  css3: [
    {
      id: "qz-css-1",
      moduleId: "css3",
      question:
        "Quelle règle CSS3 est obligatoire pour qu'une propriété width: 180px; s'applique effectivement à une balise <label> ?",
      options: [
        "position: relative;",
        "display: inline-block;",
        "text-align: justify;",
        "float: center;",
      ],
      correctIndex: 1,
      explanation:
        "Les éléments inline comme <label> ou <span> ignorent les propriétés width et height tant qu'on ne leur applique pas display: inline-block; ou display: block;.",
      notebookSource: "Carnet STI-BAC INFO • Architecte Web CSS3 (Source #52)",
    },
    {
      id: "qz-css-2",
      moduleId: "css3",
      question:
        "Comment centrer horizontalement un formulaire <form> de largeur width: 500px; au milieu de la page ?",
      options: ["text-align: center;", "margin: 0 auto;", "padding: auto;", "align-items: center;"],
      correctIndex: 1,
      explanation:
        "Sur un élément de type bloc doté d'une largeur explicite (width), des marges latérales automatiques (margin: 0 auto; ou margin: 20px auto;) le centrent horizontalement dans son conteneur.",
      notebookSource: "Carnet STI-BAC INFO • Modèle de Boîte CSS3 (Source #61)",
    },
    {
      id: "qz-css-3",
      moduleId: "css3",
      question:
        "Quelle combinaison CSS3 produit un agrandissement fluide de 10 % lorsqu'on survole un bouton ?",
      options: [
        "button { transition: transform 0.3s; } et button:hover { transform: scale(1.1); }",
        "button:hover { zoom-animation: 110%; }",
        "button { transform: rotate(10deg); }",
        "button:hover { transition: scale(1.1); }",
      ],
      correctIndex: 0,
      explanation:
        "transform: scale(1.1) applique le facteur d'échelle 1.1 (110 %) au survol (:hover), et transition: transform 0.3s adoucit le changement d'état.",
      notebookSource: "Carnet STI-BAC INFO • Étude de Cas CSS3 & Animations (Source #84)",
    },
    {
      id: "qz-css-annales-1",
      moduleId: "css3",
      question:
        "Quel est l'effet de la déclaration transform: skew(15deg, 15deg); appliquée à une image ?",
      options: [
        "Elle déplace l'image de 15 degrés vers la droite et vers le haut",
        "Elle fait tourner l'image de 15 degrés vers la droite",
        "Elle incline l'image selon les axes X et Y",
        "Elle change la casse du texte de l'image",
      ],
      correctIndex: 2,
      explanation:
        "skew incline (déforme) l'élément ; rotate le fait tourner et translate le déplace.",
      notebookSource: "Annale Bac 2024 contrôle, exercice 1 (exam-bac2024-controle-ecrit)",
    },
  ],
  js: [
    {
      id: "qz-js-1",
      moduleId: "js",
      question:
        "Quelle expression booléenne JavaScript détecte qu'un numéro CIN est invalide (ne comporte pas 8 chiffres ou contient des lettres) ?",
      options: [
        "if (cin.size !== 8 && isNaN(cin))",
        "if (cin.length !== 8 || isNaN(cin))",
        "if (length(cin) != 8 || !isNumeric(cin))",
        "if (cin.count !== 8)",
      ],
      correctIndex: 1,
      explanation:
        "En JavaScript, la longueur d'une chaîne s'obtient via la propriété .length et la non-numéricité se teste avec la fonction native isNaN(valeur).",
      notebookSource: "Carnet STI-BAC INFO • JS : Gardien du Formulaire (Source #108)",
    },
    {
      id: "qz-js-2",
      moduleId: "js",
      question:
        "Comment vérifier qu'aucune option valide n'a été choisie dans une liste déroulante <select id=\"habit\"> dont la 1ère option est « Choisir un habit » ?",
      options: [
        'document.getElementById("habit").checked === false',
        'document.getElementById("habit").selectedIndex === 0',
        'document.getElementById("habit").option === 0',
        'document.getElementById("habit").length === 0',
      ],
      correctIndex: 1,
      explanation:
        "La propriété .selectedIndex renvoie l'indice (base 0) de l'option sélectionnée. L'indice 0 correspond à la première option d'invite.",
      notebookSource: "Carnet STI-BAC INFO • Manipulation DOM Client (Source #121)",
    },
    {
      id: "qz-js-3",
      moduleId: "js",
      question:
        "Que doit impérativement retourner la fonction verif() immédiatement après avoir affiché un message alert() signalant une erreur de saisie ?",
      options: ["return 0;", "return false;", "break;", "exit();"],
      correctIndex: 1,
      explanation:
        "L'instruction return false; interrompt l'exécution de verif() et indique à l'événement onsubmit du formulaire d'annuler l'envoi HTTP vers le serveur PHP.",
      notebookSource: "Carnet STI-BAC INFO • Patron Canonique verif() (Source #139)",
    },
    {
      id: "qz-js-annales-1",
      moduleId: "js",
      question:
        'Quelle instruction extrait « Robot » de ch = "Tech#Robot#2025" quand debut vaut 4 et fin vaut 10 ?',
      options: [
        "ch.substr(debut, fin)",
        "ch.substr(debut + 1, fin - debut - 1)",
        "ch.charAt(debut + 1)",
        "ch.indexOf(debut, fin)",
      ],
      correctIndex: 1,
      explanation:
        "substr(début, longueur) : le mot commence après le premier # (debut + 1) et a pour longueur fin - debut - 1 = 5 caractères.",
      notebookSource: "Annale Bac 2024 principale, partie web (exam-bac2024-principale-ecrit)",
    },
  ],
  php: [
    {
      id: "qz-php-1",
      moduleId: "php",
      question:
        "Quelle suite d'appels correspond à la syntaxe officielle PHP MySQLi procédurale exigée au Bac STI pour vérifier si un client existe ?",
      options: [
        '$stmt = $pdo->prepare("SELECT * FROM client WHERE cin=?"); $stmt->execute([$cin]);',
        "$res = mysqli_query($cnx, \"SELECT * FROM client WHERE cin='$cin'\"); if (mysqli_num_rows($res) > 0) { ... }",
        "$res = $cnx->query(\"SELECT * FROM client WHERE cin='$cin'\"); if ($res->num_rows > 0) { ... }",
        "$res = mysql_query(\"SELECT * FROM client WHERE cin='$cin'\");",
      ],
      correctIndex: 1,
      explanation:
        "Seule l'extension procédurale mysqli_* (mysqli_connect, mysqli_query, mysqli_num_rows, mysqli_fetch_array) figure au programme officiel du Bac STI.",
      notebookSource: "Carnet STI-BAC INFO • PHP & MySQL : Le Voyage (Source #162)",
    },
    {
      id: "qz-php-2",
      moduleId: "php",
      question:
        "Dans une requête SQL écrite en PHP, comment passer correctement une variable chaîne $cin (CHAR(8)) et un entier $codehab (INT) ?",
      options: [
        "VALUES ($cin, '$codehab')",
        "VALUES ('$cin', $codehab)",
        "VALUES (cin, codehab)",
        'VALUES ("$cin", "$codehab") sans guillemets autour de la requête',
      ],
      correctIndex: 1,
      explanation:
        "En SQL, les littéraux de type chaîne (CHAR, VARCHAR) et DATE doivent être entourés d'apostrophes simples ('$cin'), tandis que les entiers (INT) s'écrivent directement ($codehab).",
      notebookSource: "Carnet STI-BAC INFO • Syntaxe des Requêtes en PHP (Source #178)",
    },
    {
      id: "qz-php-3",
      moduleId: "php",
      question:
        "Quelle fonction MySQLi retourne le message d'erreur détaillé du SGBD lorsque mysqli_query($cnx, $req) échoue ?",
      options: [
        "mysqli_error($cnx)",
        "mysqli_last_error()",
        "mysqli_Warning($res)",
        "mysqli_status($cnx)",
      ],
      correctIndex: 0,
      explanation:
        "mysqli_error($cnx) renvoie la chaîne descriptive de la dernière erreur survenue sur la connexion $cnx (ex: Violation de clé primaire #1062 ou de clé étrangère #1452).",
      notebookSource: "Carnet STI-BAC INFO • Débogage MySQLi (Source #191)",
    },
    {
      id: "qz-php-annales-1",
      moduleId: "php",
      question: "Que contient $X après l'instruction $X = (int) 2.99; ?",
      options: ["3", "2", "NULL", "2.99"],
      correctIndex: 1,
      explanation:
        "Le transtypage (int) tronque la partie décimale sans arrondir : 2.99 devient 2.",
      notebookSource: "Annale Bac 2024 principale, exercice 1 (exam-bac2024-principale-ecrit)",
    },
  ],
  sql: [
    {
      id: "qz-sql-1",
      moduleId: "sql",
      question:
        "Comment définir une clé primaire composée des colonnes (dateloc, numloc) lors de la création de la table location ?",
      options: [
        "dateloc DATE PRIMARY KEY, numloc INT PRIMARY KEY",
        "PRIMARY KEY (dateloc, numloc) en fin de déclaration CREATE TABLE",
        "COMPOSITE KEY (dateloc, numloc)",
        "UNIQUE KEY (dateloc + numloc)",
      ],
      correctIndex: 1,
      explanation:
        "En SQL, une table ne peut avoir qu'une seule clause PRIMARY KEY. Lorsqu'elle porte sur plusieurs colonnes, on la déclare en contrainte de table : PRIMARY KEY (dateloc, numloc).",
      notebookSource: "Carnet STI-BAC INFO • Maitriser BD & SQL (Source #206)",
    },
    {
      id: "qz-sql-2",
      moduleId: "sql",
      question:
        "Quelle contrainte SQL garantit que la colonne disponible n'accepte que les valeurs 'O' ou 'N' ?",
      options: [
        "FOREIGN KEY (disponible) REFERENCES ('O', 'N')",
        "CHECK (disponible IN ('O', 'N'))",
        "DEFAULT ('O', 'N')",
        "UNIQUE ('O', 'N')",
      ],
      correctIndex: 1,
      explanation:
        "La contrainte de domaine CHECK (condition) vérifie que chaque valeur insérée ou modifiée respecte le prédicat logique spécifié.",
      notebookSource: "Carnet STI-BAC INFO • Contraintes d'Intégrité (Source #215)",
    },
    {
      id: "qz-sql-3",
      moduleId: "sql",
      question:
        "Quelle requête affiche le code des catégories comptant au moins 3 habits disponibles ?",
      options: [
        "SELECT codecat, COUNT(*) FROM habit WHERE disponible='O' AND COUNT(*) >= 3 GROUP BY codecat;",
        "SELECT codecat, COUNT(*) FROM habit WHERE disponible='O' GROUP BY codecat HAVING COUNT(*) >= 3;",
        "SELECT codecat, COUNT(*) FROM habit HAVING disponible='O' AND COUNT(*) >= 3;",
        "SELECT codecat FROM habit ORDER BY COUNT(*) >= 3;",
      ],
      correctIndex: 1,
      explanation:
        "WHERE filtre d'abord les habits disponibles (disponible='O'), GROUP BY regroupe par codecat, et HAVING filtre les groupes sur l'agrégat COUNT(*) >= 3.",
      notebookSource: "Carnet STI-BAC INFO • Agrégations & Groupements (Source #229)",
    },
    {
      id: "qz-sql-4",
      moduleId: "sql",
      question:
        "Dans un schéma relationnel, que devient une association N:M entre client et habit ?",
      options: [
        "Une clé étrangère ajoutée dans client",
        "Une clé étrangère ajoutée dans habit",
        "Une table à part dont la clé primaire est composée des deux clés étrangères",
        "Une contrainte CHECK sur la table client",
      ],
      correctIndex: 2,
      explanation:
        "Une association N:M se traduit toujours par une table dédiée, dont la clé primaire regroupe les clés étrangères des deux tables associées.",
      notebookSource: "Cours BDR & SQL • Modélisation et requêtes avancées",
    },
    {
      id: "qz-sql-5",
      moduleId: "sql",
      question:
        "Quelle requête affiche les élèves des sections dont le libellé contient « Info » ?",
      options: [
        "SELECT nom FROM eleve WHERE code_sec IN (SELECT code_sec FROM section WHERE libelle_sec LIKE '%Info%');",
        "SELECT nom FROM eleve WHERE code_sec = (SELECT libelle_sec FROM section LIKE '%Info%');",
        "SELECT nom FROM eleve HAVING libelle_sec LIKE '%Info%';",
        "SELECT nom FROM eleve WHERE libelle_sec IN 'Info';",
      ],
      correctIndex: 0,
      explanation:
        "La sous-requête renvoie les codes des sections correspondantes ; IN filtre les élèves sur cet ensemble, et % remplace n caractères dans LIKE.",
      notebookSource: "Cours BDR & SQL • Modélisation et requêtes avancées",
    },
    {
      id: "qz-sql-6",
      moduleId: "sql",
      question: "Quelle jointure affiche toutes les sections, y compris celles sans élève ?",
      options: ["INNER JOIN", "section LEFT JOIN eleve", "eleve LEFT JOIN section", "CROSS JOIN"],
      correctIndex: 1,
      explanation:
        "Avec section en table de gauche, LEFT JOIN conserve toutes ses lignes ; les sections sans élève apparaissent avec des valeurs NULL côté élève.",
      notebookSource: "Cours BDR & SQL • Modélisation et requêtes avancées",
    },
    {
      id: "qz-sql-7",
      moduleId: "sql",
      question: "Quelle expression donne le pourcentage d'élèves admis (moyenne >= 10) ?",
      options: [
        "COUNT(moyenne >= 10) / 100",
        "100 * SUM(moyenne >= 10) / COUNT(*)",
        "AVG(moyenne) * 100",
        "SUM(moyenne) / COUNT(*) * 10",
      ],
      correctIndex: 1,
      explanation:
        "La condition vaut 1 ou 0 : SUM compte les admis, COUNT(*) donne le total, et on multiplie par 100 pour obtenir un pourcentage.",
      notebookSource: "Cours BDR & SQL • Modélisation et requêtes avancées",
    },
  ],
  annales: [
    {
      id: "qz-annales-1",
      moduleId: "annales",
      question:
        "Dans le sujet Bac 2023 (Location d'Habits) et Bac 2026 (Croisières Marivana), quelle erreur logique fait perdre des points lors de l'enregistrement en PHP ?",
      options: [
        "Utiliser mysqli_connect() au début du fichier",
        "Insérer la location/réservation sans mettre à jour la disponibilité ou le nombre de places dans la table parente",
        "Fermer la connexion avec mysqli_close($cnx)",
        "Utiliser date('Y-m-d') pour la date du jour",
      ],
      correctIndex: 1,
      explanation:
        "Dans tous les sujets d'examen Bac STI de réservation/location, l'insertion dans la table mouvement (location, reservation) doit obligatoirement être suivie d'un UPDATE sur la table ressource (habit, croisiere).",
      notebookSource: "Carnet STI-BAC INFO • Synthèse des Annales 2023-2026 (Source #258)",
    },
    {
      id: "qz-annales-2",
      moduleId: "annales",
      question:
        'Dans le sujet Bac 2025 (Droits d\'accès), comment récupérer proprement en PHP une case à cocher <input type="checkbox" name="lec" value="1"> qui peut ne pas être cochée ?',
      options: [
        "$lec = $_POST['lec']; (sans vérification)",
        "$lec = isset($_POST['lec']) ? 1 : 0;",
        "$lec = mysqli_num_rows($_POST['lec']);",
        "$lec = $_GET['lec'];",
      ],
      correctIndex: 1,
      explanation:
        "Une case à cocher non cochée n'est pas envoyée dans la requête HTTP POST. Utiliser isset($_POST['lec']) évite une erreur Undefined array key et permet d'attribuer 1 ou 0.",
      notebookSource: "Carnet STI-BAC INFO • Correction Bac 2025 Droits d'accès (Source #241)",
    },
  ],
};

/**
 * 4. BASE DE CONNAISSANCES DU TUTEUR DU COURS (PROGRAMME OFFICIEL 4ème STI)
 */
export const NOTEBOOK_KNOWLEDGE_BASE: NotebookKnowledgeSource[] = [
  {
    id: "kb-html-form",
    moduleId: "html5",
    title: "Formulaires HTML5 & Liaison JS/PHP",
    sourceRef: "Mémento & Cours Officiel STI • Module 1 (HTML5 & Formulaires)",
    keywords: [
      "form",
      "formulaire",
      "onsubmit",
      "input",
      "name",
      "select",
      "radio",
      "checkbox",
      "iframe",
      "target",
      "action",
      "method",
      "label",
      "fieldset",
    ],
    answer:
      'Dans le programme officiel **4ème STI (Module HTML5)**, un formulaire conforme au Bac STI repose sur 3 règles :\n1. **Balise `<form>`** : toujours écrire `<form action="script.php" method="post" onsubmit="return verif();">`.\n2. **Double attribut `id` + `name`** : `id` sert à `document.getElementById()` dans `controle.js`, tandis que `name` alimente `$_POST[\'...\']` en PHP.\n3. **Ciblage d\'iframe** : si la page principale comporte `<iframe name="cadre">`, les liens du menu utilisent `target="cadre"`.',
    codeSnippet: `<form action="location.php" method="post" onsubmit="return verif2();">
  <label for="codehab">Code Habit :</label>
  <input type="number" id="codehab" name="codehab" required>
  <input type="submit" value="Louer">
</form>`,
    followUps: [
      "Comment faire un tableau HTML avec thead et tbody ?",
      "Comment vérifier une liste déroulante <select> en JS ?",
      "Pourquoi faut-il écrire return verif() dans onsubmit ?",
    ],
  },
  {
    id: "kb-html-tableaux",
    moduleId: "html5",
    title: "Tableaux HTML5 : <table>, <thead>, <tbody>, <tr>, <th>, <td>",
    sourceRef: "Mémento & Cours Officiel STI • Module 1 (Tableaux Structurés HTML5)",
    keywords: [
      "tableau",
      "tableaux",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "colspan",
      "rowspan",
      "caption",
      "cellule",
      "ligne",
      "colonne",
    ],
    answer:
      'Pour construire un **tableau HTML5** conforme au programme STI :\n- **`<table>`** enveloppe le tableau et **`<caption>`** définit son titre.\n- **`<thead>`** regroupe la ligne d\'en-tête contenant des cellules **`<th>`** (titres de colonnes en gras et centrés par défaut).\n- **`<tbody>`** contient les lignes de données **`<tr>`**, chacune découpée en cellules **`<td>`**.\n- **`colspan="2"`** fusionne horizontalement 2 colonnes ; **`rowspan="2"`** fusionne verticalement 2 lignes.',
    codeSnippet: `<table border="1">
  <caption>Liste des tarifs</caption>
  <thead>
    <tr><th>Code</th><th>Désignation</th><th>Prix (DT)</th></tr>
  </thead>
  <tbody>
    <tr><td>H01</td><td>Caftan traditionnel</td><td>120</td></tr>
  </tbody>
</table>`,
    followUps: [
      "Comment afficher un tableau HTML dynamiquement en PHP avec while ?",
      "Comment styliser les bordures d'un tableau en CSS avec border-collapse ?",
    ],
  },
  {
    id: "kb-html-liens-mailto",
    moduleId: "html5",
    title: "Liens Hypertextes HTML5 : <a href>, mailto:, tel: et target",
    sourceRef: "Mémento & Cours Officiel STI • Module 1 (Liens & Navigation HTML5)",
    keywords: [
      "lien",
      "liens",
      "href",
      "mailto",
      "mail",
      "email",
      "e-mail",
      "courriel",
      "envoi de mail",
      "ancre",
      "hypertexte",
      "tel",
      "_blank",
    ],
    answer:
      'En **HTML5**, un lien cliquable (y compris pour ouvrir la messagerie) utilise toujours la balise **`<a>`** accompagnée de l\'attribut **`href="..."`** :\n- **Envoi d\'e-mail (`mailto:`)** : `<a href="mailto:adresse@exemple.com">Envoyer un e-mail</a>` (il n\'existe pas de balise `<Mail>` en HTML).\n- **Lien web externe** : `<a href="https://..." target="_blank" rel="noopener noreferrer">Texte</a>`.\n- **Lien interne vers un cadre `<iframe>`** : `<a href="page.html" target="cadre">Ouvrir</a>`.',
    codeSnippet: `<a href="mailto:contact@exemple.tn">Envoyer un mail</a>`,
    followUps: ["Comment cibler un iframe avec target ?", "Comment faire un tableau HTML ?"],
  },
  {
    id: "kb-css-boxmodel",
    moduleId: "css3",
    title: "Modèle de Boîte CSS3, Flexbox, Labels & Transitions",
    sourceRef: "Mémento & Cours Officiel STI • Module 2 (Mise en forme CSS3)",
    keywords: [
      "style",
      "inline-block",
      "margin",
      "padding",
      "border",
      "hover",
      "scale",
      "transition",
      "centrer",
      "box-model",
      "flexbox",
      "display flex",
      "border-collapse",
    ],
    answer:
      "Dans le **Module 2 (CSS3)** du programme STI :\n- **Alignement des `<label>`** : appliquez `display: inline-block; width: 160px;` pour aligner tous les champs de saisie verticalement.\n- **Centrage d'un bloc** : définissez une largeur (`width: 550px;`) puis `margin: 20px auto;`.\n- **Animation au survol** : placez `transition: transform 0.3s ease;` sur l'élément normal et `transform: scale(1.05);` sur `:hover`.",
    codeSnippet: `label {
  display: inline-block;
  width: 160px;
}
input[type="submit"] {
  transition: transform 0.3s ease;
}
input[type="submit"]:hover {
  transform: scale(1.05);
}`,
    followUps: [
      "Quelle est la différence entre .L1 et #titre ?",
      "Comment styliser un champ actif avec la pseudo-classe :focus ?",
    ],
  },
  {
    id: "kb-css-focus-selecteurs",
    moduleId: "css3",
    title: "Sélecteurs CSS3 (.classe, #id) & Pseudo-classes (:focus, :hover)",
    sourceRef: "Mémento & Cours Officiel STI • Module 2 (Sélecteurs & États Interactifs)",
    keywords: [
      "selecteur",
      "classe",
      "identifiant",
      "focus",
      "pseudo-classe",
      "outline",
      "box-shadow",
      "#titre",
      ".l1",
    ],
    answer:
      "En **CSS3 (programme STI)** :\n- **`.classe`** cible tous les éléments portant `class=\"classe\"` (ex. `.L1`), tandis que **`#id`** cible l'unique élément portant `id=\"id\"` (ex. `#titre`).\n- **`:focus`** s'applique lorsqu'un champ `<input>` ou `<select>` reçoit le curseur clavier/souris.\n- **`:hover`** s'applique au survol du pointeur de la souris.",
    codeSnippet: `#titre { text-align: center; text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.25); }
input:focus, select:focus {
  border-color: #2563eb;
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
}`,
    followUps: [
      "Pourquoi width ne fonctionne pas sur un <label> sans inline-block ?",
      "Quelle différence entre skew et rotate en CSS3 ?",
    ],
  },
  {
    id: "kb-js-verif",
    moduleId: "js",
    title: "Validation Client dans controle.js (CIN, Listes, Radio)",
    sourceRef: "Mémento & Cours Officiel STI • Module 3 (Validation DOM JavaScript)",
    keywords: [
      "verif",
      "cin",
      "length",
      "isnan",
      "selectedindex",
      "checked",
      "controle",
      "alert",
      "return false",
      "alpha",
      "chiffres",
      "getelementbyid",
    ],
    answer:
      "Dans le **Module 3 (JavaScript)**, le patron canonique de `verif()` dans `controle.js` vérifie successivement :\n1. **Le numéro CIN (8 chiffres)** : `if (cin.length !== 8 || isNaN(cin) || (cin.charAt(0) !== '0' && cin.charAt(0) !== '1')) { alert('...'); return false; }`\n2. **Les listes `<select>`** : `if (document.getElementById('cat').selectedIndex === 0) { alert('...'); return false; }`\n3. **Les boutons radio** : `if (!r1.checked && !r2.checked) { alert('...'); return false; }`\n4. **Validation finale** : terminer par `return true;`.",
    codeSnippet: `function verif2() {
  var cin = document.getElementById("cin").value;
  var duree = Number(document.getElementById("duree").value);
  if (cin.length !== 8 || isNaN(cin)) {
    alert("Le CIN doit contenir exactement 8 chiffres !");
    return false;
  }
  if (isNaN(duree) || duree < 1 || duree > 4) {
    alert("La durée doit être comprise entre 1 et 4 jours !");
    return false;
  }
  return true;
}`,
    followUps: [
      "Comment fonctionne addEventListener par rapport à onsubmit ?",
      "Comment tester un format avec une expression régulière RegExp ?",
    ],
  },
  {
    id: "kb-js-evenements",
    moduleId: "js",
    title: "Écouteurs d'Événements DOM : addEventListener, submit & preventDefault",
    sourceRef: "Mémento & Cours Officiel STI • Module 3 (Événements DOM & Formulaires)",
    keywords: [
      "addeventlistener",
      "preventdefault",
      "evenement",
      "event",
      "listener",
      "ecouteur",
      "submit",
      "click",
      "change",
      "input",
      "onblur",
    ],
    answer:
      "En **JavaScript DOM**, **`element.addEventListener(type, fonction)`** attache un écouteur d'événement sans modifier le HTML :\n1. **Sur un formulaire (`submit`)** : si une saisie est invalide, appelez **`event.preventDefault()`** pour empêcher l'envoi au serveur PHP.\n2. **Équivalence Bac STI** : `<form onsubmit=\"return verif();\">` avec `return false;` dans `verif()` produit le même blocage que `form.addEventListener('submit', function(e) { if (!verif()) e.preventDefault(); });`.\n3. **Autres événements fréquents** : `'click'` (bouton), `'change'` (liste `<select>`), `'input'` (saisie en direct).",
    codeSnippet: `const form = document.querySelector("form");
form.addEventListener("submit", function (event) {
  if (!verif()) {
    event.preventDefault(); // Bloque l'envoi du formulaire
  }
});`,
    followUps: [
      "Comment contrôler un CIN de 8 chiffres en JS ?",
      "Quelle différence entre getElementById et querySelector ?",
    ],
  },
  {
    id: "kb-js-regex",
    moduleId: "js",
    title: "Expressions Régulières (RegExp) & Sélecteurs querySelector en JS",
    sourceRef: "Mémento & Cours Officiel STI • Module 3 (RegExp & DOM Moderne)",
    keywords: [
      "regex",
      "regexp",
      "expression reguliere",
      "test",
      "queryselector",
      "queryselectorall",
      "motif",
      "alphabetique",
    ],
    answer:
      "En **JavaScript (Module 3)** :\n- **`/motif/.test(chaine)`** renvoie `true` si la chaîne respecte l'expression régulière : par exemple `/^[01][0-9]{7}$/.test(cin)` vérifie un CIN de 8 chiffres commençant par 0 ou 1, et `/^[A-Za-zÀ-ÿ\\s]+$/.test(nom)` vérifie un nom alphabétique.\n- **`document.querySelector(selecteur)`** accepte tout sélecteur CSS (`'#cin'`, `'input[name=\"genre\"]:checked'`, `'.erreur'`).",
    codeSnippet: `const cin = document.querySelector("#cin").value.trim();
if (!/^[01][0-9]{7}$/.test(cin)) {
  alert("CIN invalide : 8 chiffres commençant par 0 ou 1.");
  return false;
}`,
    followUps: [
      "Comment contrôler un CIN sans RegExp avec length et isNaN ?",
      "Comment utiliser addEventListener sur un formulaire ?",
    ],
  },
  {
    id: "kb-php-mysqli",
    moduleId: "php",
    title: "PHP & Interfaçage MySQLi Procédural",
    sourceRef: "Mémento & Cours Officiel STI • Module 4 (PHP & MySQLi Procédural)",
    keywords: [
      "mysqli",
      "mysqli_connect",
      "mysqli_query",
      "mysqli_num_rows",
      "mysqli_fetch_array",
      "mysqli_affected_rows",
      "mysqli_close",
      "connect",
      "query",
      "num_rows",
      "fetch_array",
      "affected_rows",
      "post",
      "pdo",
      "serveur",
    ],
    answer:
      "Dans le programme officiel **4ème STI (Module 4 PHP)**, **seule l'extension MySQLi procédurale** est attendue aux épreuves du Bac STI (`PDO` est hors-programme) :\n1. Connexion : `$cnx = mysqli_connect('localhost', 'root', '', 'bd');`\n2. Contrôle d'existence (`SELECT`) : `$res = mysqli_query($cnx, $sql);` puis `mysqli_num_rows($res)` et `mysqli_fetch_array($res)` (ou `mysqli_fetch_assoc($res)`).\n3. Écriture (`INSERT` / `UPDATE`) : vérifier avec `mysqli_affected_rows($cnx)`.\n4. Fermeture : `mysqli_close($cnx);`.",
    codeSnippet: `$cnx = mysqli_connect("localhost", "root", "", "bd_habits");
$res = mysqli_query($cnx, "SELECT disponible FROM habit WHERE codehab = $codehab");
if (mysqli_num_rows($res) == 0) {
    echo "Erreur : Habit inexistant.";
} else {
    $lig = mysqli_fetch_array($res);
    if ($lig["disponible"] == "N") {
        echo "Erreur : Habit déjà loué.";
    } else {
        mysqli_query($cnx, "INSERT INTO location (dateloc, codehab, cin, duree) VALUES ('$dateloc', $codehab, '$cin', $duree)");
        mysqli_query($cnx, "UPDATE habit SET disponible = 'N' WHERE codehab = $codehab");
        echo "Location effectuée avec succès.";
    }
}`,
    followUps: [
      "Quand utiliser mysqli_num_rows vs mysqli_affected_rows ?",
      "Comment utiliser les sessions PHP ($_SESSION) et sécuriser les entrées ?",
    ],
  },
  {
    id: "kb-php-sessions-securite",
    moduleId: "php",
    title: "Superglobales ($_POST, $_GET, $_SESSION) & Requêtes Préparées MySQLi",
    sourceRef: "Mémento & Cours Officiel STI • Module 4 (Superglobales & Sécurité PHP)",
    keywords: [
      "session",
      "session_start",
      "$_session",
      "$_get",
      "$_post",
      "$_server",
      "superglobale",
      "mysqli_prepare",
      "mysqli_stmt_bind_param",
      "mysqli_real_escape_string",
      "mysqli_fetch_assoc",
      "injection sql",
    ],
    answer:
      "En **PHP (Module 4)** :\n- **Superglobales** : `$_POST` récupère les champs d'un formulaire `method=\"post\"`, `$_GET` lit les paramètres d'URL (`?id=5`), et `$_SESSION` conserve les données utilisateur entre plusieurs pages après un appel obligatoire à **`session_start()`** en tout début de script.\n- **Sécurité SQL** : utilisez `mysqli_real_escape_string($cnx, $val)` ou une requête préparée (`mysqli_prepare` + `mysqli_stmt_bind_param` + `mysqli_stmt_execute`) pour prévenir toute injection SQL.",
    codeSnippet: `<?php
session_start();
$_SESSION["cin_client"] = $_POST["cin"] ?? "";
$stmt = mysqli_prepare($cnx, "SELECT nom FROM client WHERE cin = ?");
mysqli_stmt_bind_param($stmt, "s", $_SESSION["cin_client"]);
mysqli_stmt_execute($stmt);
?>`,
    followUps: [
      "Syntaxe procédurale mysqli_query",
      "Comment récupérer une checkbox en PHP avec isset() ?",
    ],
  },
  {
    id: "kb-sql-cle-etrangere",
    moduleId: "sql",
    title: "Clé Étrangère (FOREIGN KEY ... REFERENCES) & Intégrité Référentielle",
    sourceRef: "Mémento & Cours Officiel STI • Module 5 (Contraintes Référentielles SQL)",
    keywords: [
      "cle etrangere",
      "cles etrangeres",
      "foreign key",
      "references",
      "integrite referentielle",
      "on delete cascade",
      "on update cascade",
      "table parente",
      "table fille",
    ],
    answer:
      "Une **clé étrangère (`FOREIGN KEY`)** est une colonne (ou un groupe de colonnes) d'une table fille qui fait référence à la **clé primaire (`PRIMARY KEY`)** d'une table parente afin de garantir l'**intégrité référentielle** :\n- **Rôle** : elle interdit d'insérer dans la table fille une valeur qui n'existe pas dans la table parente (ex. impossible d'enregistrer une location pour un `cin` absent de la table `client`).\n- **Syntaxe `CREATE TABLE`** : `FOREIGN KEY (cin) REFERENCES client(cin) ON DELETE CASCADE`.\n- **Ajout avec `ALTER TABLE`** : `ALTER TABLE location ADD CONSTRAINT fk_cli FOREIGN KEY (cin) REFERENCES client(cin);`.",
    codeSnippet: `CREATE TABLE location (
  numloc INT PRIMARY KEY AUTO_INCREMENT,
  codehab INT NOT NULL,
  cin CHAR(8) NOT NULL,
  FOREIGN KEY (codehab) REFERENCES habit(codehab) ON DELETE CASCADE,
  FOREIGN KEY (cin) REFERENCES client(cin) ON DELETE CASCADE
);`,
    followUps: [
      "Qu'est-ce qu'une cardinalité (1:N, N:M) en BD ?",
      "Explique la jointure externe LEFT JOIN",
    ],
  },
  {
    id: "kb-sql-cardinalites",
    moduleId: "sql",
    title: "Modélisation Relationnelle : Cardinalités (1:1, 1:N, N:M) & Schéma",
    sourceRef: "Mémento & Cours Officiel STI • Module 5 (Modèle Relationnel & Cardinalités)",
    keywords: [
      "cardinalite",
      "cardinalites",
      "association",
      "1:n",
      "n:m",
      "1..n",
      "0..n",
      "un a plusieurs",
      "plusieurs a plusieurs",
      "entite",
      "modele relationnel",
      "table porteuse",
    ],
    answer:
      "En **conception de base de données relationnelle (Module 5)**, la **cardinalité** indique le nombre minimal et maximal d'occurrences d'une entité participant à une association :\n1. **Relation `1:N` (un-à-plusieurs, ex. `1..1` — `0..N`)** : un client peut passer plusieurs locations, mais une location appartient à un seul client. **Règle de passage** : la clé primaire du côté `1` (`client.cin`) migre comme **clé étrangère** dans la table du côté `N` (`location`).\n2. **Relation `N:M` (plusieurs-à-plusieurs, ex. `0..N` — `0..N`)** : elle se traduit par une **table d'association** (ex. `droit` ou `reservation`) dont la **clé primaire composée** regroupe les clés étrangères des deux tables reliées.",
    codeSnippet: `-- Association 1:N : Categorie (1) <---> (N) Habit
-- La clé primaire codecat migre dans habit comme clé étrangère :
CREATE TABLE habit (
  codehab INT PRIMARY KEY,
  codecat INT NOT NULL,
  FOREIGN KEY (codecat) REFERENCES categorie(codecat)
);`,
    followUps: [
      "C'est quoi une clé étrangère ?",
      "Comment déclarer une clé primaire composée en SQL ?",
    ],
  },
  {
    id: "kb-sql-jointures",
    moduleId: "sql",
    title: "Jointures SQL : INNER JOIN (interne) et LEFT JOIN (jointure externe)",
    sourceRef: "Mémento & Cours Officiel STI • Module 5 (Jointures Multi-Tables)",
    keywords: [
      "jointure",
      "jointures",
      "jointure externe",
      "jointure interne",
      "left join",
      "left outer join",
      "right join",
      "inner join",
      "join",
      "correspondance",
    ],
    answer:
      "En **SQL (Module 5)**, une jointure combine les colonnes de plusieurs tables via la condition `ON tableA.cle = tableB.cle` :\n- **`INNER JOIN` (jointure interne)** : retourne **uniquement** les lignes ayant une correspondance dans les deux tables.\n- **`LEFT JOIN` (jointure externe gauche)** : retourne **toutes les lignes de la table de gauche** (même celles sans correspondance dans la table de droite, dont les colonnes valent alors `NULL`).\n- **Astuce Bac STI** : utilisez `LEFT JOIN ... WHERE tableDroite.cle IS NULL` pour trouver les éléments n'ayant encore aucun enregistrement lié (ex. habits jamais loués) ou `COUNT(tableDroite.cle)` pour afficher `0` au lieu d'exclure la ligne.",
    codeSnippet: `-- Tous les clients, y compris ceux qui n'ont effectué aucune location (nb_loc = 0)
SELECT c.cin, c.nom, COUNT(l.numloc) AS nb_loc
FROM client c
LEFT JOIN location l ON c.cin = l.cin
GROUP BY c.cin, c.nom;`,
    followUps: [
      "Comment écrire une sous-requête avec IN ou NOT IN ?",
      "Comment calculer un pourcentage en SQL ?",
    ],
  },
  {
    id: "kb-sql-sous-requetes",
    moduleId: "sql",
    title: "Sous-Requêtes SQL : IN (SELECT ...), NOT IN et Sous-Requêtes Scalaires",
    sourceRef: "Mémento & Cours Officiel STI • Module 5 (Requêtes Imbriquées SQL)",
    keywords: [
      "sous-requete",
      "sous requete",
      "sous-requetes",
      "requete imbriquee",
      "not in",
      "in (select",
      "in select",
      "scalaire",
      "imbriquee",
      "in",
    ],
    answer:
      "Une **sous-requête (requête imbriquée)** est un `SELECT` placé entre parenthèses à l'intérieur de la clause `WHERE` ou `HAVING` d'une requête principale :\n1. **Sous-requête de liste avec `IN` / `NOT IN`** : teste si une valeur appartient (ou non) à l'ensemble retourné par le sous-`SELECT` (ex. clients n'ayant jamais loué : `WHERE cin NOT IN (SELECT cin FROM location)`).\n2. **Sous-requête scalaire (`=`, `>`, `<`)** : compare une colonne à une valeur unique calculée par `MAX()`, `MIN()` ou `AVG()` (ex. `WHERE prix = (SELECT MAX(prix) FROM habit)`).",
    codeSnippet: `-- Clients n'ayant effectué aucune location (avec sous-requête NOT IN)
SELECT cin, nom, tel
FROM client
WHERE cin NOT IN (SELECT DISTINCT cin FROM location);`,
    followUps: [
      "Quelle différence entre NOT IN et LEFT JOIN ... IS NULL ?",
      "Comment calculer un pourcentage en SQL avec une sous-requête ?",
    ],
  },
  {
    id: "kb-sql-like",
    moduleId: "sql",
    title: "Opérateur SQL LIKE : Filtrage par Motif avec les Jokers % et _",
    sourceRef: "Mémento & Cours Officiel STI • Module 5 (Filtres de Chaînes SQL)",
    keywords: [
      "like",
      "not like",
      "joker",
      "motif",
      "commence par",
      "termine par",
      "contient",
      "%",
    ],
    answer:
      "En **SQL**, l'opérateur **`LIKE`** s'utilise dans la clause `WHERE` pour rechercher un motif dans une colonne texte (`CHAR` ou `VARCHAR`) à l'aide de deux caractères jokers :\n- **`%` (pourcent)** : remplace **zéro, un ou plusieurs** caractères quelconques.\n- **`_` (souligné)** : remplace **exactement un seul** caractère.\n- Exemples : `'A%'` (commence par A), `'%tunis%'` (contient « tunis »), `'_0%'` (2e caractère égal à `0`).",
    codeSnippet: `-- Clients dont le nom commence par 'Ben' et dont le téléphone commence par '9'
SELECT cin, nom, tel
FROM client
WHERE nom LIKE 'Ben%' AND tel LIKE '9_______';`,
    followUps: [
      "Comment filtrer un intervalle avec BETWEEN ... AND ?",
      "Comment utiliser une sous-requête IN en SQL ?",
    ],
  },
  {
    id: "kb-sql-pourcentage",
    moduleId: "sql",
    title: "Calcul de Pourcentage & Fonctions d'Agrégation en SQL (COUNT, SUM, AVG)",
    sourceRef: "Mémento & Cours Officiel STI • Module 5 (Statistiques & Pourcentages SQL)",
    keywords: [
      "pourcentage",
      "pourcent",
      "ratio",
      "proportion",
      "taux",
      "round",
      "avg",
      "sum",
      "count",
      "statistique",
    ],
    answer:
      "Pour calculer un **pourcentage en SQL** (par catégorie ou par rapport au total de la table) :\n1. Multipliez l'agrégat du groupe par **`100.0`** (ou `100`) et divisez-le par une **sous-requête scalaire** comptant le total général : `100.0 * COUNT(*) / (SELECT COUNT(*) FROM table)`.\n2. Vous pouvez arrondir le résultat avec **`ROUND(valeur, 2)`** pour obtenir 2 décimales.\n3. Pour un taux conditionnel dans un même groupe, utilisez `100.0 * SUM(CASE WHEN disponible = 'O' THEN 1 ELSE 0 END) / COUNT(*)`.",
    codeSnippet: `-- Pourcentage d'habits par catégorie par rapport au stock total
SELECT codecat,
       COUNT(*) AS nb_habits,
       ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM habit), 2) AS pourcentage
FROM habit
GROUP BY codecat;`,
    followUps: [
      "Quelle est la différence entre WHERE et HAVING ?",
      "Comment utiliser une sous-requête IN en SQL ?",
    ],
  },
  {
    id: "kb-sql-contraintes",
    moduleId: "sql",
    title: "Contraintes d'Intégrité SQL, Clés Composées & Regroupements (GROUP BY / HAVING)",
    sourceRef: "Mémento & Cours Officiel STI • Module 5 (LDD, Contraintes & Agrégats SQL)",
    keywords: [
      "create table",
      "primary key",
      "cle primaire",
      "cle composee",
      "check",
      "char",
      "varchar",
      "group by",
      "having",
      "cascade",
      "contrainte",
      "alter table",
      "between",
    ],
    answer:
      "Dans le **Module 5 (BD & SQL)** du programme STI :\n- **Clé primaire composée** : se déclare en fin de table via `PRIMARY KEY (col1, col2)`.\n- **Clé étrangère** : `FOREIGN KEY (codehab) REFERENCES habit(codehab) ON DELETE CASCADE`.\n- **Contrainte de domaine** : `CHECK (disponible IN ('O', 'N'))` ou `CHECK (duree BETWEEN 1 AND 4)`.\n- **Regroupement** : `WHERE` filtre les lignes avant `GROUP BY`, tandis que `HAVING` filtre sur le résultat de `COUNT()`, `SUM()` ou `AVG()`.",
    codeSnippet: `CREATE TABLE location (
  dateloc DATE NOT NULL,
  numloc INT AUTO_INCREMENT,
  codehab INT NOT NULL,
  cin CHAR(8) NOT NULL,
  duree INT NOT NULL CHECK (duree BETWEEN 1 AND 4),
  PRIMARY KEY (dateloc, numloc),
  FOREIGN KEY (codehab) REFERENCES habit(codehab),
  FOREIGN KEY (cin) REFERENCES client(cin)
);`,
    followUps: [
      "Pourquoi utiliser CHAR(8) plutôt que INT pour un CIN ?",
      "Comment ajouter une contrainte avec ALTER TABLE ?",
    ],
  },
  {
    id: "kb-annales-2025-2026",
    moduleId: "annales",
    title:
      "Corrigés Bac 2025 (Droits d'accès) & Annales Blanches 2026 (Bijoux Aurythia / Marivana)",
    sourceRef: "Carnet STI-BAC INFO • Annales Officielles 2023–2025 & Annales Blanches 2026",
    keywords: [
      "bac",
      "2025",
      "2026",
      "2023",
      "aurythia",
      "bijoux",
      "droits",
      "marivana",
      "croisiere",
      "annales",
      "correction",
      "corrige",
      "examen",
    ],
    answer:
      "Le module **Annales & Projets Full-Stack** regroupe les corrigés d'épreuves officielles et les sujets blancs :\n- **Bac 2025 officiel (Droits d'accès)** : gestion des cases à cocher (`isset($_POST['lec']) ? 1 : 0`) dans `droit.php` et jointure 3 tables (`utilisateur`, `document`, `droit`) dans `affichage.php`.\n- **Bac 2026 — Annale Blanche (Bijoux Aurythia)** : ajout d'un bijou (`ajout.php`), contrôle de non-duplication d'évaluation par expert (`evaluation.php`) et calcul de moyenne `AVG(note)` (`liste.php`).\n- **Bac 2026 — Annale Blanche (Croisières Marivana)** : contrôle du quota de places (`nbplaces >= $nb`) suivi de `INSERT INTO reservation` et `UPDATE croisiere SET nbplaces = nbplaces - $nb`.",
    codeSnippet: `// Annale Blanche Bac 2026 - Croisières Marivana : décrémentation du quota après réservation
mysqli_query($cnx, "INSERT INTO reservation VALUES ('$numCrois', '$cin', $nbPlaces, '$dateRes')");
mysqli_query($cnx, "UPDATE croisiere SET nbplaces = nbplaces - $nbPlaces WHERE numcrois = '$numCrois'");`,
    followUps: [
      "Explique-moi le corrigé du Bac 2025 Droits d'accès",
      "Explique-moi le corrigé du Bac 2026 Bijoux Aurythia",
      "Quelle est la méthode en 4 étapes le jour de l'examen ?",
    ],
  },
  {
    id: "kb-html-annales",
    moduleId: "html5",
    title: "Notions HTML5 des annales : figcaption, range, hr, alt, title, textarea, oninput",
    sourceRef: "Annales Bac 2023–2025 (HTML5)",
    keywords: [
      "figcaption",
      "range",
      "hr",
      "alt",
      "title",
      "textarea",
      "oninput",
      "onfocus",
      "figure",
    ],
    answer:
      "Notions d'HTML5 fréquentes dans les épreuves écrites et pratiques : **figcaption** (légende de `<figure>`), **alt** (description alternative d'image) et **title** (infobulle au survol), **hr** (ligne de séparation horizontale), **input type=\"range\"** (curseur numérique min-max), **textarea** (zone de saisie multiligne) et les événements **onfocus**, **onblur**, **oninput**.",
    codeSnippet:
      '<figure><img src="robot.jpg" alt="Robot" title="Notre robot"><figcaption>Figure 1</figcaption></figure>\n<input type="range" min="0" max="5"><hr>',
    followUps: ["Quelle différence entre alt et title ?", "Comment faire un tableau HTML ?"],
  },
  {
    id: "kb-css-annales",
    moduleId: "css3",
    title: "Notions CSS3 des annales : skew, rotate, border-radius, font-weight, link",
    sourceRef: "Annales Bac 2023–2025 (CSS3)",
    keywords: [
      "skew",
      "rotate",
      "transform",
      "border-radius",
      "font-weight",
      "link",
      "stylesheet",
      "text-transform",
    ],
    answer:
      'Notions de CSS3 fréquentes : **transform** (`skew` incline, `rotate` tourne, `scale` agrandit), **border-radius: 50%** (cercle), **font-weight** (graisse du texte), **text-transform** (casse majuscule/minuscule) et la liaison **`<link rel="stylesheet">`**.',
    codeSnippet:
      "img { transform: skew(15deg, 15deg); }\n.pastille { border-radius: 50%; font-weight: bold; }",
    followUps: ["Quelle différence entre skew et rotate ?", "Comment obtenir un cercle ?"],
  },
  {
    id: "kb-js-annales",
    moduleId: "js",
    title: "Notions JavaScript des annales : indexOf, substr, charAt, toUpperCase, innerHTML",
    sourceRef: "Annales Bac 2023–2025 (JavaScript)",
    keywords: ["indexof", "substr", "charat", "touppercase", "innerhtml", "trim", "replace"],
    answer:
      "Notions de JavaScript fréquentes : **indexOf** (position d'une sous-chaîne, `-1` si absente), **substr(début, longueur)**, **charAt(i)**, **toUpperCase()**, **trim()**, **replace()** et **innerHTML** pour écrire dans un conteneur DOM.",
    codeSnippet:
      'let d = ch.indexOf("#", 0);\nlet mot = ch.substr(d + 1, 5);\ndocument.getElementById("info").innerHTML = mot;',
    followUps: ["Quelle différence entre substr et substring ?", "innerHTML ou value ?"],
  },
  {
    id: "kb-php-annales",
    moduleId: "php",
    title: "Notions PHP des annales : (int), count, isset, require, str_replace, mysqli_num_rows",
    sourceRef: "Annales Bac 2023–2025 (PHP)",
    keywords: ["(int)", "transtypage", "count", "isset", "require", "str_replace", "include"],
    answer:
      "Notions de PHP fréquentes : **(int)** (transtypage entier par troncature), **count()** (taille d'un tableau), **isset()** (teste si une variable ou clé `$_POST` est définie), **require** (arrêt fatal si fichier absent), **str_replace()** (remplacement de sous-chaîne), **mysqli_num_rows** (nombre de lignes d'un `SELECT`) et **mysqli_affected_rows** (lignes modifiées par `INSERT`, `UPDATE`, `DELETE`).",
    codeSnippet: '$X = (int) 2.99;\nif (mysqli_num_rows($res) == 0) { echo "Aucun résultat"; }',
    followUps: ["require ou include ?", "Quand utiliser mysqli_affected_rows ?"],
  },
];

const STOP_WORDS_FR = new Set([
  "le",
  "la",
  "les",
  "un",
  "une",
  "des",
  "du",
  "de",
  "d",
  "l",
  "au",
  "aux",
  "en",
  "dans",
  "sur",
  "sous",
  "avec",
  "sans",
  "pour",
  "par",
  "et",
  "ou",
  "mais",
  "donc",
  "car",
  "ni",
  "que",
  "qui",
  "quoi",
  "quel",
  "quelle",
  "quels",
  "quelles",
  "ce",
  "cet",
  "cette",
  "ces",
  "c",
  "est",
  "sont",
  "etre",
  "avoir",
  "ai",
  "as",
  "a",
  "je",
  "tu",
  "il",
  "elle",
  "on",
  "nous",
  "vous",
  "ils",
  "elles",
  "me",
  "te",
  "se",
  "moi",
  "toi",
  "mon",
  "ma",
  "mes",
  "ton",
  "ta",
  "tes",
  "son",
  "sa",
  "ses",
  "ne",
  "n",
  "pas",
  "plus",
  "comment",
  "pourquoi",
  "quand",
  "faire",
  "fait",
  "fais",
  "explique",
  "expliquer",
  "expliquez",
  "comprendre",
  "comprends",
  "arrive",
  "aider",
  "aide",
  "aidez",
  "bonjour",
  "salut",
  "bonsoir",
  "hello",
  "coucou",
  "merci",
  "svp",
  "stp",
  "peux",
  "peut",
  "veux",
  "voudrais",
  "sujet",
  "question",
]);

const GENERIC_MODULE_TERMS = new Set([
  "html",
  "html5",
  "css",
  "css3",
  "js",
  "javascript",
  "php",
  "sql",
  "bd",
  "base",
  "donnees",
]);

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, " ")
    .replace(/[^a-z0-9_#%.:()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSearchText(normalized: string): string[] {
  if (!normalized) return [];
  return normalized
    .split(" ")
    .map((t) => t.replace(/^[.,;:!?()-]+|[.,;:!?()-]+$/g, ""))
    .filter((t) => t.length > 0);
}

function buildHonestFallbackSource(
  query: string,
  activeModuleId: NotebookCategoryId,
): NotebookKnowledgeSource {
  const cleanQuery = query.trim();
  const displayQuery = cleanQuery.length > 0 ? `« ${cleanQuery} »` : "votre message";
  return {
    id: "kb-fallback",
    moduleId: activeModuleId,
    isFallback: true,
    title: "Sujet non trouvé dans les fiches du tuteur",
    sourceRef: "Repli honnête • Aucune fiche directe pour cette requête",
    keywords: [],
    answer: `Je n'ai pas de fiche sur ce sujet dans le tuteur du cours pour ${displayQuery}.\n\n- **Reformulez avec un mot-clé précis du programme 4ème STI** : par exemple \`clé étrangère\`, \`LEFT JOIN\`, \`tableau HTML\`, \`cardinalité\`, \`LIKE\`, \`pourcentage SQL\`, \`sous-requête IN\`, \`addEventListener\`, \`CIN\` ou \`mysqli_query\`.\n- **Utilisez la barre de recherche du mémento** en haut à gauche pour filtrer tous les extraits de code des 5 modules.`,
    followUps: [
      "C'est quoi une clé étrangère ?",
      "Explique la jointure externe LEFT JOIN",
      "Comment faire un tableau HTML ?",
      "Comment contrôler un CIN de 8 chiffres en JS ?",
    ],
  };
}

/**
 * Interroge la base de connaissances du tuteur de cours (/cours) avec :
 * - normalisation des accents et de la casse,
 * - filtrage des mots vides et salutations,
 * - correspondance par frontières de mots pour éviter les faux positifs de sous-chaînes,
 * - recherche de secours dans MEMENTO_CARDS,
 * - repli honnête explicite (`isFallback: true`) si le score de pertinence est insuffisant.
 */
export function queryNotebookKnowledgeBase(
  query: string,
  activeModuleId: NotebookCategoryId = "html5",
): NotebookKnowledgeSource {
  const rawLower = query.trim().toLowerCase();
  const normQuery = normalizeSearchText(query);
  const allTokens = tokenizeSearchText(normQuery);

  // Conserver les jetons techniques (même courts comme "in", "hr", "js") non présents dans STOP_WORDS_FR
  const meaningfulTokens = allTokens.filter((t) => !STOP_WORDS_FR.has(t));

  if (meaningfulTokens.length === 0) {
    return buildHonestFallbackSource(query, activeModuleId);
  }

  const tokenSet = new Set(allTokens);
  const meaningfulSet = new Set(meaningfulTokens);

  let bestMatch: NotebookKnowledgeSource | null = null;
  let bestScore = 0;

  for (const entry of NOTEBOOK_KNOWLEDGE_BASE) {
    let score = 0;
    const normTitle = normalizeSearchText(entry.title);
    const titleTokens = new Set(tokenizeSearchText(normTitle));

    for (const kw of entry.keywords) {
      const rawKw = kw.toLowerCase().trim();
      const normKw = normalizeSearchText(kw);
      if (!normKw) continue;

      const kwParts = tokenizeSearchText(normKw);
      const isGeneric = kwParts.length === 1 && GENERIC_MODULE_TERMS.has(kwParts[0] ?? "");

      if (rawKw === "(int)" || rawKw === "%") {
        if (rawLower.includes(rawKw)) {
          score += 6;
        }
        continue;
      }

      if (kwParts.length > 1) {
        // Expression multi-mots (ex: "cle etrangere", "left join", "sous-requete", "create table")
        const phraseMatch =
          normQuery.includes(normKw) || kwParts.every((part) => tokenSet.has(part));
        if (phraseMatch) {
          score += 7;
        }
      } else {
        const singleKw = kwParts[0] ?? normKw;
        if (singleKw.length <= 3) {
          // Mot-clé court ("in", "hr", "alt", "cin", "sql") : correspondance exacte de jeton uniquement
          if (tokenSet.has(singleKw)) {
            score += isGeneric ? 1 : 5;
          }
        } else {
          // Mot-clé de 4+ lettres : correspondance exacte ou préfixe/pluriel (ex: cardinalite / cardinalites)
          const matchedToken = meaningfulTokens.some(
            (t) =>
              t === singleKw ||
              (t.length >= 4 &&
                singleKw.length >= 4 &&
                (t.startsWith(singleKw) || singleKw.startsWith(t))),
          );
          if (matchedToken) {
            score += isGeneric ? 1 : 5;
          }
        }
      }
    }

    // Bonus sur les mots significatifs présents dans le titre de la fiche
    for (const tok of meaningfulTokens) {
      if (GENERIC_MODULE_TERMS.has(tok)) continue;
      if (tok.length <= 3) {
        if (titleTokens.has(tok)) score += 2;
      } else {
        for (const tt of titleTokens) {
          if (tt === tok || (tt.length >= 4 && (tt.startsWith(tok) || tok.startsWith(tt)))) {
            score += 2;
            break;
          }
        }
      }
    }

    // Tie-breaker léger pour le module actif UNIQUEMENT si un vrai mot-clé de contenu a matché
    if (score >= 4 && entry.moduleId === activeModuleId) {
      score += 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore >= 4) {
    return bestMatch;
  }

  // Recherche de secours dans les fiches MEMENTO_CARDS si aucun article principal n'a atteint le seuil
  let bestMementoScore = 0;
  let bestMementoMatch: NotebookKnowledgeSource | null = null;

  for (const card of MEMENTO_CARDS) {
    for (const sec of card.sections) {
      for (const snip of sec.snippets) {
        let mScore = 0;
        const normSnipTitle = normalizeSearchText(snip.title);
        for (const kw of snip.keywords) {
          const normKw = normalizeSearchText(kw);
          if (!normKw || GENERIC_MODULE_TERMS.has(normKw)) continue;
          if (normKw.length <= 3) {
            if (meaningfulSet.has(normKw)) mScore += 4;
          } else if (
            meaningfulTokens.some(
              (t) =>
                t === normKw ||
                (t.length >= 4 &&
                  normKw.length >= 4 &&
                  (t.startsWith(normKw) || normKw.startsWith(t))),
            )
          ) {
            mScore += 4;
          }
        }
        for (const tok of meaningfulTokens) {
          if (tok.length >= 4 && !GENERIC_MODULE_TERMS.has(tok) && normSnipTitle.includes(tok)) {
            mScore += 3;
          }
        }
        if (mScore > bestMementoScore && mScore >= 4) {
          bestMementoScore = mScore;
          bestMementoMatch = {
            id: `kb-memento-${card.id}-${sec.id}`,
            moduleId: card.id,
            title: `${snip.title} (${card.shortTitle})`,
            sourceRef: `Fiche Mémento ${card.badge} • ${sec.title}`,
            keywords: snip.keywords,
            answer:
              snip.explanation ??
              `Extrait issu de la fiche mémento **${card.title}** (${sec.title}).`,
            codeSnippet: snip.code,
            followUps: [
              "C'est quoi une clé étrangère ?",
              "Explique la jointure externe LEFT JOIN",
              "Comment faire un tableau HTML ?",
            ],
          };
        }
      }
    }
  }

  if (bestMementoMatch) {
    return bestMementoMatch;
  }

  // Repli honnête explicite : ne jamais renvoyer silencieusement une fiche hors sujet
  return buildHonestFallbackSource(query, activeModuleId);
}
