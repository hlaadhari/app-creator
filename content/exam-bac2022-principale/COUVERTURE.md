# Matrice de Couverture Pédagogique — Bac 2022 Session Principale (`exam-bac2022-principale`)

## 1. Synthèse Pédagogique

- **Sujet** : `exam-bac2022-principale`
- **Titre** : Bac STI 2022 (Session Principale) - Agence AgVoy & Gestion Élèves
- **Module** : Module C — Épreuves Pratiques Officielles du Baccalauréat
- **Référentiel** : `bac-si-tn` (Baccalauréat Sciences de l'Informatique — Épreuve Pratique STI)
- **Session source** : Baccalauréat 2022 (Session principale)
- **Barème total** : 20 points
- **Nombre de critères** : 8 critères

---

## 2. Matrice Consignes ➔ Critères ➔ Sondes de Test

| N°  | Consigne de l'Énoncé                                                                         | Fichier Ciblé   | Id Critère | Sonde / Type de Vérification                                               | Points  |
| :-: | :------------------------------------------------------------------------------------------- | :-------------- | :--------- | :------------------------------------------------------------------------- | :-----: |
|  1  | Définir la table `Eleve` avec `Cin VARCHAR(8) PRIMARY KEY` et champs obligatoires            | `db/init.sql`   | `BAC22-01` | SQL Table Probe: clé primaire `Cin` sur `Eleve`                            | 1.5 pts |
|  2  | Définir la table `Excursion` avec clé primaire, étrangère et contrainte `CHECK (PrixEx > 0)` | `db/init.sql`   | `BAC22-02` | SQL Table Probe: clé primaire `NumEx` et `hasCheck` sur `Excursion`        | 1.5 pts |
|  3  | Formulaire `modifier.html` ciblant `modifier.php` avec `cin`, `nom`, `prenom`, `tel`         | `modifier.html` | `BAC22-03` | DOM Probe: `form[method="POST"][action="modifier.php"]` et 4 champs requis | 2.5 pts |
|  4  | Relier et styliser le fieldset avec bordure et espacements dans `mesStyles.css`              | `modifier.html` | `BAC22-04` | CSS Probe: `border-width > 0` sur `fieldset`                               | 2.5 pts |
|  5  | Dans `controles.js`, programmer `verif()` : CIN à 8 chiffres et nom non vide                 | `modifier.html` | `BAC22-05` | JS Test Case: rejet des CIN non conformes ou nom vide                      | 3.0 pts |
|  6  | Dans `controles.js`, valider le format du téléphone (8 chiffres) et autoriser l'envoi        | `modifier.html` | `BAC22-06` | JS Test Case: rejet téléphone court et validation positive globale         | 2.0 pts |
|  7  | Dans `modifier.php`, se connecter à `bd_agvoy2022` et vérifier l'existence du CIN            | `modifier.php`  | `BAC22-07` | PHP MySQLi Probe: gestion d'élève introuvable                              | 2.0 pts |
|  8  | Dans `modifier.php`, exécuter la mise à jour SQL `UPDATE Eleve ...` et confirmer             | `modifier.php`  | `BAC22-08` | PHP MySQLi Probe: mise à jour en BDD et message de succès                  | 5.0 pts |

---

## 3. Banc Didactique Tripartite

- **`solution/`** : Implémentation officielle complète conforme aux spécifications nationales du Bac STI 2022 (20/20 pts).
- **`solution-alt/`** : Implémentation alternative avec mise en page responsive et requêtes optimisées (20/20 pts).
- **`solution-invalide/`** : Implémentation omettant le contrôle JavaScript et la mise à jour SQL (échec aux tests).
