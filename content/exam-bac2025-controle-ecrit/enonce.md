# Examen du Baccalauréat — Session de Contrôle 2025

**Épreuve :** Systèmes et Technologies de l'Informatique (STI)  
**Section :** Sciences de l'informatique  
**Durée :** 3 heures — **Coefficient :** 1.8 — **Barème :** 20 points

> Transcription du sujet officiel (PDF « controle_2025 », 15 pages). Le sujet papier publie le barème par exercice ; la répartition par question est précisée dans `COUVERTURE.md`.

---

## Contexte : la base Gestion_Incendies

GeoIncendie est un bureau d'études spécialisé dans le suivi des incendies des forêts. Les informations nécessaires à ses statistiques sont gérées par une plateforme web développée autour de la base **Gestion_Incendies**, dont la version simplifiée est :

```
Gouvernorat (codeGouv, nomGouv)
Ville (codeVille, nomVille, nbForet, codeGouv#)
Foret (codeForet, nomForet, superficieForet, codeVille#)
Incendie (codeInc, dateHeureInc, superficieBrulee, statutInc, dateHeureExt, codeForet#)
TypeIntervention (codeTypeInt, description)
Intervention (codeInt, dateHeureDebInt, dateHeureFinInt, superficieInt, codeTypeInt#, codeInc#)
```

| Champ            | Description                          | Type et propriété(s)                                                                                       |
| ---------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| codeGouv         | Code d'un gouvernorat                | Chaîne de 3 caractères                                                                                     |
| nomGouv          | Nom d'un gouvernorat                 | Chaîne non vide de 50 caractères qui ne se répète pas                                                      |
| codeVille        | Code d'une ville                     | Chaîne de 5 caractères                                                                                     |
| nomVille         | Nom d'une ville                      | Chaîne non vide de 50 caractères                                                                           |
| nbForet          | Nombre de forêts dans une ville      | Entier strictement positif                                                                                 |
| codeForet        | Code d'une forêt                     | Chaîne de 6 caractères                                                                                     |
| nomForet         | Nom d'une forêt                      | Chaîne non vide de 50 caractères                                                                           |
| superficieForet  | Superficie d'une forêt en hectares   | Réel strictement positif obligatoire                                                                       |
| codeInc          | Code d'un incendie                   | Chaîne de 10 caractères                                                                                    |
| dateHeureInc     | Date et heure de début d'un incendie | Date et heure non vide                                                                                     |
| superficieBrulee | Superficie brûlée en hectares        | Réel strictement positif obligatoire                                                                       |
| statutInc        | Statut d'un incendie                 | Un caractère initialisé à « A » (incendie actif) ; « E » si l'incendie est éteint suite à une intervention |
| dateHeureExt     | Date et heure d'extinction           | Date et heure (si l'incendie est actif, le champ ne contient aucune valeur)                                |
| codeTypeInt      | Code d'un type d'intervention        | Chaîne de 3 caractères                                                                                     |
| description      | Description du type d'intervention   | Chaîne non vide de 9 caractères                                                                            |
| codeInt          | Code d'une intervention              | Chaîne de 10 caractères                                                                                    |
| dateHeureDebInt  | Date et heure de début               | Date et heure obligatoire                                                                                  |
| dateHeureFinInt  | Date et heure de fin                 | Date et heure (si l'intervention n'est pas achevée, le champ ne contient aucune valeur)                    |
| superficieInt    | Superficie traitée (hectares)        | Réel positif, valeur par défaut 0                                                                          |

---

# Partie A : Gestion de la base de données (12 points)

## Exercice 1 : Interprétation de la base de données (3,25 points)

1. Compléter la colonne « Valide » par **Oui** ou **Non** :
   1. Chaque gouvernorat comporte une ou plusieurs villes, mais chaque ville est rattachée à un seul gouvernorat.
   2. Une intervention peut concerner plusieurs incendies simultanément.
   3. Pour un type d'intervention, on peut mener plusieurs interventions en même temps.
   4. Il est possible que le statut d'un incendie soit éteint sans nécessiter aucune intervention.
   5. La date et l'heure d'extinction est obligatoire lors de l'insertion des données dans la table Incendie.
   6. Un incendie peut nécessiter plusieurs interventions en même temps.
   7. Une forêt peut être rattachée à plusieurs villes.
   8. Le même incendie peut se produire dans plusieurs forêts.
2. Pour chaque affirmation, une seule croix (toute réponse avec plus d'une croix est erronée) :
   - a) Pour initialiser `statutInc` à « A » lors de la création de la table Incendie : `DEFAULT` — `DISTINCT` — `NULL`
   - b) Pour créer une relation entre Gouvernorat et Ville : `PRIMARY KEY` — `NOT NULL` — `REFERENCES`
   - c) Pour obliger la saisie d'un contenu dans `nomForet` : `DEFAULT` — `UNIQUE` — `NOT NULL`
   - d) Pour garantir que `nomGouv` ne se répète pas : `CHECK` — `UNIQUE` — `REFERENCES`
   - e) Pour supprimer un enregistrement de Ville et tous les enregistrements de Foret associés : `ON DELETE CASCADE` — `ON UPDATE CASCADE` — `ON DROP CASCADE`
   - f) Pour ajouter une contrainte nommée `FKTypeInt` sur la clé étrangère `codeTypeInt` de Intervention : `DROP TABLE` — `ALTER TABLE` — `UPDATE`
3. Extrait des données à insérer :

   | N°  | Ville : codeVille | nomVille   | codeGouv |
   | --- | ----------------- | ---------- | -------- |
   | 1   | V0001             | Hammam Lif | G03      |
   | 2   | V0002             | Bargou     | G11      |
   | 3   | V0003             | Zaghouan   | G06      |
   | 4   | V0004             | Aïn Draham | G09      |
   | 5   | V0005             | Souk Jomaa | G09      |
   | 6   | V0006             | Ghardimaou | G09      |
   | 7   | V0006             | Nasrallah  | G13      |

   | N°  | Foret : codeForet | nomForet                      | superficieForet | codeVille |
   | --- | ----------------- | ----------------------------- | --------------- | --------- |
   | 1   | F00001            | Parc national de Boukornine   | 1 939.000       | V0001     |
   | 2   | F00002            | Forêt de Jbel Serj            | 1 720.000       | V0002     |
   | 3   | F00003            | Forêt de Jbel Zaghouan        | 2 010.000       | V00003    |
   | 4   | F00004            | Réserve naturelle de Aïn Zana | -47.000         | V0004     |
   | 5   | F00005            | Forêt Bent Hmed               | 1 541.000       | V0005     |
   | 6   | F00006            | Parc national d'El Feija      | 2 632.000       | V0006     |
   | 7   | F00007            | La Tourbière de Dar Fatma     | 15.000          | V0004     |

   Lors de l'insertion, le SGBD génère des erreurs. Compléter un tableau indiquant, pour chaque erreur, le numéro de la ligne, le nom de la table, le nom du champ et la contrainte non respectée (intégrité de table, référentielle ou de domaine). Tous les codes de gouvernorats de la table Ville existent déjà dans Gouvernorat.

## Exercice 2 : Interprétation des requêtes (1,75 point)

Extrait de **TypeIntervention** : TI1 Aérienne, TI2 Terrestre, TI3 Maritime, TI4 Mixte.

Extrait de **Intervention** :

| codeInt    | dateHeureDebInt  | dateHeureFinInt  | superficieInt | codeTypeInt | codeInc    |
| ---------- | ---------------- | ---------------- | ------------- | ----------- | ---------- |
| INT0000001 | 01/07/2024 17:00 | 02/07/2024 12:00 | 80.000        | TI2         | INC0000001 |
| INT0000002 | 02/07/2024 8:00  | 02/07/2024 12:00 | 20.000        | TI1         | INC0000001 |
| INT0000003 | 02/07/2024 12:00 | 03/07/2024 18:00 | 100.000       | TI2         | INC0000001 |
| INT0000004 | 05/07/2024 11:00 | 05/07/2024 17:00 | 70.000        | TI4         | INC0000002 |
| INT0000005 | 20/08/2024 11:30 | 21/08/2024 12:00 | 200.000       | TI1         | INC0000003 |
| INT0000006 | 21/08/2024 11:00 | 22/08/2024 12:00 | 100.000       | TI2         | INC0000003 |

Requête **R** :

```sql
SELECT description, SUM(superficieInt) AS SuperficieTotale
FROM TypeIntervention T, Intervention I
WHERE T.codeTypeInt = I.codeTypeInt
GROUP BY description ;
```

1. En se basant sur l'extrait, compléter le tableau du résultat de R, noms de colonnes compris.
2. En déduire le rôle de la requête R.
3. Réécrire R pour afficher uniquement les types d'intervention ayant une superficie totale supérieure ou égale à 120.000 hectares.

## Exercice 3 : Manipulation de la structure et des données (5,5 points)

1. Une seule croix par affirmation :
   - a) Supprimer de Ville le champ `nbForet` : `ALTER TABLE Ville DELETE nbForet` — `ALTER TABLE Ville DROP nbForet` — `ALTER TABLE Ville DROP CONSTRAINT nbForet`
   - b) Attribuer NULL à `dateHeureExt` de Incendie pour tous les incendies actifs : `ALTER Table Incendie ADD dateHeureExt DATETIME NULL DEFAULT` — `UPDATE Incendie ADD dateHeureExt DEFAULT NULL WHERE StatutInc='A'` — `UPDATE Incendie SET dateHeureExt =NULL WHERE StatutInc='A'`
   - c) Renommer `dateHeureExt` en `dateHExt` : `ALTER TABLE Incendie RENAME dateHeureExt To dateHExt` — `ALTER Incendie RENAME dateHeureExt To dateHExt` — `UPDATE TABLE Incendie SET dateHeureExt = dateHExt`
   - d) Augmenter `nomForet` de 50 à 100 caractères : `ALTER TABLE Foret CHANGE nomForet varchar(100)` — `ALTER TABLE Foret MODIFY nomForet varchar(100)` — `ALTER TABLE Foret MODIFY nomForet varchar(50) To nomForet varchar(100)`
2. Écrire une requête qui ajoute une nouvelle intervention **non achevée** : incendie `INC0000010`, intervention `INT0000017`, type `TI4`, début le `2025-06-01 14:00`, superficie `8.000` hectares (l'incendie et le type existent déjà).
3. Écrire en SQL les requêtes suivantes :
   - a) Quelles sont les forêts localisées dans le gouvernorat de **Jendouba** ? _Champs `nomForet` et `superficieForet`._
   - b) Quel est le nombre d'incendies enregistrés pour chaque forêt au cours de l'année **2024** ? _Champs `nomForet` et le nombre d'incendies._
   - c) Quelle est la somme des superficies brûlées pendant l'été **2023** (juin, juillet, août) pour chaque ville ? _Champs `nomVille` et la somme._
   - d) Quels sont les incendies ayant fait l'objet d'une intervention « **Aérienne** » ? _Sans répétition, champs `codeInc` et `dateHeureInc`._
   - e) Quels sont les incendies ayant subi trois interventions ou plus ? _Champs `codeInc`, `nomForet`, `dateHeureInc` et le nombre d'interventions._
   - f) Quelles sont les forêts ayant la plus grande superficie ? _Champs `nomForet` et `superficieForet`._

## Exercice 4 : Extension et modification de la structure de la base (1,5 point)

_À chaque représentation textuelle, indiquer la clé primaire et les clés étrangères de chaque table._

Pour évaluer l'impact écologique des incendies, on ajoute deux tables :

```sql
CREATE TABLE Espece (
  codeEspece INT PRIMARY KEY AUTO_INCREMENT,
  nomEspece VARCHAR (50) NOT NULL,
  typeEspece VARCHAR (8) NOT NULL CHECK (typeEspece IN ('Végétale', 'Animale'))
);

CREATE TABLE ImpactEspece (
  codeImpact INT PRIMARY KEY AUTO_INCREMENT,
  codeEspece INT NOT NULL REFERENCES Espece (codeEspece),
  codeIncendie VARCHAR(10) NOT NULL REFERENCES Incendie (codeInc),
  populationAffectee INT
);
```

1. D'après ces requêtes, donner la représentation textuelle de **Espece** et **ImpactEspece**.
2. Règles de gestion : **R1** une espèce peut être touchée par plusieurs incendies ; **R2** un incendie peut affecter plusieurs espèces ; **R3** l'impact d'un incendie sur une espèce doit être enregistré une seule fois. La requête de ImpactEspece ne respecte pas R3 : donner une nouvelle représentation textuelle qui respecte R1, R2 et R3.
3. Une table **StatutEspece** (identifiée par `codeStatut`, avec un champ `libelle`) suit le statut des espèces. **R4** une espèce a un seul statut ; **R5** un statut concerne plusieurs espèces. Donner la représentation textuelle de StatutEspece et de la table concernée.

---

# Partie B : Programmation Web (8 points)

La page **Statistiques_Interventions.html** permet de consulter le nombre d'interventions pour des types sélectionnés pendant une période donnée.

### Fig. 2 — code (incomplet) de Statistiques_Interventions.html

```html
1 <!DOCTYPE HTML>
2 <html lang="fr">
3 <head>
4   <title>Gestion des Incendies</title>
5   ........................................
6   <script src="mesScripts.js"></script>
7 </head>
8 ........................................
9   <header>
10    <h1>Gestion des Incendies</h1>
11    ........................................
12    <nav>
13      <div class="menu"><a href="accueil.html">Accueil</a></div>
14      <div class="menu"><a href="ajout_donnees.html#intervention">Ajout des données</a></div>
15      <div class="menu"><a href="#stat">Statistiques</a></div>
16    </nav>
17  </header>
18  <section id="#stat">
19    <h3>Statistiques des types d'interventions</h3>
20    <form id="f" action="Statistiques_Types.php" method="POST" onsubmit="return verification()">
21      <label>Date et heure de début d'une intervention: </label>
22      <input id="date1" name="date1" type="date" required>
23      <input id="temps1" name="temps1" type="time" required><br>
24      <label>Date et heure de fin d'une intervention: </label>
25      <input id="date2" name="date2" type="date" required>
26      <input id="temps2" name="temps2" type="time" required><br>
27      ........................................
28      <input name="intervention[]" type="checkbox" value="TI1">Aérienne
29      <input name="intervention[]" type="checkbox" value="TI2">Terrestre
30      <input name="intervention[]" type="checkbox" value="TI3">Maritime
31      <input name="intervention[]" type="checkbox" value="TI4">Mixte <br>
32      <div>
33        <input class="bouton" id="bt1" name="bt1" type="submit" value="Envoyer">
34        ........................................
35      </div>
36    </form>
37  </section>
38  ........................................
39 </body>
40 </html>
```

### Fig. 3 — extrait de mesStyles.css

```css
1  ........................................
2  ........................................
3  label {
4    display: inline-block;
5    margin: 0px 0px 5px 0px;
6    width: 300px; }
7  .bouton {
8    background-color: yellow;
9    background-size: 30px 30px;
10   width: 150px;
11   height: 30px; }
12 .bouton:hover { text-transform: uppercase; }
13 h3, div { text-align: center; }
14 footer, header {
15   background: black;
16   text-align: center;
17   margin: 10px;
18   color: white; }
19 header { background: #007BFF; }
20 h1,h2 { margin: 5px 0px 5 px 0px;}
21 #bt1 { ........................................ : url(valider.png); }
```

### Fig. 4 — extrait de mesScripts.js

```javascript
1  function date() {
2    const datej=new Date();
3    let jour=datej.getDate();
4    if (jour<10)
5      jour="0"+jour
6    let mois=datej.getMonth()+1;
7    if (mois<10)
8      mois="0"+mois
9    const annee=datej.getFullYear();
10   let datejour=String(annee)+"-"+mois+"-"+jour;
11   document.getElementById("date1").value=datejour;
12   document.getElementById("date2").value=datejour;
13 }
14 function temps() {
15   document.getElementById("temps1").value="00:00";
16   document.getElementById("temps2").value="23:59";
17 }
18 function inconnue () {
19   // sauvegarder dans la constante "interventions" les éléments HTML ayant le nom "intervention[]".
20   const interventions = document.getElementsByName("intervention[]");
21   let test = false ;
22   let i = -1;
23   do
24   {
25     i++;
26     if (interventions[i].checked == true)
27       test = true;
28   } while (test == false && i < interventions.length-1);
29   return test;
30 }
31 function verification() {
32   const date1=document.getElementById("date1").value;
33   const date2=document.getElementById("date2").value;
34   const temps1=document.getElementById("temps1").value;
35   const temps2=document.getElementById("temps2").value;
36   if (date1>date2) {
37     alert("La date de début doit être inférieure ou égale à la date de fin de l'intervention");
38     return false; }
39   if ((date1==date2) && (temps1>=temps2)) {
40     alert("L'heure de début doit être inférieure ou égale à l'heure de fin de l'intervention");
41     return false; }
42   if (inconnue()==false) {
43     alert("Il faut cocher au moins un type d'intervention");
44     return false; }
45 }
```

### Fig. 5 — extrait (incomplet) de Statistiques_Types.php

```php
1  <?php
2  //Tâche N° 1 : Établir une connexion à la base de données.
3  $con=........................................("localhost", "root", "", "gestion_incendies") or die ("Erreur de la base de données");
4  $datedebut=$_POST["date1"]." ".$_POST["temps1"];
5  $datefin=$_POST["date2"]." ".$_POST["temps2"];
6  $types=$_POST["intervention"];
7  $ch="(";
8  //Tâche N° 2 : Retourner le nombre de cases du tableau "types".
9  for($i=0; $i<........................................; $i++)
10   $ch=$ch."'".$types[$i]."',";
11 //Tâche N° 3 : Retourner la longueur de la chaîne de caractères "ch".
12 $L=........................................;
13 //Tâche N° 4 : Retourner une sous-chaîne à partir de "ch" sans le dernier caractère.
14 $ch1=........................................;
15 $ch1=$ch1.")";
16 $req="select T.description, count(I.codeInt)
17        from Intervention I, typeintervention T
18        where (I.codeTypeInt=T.codeTypeInt) and (I.codeTypeInt in $ch1) and
19              (dateHeureDebInt>='$datedebut') and (dateHeureFinInt<='$datefin')
20        group by T.description;";
21 //Tâche N° 5 : Exécuter la requête "req".
22 $res=........................................ or die ("Erreur de la requête".mysqli_error($con));
23 //Tâche N° 6 : Récupérer le nombre d'enregistrements retourné par la requête.
24 if (........................................==0)
25   echo "Aucune intervention n'est enregistrée pour les critères introduits.";
26 else
27   echo "<table border=1><thead><tr><th>Type Interventions</th><th>Nombre Interventions</th></tr> </thead><tbody>";
28 //Tâche N° 7 : Retourner un enregistrement du résultat de l'exécution de la requête.
29 while ($enreg=........................................)
30   echo "<tr><td>$enreg[0]</td>
31         <td>$enreg[1]</td></tr>";
32 echo "</tbody></table>";
33 //Tâche N° 8 : Se déconnecter de la base de données.
34 ........................................;
35 ?>
```

## Exercice 1 : Analyse du code HTML (3 points)

1. Pour chaque proposition, répondre **V** (correcte) ou **F** (sinon) :
   - a) La balise `<title>` (ligne 4) affiche : le titre d'un tableau — le titre de la page Web — l'auteur de la page Web.
   - b) La balise `<header>` (ligne 9) : définit un conteneur pour le contenu d'introduction — définit le contenu principal d'un document — doit figurer dans le corps de la page web.
   - c) Les balises des lignes 13, 14 et 15 qui définissent des liens hypertextes **externes** : `accueil.html` — `ajout_donnees.html#intervention` — `#stat`.
   - d) L'attribut `required` (ligne 22) : désactive la saisie dans un champ — initialise le champ à une valeur donnée — exige la saisie d'une valeur dans un champ.
2. Indiquer, pour chaque balise, le numéro de la ligne de la Fig. 2 où elle doit être insérée :
   - `<input class="bouton" id="bt2" name="bt2" type="reset" value="Annuler">`
   - `<h2>Statistiques des Incendies</h2>`
   - `<footer id="stat">Gestion des Incendies - GeoIncendie 2025</footer>`
   - `<label>Type(s) d'intervention: </label>`
   - `<body onload="date(); temps()">`
   - `<link rel="stylesheet" href="mesStyles.css">`

## Exercice 2 : Analyse du code CSS (1 point)

1. Une seule croix par affirmation :
   - a) Pour afficher les liens « Accueil », « Ajout des données » et « Statistiques » sur la même ligne avec une marge externe droite de 15 pixels, la règle à ajouter à la ligne 1 est : `.menu { display: inline; margin: 0px 15px 0px 0px; }` — `#menu { display: inline; margin: 0px 15px 0px 0px; }` — `.menu { display: none; margin: 0px 15px 0px 0px; }`
   - b) Pour colorer en blanc les textes des liens, la règle à ajouter à la ligne 2 est : `div { color: white; }` — `href { color: white; }` — `a { color: white; }`
   - c) `background-size: 30px 30px;` (ligne 9) permet de : définir la largeur et la hauteur à 30 pixels des deux boutons — définir la largeur et la hauteur à 30 pixels des images d'arrière-plan des deux boutons — placer les images à 30 pixels du bord supérieur et du bord inférieur des deux boutons
   - d) Pour que `valider.png` s'affiche en image de fond du bouton « Envoyer », la propriété à ajouter à la ligne 21 est : `img` — `list-style-image` — `background-image`
2. Quel est le rôle de la règle `.bouton:hover { text-transform: uppercase; }` (ligne 12) ?

## Exercice 3 : Analyse du code JavaScript (2 points)

1. Indiquer l'élément du langage JavaScript correspondant à chaque rôle :
   - Fonction qui convertit une valeur numérique en une chaîne.
   - Expression qui retourne la date courante du système.
   - Méthode qui retourne la valeur du jour (entre 1 et 31) d'une date donnée.
   - Propriété qui retourne le contenu d'un champ de saisie.
   - Propriété qui vérifie si une case est cochée ou non.
   - Méthode qui retourne une liste d'éléments ayant le même nom.
   - Fonction qui affiche un message dans une boîte de dialogue.
   - Instruction qui retourne le résultat d'une fonction.
2. Deux exemples de la page : **Exemple N° 1** (cases Aérienne et Maritime cochées), **Exemple N° 2** (aucune case cochée).
   - a) D'après la fonction `inconnue` (Fig. 4), donner pour chaque exemple la valeur retournée en complétant la trace d'exécution (`test`, `i`, `interventions[i].checked`).
   - b) En déduire le rôle de la fonction `inconnue`.

## Exercice 4 : Analyse du code PHP (2 points)

Pour chaque tâche manquante (N° 1 à 8) de la Fig. 5, écrire la fonction correspondante choisie dans la liste : `strlen($ch)`, `mysqli_fetch_array($res)`, `mysqli_close($con)`, `count($types)`, `mysqli_connect`, `mysqli_query($con)`, `mysqli_connexion`, `substr($ch,0,$L-1)`, `strlen ($types)`, `mysqli_num_rows($res)`, `mysqli_query($con,$req)`, `count($ch)`.
