# Matrice de Couverture Pédagogique — Formulaire de Don pour les Lycées (`tp-fs-01`)

## 1. Synthèse Pédagogique

- **Sujet** : `tp-fs-01`
- **Titre** : Formulaire de Don pour les Lycées
- **Module** : Module B — Synthèse Full-Stack (HTML, CSS, JS, PHP, MySQL)
- **Référentiel** : `bac-si-tn` (Baccalauréat Sciences de l'Informatique — Épreuve Pratique STI)
- **Barème total** : 20 points
- **Nombre de critères** : 6 critères

---

## 2. Matrice Consignes ➔ Critères ➔ Sondes de Test

| N°  | Consigne de l'Énoncé                                                                                 | Fichier Ciblé     | Id Critère          | Sonde / Type de Vérification                                                | Points |
| :-: | :--------------------------------------------------------------------------------------------------- | :---------------- | :------------------ | :-------------------------------------------------------------------------- | :----: |
|  1  | Concevoir le formulaire `Don.html` avec method="POST", action="enregistrer.php", fieldset et champs  | `Don.html`        | `c1_form_structure` | DOM Probe: `form#fDon fieldset input#nom, select#lycee, select#article`     | 3 pts  |
|  2  | Styliser `#fDon` dans `mesStyles.css` avec largeur maximale et marges automatiques                   | `Don.html`        | `c2_css_layout`     | CSS Rule Inspection: présence de la règle `#fDon` avec mise en page         | 3 pts  |
|  3  | Implémenter la fonction `calculerMontant()` pour multiplier le prix unitaire par la quantité         | `Don.html`        | `c3_js_calculation` | JS Test Case: calcul dynamique sur saisies d'articles                       | 4 pts  |
|  4  | Implémenter la fonction `test1()` pour valider le nom (≥ 3 car), le type donateur et la quantité > 0 | `Don.html`        | `c4_js_validation`  | JS Test Case: validation positive et rejet des saisies invalides            | 4 pts  |
|  5  | Créer la table MySQL `don` avec clé primaire `id` et contraintes CHECK sur `qte` et `montant`        | `db/init.sql`     | `c5_db_table`       | SQL Table Probe: existence table `don`, PK id, CHECK qte/montant            | 3 pts  |
|  6  | Traiter la soumission dans `enregistrer.php` et exécuter l'insertion sécurisée via MySQLi            | `enregistrer.php` | `c6_php_insert`     | PHP MySQLi Probe: exécution requête INSERT et vérification de ligne insérée | 3 pts  |

---

## 3. Banc Didactique Tripartite

- **`solution/`** : Implémentation complète avec recalcul serveur et confirmation HTML formatée (20/20 pts).
- **`solution-alt/`** : Implémentation alternative avec logique de sélection simplifiée et insertion directe (20/20 pts).
- **`solution-invalide/`** : Implémentation comportant un schéma SQL sans contraintes, JS permissif et PHP sans insertion.
