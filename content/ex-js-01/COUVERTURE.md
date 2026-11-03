# Matrice de Couverture Pédagogique — Validation JS - Contrôle CIN (`ex-js-01`)

## 1. Synthèse Pédagogique

- **Sujet** : `ex-js-01`
- **Titre** : Validation JS - Contrôle CIN & Chaînes
- **Module** : Module A — Technologies Web Côté Client
- **Référentiel** : `bac-si-tn` (Baccalauréat Sciences de l'Informatique — Épreuve Pratique STI)
- **Barème total** : 20 points
- **Nombre de critères** : 5 critères

---

## 2. Matrice Consignes ➔ Critères ➔ Sondes de Test

| N°  | Consigne de l'Énoncé                                                            | Fichier Ciblé | Id Critère          | Sonde / Type de Vérification                            | Points |
| :-: | :------------------------------------------------------------------------------ | :------------ | :------------------ | :------------------------------------------------------ | :----: |
|  1  | Déclarer la fonction `verif()` dans `controle.js` reliée à l'événement onsubmit | `controle.js` | `c1_verif_exists`   | Function presence: `typeof window.verif === "function"` | 4 pts  |
|  2  | Contrôler la longueur exacte de 8 caractères du champ CIN                       | `controle.js` | `c2_length_control` | JS Test Case: input 8 caractères attendu true           | 4 pts  |
|  3  | Rejeter les identifiants CIN de longueur inférieure à 8 chiffres                | `controle.js` | `c3_reject_short`   | JS Test Case: input "1234" attendu false                | 4 pts  |
|  4  | Rejeter les valeurs contenant des caractères alphabétiques ou symboles          | `controle.js` | `c4_reject_alpha`   | JS Test Case: input "1234567A" attendu false            | 4 pts  |
|  5  | Accepter et valider positivement un numéro CIN composé de 8 chiffres décimaux   | `controle.js` | `c5_accept_valid`   | JS Test Case: input "09876543" attendu true             | 4 pts  |

---

## 3. Banc Didactique Tripartite

- **`solution/`** : Implémentation officielle avec boucle de parcours caractère par caractère (20/20 pts).
- **`solution-alt/`** : Implémentation alternative utilisant l'expression régulière `/^[0-9]{8}$/` (20/20 pts).
- **`solution-invalide/`** : Implémentation non restrictive sans contrôle renvoyant true (échoue sur c2, c3, c4).
