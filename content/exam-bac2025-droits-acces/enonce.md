# Épreuve Pratique du Baccalauréat STI — Session 2025

## Sujet : Droits d'accès aux documents partagés (Futura Horizon AI)

**Durée :** 2 heures (120 minutes)  
**Coefficient :** 1.2  
**Note Maximale :** 20 points (Mode Examen)

---

## Contexte

Le service informatique de la société **Futura Horizon AI** souhaite un site Web pour gérer les droits d'accès aux documents partagés sur son serveur. Le site doit permettre :

- d'ajouter un utilisateur ;
- d'attribuer des droits d'accès à un utilisateur pour un document ;
- d'afficher les droits d'accès relatifs à un document.

Le dossier de travail se nomme `SW<numéro d'inscription>`. Les ressources fournies sont : `tables.sql`, `logo.png`, `mesStyles.css`, `mesControles.js`, `droit.html`, `affichage.html` et `affichage.php`.

Représentation textuelle de la base (nommée `bd2025` dans la plateforme) :

```
Document    (idDoc, nomDoc, dateCreation)
Utilisateur (idUtil, nomPrenom)
Droit       (idDoc#, idUtil#, ecriture, lecture, impression)
```

| Champ                               | Type et contrainte                                          |
| ----------------------------------- | ----------------------------------------------------------- |
| `idDoc`                             | Chaîne de 5 caractères                                      |
| `nomDoc`                            | Chaîne de 50 caractères                                     |
| `dateCreation`                      | Date et heure                                               |
| `idUtil`                            | Chaîne de 4 caractères                                      |
| `nomPrenom`                         | Chaîne de 50 caractères                                     |
| `ecriture`, `lecture`, `impression` | Caractère non vide : `O` si le droit est accordé, `N` sinon |

---

## Travail Demandé

### Partie A : base de données

1. Créer la base de données.
2. Importer `tables.sql` (tables `document` et `utilisateur`).
3. Créer la table `droit` conformément à la représentation textuelle.
4. Créer les relations entre les tables.
5. Exporter la base au format SQL dans le dossier de travail.

### Partie B : documents Web

Consignes : les fonctions JavaScript vont dans `mesControles.js`, les règles CSS dans `mesStyles.css`, toutes les pages sont liées à `mesStyles.css`, `utilisateur.html` et `droit.html` sont liées à `mesControles.js`, et le bouton « Annuler » de chaque formulaire réinitialise les champs.

**1. Page `index.html`**

- Un `<header>` avec l'image `logo.png` et le titre de niveau 1 « Les droits d'accès aux documents partagés ».
- Un `<main>` avec une navigation `<nav>` (trois liens, chacun sur sa ligne : Ajout d'un utilisateur, Attribution des droits d'accès, Affichage des droits d'accès) et une zone d'affichage `<section>` qui contient par défaut `utilisateur.html`.
- Un `<footer>` avec « Copyright - Futura Horizon AI - 2025 ».
- Mise en forme : `h1` et `footer` sur fond bleu, texte blanc centré ; liens avec une ombre rouge (décalage 5px / 5px, flou 3px) et en italique lorsqu'ils sont actifs.

**2. Page `utilisateur.html`** : formulaire d'ajout (identifiant, nom et prénom, boutons Ajouter et Annuler).

- Le bouton « Ajouter » appelle la fonction `verif1` et le fichier `ajout.php`.
- Boutons centrés ; `fieldset` avec bordure de 2 pixels en pointillé.
- `verif1` : l'identifiant est une chaîne de longueur 4 qui commence par `U` suivie de 3 chiffres ; le nom et prénom ne contient que des lettres et des espaces, sur 5 à 50 caractères (utiliser la fonction `alpha` fournie).
- `ajout.php` : insère l'utilisateur puis affiche « Utilisateur ajouté avec succès », ou « Erreur d'insertion des données » dans le cas contraire.

**3. Page `droit.html`** : attribution des droits.

- Champ « Identifiant de l'utilisateur » obligatoire ; le bouton « Enregistrer » appelle `verif2` et `droit.php`.
- Les cases « Ecriture », « Lecture » et « Impression » appellent respectivement `choix1`, `choix2` et `choix3`.
- `verif2` : sélection obligatoire d'un document et d'au moins un droit.
- `choix1` coche « Lecture » si « Ecriture » est cochée ; `choix2` décoche « Ecriture » et « Impression » si « Lecture » est décochée ; `choix3` coche « Lecture » si « Impression » est cochée.
- `droit.php` affiche « Erreur : Utilisateur inexistant » si l'identifiant n'existe pas ; sinon il met à jour les droits (message « Mise à jour des droits d'accès réussie ») si l'utilisateur en a déjà pour ce document, ou les insère (message « Insertion des droits d'accès réussie »).

**4. Page `affichage.html`** : le bouton « Afficher » appelle `affichage.php`, qui complète l'affichage : titre « Les droits d'accès relatifs au document : <nomDoc> », puis une ligne par utilisateur (nom et prénom, écriture, lecture, impression).

---

## Barème Officiel

| Partie    | Critère Évalué                                   | Points        |
| --------- | ------------------------------------------------ | ------------- |
| **A**     | Base de données (5 tâches de 0,25 pt)            | 1,25 pts      |
| **A**     | Respect des consignes                            | 0,5 pt        |
| **B-1**   | Page `index.html` (structure)                    | 2 pts         |
| **B-1**   | Mise en forme de l'index                         | 1,25 pts      |
| **B-2**   | Formulaire `utilisateur.html`                    | 1,25 pts      |
| **B-2**   | Mise en forme du formulaire                      | 0,75 pt       |
| **B-2**   | Fonction `verif1`                                | 1 pt          |
| **B-2**   | Fichier `ajout.php`                              | 2 pts         |
| **B-3**   | Page `droit.html`                                | 1,75 pts      |
| **B-3**   | Fonctions `verif2`, `choix1`, `choix2`, `choix3` | 2 pts         |
| **B-3**   | Fichier `droit.php`                              | 4,25 pts      |
| **B-4**   | Page `affichage.html`                            | 0,25 pt       |
| **B-4**   | Fichier `affichage.php`                          | 1,75 pts      |
| **Total** | **Note Globale Bac Pratique**                    | **20 points** |
