# Matrice de Couverture Pédagogique — Consultation Météo & Agrégations (`tp-fs-02`)

## 1. Synthèse Pédagogique

- **Sujet** : `tp-fs-02`
- **Titre** : Consultation Météo & Agrégations (Bac 2021)
- **Module** : Module B — Intégration Full-Stack (JS, PHP, MySQL)
- **Référentiel** : `bac-si-tn` (Baccalauréat Sciences de l'Informatique — Épreuve Pratique STI)
- **Session source** : Baccalauréat 2021 (Session de contrôle)
- **Barème total** : 20 points
- **Nombre de critères** : 5 critères

---

## 2. Matrice Consignes ➔ Critères ➔ Sondes de Test

| N°  | Consigne de l'Énoncé                                                                             | Fichier Ciblé       | Id Critère             | Sonde / Type de Vérification                                                  | Points |
| :-: | :----------------------------------------------------------------------------------------------- | :------------------ | :--------------------- | :---------------------------------------------------------------------------- | :----: |
|  1  | Créer le formulaire `consultation.html` avec la liste `#station` et le champ `#annee`            | `consultation.html` | `c1_form_selection`    | DOM Probe: sélection `form#fMeteo select#station, input#annee`                | 4 pts  |
|  2  | Écrire la fonction `test2()` pour vérifier la sélection de station et l'année entre 2020 et 2026 | `consultation.html` | `c2_js_test2`          | JS Test Case: validation des bornes [2020..2026] et station non vide          | 4 pts  |
|  3  | Définir les tables `station` et `mesure` reliées par clé étrangère avec contrainte CHECK         | `db/init.sql`       | `c3_db_schema`         | SQL Table Probe: existence `mesure`, FK vers `station`, CHECK humidité        | 4 pts  |
|  4  | Dans `meteo.php`, exécuter la requête d'agrégation avec `AVG()`, `MAX()`, `MIN()` et `GROUP BY`  | `meteo.php`         | `c4_sql_aggregation`   | PHP MySQLi Probe: interrogation relationnelle et vérification sortie          | 4 pts  |
|  5  | Présenter les statistiques météo sous la forme d'un tableau HTML `<table>`                       | `meteo.php`         | `c5_html_table_render` | PHP Output Pattern Probe: présence du tableau `<table>` avec `<th>` et `<td>` | 4 pts  |

---

## 3. Banc Didactique Tripartite

- **`solution/`** : Implémentation complète conforme au sujet national Bac 2021 (20/20 pts).
- **`solution-alt/`** : Implémentation alternative avec jointure explicite et gestion d'erreurs (20/20 pts).
- **`solution-invalide/`** : Implémentation comportant des tables sans relations et un script PHP sans agrégation.
