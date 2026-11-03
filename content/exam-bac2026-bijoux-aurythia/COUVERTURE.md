# Matrice de Couverture Pédagogique — Bac 2026 Bijoux Aurythia (`exam-bac2026-bijoux-aurythia`)

## 1. Synthèse Pédagogique

- **Sujet** : `exam-bac2026-bijoux-aurythia`
- **Titre** : Bac 2026 - Bijoux Aurythia (Session de 8h30)
- **Module** : Module C — Épreuves Pratiques Officielles du Baccalauréat
- **Référentiel** : `bac-si-tn` (Baccalauréat Sciences de l'Informatique — Épreuve Pratique STI)
- **Session source** : Baccalauréat 2026 (Épreuve blanche calibrée - 08h30)
- **Barème total** : 20 points
- **Nombre de critères** : 12 critères

---

## 2. Matrice Consignes ➔ Critères ➔ Sondes de Test

| N°  | Consigne de l'Énoncé                                                                        | Fichier Ciblé     | Id Critère | Sonde / Type de Vérification                                   |  Points  |
| :-: | :------------------------------------------------------------------------------------------ | :---------------- | :--------- | :------------------------------------------------------------- | :------: |
|  1  | Concevoir la BDD `bd_bijoux`, créer les tables et clés étrangères                           | `index.html`      | `EX26B-01` | Correction Enseignant: intégrité des tables et associations    | 1.25 pt  |
|  2  | Relier les pages à `mesStyles.css` et respecter scrupuleusement la nomenclature             | `index.html`      | `EX26B-02` | DOM Probe: `link[rel="stylesheet"][href="mesStyles.css"]`      |  0.5 pt  |
|  3  | Structurer `index.html` avec en-tête, barre de navigation, section centrale et footer       | `index.html`      | `EX26B-03` | DOM Probe: header, nav, liens, section, footer                 |  2 pts   |
|  4  | Styliser l'index avec titre doré, fond sombre et effets sur les liens de navigation         | `index.html`      | `EX26B-04` | CSS Computed: couleurs et typographie de la charte             | 1.25 pt  |
|  5  | Créer `ajout.html` pour la saisie de description, type de bijou, métaux et poids            | `ajout.html`      | `EX26B-05` | DOM Probe: formulaire ajout avec champs requis                 | 1.25 pt  |
|  6  | Mettre en forme le formulaire `ajout.html` avec bordures et alignements CSS                 | `ajout.html`      | `EX26B-06` | CSS Computed: bordure et espacements du fieldset               |  0.5 pt  |
|  7  | Contrôler dans `verif1()` la description non vide, sélection de métal et poids > 0          | `ajout.html`      | `EX26B-07` | JS Test Case: validation description, métal et poids positif   |  1.5 pt  |
|  8  | Dans `ajout.php`, insérer le bijou et sa composition dans les tables correspondantes        | `ajout.php`       | `EX26B-08` | PHP Probe: exécution des requêtes INSERT et confirmation       | 2.75 pts |
|  9  | Créer `evaluation.html` et vérifier dans `verif2()` l'évaluation et l'estimation financière | `evaluation.html` | `EX26B-09` | DOM & JS Test Case: contrôle note expert et estimation > 0     |  2 pts   |
| 10  | Dans `evaluation.php`, enregistrer l'expertise du bijou sélectionné                         | `evaluation.php`  | `EX26B-10` | PHP Probe: mise à jour/insertion dans la table des évaluations |  2 pts   |
| 11  | Dans `liste.php`, afficher les bijoux enregistrés sous forme d'un tableau HTML              | `liste.php`       | `EX26B-11` | PHP Output Probe: tableau récapitulatif `<table>`              | 2.5 pts  |
| 12  | Calculer le montant total estimé de la collection via une requête SQL d'agrégation SUM()    | `liste.php`       | `EX26B-12` | PHP Output Probe: affichage de la valeur totale calculée       | 2.5 pts  |

---

## 3. Banc Didactique Tripartite

- **`solution/`** : Implémentation complète et rigoureuse respectant l'ensemble du cahier des charges (20/20 pts).
- **`solution-alt/`** : Implémentation alternative avec fonctions réutilisables et requêtes nettoyées (20/20 pts).
- **`solution-invalide/`** : Implémentation comportant des scripts de contrôle sans vérification de validité.
