# Épreuve Pratique du Baccalauréat STI — Session 2026 (8h30)

## Sujet : Aurythia, l'art des bijoux

**Durée :** 2 heures (120 minutes)  
**Coefficient :** 1.2  
**Note Maximale :** 20 points (Mode Examen)

---

## Contexte

**Aurythia** fabrique des bijoux. Elle souhaite un site Web pour :

- ajouter un bijou et sa composition ;
- enregistrer l'évaluation d'un bijou par un expert ;
- afficher la liste des bijoux originaux.

Ressources fournies : `bijoux.jpg`, `ajout.html`, `bijoux.sql`, `mesStyles.css`, `mesControles.js` (fonction `nettoyage`). Le dossier de travail se nomme `SW<numéro d'inscription>`.

Représentation textuelle de la base (nommée `bd2026_bijoux` dans la plateforme) :

```
bijou       (idBij, description, prixVente, poids)
metal       (idMet, nomMet)
composition (idBij#, idMet#)
expert      (idExp, nomExp, mail)
evaluation  (idExp#, idBij#, finition, originalite, commentaire, dateEv)
```

| Champ | Type et propriété(s) |
| --- | --- |
| `idBij` | Chaîne de 5 caractères |
| `description` | Chaîne de 100 caractères |
| `prixVente` | Entier (dinars) |
| `poids` | Entier (grammes) |
| `idMet` | Caractère |
| `nomMet` | Chaîne de 50 caractères, unique |
| `idExp` | Chaîne de 3 caractères |
| `nomExp` | Chaîne de 50 caractères, unique |
| `mail` | Chaîne de 100 caractères, unique |
| `finition` | Entier : note du critère « Finition » |
| `originalite` | Caractère : `O` (oui) ou `N` (non) |
| `commentaire` | Chaîne de 200 caractères |
| `dateEv` | Date et heure de l'évaluation |

---

## Travail Demandé

### Étape 1 : base de données

1. Créer la base de données.
2. Importer `bijoux.sql`.
3. Définir les clés primaires des différentes tables, créer la table `evaluation` et établir les relations entre les tables.
4. Exporter la base au format SQL dans le dossier de travail.

### Étape 2 : documents Web

Consignes : les fonctions JavaScript vont dans `mesControles.js`, les règles CSS dans `mesStyles.css`, toutes les pages sont liées à `mesStyles.css`, `ajout.html` et `evaluation.html` sont liées à `mesControles.js`, et le bouton « Annuler » de chaque formulaire réinitialise les champs.

**1. Page `index.html`**

- `<header>` : un titre `<h1>` « Aurythia : l'art des bijoux » et une navigation `<nav>` sur une seule ligne avec les liens « Ajout d'un bijou » (`ajout.html`), « Evaluation d'un bijou » (`evaluation.html`) et « Liste des bijoux originaux » (`liste.php`).
- `<main>` : une `<section>` (zone d'affichage, `ajout.html` par défaut) et un `<aside>` à droite avec l'image `bijoux.jpg`.
- `<footer>` : liste à puces « Numéro Bleu : 82 10 00 00 » et « Email : admin@Aurythia.ai ».
- Mise en forme : `h1` en Arial, première lettre de chaque mot en majuscule, fond `#053860` ; `header` et `footer` sur fond `#053860` ; liens, `header` et `footer` en blanc (`#FFFFFF`) ; `nav` avec 15px de marge intérieure ; `section` et `aside` sur la même ligne ; puces carrées pour les `ul`.

**2. Page `ajout.html`**

- Le bouton « Enregistrer » appelle `valide1` et `ajout.php` ; le champ « Description » est obligatoire.
- Les `fieldset` « Détails » et « Composition » ont une bordure double `#0000FF` de 3px ; les deux boutons ont une ombre bleue décalée de 5px (horizontalement et verticalement).
- `valide1` : identifiant = deux lettres alphabétiques suivies de trois chiffres ; prix de vente supérieur ou égal à 100 ; au moins un métal sélectionné (l'arrière-plan de la composition devient rouge si elle est invalide).
- `ajout.php` : insère le bijou dans `bijou` et ses métaux dans `composition` ; affiche « Ajout effectué avec succès » ou « Erreur d'insertion ».

**3. Page `evaluation.html`** : formulaire d'évaluation (identifiant du bijou, expert, finition, originalité, commentaire).

- Experts (attribut `value`) : Chokri Sfaxi `A22`, Mohamed Jerbi `A23`, Radhia Gafsi `A24`. Finition de type `number`. Originalité : `O` pour OUI, `N` pour NON. Le bouton « Enregistrer » appelle `valide2` et `evaluation.php`.
- Les légendes « Evaluation d'un bijou » et « Critères d'évaluation » sont en gras et italique ; les boutons ont la même mise en forme qu'à la question 2.
- `valide2` : même contrôle d'identifiant qu'en 2 ; expert obligatoire ; finition = entier de 1 à 5 ; originalité obligatoire ; commentaire = au moins deux mots séparés par des espaces, chacun uniquement formé de lettres (utiliser `nettoyage`).
- `evaluation.php` : affiche « Bijou inexistant » si l'identifiant est inconnu ; « Bijou déjà évalué par cet expert » si l'évaluation existe ; sinon enregistre l'évaluation (`dateEv` = date et heure système) et affiche « Evaluation enregistrée avec succès ».

**4. Page `liste.php`** : liste des bijoux originaux (évaluations dont `originalite` vaut `O`), avec colonnes Identifiant, Description et Moyenne (Finition), la moyenne portant sur ces évaluations.

---

## Barème Officiel

| Partie | Critère Évalué | Points |
| --- | --- | --- |
| **Étape 1** | Manipulation de la base de données | 1,75 pts |
| **Étape 2-1** | Page `index.html` : structure (2) et mise en forme (2) | 4 pts |
| **Étape 2-2** | Ajout d'un bijou : HTML (1,25), CSS (1), `valide1` (1,75), `ajout.php` (1,75) | 5,75 pts |
| **Étape 2-3** | Évaluation : HTML (1,75), CSS (0,5), `valide2` (2,5), `evaluation.php` (2,5) | 7,25 pts |
| **Étape 2-4** | Page `liste.php` | 1,25 pts |
| **Total** | **Note Globale Bac Pratique** | **20 points** |
