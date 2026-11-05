# Baccalauréat 2023 - Session Principale

## Section : Sciences de l'Informatique

### Épreuve : Systèmes et Technologies de l'Informatique (Écrit Théorique)

**Durée : 3 heures | Coefficient : 1.8**

---

### Exercice N°1 : QCM Notions Web & Programmation (2 points)

Pour chaque question, cochez l'unique bonne réponse parmi les propositions fournies.

1. **HTML5** : Quel attribut permet de cocher une case à cocher par défaut ?
   - `checked`
   - `selected`
   - `value`
   - `default`

2. **HTML5** : Quelle balise permet de regrouper visuellement et logiquement des champs de formulaire ?
   - `<fieldset>`
   - `<group>`
   - `<section>`
   - `<legend>`

3. **CSS3** : À quel élément s'applique la règle `p.eleve { color: blue; }` ?
   - Aux éléments `<p>` ayant la classe 'eleve'
   - À l'unique élément d'identifiant #eleve
   - À tous les éléments `<p>` et à tous les éléments de classe 'eleve'
   - Aux éléments de classe 'eleve' enfants directs d'un `<p>`

4. **CSS3** : Quelle règle applique la couleur rouge simultanément aux éléments d'identifiants `p1` et `p2` ?
   - `#p1, #p2 { color: red; }`
   - `#p1 #p2 { color: red; }`
   - `#p1 + #p2 { color: red; }`
   - `#p1.p2 { color: red; }`

5. **PHP** : Quelle superglobale récupère un paramètre transmis en GET sous le nom 'cin' ?
   - `$_GET["cin"]`
   - `$_POST["cin"]`
   - `$_URL["cin"]`
   - `$_SERVER["cin"]`

6. **PHP** : Quelle instruction inclut obligatoirement le fichier 'connexion.php' en interrompant le script en cas d'erreur ?
   - `require("connexion.php");`
   - `include("connexion.php");`
   - `import("connexion.php");`
   - `load("connexion.php");`

7. **JavaScript** : Quelle méthode native supprime les espaces blancs au début et à la fin d'une chaîne `ch` ?
   - `ch.trim()`
   - `ch.strip()`
   - `ch.clean()`
   - `ch.deleteSpaces()`

8. **JavaScript** : Quelle boucle for s'exécute exactement 5 fois pour les indices de 0 à 4 ?
   - `for (i = 0; i < 5; i++)`
   - `for (i = 0; i <= 5; i++)`
   - `for (i = 1; i < 5; i++)`
   - `for (i = 0; i < 4; i++)`

---

### Exercice N°2 : Grille / Mots Croisés du Développeur Web (3 points)

Déduisez le terme technique informatique exact correspondant à chaque définition :

1. **Ligne 1** (mot de 6 lettres) : Propriété CSS spécifiant le décalage vertical par rapport au bas.
2. **Ligne 2** (mot de 4 lettres) : Commande d'affichage PHP.
3. **Ligne 3** (mot de 5 lettres) : Méthode JavaScript d'arrondi à l'entier le plus proche.
4. **Ligne 4** (mot de 7 lettres) : Événement HTML5 déclenché dès que la valeur d'un champ change.
5. **Ligne 5** (mot de 6 lettres) : Contrainte d'intégrité SQL d'unicité de colonne.
6. **Ligne 6** (mot de 4 lettres) : Méthode HTTP d'envoi confidentiel de formulaire.

---

### Exercice N°3 : Intégration Web & JavaScript (4 points)

- **Partie A** : Déclarations HTML5 et règles CSS3 du formulaire `ajoutCours.html` (Vrai/Faux).
- **Partie B** : Complétion de la fonction de contrôle JavaScript `test(x)`.

---

### Exercice N°4 : Modélisation Relationnelle « EduNum-FOAD » (3 points)

1. Association des représentations graphiques aux règles de gestion R6 et R7.
2. Correction de l'anomalie de conception dans la relation Matière-Leçon.
3. Modélisation textuelle de l'association Établissement-Apprenant (Règle R5).

---

### Exercice N°5 : Base « BioLab-Medoc » & Requêtes SQL (8 points)

Base de données médicale reliant `Plante`, `Forme`, `Medicament`, `Composition`, `Maladie` et `Traitement`.

- **Partie 1** : Vrai / Faux sur le schéma relationnel.
- **Partie 2 - I** : Interprétation sémantique de requêtes SQL (`DELETE`, `INSERT`, `WHERE = '4%'`, `ORDER BY 2`).
- **Partie 2 - II** : Requêtes LDD (`ALTER TABLE`).
- **Partie 2 - III - A** : 8 requêtes d'interrogation LID (jointures, agrégations, sous-requêtes, `HAVING`).
- **Partie 2 - III - B** : 2 requêtes de manipulation LMD (`INSERT`, `UPDATE`).
