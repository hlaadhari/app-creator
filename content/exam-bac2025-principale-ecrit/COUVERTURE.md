# Couverture Pédagogique — Bac STI 2025 Session Principale

**Identifiant :** `exam-bac2025-principale-ecrit`  
**Discipline :** Systèmes et Technologies de l'Informatique (Épreuve Écrite Théorique)  
**Niveau :** 4ème année Sciences de l'Informatique (Bac STI)  
**Session :** Session principale 2025  
**Source :** sujet officiel transcrit depuis le PDF « principale_2025 » (14 pages numérisées)  
**Barème Total :** 20.0 points (100 % vérifiable automatiquement)

> **Statut : banc didactique validé, corrigé à relire par un enseignant.** Le sujet papier publie le barème par exercice (partie A : 3 + 1,5 + 6 + 1,5 = 12 ; partie B : 2,5 + 1,5 + 2 + 2 = 8) mais ni le corrigé ni le détail par question. Les corrigés sont rédigés à partir de l'énoncé et les requêtes sont exécutées sur le moteur SQL du dépôt ; le détail des points par question est une proposition qui respecte les totaux officiels de chaque exercice.

> **Écart avec la description initiale de l'issue #204** : l'issue annonçait une base `Gestion_Exposition` (manifestations, stands, halles, réservations) ; le sujet réel porte sur les manifestations, les types, les halles, les stands, les clients, les locations et les évaluations (pas de table « réservation »). Les calculs de pourcentage et `DISTINCT` annoncés sont présents (réduction de 15 %, clients sans répétition).

---

## 1. Répartition du Barème

| Partie / exercice  | Domaine                                                                          | Barème   |
| ------------------ | -------------------------------------------------------------------------------- | -------- |
| **A — Exercice 1** | Représentation textuelle, assertions Vrai/Faux, vocabulaire des clés             | 3.0 pts  |
| **A — Exercice 2** | Rôle de six requêtes (INSERT, SELECT, UPDATE, DELETE, ALTER)                     | 1.5 pt   |
| **A — Exercice 3** | Neuf requêtes : DATEDIFF, UPDATE, DISTINCT, ORDER BY, COUNT, HAVING, NOT IN, MAX | 6.0 pts  |
| **A — Exercice 4** | Table Pays, règles R3 à R6, Service / Evaluation / Note_Service                  | 1.5 pt   |
| **B — Exercice 1** | Code HTML : numéros de ligne, method, hr, input range, alt                       | 2.5 pts  |
| **B — Exercice 2** | Code CSS : sélecteurs et propriétés (12 mises en forme)                          | 1.5 pt   |
| **B — Exercice 3** | JavaScript : verif, imagenote, calcultotal, rôle de inconnue                     | 2.0 pts  |
| **B — Exercice 4** | PHP : $_POST, array, date, mysqli (connect, fetch_row, affected_rows, error)     | 2.0 pts  |
| **Total**          |                                                                                  | **20.0** |

## 2. Compétences du programme couvertes

- **Bases de données** : lecture d'un schéma graphique (cardinalités, clé primaire composée), vocabulaire (intégrité référentielle, de domaine, clé étrangère), rôle des requêtes, `DATEDIFF`, `UPDATE` avec calcul, `DISTINCT`, `ORDER BY`, `COUNT`, `GROUP BY` / `HAVING SUM`, `NOT IN` avec `YEAR`, sous-requête `MAX`, normalisation (table Pays), traduction de règles de gestion (R3 à R6).
- **HTML5** : `meta charset`, `meta description`, `link`, `body onload`, `form` (`method`, `action`, `onsubmit`), `fieldset`, `legend`, `select`, `hr`, `input type="range"`, `img alt`, `span`.
- **CSS3** : sélecteurs de balise et de classe, `color`, `font-size`, `font-weight`, `font-style`, `text-align`, `background-color`, `border`, `width`, `display: inline-block`, `padding`.
- **JavaScript** : `selectedIndex`, `getElementById` et `getElementsByName`, `src`, `value`, boucles `for`, portée de `let` et `const`, `parseInt`/`Number`, `innerHTML`.
- **PHP / MySQLi** : `$_POST`, tableau indexé, `date('Y-m-d')`, `mysqli_connect` avec `die`, `mysqli_fetch_array`/`mysqli_fetch_row`, `mysqli_affected_rows`, `mysqli_error`.

## 3. Triplet Didactique & Conformité

- `solution/` : corrigé modèle obtenant **20.0 / 20 points**.
- `solution-alt/` : variante (jointures `INNER JOIN ... ON`, `LEFT JOIN`, `IN` avec sous-requête, `BETWEEN` de dates, `<= 4` au lieu de `< 5`, espaces et casse différents dans les réponses) obtenant **20.0 / 20 points**.
- `solution-invalide/` : copie très fautive (assertions inversées, requêtes imprécises, mauvaises règles et fonctions) obtenant **moins de 10 points** mais plus de 0.
- `initial/` : copie vierge, **0 point**.

## 4. Limites connues de la notation automatique

- Le sujet papier demande à compléter un schéma graphique et un tableau de code CSS ; ces réponses sont saisies en texte (représentation textuelle, une propriété par ligne). Les propriétés CSS sont acceptées avec ou sans espaces autour des deux-points et avec ou sans point-virgule final.
- Les jeux d'essai sont choisis pour que les variantes courantes d'une même requête (`< 5` ou `<= 4`, `INNER JOIN` ou jointure implicite, `LEFT JOIN` pour les types) donnent le même résultat ; les durées de 5 jours exactement et les types sans manifestation sont évités à dessein.
- La question 2.c de l'exercice 3 de la partie B accepte deux scripts valides (V) : celui avec `parseInt` et celui avec `const` et `Number`. Ils fonctionnent tous les deux ; seuls les scripts à `const i` modifié et sans `let s=0` sont faux.
