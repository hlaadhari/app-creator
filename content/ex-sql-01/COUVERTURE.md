# Matrice de Couverture Pédagogique — Commandes LDD & Contraintes d'Intégrité (`ex-sql-01`)

## 1. Synthèse Pédagogique

- **Sujet** : `ex-sql-01`
- **Titre** : Commandes LDD & Contraintes d'Intégrité
- **Module** : Module A — Bases de Données & SQL
- **Référentiel** : `bac-si-tn` (Baccalauréat Sciences de l'Informatique — Épreuve Pratique STI)
- **Barème total** : 20 points
- **Nombre de critères** : 5 critères

---

## 2. Matrice Consignes ➔ Critères ➔ Sondes de Test

| N°  | Consigne de l'Énoncé                                                                   | Fichier Ciblé | Id Critère            | Sonde / Type de Vérification                                               | Points |
| :-: | :------------------------------------------------------------------------------------- | :------------ | :-------------------- | :------------------------------------------------------------------------- | :----: |
|  1  | Écrire l'instruction LDD `CREATE TABLE mesure` pour stocker les relevés                | `schema.sql`  | `c1_create_table`     | SQL Table Probe: existence de la table relationnelle `mesure`              | 4 pts  |
|  2  | Définir la colonne `id_mesure` comme clé primaire de la table                          | `schema.sql`  | `c2_primary_key`      | SQL Table Probe: `PRIMARY KEY (id_mesure)`                                 | 4 pts  |
|  3  | Déclarer la clé étrangère reliant `mesure(id_capteur)` à `capteur(id_capteur)`         | `schema.sql`  | `c3_foreign_key`      | SQL Table Probe: `FOREIGN KEY (id_capteur) REFERENCES capteur(id_capteur)` | 4 pts  |
|  4  | Imposer une contrainte de domaine `CHECK` restreignant la température entre -50 et 150 | `schema.sql`  | `c4_check_constraint` | SQL Table Probe: `CHECK (valeur >= -50 AND valeur <= 150)`                 | 4 pts  |
|  5  | Rendre obligatoires les champs `id_capteur` et `valeur` avec la clause `NOT NULL`      | `schema.sql`  | `c5_not_null`         | SQL Table Probe: contrainte `NOT NULL` sur colonnes requises               | 4 pts  |

---

## 3. Banc Didactique Tripartite

- **`solution/`** : Implémentation officielle avec contraintes nommées en fin de table (20/20 pts).
- **`solution-alt/`** : Implémentation alternative avec syntaxe inline ANSI et BETWEEN (20/20 pts).
- **`solution-invalide/`** : Schéma omettant la clé primaire, la clé étrangère et la contrainte CHECK.
