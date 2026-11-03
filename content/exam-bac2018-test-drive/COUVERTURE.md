# Matrice de Couverture Pédagogique — Bac 2018 Test Drive (`exam-bac2018-test-drive`)

## 1. Synthèse Pédagogique

- **Sujet** : `exam-bac2018-test-drive`
- **Titre** : Bac 2018 - Évaluation & Essai Test Drive
- **Module** : Module C — Épreuves Pratiques Officielles du Baccalauréat
- **Référentiel** : `bac-si-tn` (Baccalauréat Sciences de l'Informatique — Épreuve Pratique STI)
- **Session source** : Baccalauréat 2018 (Session principale)
- **Barème total** : 20 points
- **Nombre de critères** : 7 critères

---

## 2. Matrice Consignes ➔ Critères ➔ Sondes de Test

| N°  | Consigne de l'Énoncé                                                                                   | Fichier Ciblé     | Id Critère | Sonde / Type de Vérification                                                      | Points  |
| :-: | :----------------------------------------------------------------------------------------------------- | :---------------- | :--------- | :-------------------------------------------------------------------------------- | :-----: |
|  1  | Élaborer le formulaire `evaluation.html` (champs cin, immatriculation, date, notes) vers `evaluer.php` | `evaluation.html` | `EX18-01`  | DOM Probe: `form[method="POST"][action="evaluer.php"]` et 6 champs                |  2 pts  |
|  2  | Appliquer les styles CSS requis dans `mesStyles.css` sur les fieldsets et conteneurs                   | `evaluation.html` | `EX18-02`  | CSS Probe: `border-width > 0` sur `fieldset`                                      |  2 pts  |
|  3  | Contrôler dans `test()` le format 8 chiffres du CIN et la sélection d'un véhicule                      | `evaluation.html` | `EX18-03`  | JS Test Case: rejet CIN invalide et véhicule non sélectionné                      | 2.5 pts |
|  4  | Contrôler dans `test()` la date du test et les bornes [1..5] des 3 notes (confort, conduite, sécurité) | `evaluation.html` | `EX18-04`  | JS Test Case: rejet des notes hors bornes [1..5] et date vide                     | 2.5 pts |
|  5  | Dans `evaluer.php`, se connecter à MySQLi et extraire les variables postées avec vérification          | `evaluer.php`     | `EX18-05`  | PHP MySQLi Probe: extraction et confirmation présence client                      |  4 pts  |
|  6  | Vérifier l'existence client/voiture et exécuter l'insertion dans la table `evaluation`                 | `evaluer.php`     | `EX18-06`  | PHP MySQLi Probe: insertion et vérification du nombre de lignes dans `evaluation` |  4 pts  |
|  7  | Calculer la moyenne du test et exécuter la requête d'agrégation `AVG()` pour le bilan global           | `evaluer.php`     | `EX18-07`  | PHP Output Probe: présence des mentions de moyenne/synthèse dans la réponse       |  3 pts  |

---

## 3. Banc Didactique Tripartite

- **`solution/`** : Implémentation officielle complète conforme aux attendus du jury national 2018 (20/20 pts).
- **`solution-alt/`** : Implémentation alternative avec fonctions modulaires et requêtes optimisées (20/20 pts).
- **`solution-invalide/`** : Implémentation avec script JS permissif et PHP omettant l'insertion en BDD.
