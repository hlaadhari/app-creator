# Examen du Baccalauréat — Session de Contrôle 2024

**Épreuve :** Systèmes et Technologies de l'Informatique (STI)  
**Section :** Sciences de l'informatique  
**Durée :** 3 heures — **Coefficient :** 1.8 — **Barème :** 20 points

> Transcription du sujet officiel (PDF « controle_2024 », 14 pages). Le sujet papier ne publie pas le barème par question : la répartition des points est précisée dans `COUVERTURE.md`.

---

## Exercice N°1 (2 points) — QCM Notions Web & Programmation

Pour chacune des questions ci-dessous, mettre une croix (X) dans la case correspondante à la réponse correcte. **Toute réponse comportant plus d'une croix est considérée erronée.**

1. En HTML, quel événement utiliser pour déclencher une action lorsqu'un champ de saisie devient actif ?
   - `oninput` — `onfocus` — `onblur`
2. En HTML, à quel élément la balise `<figcaption>` ajoute-t-elle une légende ?
   - à l'élément figure — à l'élément table — à l'élément audio
3. En CSS, quel est l'effet de la déclaration suivante lorsqu'elle est appliquée à un élément `img` ? `transform: skew(15deg, 15deg);`
   - déplacer l'image de 15 degrés vers la droite et de 15 degrés vers le haut
   - appliquer une rotation de l'image de 15 degrés vers la droite
   - incliner l'image de 15 degrés vers la droite et de 15 degrés vers le bas
4. En CSS, quel est le rôle de la propriété `text-transform` ?
   - modifier la couleur du texte
   - transformer les caractères d'un texte en majuscules ou en minuscules
   - transformer les caractères d'un texte en image
5. En JavaScript, quelle méthode utiliser pour afficher du texte directement dans une page HTML ?
   - `alert()` — `prompt()` — `document.write()`
6. En PHP, quelle fonction prédéfinie utiliser pour vérifier la validité d'une date ?
   - `checkdate()` — `time()` — `date()`
7. En PHP, quelle fonction utiliser pour vérifier si une variable de type tableau est définie ?
   - `array()` — `isset()` — `count()`
8. En SQL, quel mot-clé n'est pas utilisé pour définir une contrainte de domaine ?
   - `UNIQUE` — `CHECK` — `DEFAULT`

---

## Exercice N°2 (5 points) — Base de données BD_Collecte

Pour améliorer la gestion de collecte des poubelles intelligentes, une base de données nommée **BD_Collecte** est envisagée. Ces poubelles sont équipées de capteurs fournissant en temps réel des données telles que le poids et le niveau de remplissage. Ces données permettront aux agents responsables d'identifier les poubelles pleines et de les collecter en fin de journée.

Structure simplifiée (représentation textuelle) :

```
Poubelle (idPoub, nomRue, volMax)
Remplissage (dateRemp, idPoub#, nivRemp)
Agent (idAg, nomAg, telAg)
Collecte (dateCol, idPoub#, poids, idAg#)
```

| Champ    | Description                                                        |
| -------- | ------------------------------------------------------------------ |
| idPoub   | Identifiant d'une poubelle                                         |
| nomRue   | Nom de la rue où se trouve une poubelle                            |
| volMax   | Volume maximal d'une poubelle                                      |
| dateRemp | **Date** et **heure** de l'enregistrement du niveau de remplissage |
| nivRemp  | Niveau de remplissage d'une poubelle exprimé en pourcentage        |
| idAg     | Identifiant d'un agent responsable d'une collecte                  |
| nomAg    | Nom d'un agent                                                     |
| telAg    | Numéro de téléphone d'un agent                                     |
| dateCol  | **Date** de collecte d'une poubelle                                |
| poids    | Poids d'une poubelle collectée                                     |

### 1ère partie : Interprétation de la représentation textuelle

1. Compléter la représentation graphique de la base BD_Collecte (tables Remplissage, Poubelle, Collecte, Agent) tout en indiquant les **clés primaires**, les **clés étrangères** et les **cardinalités** (types de relations).
2. Mettre une croix dans la colonne Vrai ou Faux pour chaque proposition :
   - a. Une poubelle est associée à une seule rue.
   - b. Un agent collecte toujours le contenu de la même poubelle.
   - c. Au cours d'une journée, le niveau de remplissage d'une poubelle peut avoir différentes valeurs.
   - d. À une date donnée, le champ « poids » correspond au poids total de toutes les poubelles collectées par un agent donné.
   - e. À une date donnée, une poubelle peut être collectée plusieurs fois.

### 2ème partie : Extension et modification de la base de données

_À chaque représentation textuelle demandée, indiquer les clés primaires et étrangères._

1. Le nom d'une rue pouvant figurer dans plusieurs enregistrements de la table **Poubelle**, on évite cette redondance en ajoutant une table **Rue** contenant l'identifiant de la rue et son nom. Proposer une représentation textuelle de **Poubelle** et **Rue** en assurant la relation entre elles.
2. Pour automatiser la collecte, des véhicules autonomes remplaceront les agents, qui seront chargés de les superviser. Chaque véhicule est identifié par un identifiant et une capacité maximale de collecte. Règles de gestion :
   - **R1** : un véhicule est affecté à un seul agent et un agent peut superviser plusieurs véhicules.
   - **R2** : un véhicule peut effectuer plusieurs collectes et une collecte est réalisée par un seul véhicule.

   Proposer une représentation textuelle de **Agent**, **Vehicule** et **Collecte** respectant R1 et R2.

---

## Exercice N°3 (13 points) — Plateforme StreamVision

Une plateforme de partage de vidéos en streaming offre à ses utilisateurs la possibilité de regarder, partager et commenter des vidéos. Les données sont enregistrées dans la base **StreamVision** :

```
Proprietaire (emailProp, nomProp, pswProp)
Chaine (idChaine, nomChaine, emailProp#)
Video (idVideo, titreVideo, duree, taille, idChaine#)
Tag (idTag, libelleTag)
VideosTag (idVideo#, idTag#)
Utilisateur (emailUtilis, nomUtilis, pswUtilis)
Visualisation (idVis, dateVis, commentaire, appreciation, emailUtilis#, idVideo#)
```

`duree` est exprimée en minutes (entier), `taille` en Mo (réel), `dateVis` est de type date et heure, `appreciation` vaut 1 (like) ou -1 (dislike).

Le site est composé des pages `index.html`, `mesStyles.css`, `mesControles.js` et `commenter.php` (extraits ci-dessous, la Figure 1 montrant l'aperçu de la page).

### Figure 2 — extrait de index.html

```html
1 2
<html lang="fr">
  3
  <head>
    4
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
    5
    <title>Univers de la robotique</title>
    6
    <script src="mesControles.js"></script>
    7
    <link href="mesStyles.css" rel="stylesheet" type="text/css" />
    8
  </head>
  9
  <body>
    10
    <header><h1>Tech@boot : L'univers fascinant de la robotique</h1></header>
    11
    <nav>
      12
      <div class="zone" id="div1">
        13 <img id="img1" src="img/src1.jpeg" alt="" onclick="chargerVideo(1)" /> 14
        <p>Poubelle intelligente</p>
        15
      </div>
      16
      <div class="zone" id="div2">
        17 <img id="img2" src="img/src2.jpeg" alt="" onclick="chargerVideo(2)" /> 18
        <p>Programmez votre 1er robot</p>
        19
      </div>
      20
      <div class="zone" id="div3">
        21 <img id="img3" src="img/src3.jpeg" alt="" onclick="chargerVideo(3)" /> 22
        <p>Robotique pour enfants</p>
        23
      </div>
      24
    </nav>
    25
    <section>
      26
      <div class="zoneP" id="div5">
        27 <video class="video" id="video1" src="video/vid1.mp4" controls></video> 28
        <details>Découvrez le monde fascinant des robots intelligents...</details>
        29
        <div class="zone">
          30
          <fieldset>
            <legend>Avis et commentaire</legend>
            31
            <form action="commenter.php" method="post" onsubmit="valide()">
              32 <input type="radio" name="like" id="oui" value="1" />J'aime 33
              <input type="radio" name="dislike" id="non" value="-1" />Je n'aime pas 34
              <input type="text" name="comment" id="comment" /> 35
              <input type="submit" name="submit" id="btn" value="Envoyer" /> 36
            </form>
            37
          </fieldset>
          38
        </div>
        39
      </div>
      40
    </section>
    41
    <footer><h1>Contact : support@techboot.info</h1></footer>
    42
  </body>
  43
</html>
```

### Figure 3 — extrait de mesStyles.css (le numéro de règle est ajouté pour les questions)

```css
/* Règle 1 */
.video {
  opacity: 0.5;
}
/* Règle 2 */
video:hover {
  transform: scale(1.2);
}
/* Règle 3 */
#video1 {
  border-style: solid;
}
/* Règle 4 */
.zone {
  overflow: auto;
}
/* Règle 5 */
img {
  width: 200px;
  height: 180px;
}
/* Règle 6 */
#div1 {
  top: 100px;
}
/* Règle 7 */
#div2 {
  top: 340px;
}
/* Règle 8 */
#div3 {
  top: 580px;
}
/* Règle 9 */
#div1,
#div2,
#div3 {
  right: 100px;
  width: 200px;
  height: 220px;
  border-bottom: 4px solid black;
}
```

### Figure 4 — extrait de mesControles.js

```javascript
1 function formater(ch){
2   while(ch.indexOf(" ",0) != -1)
3     { ch = ch.replace(" ","_") }
4   if(ch.length>0){
5     ch = ch.toLowerCase()
6     ch = ch.replace(ch.charAt(0),ch.charAt(0).toUpperCase())
7   }
8   return ch
9 }
10 function valide(){
11   let resultat = false
12   let like = document.getElementById("oui")
13   let dislike = document.getElementById("non")
14   let comment = document.getElementById("comment").value
15   comment = comment.trim()
16   if(like.checked || dislike.checked || comment.length>0){
17     resultat = true
18     if(comment.length>0)
19       document.getElementById("comment").value = formater(comment)
20   }
21   return resultat
22 }
```

### Figure 5 — extrait de commenter.php

```php
3 function conforme ($comment)
4 {
5   $wordsFilter = array ("gratuit","offre","urgent");
6   $i = 0;
7   $trouve = false;
8   do {
9     $unMot = $wordsFilter[$i];
10    $i = $i+1;
11    if (strpos($comment,$unMot)!== false)
12      $trouve = true;
13  } while ($i < count($wordsFilter) && !$trouve );
14
15  return !$trouve;
16 }
```

### 1ère partie : Programmation Web

#### I. Analyse et interprétation du code HTML (Figure 2) — une seule croix par question

1. Quelle déclaration `doctype` doit figurer à la ligne N° 1 pour que le navigateur interprète la page comme un document HTML5 ? (`<!DOCTYPE html5>` — `<!DOCTYPE html5 PUBLIC>` — `<!DOCTYPE html>`)
2. Comment décrire le rôle de la balise `<section>` de la ligne N° 25 ? (contenu du pied de la page — contenu principal de la page — contenu de navigation de la page)
3. À la ligne N° 28, quelle balise inclure dans `<details>` pour remplacer son titre « Détails » par « Afficher plus » ? (`<summary>` — `<title>` — `<caption>`)
4. À la ligne N° 31, quelle est la condition de déclenchement de l'appel de `commenter.php`, sachant qu'il manque le mot-clé `return` dans l'attribut `onsubmit` ? (uniquement si `valide()` retourne vrai — uniquement si elle retourne faux — quelle que soit la valeur retournée)
5. Pourquoi les lignes N° 32 et 33 permettent-elles de sélectionner les deux boutons radio à la fois ? (valeurs différentes pour `name` — pour `id` — pour `value`)

#### II. Analyse et interprétation du code CSS (Figures 2 et 3)

1. Pour chaque numéro de règle 1, 2 et 3 : indiquer le type de sélecteur (classe, identifiant, élément), si la règle est liée à un événement (Vrai/Faux) et décrire l'effet de la règle sur l'élément `video`.
2. Quels sont les numéros des règles de `mesStyles.css` qui vont s'appliquer sur l'élément d'identifiant `div1` ?

#### III. Analyse et interprétation du code JavaScript (Figure 4)

1. Donner le résultat de l'exécution de l'instruction de la ligne N° 6 lorsque la variable `ch` contient la valeur `bravo`.
2. Donner le rôle de l'instruction de la ligne N° 15.
3. Parmi trois aperçus du formulaire (1er : champ rempli par « bravo » ; 2e : rien de saisi ni coché ; 3e : « Je n'aime pas » coché, sans commentaire), lequel permet d'activer, après soumission, l'exécution de `formater()` de la ligne N° 19 ?
4. D'après la ligne N° 19, dans quel élément du formulaire sera placé le résultat de l'exécution de `formater(comment)` ?

#### IV. Analyse et interprétation du code PHP (Figure 5)

Donner la valeur des variables `$i`, `$trouve` et `$unMot` après exécution de la fonction `conforme` :

- 1er cas : `$comment = "Bravo"`
- 2ème cas : `$comment = "Profitez offre spéciale"`

### 2ème partie : Gestion de la base de données

#### I. Interprétation des requêtes

Extrait des tables **Chaine** et **Video** :

| idChaine | nomChaine   | emailProp        |
| -------- | ----------- | ---------------- |
| 1        | PgmAlgo     | ppgm@gmail.com   |
| 2        | WebX        | pweb@gmail.com   |
| 3        | Crypto4tous | adcryp@gmail.com |

| idVideo | titreVideo | duree | taille | idChaine |
| ------- | ---------- | ----- | ------ | -------- |
| 110     | Video1     | 30    | 428    | 1        |
| 225     | Video2     | 40    | 753    | 1        |
| 303     | Video3     | 10    | 259    | 2        |
| 400     | Video4     | 20    | 145    | 2        |

Requête **R** :

```sql
SELECT nomChaine, SUM(duree)
FROM Chaine C, Video V
WHERE C.idChaine = V.idChaine
GROUP BY nomChaine
HAVING SUM(duree) > 60
```

1. En se basant sur les extraits fournis, donner le résultat de l'exécution de la requête R.
2. En déduire le rôle de la requête R.

#### II. Manipulation des données et de la structure de la base

**A — Écrire en SQL les requêtes permettant de répondre aux questions suivantes :**

1. Quelles sont les chaînes de la plateforme ? _On affichera les champs `nomChaine` et `emailProp`._
2. Qui sont les utilisateurs qui ont visualisé la vidéo d'identifiant 2438 ? _On affichera les champs `emailUtilis` et `dateVis`._
3. Quelles sont les vidéos de la chaîne nommée « info_Experts » ? _On affichera les champs `titreVideo` et `duree`._
4. Quelle est la dernière date de visualisation pour l'utilisateur ayant le nom « Ch240T » ?
5. Quelle est la taille totale de toutes les vidéos de la chaîne nommée « info_Experts » ?
6. Quel est le nombre de visualisations de chaque vidéo associée au tag d'identifiant 7 ? _On affichera le champ `idVideo` ainsi que le nombre de ses visualisations, triées par ordre décroissant du nombre de visualisations._
7. Quelles sont les vidéos de la chaîne d'identifiant 5 dont la durée est supérieure à la durée moyenne des vidéos publiées par cette même chaîne ? _On affichera les champs `idVideo`, `titreVideo` et `duree`._

**B — Écrire les requêtes SQL permettant de répondre aux situations suivantes :**

1. Un algorithme automatique détecte le nouveau tag « HTMX ». Insérer ce tag dans la table correspondante, sachant que l'identifiant d'un tag est un champ auto-incrémenté.
2. En raison du non-respect des conditions d'utilisation, supprimer toutes les vidéos de la chaîne d'identifiant 3.
3. Pour la vidéo d'identifiant 2216, remplacer par la chaîne « \*\*\* » les commentaires contenant le texte « la fin du film ».
4. Ajouter à la table **Video** une colonne nommée `langue`, de type chaîne de caractères de longueur fixe de 2 caractères.
