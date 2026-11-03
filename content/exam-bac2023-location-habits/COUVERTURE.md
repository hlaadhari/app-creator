# Matrice de Couverture Pédagogique — Bac 2023 Location d'Habits (`exam-bac2023-location-habits`)

## 1. Synthèse Pédagogique

- **Sujet** : `exam-bac2023-location-habits`
- **Titre** : Bac 2023 - Location d'Habits Traditionnels
- **Module** : Module C — Épreuves Pratiques Officielles du Baccalauréat
- **Référentiel** : `bac-si-tn` (Baccalauréat Sciences de l'Informatique — Épreuve Pratique STI)
- **Session source** : Baccalauréat 2023 (Session principale)
- **Barème total** : 20 points
- **Nombre de critères** : 7 critères

---

## 2. Matrice Consignes ➔ Critères ➔ Sondes de Test

| N°  | Consigne de l'Énoncé                                                                       | Fichier Ciblé   | Id Critère | Sonde / Type de Vérification                                                      | Points  |
| :-: | :----------------------------------------------------------------------------------------- | :-------------- | :--------- | :-------------------------------------------------------------------------------- | :-----: |
|  1  | Établir le formulaire `location.html` (cin, id_habit, date_loc, duree) vers `location.php` | `location.html` | `EX23-01`  | DOM Probe: `form[method="POST"][action="location.php"]` et 4 champs requis        |  2 pts  |
|  2  | Relier et styliser le fieldset avec bordure et padding dans `mesStyles.css`                | `location.html` | `EX23-02`  | CSS Probe: `border-width > 0` sur `fieldset`                                      |  2 pts  |
|  3  | Contrôler dans `verif2()` que le CIN comporte exactement 8 chiffres décimaux               | `location.html` | `EX23-03`  | JS Test Case: rejet des CIN trop courts ou contenant des caractères alphabétiques | 2.5 pts |
|  4  | Contrôler dans `verif2()` la sélection d'un habit, la date et la durée > 0                 | `location.html` | `EX23-04`  | JS Test Case: validation de l'habit sélectionné et durée positive                 | 2.5 pts |
|  5  | Dans `location.php`, se connecter à `bd2023` et extraire les paramètres POST               | `location.php`  | `EX23-05`  | PHP MySQLi Probe: extraction et gestion des cas clients                           |  4 pts  |
|  6  | Contrôler l'existence du client et enregistrer la location dans la table `location`        | `location.php`  | `EX23-06`  | PHP MySQLi Probe: exécution requête INSERT et vérification dans `location`        |  4 pts  |
|  7  | Décrémenter la disponibilité de l'habit loué et afficher la facture récapitulative         | `location.php`  | `EX23-07`  | PHP Output Probe: mise à jour et affichage du montant/facture de location         |  3 pts  |

---

## 3. Banc Didactique Tripartite

- **`solution/`** : Implémentation officielle complète conforme aux spécifications nationales 2023 (20/20 pts).
- **`solution-alt/`** : Implémentation alternative avec fonctions sécurisées et gestion fine des stocks (20/20 pts).
- **`solution-invalide/`** : Implémentation omettant le contrôle JavaScript et l'insertion dans la table `location`.
