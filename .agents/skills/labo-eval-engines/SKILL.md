---
name: labo-eval-engines
description: >-
  Architecture et maintenance des moteurs d'évaluation et d'exécution locale de Labo STI : moteur d'évaluation
  unifié (HTML/CSS/JS), simulateur PHP procédural Web Worker, moteur SQL relationnel MySQL/MariaDB, épreuves écrites
  et rejouage de snapshots. À activer lors de modifications dans src/lib/evaluation/, src/lib/evaluator/,
  src/lib/php/, src/lib/sql/ ou src/lib/snapshot/.
---

# Moteurs d'Évaluation & Exécution Locale — Labo STI

Ce skill documente le fonctionnement et les invariants des moteurs d'exécution et de notation de **Labo STI**.

## 1. Architecture Unifiée d'Évaluation (TEC-05)

La notation d'un projet (fichiers HTML, CSS, JS, PHP, SQL) repose sur un pipeline unique partagé entre :
1. **La vérification formative élève** (bouton « Vérifier » dans le workspace),
2. **Le banc didactique du Studio enseignant** (`src/lib/subjects/banc-didactique.ts`),
3. **Le rejouage officiel de snapshot scellé** (`src/lib/snapshot/replay-engine.ts`).

### Modules Centraux
- `src/lib/evaluation/document-evaluation.ts` (`construireDocumentEvaluation`) : assemble un document HTML complet isolé en injectant les feuilles CSS et scripts JS associés à la page ciblée.
- `src/lib/evaluation/evaluation-par-page.ts` (`evaluerParPage`) : groupe les critères par page cible (`index.html`, `evaluation.html`, `ajout.php`, etc.), évalue les sondes DOM/CSS/JS et consolide les résultats.
- `src/lib/exercises.ts` (`runCriteria`, `score`) : exécute chaque sonde et qualifie précisément la cause d'échec (`syntaxe`, `execution`, `absent`, `valeur` — PED-05).
- **Normalisation CSS** : les couleurs CSS sont comparées après normalisation canonique (`rgb(...)` / hexadécimal) pour éviter tout faux négatif lié au navigateur ou à JSDOM (`src/test/sonde-couleur-normalisee.test.ts`).

---

## 2. Moteur SQL Relationnel en Mémoire (`src/lib/sql/`)

Conçu pour reproduire fidèlement le comportement **MySQL / MariaDB** au programme du Bac STI :
- **`decouperRequetesSql`** (`src/lib/sql/relational-engine.ts`) : découpeur lexical respectant les points-virgules dans les littéraux chaînes (`'...'`, `"..."`, `` `...` ``), les échappements `''` / `\'` et les commentaires `--` et `/* ... */`.
- **`RelationalDatabaseEngine`** :
  - **DDL** : `CREATE TABLE`, `ALTER TABLE` (`ADD COLUMN`, `ADD CONSTRAINT`, `DROP COLUMN`), `DROP TABLE`.
  - **Contraintes** : `PRIMARY KEY` (simple et composée), `FOREIGN KEY ... REFERENCES` (`RESTRICT` erreur `1451`, `CASCADE`), `NOT NULL` (erreur `1048`), `UNIQUE` (erreur `1062`), `DEFAULT`, `CHECK` (erreur `3819`).
  - **DML** : `INSERT INTO` (multi-tuples, `AUTO_INCREMENT`, erreur `1452` sur FK orpheline), `UPDATE`, `DELETE FROM`.
  - **SELECT** : `INNER JOIN`, `LEFT JOIN`, jointures implicites par virgules (`FROM t1, t2`), `WHERE` (`BETWEEN ... AND ...`, `IN`, `LIKE`, `IS NULL`, sous-requêtes `IN (SELECT ...)` et scalaires), `GROUP BY`, `HAVING`, `ORDER BY` multi-colonnes, `LIMIT`, agrégations (`COUNT`, `COUNT(DISTINCT)`, `SUM`, `AVG`, `MIN`, `MAX`), `DISTINCT`.
- **`SqliteEngine`** (`src/lib/sql/sqlite-engine.ts`) : façade publique utilisée par `DatabasePanel.tsx` et les tests, intégrant le contrôleur de dialecte (`dialect-controller.ts`).

---

## 3. Simulateur PHP Procédural & Web Worker (`src/lib/php/`)

- **`PhpProceduralSimulator`** (`src/lib/php/procedural-simulator.ts`) :
  - Exécute les scripts PHP procéduraux du programme Bac STI (`$_POST`, `$_GET`, `$_SESSION`, `isset`, `empty`, fonctions de chaînes/tableaux, boucles `while ($row = mysqli_fetch_array($res))`, `echo` / `print`).
  - Connecté directement au moteur SQL (`MySqliSimulator` / `RelationalDatabaseEngine`) pour exécuter réellement `mysqli_connect`, `mysqli_select_db`, `mysqli_query`, `mysqli_num_rows`, `mysqli_fetch_array`, `mysqli_fetch_assoc`, `mysqli_affected_rows`, `mysqli_error`, `mysqli_close`.
- **`php-worker-core.ts` & `src/workers/php-worker.ts`** :
  - Isolation dans un Web Worker dédié avec **watchdog de 3 secondes (T-10)** et limite mémoire (64 Mo).
  - Transparence explicite du mode d'exécution (`modeExecution: "simulateur_procedural"`).

---

## 4. Commandes de Vérification Ciblées

Lors d'une modification sur l'un de ces moteurs, exécuter systématiquement :

```powershell
bun run test src/test/unification-evaluation-engine.test.ts src/test/evaluation-par-page.test.ts src/test/qualification-cause-echec.test.tsx src/test/sql-relational-engine.test.ts src/test/sql-sous-requetes-having.test.ts src/test/php-procedural-simulator.test.ts src/test/php-worker-runner.test.ts src/test/sujets-banc-notation.test.ts
```
