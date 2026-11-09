# Examen du Baccalauréat — Session Principale 2025

**Épreuve :** Systèmes et Technologies de l'Informatique (STI)  
**Section :** Sciences de l'informatique  
**Durée :** 3 heures — **Coefficient :** 1.8 — **Barème :** 20 points

> Transcription du sujet officiel (PDF « principale_2025 », 14 pages). Le sujet papier publie le barème par exercice ; la répartition par question est précisée dans `COUVERTURE.md`.

---

## Contexte : la base Gestion_Exposition

La société **Dynamik Expo** utilise une base de données simplifiée, **Gestion_Exposition**, pour gérer ses manifestations. Chaque manifestation est associée à un type (foire, salon, séminaire, etc.) et se déroule dans des halles subdivisées en plusieurs stands disponibles à la location aux clients. Pour chaque manifestation, des évaluations sont réalisées de manière anonyme en attribuant des notes aux services de base (accueil, confort, signalétique et logistique).

Représentation graphique (clés primaires soulignées, clés étrangères suivies de #), cardinalités entre parenthèses :

```
Evaluation (codeEval, dateEval, noteAccueil, noteConfort, noteSignal, noteLogistique, codeManif#)   ∞ — 1  Manifestation
Manifestation (codeManif, nomManif, dateOuv, dateFer, codeType#)                                    ∞ — 1  Type_Manif
Location (codeManif#, codeStand#, dateLoc, prix, codeCl#)                                           ∞ — 1  Manifestation, Stand, Client
Stand (codeStand, designation, superficie, etat, codeHalle#)                                        ∞ — 1  Halle
Type_Manif (codeType, libType)    Halle (codeHalle, libHalle, nbStandsMax)    Client (codeCl, nomCl, telCl, emailCl, pays)
```

| Champ                                                | Type et propriété(s)                                           |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| codeType                                             | Chaîne de 3 caractères                                         |
| libType                                              | Chaîne de 20 caractères et unique                              |
| codeManif                                            | Chaîne de 5 caractères                                         |
| nomManif                                             | Chaîne de 50 caractères et unique                              |
| dateOuv, dateFer                                     | Date                                                           |
| codeHalle                                            | Chaîne de 3 caractères                                         |
| libHalle                                             | Chaîne de 50 caractères et unique                              |
| nbStandsMax                                          | Entier strictement positif                                     |
| codeStand                                            | Chaîne de 3 caractères                                         |
| designation                                          | Chaîne de 50 caractères                                        |
| superficie                                           | Entier compris entre 30 et 100 (m²)                            |
| etat                                                 | Caractère : « L » si le stand est libre, « O » s'il est occupé |
| codeCl                                               | Chaîne de 5 caractères                                         |
| nomCl                                                | Chaîne de 50 caractères                                        |
| telCl                                                | Chaîne de 8 caractères et unique                               |
| emailCl                                              | Chaîne de 50 caractères et unique                              |
| pays                                                 | Chaîne de 50 caractères                                        |
| dateLoc                                              | Date                                                           |
| prix                                                 | Réel strictement positif                                       |
| codeEval                                             | Entier auto-incrémenté                                         |
| dateEval                                             | Date                                                           |
| noteAccueil, noteConfort, noteSignal, noteLogistique | Entier compris entre 0 et 5                                    |

---

# Partie A : Gestion de la base de données (12 points)

## Exercice 1 : Interprétation de la base de données (3 points)

1. Donner la représentation textuelle de cette base de données en précisant pour chaque table son nom, ses champs, sa clé primaire et sa (ses) clé(s) étrangère(s).
2. Compléter le tableau par une croix dans la colonne **Vrai** ou **Faux** :
   1. Une manifestation peut avoir plusieurs types.
   2. Une halle peut accueillir plusieurs clients dans une date donnée.
   3. Un stand peut être loué par le même client à des manifestations différentes.
   4. Un stand peut être loué par plusieurs clients pendant la même manifestation à des dates différentes.
   5. Un client peut participer à une manifestation sans louer un stand.
   6. Un client peut louer plusieurs stands pendant la même manifestation.
   7. Le prix d'un stand est toujours le même quel que soit la manifestation.
3. Compléter les phrases par les mots convenables de la liste : **composée – de domaine – fille – de table – primaire – référentielle – mère – simple – étrangère**.
   - a) La clé étrangère dans la table « Stand » assure l'intégrité ... avec la table « Halle ».
   - b) La table « Location » possède une clé primaire ...
   - c) La contrainte d'intégrité ... permet de s'assurer que le champ « prix » de la table « Location » ne contient que des valeurs strictement positives.
   - d) Le champ « codeCl » dans la table « Location » est une clé ..., toutefois il est une clé ... dans la table « Client ».

## Exercice 2 : Interprétation des requêtes (1,5 point)

Rôles possibles :

- a) Supprimer toutes les manifestations dont le « codeManif » contient le caractère « 3 ».
- b) Modifier la valeur par défaut d'un champ de la table « Halle ».
- c) Afficher le nom et la date d'ouverture des manifestations ayant le code de type « Salon ».
- d) Modifier le numéro de téléphone d'un client dont le code est spécifié.
- e) Supprimer toutes les manifestations dont le « codeManif » se termine par le caractère « 3 ».
- f) Ajouter un nouveau client avec des valeurs spécifiques.
- g) Ajouter une contrainte de domaine sur un champ de la table « Halle ».
- h) Supprimer un client ayant des valeurs spécifiques.
- i) Afficher le nom et la date d'ouverture des manifestations ayant le libellé de type « Salon ».
- j) Modifier le type du champ « telCl » de la table « Client ».

Pour chacune des requêtes suivantes, indiquer la lettre du rôle correspondant :

```sql
INSERT INTO Client VALUES ('C0001', 'Ali ABIDI', '33556677', 'Ali.ABIDI@gmail.com', 'Tunisie') ;

SELECT nomManif, dateOuv FROM Manifestation F, Type_Manif T
WHERE ( F.codeType = T.codeType ) AND ( libType = 'Salon' ) ;

UPDATE Client SET telCl = '66333111' WHERE codeCl = 'C0023' ;

DELETE FROM Manifestation WHERE codeManif Like '%3' ;

ALTER TABLE Halle ADD CHECK ( nbStandsMax > 0 ) ;

ALTER TABLE Halle MODIFY nbStandsMax int DEFAULT 1 ;
```

## Exercice 3 : Manipulation des données de la base (6 points)

Écrire en SQL les requêtes permettant de répondre aux questions suivantes :

1. Quels sont les différents types de manifestations ? _On affichera les champs « codeType » et « libType »._
2. Quelles sont les manifestations qui ont une durée strictement inférieure à 5 jours ? _On affichera les champs « codeManif », « nomManif » et « dateOuv »._
3. Comment réduire de **15 %** les prix de location des stands de la manifestation ayant le code « M0001 » ?
4. Quels sont les clients qui ont loué un ou plusieurs stands ? _On affichera sans répétition les champs « nomCl », « telCl » et « emailCl »._
5. Quels sont les stands libres dans la halle de libellé « Halle A », triés par superficie décroissante ? _On affichera les champs « codeStand », « designation » et « superficie »._
6. Quel est le nombre de manifestations pour chaque type ? _On affichera les champs « codeType » et « libType » ainsi que le nombre de manifestations de chaque type._
7. Quelles sont les manifestations dont le revenu total de location de stands dépasse strictement 10000 dinars ? _On affichera les champs « codeManif », « nomManif » ainsi que le total des revenus._
8. Quelles sont les désignations des stands qui n'ont pas été loués pendant l'année **2025** ? _On affichera uniquement le champ « designation »._
9. Quels sont les stands ayant le prix de location le plus élevé ? _On affichera les champs « codeStand », « designation » et « superficie »._

## Exercice 4 : Extension et modification de la structure de la base (1,5 point)

_À chaque représentation textuelle demandée, indiquer la clé primaire et la (les) clé(s) étrangère(s) de chaque table._

1. Pour éliminer l'incohérence des données dans le champ « pays » de la table « Client », on propose de modifier la structure en respectant : **R1** un client appartient à un seul pays ; **R2** il est possible d'avoir plusieurs clients provenant du même pays. Proposer une représentation textuelle de « Client » et de toute nouvelle table indispensable.
2. Pour évaluer d'autres services (sécurité, publicité, etc.) on crée les tables **Service** (informations sur les services) et **Note_Service** (notes attribuées aux services lors d'une évaluation), avec les règles : **R3** pour une évaluation, on peut évaluer plusieurs services ; **R4** un service peut être évalué plusieurs fois dans différentes évaluations ; **R5** une évaluation concerne une seule manifestation ; **R6** un service ne peut être évalué qu'une seule fois par évaluation avec l'attribution d'une note.
   - a) Quatre représentations textuelles erronées sont données ; indiquer pour chacune la règle (R3, R4, R5 ou R6) non respectée :
     1. `Service (codeSer, libSer)` ; `Evaluation (codeEval, dateEval)` ; `Note_Service (codeEval#, codeSer#, note, commentaire, codeManif#)`
     2. `Service (codeSer, libSer)` ; `Evaluation (codeEval, dateEval, codeManif#, codeSer#, note)` ; `Note_Service (codeEval#, commentaire)`
     3. `Service (codeSer, libSer)` ; `Evaluation (codeEval, dateEval, codeManif#)` ; `Note_Service (codeEval#, codeSer#, commentaire)`
     4. `Service (codeSer, libSer, codeEval#, note)` ; `Evaluation (codeEval, dateEval, codeManif#)` ; `Note_Service (codeEval#, commentaire)`
   - b) En déduire la représentation textuelle correcte de « Service », « Evaluation » et « Note_Service » respectant R3, R4, R5 et R6.

---

# Partie B : Programmation Web (8 points)

La page **EvaluationManif.html** permet d'évaluer la qualité des quatre services de base offerts par Dynamik Expo (accueil, confort, signalétique et logistique). Le site est composé des pages `EvaluationManif.html`, `mesStyles.css`, `mesScripts.js` et `Evaluation.php`.

### Fig. 2 — code de EvaluationManif.html

```html
1 <!DOCTYPE html> 2
<html lang="fr">
  3
  <head>
    4
    <title>Évaluation d'une manifestation</title>
    5
    <meta charset="utf-8" />
    6
    <meta name="Description" content="Cette page permet l'évaluation des manifestations." />
    7
    <link rel="stylesheet" type="text/css" href="mesStyles.css" />
    8
    <script src="mesScripts.js"></script>
    9
  </head>
  10
  <body onload="inconnue()">
    11
    <form id="f" name="f" action="evaluation.php" method="POST" onsubmit="return verif ()">
      12
      <fieldset>
        13
        <legend>Évaluation d'une manifestation</legend>
        14 <label>Manifestation :</label> 15
        <select id="manif" name="manif">
          16
          <option selected>Choisir une manifestation</option>
          17
          <option value="M0001">Foire du livre</option>
          18
          <option value="M0002">Salon de l'Art</option>
          19
          <option value="M0003">Séminaire des médecins</option>
          20</select
        ><br />
        21
        <hr />
        22 <label class="labserv">Service</label> <label id="labnote">Note</label><br /><br />
        23 <label class="service">Accueil :</label> 24
        <input
          type="range"
          id="serv1"
          name="serv1"
          min="0"
          max="5"
          25
          onchange="imagenote('serv1', 'imgser1'); calcultotal();"
        />
        26
        <img
          id="imgser1"
          src="0.png"
          width="150"
          height="20"
          alt="Note attribuée à l'accueil"
        /><br />
        27 <label class="service">Confort : </label> 28
        <input
          type="range"
          id="serv2"
          name="serv2"
          min="0"
          max="5"
          29
          onchange="imagenote('serv2', 'imgser2'); calcultotal();"
        />
        30
        <img
          id="imgser2"
          src="0.png"
          width="150"
          height="20"
          alt="Note attribuée au confort"
        /><br />
        31 <label class="service">Signalétique :</label> 32
        <input
          type="range"
          id="serv3"
          name="serv3"
          min="0"
          max="5"
          33
          onchange="imagenote('serv3', 'imgser3'); calcultotal();"
        />
        34
        <img
          id="imgser3"
          src="0.png"
          width="150"
          height="20"
          alt="Note attribuée à la signalétique"
        /><br />
        35 <label class="service">Logistique :</label> 36
        <input
          type="range"
          id="serv4"
          name="serv4"
          min="0"
          max="5"
          37
          onchange="imagenote('serv4', 'imgser4'); calcultotal();"
        />
        38
        <img
          id="imgser4"
          src="0.png"
          width="150"
          height="20"
          alt="Note attribuée à la logistique"
        /><br />
        39 <label class="service">Note totale :</label> 40 <span id="total">0/20</span><br />
        41
        <div>
          42 <input name="Valider" type="submit" value="Valider" /> 43
          <input name="Annuler" type="reset" value="Annuler" /> 44
        </div>
        45
      </fieldset>
      46
    </form>
    47
  </body>
  48
</html>
```

### Fig. 3 — code de Evaluation.php

```php
1  <?php
2  $manif=$_POST["manif"];
3  $note=array($_POST["serv1"], $_POST["serv2"], $_POST["serv3"], $_POST["serv4"]);
4  $tot=$_POST["total"];
5  echo "Le total des notes attribuées est $tot / 20 <br>" ;
6  $datejour=date('Y-m-d') ;
7  $con=mysqli_connect("localhost","root","", "Gestion_Exposition") or die ("Erreur B.D.");
8  $reqSelect="select DateOuv , DateFer from manifestation where (CodeManif ='$manif') ";
9  $resSelect=mysqli_query ($con, $reqSelect) or die ("La requête est erronée.");
10 if ($enreg=mysqli_fetch_array($resSelect))
11 {
12   $date1=$enreg[0];
13   $date2=$enreg[1];
14   if ($date1>$datejour)
15      { echo "La manifestation sélectionnée n'a pas encore commencé."; }
16   else
17   if ($date2<$datejour)
18      { echo "La manifestation sélectionnée est déjà clôturée."; }
19   else
20   {
21      $reqInsert="insert into evaluation (dateEval, noteAccueil, noteConfort , noteSignal, noteLogistique,
22      codeManif) values ('$datejour', $note[0], $note[1], $note[2], $note[3], '$manif')";
23      $resInsert=mysqli_query($con,$reqInsert) ;
24      if ($resInsert)
25         { echo "L'évaluation est enregistrée avec succès."; }
26      else
27         { echo "Echec d'insertion" . mysqli_error($con); }
28   }
29 }
30 else
31   echo "La manifestation n'existe pas !";
32 mysqli_close($con) ;
33 ?>
```

_Le fichier Evaluation.php est développé autour de la base décrite ci-dessus, sans tenir compte des modifications de l'exercice 4 de la partie A._

## Exercice 1 : Analyse et interprétation du code HTML (2,5 points)

1. Indiquer, pour chaque rôle, le numéro de la ligne de la Fig. 2 contenant le code HTML correspondant :
   - Créer un bouton permettant d'envoyer les données du formulaire à un serveur.
   - Créer un conteneur en ligne permettant d'afficher un contenu.
   - Spécifier l'encodage des caractères de la page web.
   - Lier une feuille de style CSS externe à la page web.
   - Exécuter une fonction JavaScript au moment où la page web est entièrement chargée.
   - Créer une liste déroulante.
   - Regrouper un ou plusieurs éléments d'un formulaire.
   - Fournir des informations supplémentaires sur la page web utilisées par les moteurs de recherche.
2. Une seule croix par affirmation :
   - a) L'attribut `method` (ligne 11) permet de : spécifier l'adresse URL vers laquelle les données seront envoyées — spécifier la méthode HTTP utilisée pour envoyer les données — définir le nom du conteneur où la réponse du serveur sera affichée.
   - b) La balise `<hr>` (ligne 21) permet d'insérer : une ligne horizontale — une ligne dans un tableau — un retour à la ligne.
   - c) L'élément `<input type="range">` (ligne 24) permet de : saisir librement un texte dont la valeur est comprise entre min et max — sélectionner une valeur dans une plage définie — saisir une valeur numérique.
   - d) L'attribut `alt` (ligne 26) sert à : spécifier une légende de l'image — définir un texte qui s'affiche lorsqu'on survole l'image — définir une description textuelle alternative pour l'image.

## Exercice 2 : Analyse et interprétation du code CSS (1,5 point)

D'après les figures Fig. 1 et Fig. 2, écrire dans la colonne « Code CSS » le code adéquat pour chaque mise en forme, à choisir dans la liste : `background-color : yellow` | `border : 3px solid red` | `font-style : italic` | `color : red` | `#labserv` | `legend` | `font-weight : bolder` | `border-radius : 5px` | `display : inline-block` | `border : 3px dashed red` | `.labserv` | `font-size : 20px` | `text-align : center` | `padding : 5px` | `margin : 5px` | `color : yellow` | `width : 150px`.

- Le titre « Évaluation d'une manifestation » doit avoir : une couleur de texte rouge, une taille de caractères égale à 20 pixels, un style de caractères gras.
- Le titre « Service » doit avoir : un texte centré, un arrière-plan jaune, une bordure rouge hachée de 3 pixels, une largeur de 150 pixels, un style de caractères italique.
- Les libellés (`label`) du formulaire doivent avoir : un comportement d'affichage bloc en ligne, une marge intérieure haut de 5 pixels.

## Exercice 3 : Analyse et interprétation du code JavaScript (2 points)

1. Pour chaque proposition, répondre **V** (correcte) ou **F** :
   - a) Code incomplet de la fonction `verif` (appel à la ligne 11) : `if (document.getElementById ("manif") .......... ==0)`. La propriété à ajouter pour vérifier qu'une manifestation est sélectionnée est : `.checked` — `.selectedIndex` — `.value` — `.indexOf`.
   - b) Fonction `imagenote (idnote, idimage)` : `note=document.getElementById (idnote).value;` puis une instruction à ajouter pour afficher l'image « 0.png » pour la note 0, « 1.png » pour la note 1, ..., « 5.png » pour la note 5 : `document.getElementById (idimage).name=note+'.png';` — `document.getElementsByName (idimage).value=note+'.png';` — `document.getElementById (idimage).src=note+'.png';` — `document.getElementsByName (idimage).src=note+'.png';`
   - c) La fonction `calcultotal` calcule et affiche le total des quatre notes. Parmi quatre scripts proposés, répondre V ou F pour chacun : (1) `let s=0; for (let i=1; i<=4; i++) { idnote="serv"+i; s=s+parseInt(document.getElementById(idnote).value); }` ; (2) `for (const i=1; i<=4; i++)` ; (3) sans `let s=0` ; (4) `const idnote="serv"+i; s=s+Number(...)`. Chaque script se termine par `document.getElementById ("total").innerHTML=String(s)+"/20";`.
2. Fonction `inconnue` (appel à la ligne 10) :

   ```javascript
   function inconnue() {
     for (i = 1; i <= 4; i++) {
       idimage = "imgser" + i;
       document.getElementById(idimage).src = "0.png";
       idnote = "serv" + i;
       document.getElementById(idnote).value = 0;
     }
   }
   ```

   En se basant sur ce code et sur le code HTML de la Fig. 2, donner le rôle de cette fonction.

## Exercice 4 : Analyse et interprétation du code PHP (2 points)

D'après `Evaluation.php` (Fig. 3), `EvaluationManif.html` (Fig. 2) et l'exemple d'exécution (« Séminaire des médecins » sélectionné, note totale affichée 10/20), une seule croix par affirmation :

1. Après la ligne 2, la variable `$manif` contient : Séminaire des médecins — M0003 — manif.
2. Après la ligne 5, le navigateur affiche : « Le total des notes attribuées est 10 / 20 » — « Le total des notes attribuées est 0.5 » — un message d'erreur relatif au champ « total » et le message « Le total des notes attribuées est / 20 ».
3. La ligne 3 permet de : copier tous les éléments du tableau associatif `$_POST` dans `$note` — créer un tableau indexé `$note` contenant les notes — créer un tableau associatif `$note` contenant les notes.
4. Si la date du jour est le 10 juin 2025, `$datejour` (ligne 6) contient : 2025-06-10 — 06-10-2025 — 10-06-2025.
5. La ligne 7 peut être remplacée par : `$con=mysqli_connect(...); if (!$con) { echo "Erreur B.D."; }` — `... if (!isset($con)) { die ("Erreur B.D."); }` — `... if (!$con) { die ("Erreur B.D."); }`.
6. La ligne 10 peut être remplacée par : `if ($enreg=mysqli_num_rows($resInsert))` — `if ($enreg=mysqli_fetch_row($resSelect))` — `if ($enreg=mysqli_fetch_rows($resSelect))`.
7. La ligne 24 peut être remplacée par : `if (mysqli_num_rows($resInsert)!=0)` — `if (mysqli_fetch_row($resInsert))` — `if (mysqli_affected_rows($con)!=0)`.
8. La fonction `mysqli_error($con)` (ligne 27) retourne, en cas d'erreur de la dernière requête SQL : une chaîne contenant le message d'erreur — un tableau contenant la liste des erreurs — un entier contenant le code de l'erreur.
