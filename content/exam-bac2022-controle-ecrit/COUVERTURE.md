# Couverture Pédagogique — Bac STI 2022 Session de Contrôle

**Identifiant :** `exam-bac2022-controle-ecrit`  
**Discipline :** Bases de Données (Épreuve Écrite Théorique)  
**Niveau :** 4ème année Sciences de l'Informatique (Bac STI)  
**Session :** Contrôle 2022  
**Barème Total :** 20.0 points (100% vérifiable automatiquement)

---

## 1. Répartition du Barème Officiel

| Exercice       | Domaine              | Questions                                                       | Points                         |
| -------------- | -------------------- | --------------------------------------------------------------- | ------------------------------ |
| **Exercice 1** | QCM & Concepts BDD   | Agrégats, CHECK, Clé étrangère, Intégrité référentielle         | 3.0 pts (4 x 0.75 pt)          |
| **Exercice 2** | Base GestionConcours | `CREATE TABLE`, `ADD FOREIGN KEY`, `CHECK Note`, `ADD Genre`    | 4.0 pts (4 x 1.0 pt)           |
| **Exercice 3** | Base Gaming          | `ADD Version`, `INSERT Categorie`, `INSERT Jeu`, `SELECT JOIN`  | 6.0 pts (4 x 1.5 pt)           |
| **Exercice 4** | Base GestionEmployes | `COUNT(*)`, `AVG()`, `GROUP BY`, `ORDER BY`, `UPDATE`, `DELETE` | 7.0 pts (4 x 1.0 + 2 x 1.5 pt) |
| **Total**      |                      |                                                                 | **20.0 / 20 points**           |

---

## 2. Triplet Didactique & Conformité

- `solution/` : Corrigé modèle officiel obtenant **20/20 (100% des points)**.
- `solution-alt/` : Variante syntaxique alternative (jointures explicites `INNER JOIN`, syntaxes SQL équivalentes) obtenant **20/20**.
- `solution-invalide/` : Réponses comportant des erreurs courantes (mauvais agrégat, clause `WHERE` omise sur `UPDATE`, faute de syntaxe LDD) obtenant **< 20 points**.
