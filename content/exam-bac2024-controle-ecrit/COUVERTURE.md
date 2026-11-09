# Couverture Pédagogique — Bac STI 2024 Session de Contrôle

**Identifiant :** `exam-bac2024-controle-ecrit`  
**Discipline :** Systèmes et Technologies de l'Informatique (Épreuve Écrite Théorique)  
**Niveau :** 4ème année Sciences de l'Informatique (Bac STI)  
**Session :** Session de contrôle 2024  
**Source :** sujet officiel transcrit depuis le PDF « controle_2024 » (14 pages numérisées)  
**Barème Total :** 20.0 points (100 % vérifiable automatiquement)

> **Statut : banc didactique validé, corrigé à relire par un enseignant.** Le sujet papier ne publie ni le corrigé officiel ni le barème par question. Les corrigés de ce dossier sont rédigés à partir de l'énoncé et exécutés sur le moteur SQL du dépôt ; la répartition des points ci-dessous est une proposition qui respecte les totaux officiels : 2 + 5 + 13 = 20. `statut_validation` reflète le critère du dépôt (2 solutions valides et 1 invalide testées), pas une validation par le ministère.

> **Écart avec la description initiale de l'issue #202** : l'issue décrivait, d'après un résumé du carnet, une base `info_Experts` et des « visualisations ». Le sujet réel comporte la base **BD_Collecte** (exercice 2) et la base **StreamVision** (exercice 3) ; `info_Experts` n'est que le nom d'une chaîne utilisée dans les requêtes. Le QCM porte sur `onfocus`, `<figcaption>`, `skew`, `text-transform`, `document.write`, `checkdate`, `isset` et les contraintes de domaine.

---

## 1. Répartition du Barème

| Partie                             | Domaine                                                    | Barème   |
| ---------------------------------- | ---------------------------------------------------------- | -------- |
| **Exercice 1**                     | QCM Web & programmation (8 × 0.25)                         | 2.0 pts  |
| **Exercice 2** (1ère partie)       | Schéma BD_Collecte : clés, cardinalités, 5 assertions V/F  | 2.75 pts |
| **Exercice 2** (2ème partie)       | Table Rue, véhicules (R1, R2)                              | 2.25 pts |
| **Exercice 3** (1ère partie, I)    | Code HTML : DOCTYPE, section, summary, onsubmit, radio     | 1.25 pt  |
| **Exercice 3** (1ère partie, II)   | Code CSS : sélecteurs, :hover, règles appliquées à `#div1` | 1.75 pt  |
| **Exercice 3** (1ère partie, III)  | Code JavaScript : replace/charAt, trim, condition, DOM     | 2.0 pts  |
| **Exercice 3** (1ère partie, IV)   | Code PHP : suivi de variables d'un `do ... while`          | 1.0 pt   |
| **Exercice 3** (2ème partie, I)    | Interprétation de la requête R (GROUP BY / HAVING)         | 1.0 pt   |
| **Exercice 3** (2ème partie, II-A) | 7 requêtes SELECT (jointures, MAX, SUM, COUNT, AVG)        | 4.0 pts  |
| **Exercice 3** (2ème partie, II-B) | INSERT auto-incrémenté, DELETE, UPDATE ... LIKE, ALTER     | 2.0 pts  |
| **Total**                          |                                                            | **20.0** |

## 2. Compétences du programme couvertes

- **Web — HTML5** : `DOCTYPE`, balises sémantiques (`section`, `nav`, `footer`), `details`/`summary`, `figure`/`figcaption`, formulaires, boutons radio et attribut `name`, `onsubmit` et `return`, événement `onfocus`.
- **Web — CSS3** : sélecteurs de classe, d'identifiant et d'élément, pseudo-classe `:hover`, `opacity`, `transform` (`scale`, `skew`), `border-style`, `text-transform`, cascade (règles qui s'appliquent à un élément).
- **Web — JavaScript** : `indexOf`, `replace`, `charAt`, `toLowerCase`/`toUpperCase`, `trim`, `getElementById`, `value`, `checked`, condition de validation de formulaire, `document.write`.
- **PHP** : boucle `do ... while`, tableaux (`count`, `isset`), `strpos`, `checkdate`.
- **Bases de données** : lecture d'un schéma textuel, clés primaires et étrangères, cardinalités, normalisation d'une redondance (table Rue), traduction de règles de gestion (R1, R2), contraintes de domaine et d'unicité, jointures, agrégats (`SUM`, `MAX`, `AVG`, `COUNT`), `GROUP BY` / `HAVING`, sous-requête, `LIKE`, `INSERT` avec clé auto-incrémentée, `DELETE`, `UPDATE`, `ALTER TABLE`.

## 3. Triplet Didactique & Conformité

- `solution/` : corrigé modèle obtenant **20.0 / 20 points**.
- `solution-alt/` : variante (jointures `INNER JOIN ... ON`, sous-requête `IN`, alias de colonnes, `INSERT ... VALUES (NULL, ...)`, `ADD COLUMN`) obtenant **20.0 / 20 points**.
- `solution-invalide/` : erreurs fréquentes d'élèves (mauvais QCM, assertions inversées, requêtes imprécises, mauvaise cible de suppression) obtenant **moins de 20 points** mais plus de 0.
- `initial/` : copie vierge, **0 point**.

## 4. Limites connues de la notation automatique

- La représentation graphique de la question 1 de l'exercice 2 est transcrite en texte : l'élève décrit les clés et les cardinalités (par exemple `Poubelle 1,N Remplissage`). Le contrôle porte sur la présence des éléments attendus.
- Les questions de texte libre (rôle d'une instruction, effet d'une règle CSS) sont contrôlées par mots-clés : une formulation très éloignée du corrigé peut être refusée à tort. Les indices du fichier `criteria.json` guident l'élève.
- Le tri demandé à la question II-A.6 n'est pas vérifié (la comparaison des résultats ignore l'ordre des lignes).
