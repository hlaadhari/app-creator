# Baccalauréat 2023 - Session de Contrôle

## Section : Sciences de l'Informatique

### Épreuve : Systèmes et Technologies de l'Informatique (Écrit Théorique)

**Durée : 3 heures | Coefficient : 1.8**

---

### Exercice N°1 : QCM Notions Web & BDD (2 points)

Pour chaque question, cochez l'unique bonne réponse parmi les propositions fournies.

1. **HTML5** : Quels sont les éléments nécessaires pour créer une liste non ordonnée à puces ?
   - `<ul> et <li>`
   - `<ol> et <li>`
   - `<dl> et <dt>`
   - `<table> et <tr>`

2. **CSS3** : Quelle balise permet de lier une feuille de style externe 'mesStyles.css' au document HTML ?
   - `<link href="mesStyles.css" rel="stylesheet" type="text/css">`
   - `<style src="mesStyles.css">`
   - `<script href="mesStyles.css">`
   - `<css link="mesStyles.css">`

3. **JavaScript** : En JavaScript, quelle est la syntaxe correcte pour appeler une fonction non paramétrée nommée `f1` ?
   - `f1();`
   - `call f1;`
   - `function f1();`
   - `f1;`

4. **JavaScript** : En JavaScript, quelle fonction affiche une boîte de dialogue informative avec un bouton OK ?
   - `alert("Bonjour");`
   - `confirm("Bonjour");`
   - `prompt("Bonjour");`
   - `print("Bonjour");`

5. **PHP / MySQLi** : En PHP / MySQLi, quelle fonction retourne le nombre de lignes renvoyées par une requête SELECT ?
   - `mysqli_num_rows()`
   - `mysqli_affected_rows()`
   - `mysqli_count_rows()`
   - `mysqli_fetch_row()`

6. **PHP** : En PHP, quelle est l'utilité exacte de la fonction `isset($a)` ?
   - Vérifier si la variable `$a` est déclarée et différente de NULL
   - Affecter une nouvelle valeur par défaut à `$a`
   - Détruire la variable `$a` de la session
   - Calculer la longueur en octets de la variable `$a`

7. **CSS3** : En CSS3, quelle règle applique un arrière-plan bleu à tous les titres de niveau 6 ?
   - `h6 { background-color: blue; }`
   - `#h6 { background: blue; }`
   - `.h6 { color: blue; }`
   - `h6 { color-background: blue; }`

8. **CSS3** : En CSS3, quelle règle permet de centrer horizontalement le texte d'un paragraphe portant la classe 'bloc' ?
   - `.bloc { text-align: center; }`
   - `#bloc { align: center; }`
   - `p.bloc { text-center: true; }`
   - `bloc { align-text: center; }`

---

### Exercice N°2 : Scrabble du Développeur Web (3 points)

Reconstituez le mot-clé informatique exact à partir du tirage de lettres et de la définition fournie :

1. **Tirage 1** (`M O P E T R P` - 6 lettres) : Méthode JavaScript pour afficher une boîte de dialogue avec zone de saisie.
2. **Tirage 2** (`F E R O T O U` - 6 lettres) : Élément sémantique HTML5 définissant le pied d'une page ou d'une section.
3. **Tirage 3** (`G E R L S N T` - 6 lettres) : Fonction PHP retournant le nombre de caractères d'une chaîne.
4. **Tirage 4** (`Q E U I U N Y` - 6 lettres) : Contrainte d'intégrité SQL garantissant l'unicité des valeurs d'une colonne.
5. **Tirage 5** (`H T K C E C Q` - 5 lettres) : Clause SQL permettant de spécifier une condition de validation de domaine.
6. **Tirage 6** (`T R U N C M I` - 4 lettres) : Méthode JavaScript supprimant les espaces aux extrémités d'une chaîne.

---

### Exercice N°3 : Base « Ebook » & Programmation Web (7.5 points)

#### Partie 1 : Modélisation Relationnelle (3.5 points)

1. Traduire la règle R5 (Spécialités évaluateurs) : Table `Specialite` et modification d'`Evaluateur`.
2. Traduire la règle R1 modifiée (Co-auteurs N:M) : Table d'association `Redaction`.
3. Traduire la gestion des adresses emails multiples d'un auteur : Table `Adresse`.
4. Traduire la règle R3 modifiée (Évaluations répétées dans le temps) : Clé primaire composite dans `Evaluation`.

#### Partie 2 : Programmation Web (4 points)

- Répondre par Vrai ou Faux aux questions d'analyse HTML5 / CSS3.
- Compléter la fonction JavaScript `verifIdentifiant()`.

---

### Exercice N°4 : Base « SeismicSTAT » & Requêtes SQL (7.5 points)

Le schéma relationnel textuel de la base SeismicSTAT est :

- `Pays (#codePays, nomPays)`
- `Ville (#codeVille, nomVille, #codePays)`
- `LieuSeisme (#codeLieu, latitude, longitude, #codeVille)`
- `Seisme (#dateSeisme, #codeLieu, magnitude)`

#### Requêtes d'Interrogation et de Mise à Jour :

1. Représentation textuelle normalisée.
2. Interprétation des effets des requêtes `UPDATE`, `DROP`, `LIKE` et `COUNT() ... GROUP BY`.
3. Requêtes SQL LID (séismes d'une ville, pays, seuils de magnitude, année 2022, agrégats et sous-requêtes).
4. Requêtes SQL LDD / LMD (`ALTER TABLE`, `DELETE`, `UPDATE`, `INSERT`).
