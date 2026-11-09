# Couverture Pédagogique — Bac STI 2025 Session de Contrôle

**Identifiant :** `exam-bac2025-controle-ecrit`  
**Discipline :** Systèmes et Technologies de l'Informatique (Épreuve Écrite Théorique)  
**Niveau :** 4ème année Sciences de l'Informatique (Bac STI)  
**Session :** Session de contrôle 2025  
**Source :** sujet officiel transcrit depuis le PDF « controle_2025 » (15 pages numérisées)  
**Barème Total :** 20.0 points (100 % vérifiable automatiquement)

> **Statut : banc didactique validé, corrigé à relire par un enseignant.** Le sujet papier publie le barème par exercice (partie A : 3,25 + 1,75 + 5,5 + 1,5 = 12 ; partie B : 3 + 1 + 2 + 2 = 8) mais ni le corrigé ni le détail par question. Les corrigés sont rédigés à partir de l'énoncé et exécutés sur le moteur SQL du dépôt ; le détail des points par question est une proposition qui respecte les totaux officiels de chaque exercice.

> **Écart avec la description initiale de l'issue #203** : l'issue annonçait une épreuve « Gestion_Incendies » avec une partie SQL et une partie Web ; c'est bien le cas. La base compte six tables (Gouvernorat, Ville, Foret, Incendie, TypeIntervention, Intervention) et la partie B porte sur la page Statistiques_Interventions.html.

---

## 1. Répartition du Barème

| Partie / exercice              | Domaine                                                                  | Barème   |
| ------------------------------ | ------------------------------------------------------------------------ | -------- |
| **A — Exercice 1**             | Affirmations Oui/Non, contraintes d'intégrité, erreurs d'insertion       | 3.25 pts |
| **A — Exercice 2**             | Résultat et rôle de la requête R, ajout d'un HAVING                      | 1.75 pt  |
| **A — Exercice 3** (structure) | ALTER TABLE (DROP, RENAME, MODIFY), UPDATE                               | 1.0 pt   |
| **A — Exercice 3** (données)   | INSERT d'une intervention non achevée, 6 requêtes SELECT                 | 4.5 pts  |
| **A — Exercice 4**             | Représentation textuelle, clé composée (R3), table StatutEspece (R4, R5) | 1.5 pt   |
| **B — Exercice 1**             | Code HTML : title, header, liens, required, numéros de ligne             | 3.0 pts  |
| **B — Exercice 2**             | Code CSS : sélecteurs, display, background-size/-image, :hover           | 1.0 pt   |
| **B — Exercice 3**             | JavaScript : éléments du langage, trace de `inconnue`, rôle              | 2.0 pts  |
| **B — Exercice 4**             | PHP : fonctions mysqli, count, strlen, substr                            | 2.0 pts  |
| **Total**                      |                                                                          | **20.0** |

## 2. Compétences du programme couvertes

- **Bases de données** : lecture d'un schéma textuel (cardinalités déduites des clés étrangères), contraintes d'intégrité (clé primaire, référentielle, domaine, `NOT NULL`, `UNIQUE`, `DEFAULT`, `CHECK`, `ON DELETE CASCADE`), détection des violations lors d'une insertion, `ALTER TABLE` (ajout, suppression, renommage, modification de type), `UPDATE`, `INSERT` avec valeur nulle, jointures sur trois tables, `COUNT`, `SUM`, `DISTINCT`, `GROUP BY` / `HAVING`, fonctions de date, sous-requête avec `MAX`, modélisation (clé primaire composée, relation 1:N).
- **HTML5** : structure d'un document, `title`, `header`, `nav`, `section`, `footer`, liens internes et externes, formulaire (`required`, `checkbox`, `reset`, `onsubmit`), `body onload`, placement des balises.
- **CSS3** : sélecteurs de classe et d'élément, `display`, `margin`, `background-size`, `background-image`, pseudo-classe `:hover`, `text-transform`.
- **JavaScript** : `String()`, `new Date()`, `getDate()`, `value`, `checked`, `getElementsByName()`, `alert()`, `return`, boucle `do ... while`.
- **PHP / MySQLi** : `mysqli_connect`, `mysqli_query`, `mysqli_num_rows`, `mysqli_fetch_array`, `mysqli_close`, `count`, `strlen`, `substr`.

## 3. Triplet Didactique & Conformité

- `solution/` : corrigé modèle obtenant **20.0 / 20 points**.
- `solution-alt/` : variante (jointures `INNER JOIN ... ON`, `IN` avec sous-requête, `YEAR`/`MONTH`, `INSERT` sans liste de colonnes, espaces et préfixes différents dans les réponses de code) obtenant **20.0 / 20 points**.
- `solution-invalide/` : copie très fautive (erreurs de contraintes, requêtes imprécises, mauvaises fonctions PHP) obtenant **moins de 10 points** mais plus de 0.
- `initial/` : copie vierge, **0 point**.

## 4. Limites connues de la notation automatique

- Les tableaux à compléter de l'énoncé (erreurs d'insertion, résultat de R, trace d'exécution) sont saisis en texte libre : le contrôle porte sur la présence des éléments attendus (numéro de ligne, table, champ, contrainte ; valeurs du résultat).
- Les réponses de code (fonctions PHP, éléments JavaScript) sont acceptées avec ou sans espaces et avec ou sans préfixe d'objet (par exemple `getDate()` ou `datej.getDate()`).
- La question 3.c (été 2023) est contrôlée sur les données du jeu d'essai : un élève qui raisonne par `MONTH()` ou par intervalle de dates obtient le même résultat.
