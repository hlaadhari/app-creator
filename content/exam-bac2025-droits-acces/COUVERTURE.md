# Matrice de Couverture Pédagogique — Bac 2025 Droits d'Accès (`exam-bac2025-droits-acces`)

## 1. Synthèse Pédagogique

- **Sujet** : `exam-bac2025-droits-acces`
- **Titre** : Bac 2025 - Droits d'Accès aux Documents Partagés
- **Module** : Module C — Épreuves Pratiques Officielles du Baccalauréat
- **Référentiel** : `bac-si-tn` (Baccalauréat Sciences de l'Informatique — Épreuve Pratique STI)
- **Session source** : Baccalauréat 2025 (Sujet spécimen officiel)
- **Barème total** : 20 points
- **Nombre de critères** : 13 critères

---

## 2. Matrice Consignes ➔ Critères ➔ Sondes de Test

| N°  | Consigne de l'Énoncé                                                                         | Fichier Ciblé      | Id Critère | Sonde / Type de Vérification                                         |  Points  |
| :-: | :------------------------------------------------------------------------------------------- | :----------------- | :--------- | :------------------------------------------------------------------- | :------: |
|  1  | Créer la base `bd2025`, importer les tables et définir la table d'association `droit`        | `index.html`       | `EX25-01`  | Correction Enseignant: vérification structure relationnelle exportée | 1.25 pt  |
|  2  | Relier toutes les pages à `mesStyles.css` et respecter les noms des fichiers                 | `index.html`       | `EX25-02`  | DOM Probe: `link[rel="stylesheet"][href="mesStyles.css"]`            |  0.5 pt  |
|  3  | Structurer `index.html` avec header (logo + h1), nav (3 liens), section et footer            | `index.html`       | `EX25-03`  | DOM Probe: header, img, h1, nav, section, footer                     |  2 pts   |
|  4  | Mettre en forme l'index : h1/footer en bleu avec texte centré blanc                          | `index.html`       | `EX25-04`  | CSS Computed: `background-color === "blue"` sur `h1`                 | 1.25 pt  |
|  5  | Créer `utilisateur.html` avec le formulaire et les champs requis                             | `utilisateur.html` | `EX25-05`  | DOM Probe: formulaire avec idUtil, nomPrenom, mdp, confMdp           | 1.25 pt  |
|  6  | Mettre en forme le fieldset en bordure pointillée dans `utilisateur.html`                    | `utilisateur.html` | `EX25-06`  | CSS Computed: `border-style === "dotted"` sur `fieldset`             |  0.5 pt  |
|  7  | Contrôler dans `verif1()` le format U+3 chiffres et nom/prénom alphabétique (5-50 car)       | `utilisateur.html` | `EX25-07`  | JS Test Case: validation identifiant et nomPrenom avec `alpha()`     |   1 pt   |
|  8  | Contrôler dans `verif1()` la longueur du mot de passe (6 car) et la concordance              | `utilisateur.html` | `EX25-08`  | JS Test Case: validation conformité mot de passe et confirmation     | 1.25 pt  |
|  9  | Dans `ajout.php`, vérifier l'unicité de l'identifiant utilisateur avant insertion            | `ajout.php`        | `EX25-09`  | PHP Probe: détection doublon utilisateur et message explicite        | 1.25 pt  |
| 10  | Dans `ajout.php`, insérer le nouvel utilisateur dans la table `utilisateur`                  | `ajout.php`        | `EX25-10`  | PHP Probe: exécution requête INSERT et message de confirmation       |  1.5 pt  |
| 11  | Concevoir `droit.html` et valider les sélections dans `verif2()`                             | `droit.html`       | `EX25-11`  | DOM & JS Test Case: formulaire droit et validation sélections        |  2 pts   |
| 12  | Dans `droit.php`, insérer ou mettre à jour les autorisations (lecture, écriture, impression) | `droit.php`        | `EX25-12`  | PHP Probe: gestion des droits d'accès dans la table `droit`          |  2 pts   |
| 13  | Dans `affichage.php`, restituer la liste des droits accordés sous forme de tableau           | `affichage.php`    | `EX25-13`  | PHP Probe: tableau récapitulatif des utilisateurs et permissions     | 4.25 pts |

---

## 3. Banc Didactique Tripartite

- **`solution/`** : Implémentation officielle complète conforme aux 3 pages HTML et 3 scripts PHP (20/20 pts).
- **`solution-alt/`** : Implémentation alternative avec fonctions modulaires et styles consolidés (20/20 pts).
- **`solution-invalide/`** : Implémentation avec validation JavaScript permissive laissant passer des identifiants non conformes.
