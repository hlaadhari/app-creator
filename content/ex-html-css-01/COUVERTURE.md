# Matrice de Couverture Pédagogique — Mise en forme & Transitions CSS3 (`ex-html-css-01`)

## 1. Synthèse Pédagogique

- **Sujet** : `ex-html-css-01`
- **Titre** : Mise en forme & Transitions CSS3
- **Module** : Module A — Technologies Web Côté Client
- **Référentiel** : `bac-si-tn` (Baccalauréat Sciences de l'Informatique — Épreuve Pratique STI)
- **Barème total** : 20 points
- **Nombre de critères** : 6 critères

---

## 2. Matrice Consignes ➔ Critères ➔ Sondes de Test

| N°  | Consigne de l'Énoncé                                                                 | Fichier Ciblé | Id Critère                | Sonde / Type de Vérification                            | Points |
| :-: | :----------------------------------------------------------------------------------- | :------------ | :------------------------ | :------------------------------------------------------ | :----: |
|  1  | Configurez les blocs `.L1` sous forme de blocs en ligne avec `display: inline-block` | `style.css`   | `c1_display_inline_block` | CSS Computed: `display === "inline-block"` sur `.L1`    | 4 pts  |
|  2  | Définissez une largeur fixe `width: 250px` sur les blocs de classe `.L1`             | `style.css`   | `c2_width`                | CSS Computed: `width === "250px"` sur `.L1`             | 3 pts  |
|  3  | Ajoutez une bordure solide de 2px couleur `#0066cc` sur la classe `.b1`              | `style.css`   | `c3_border`               | CSS Computed: `border-style === "solid"` sur `.b1`      | 4 pts  |
|  4  | Appliquez un rayon de courbure aux coins avec `border-radius: 8px` sur `.b1`         | `style.css`   | `c4_border_radius`        | CSS Computed: `border-radius === "8px"` sur `.b1`       | 3 pts  |
|  5  | Configurez une transition fluide sur l'élément `h1` (`transition: all 0.3s ease`)    | `style.css`   | `c5_transition`           | CSS Computed: `transition-duration === "0.3s"` sur `h1` | 3 pts  |
|  6  | Au survol (`h1:hover`), appliquez un changement de couleur et/ou transformation      | `style.css`   | `c6_hover_rule`           | CSS Rule Inspection: présence de la règle `h1:hover`    | 3 pts  |

---

## 3. Banc Didactique Tripartite

- **`solution/`** : Implémentation officielle validant les 6 critères (20/20 pts).
- **`solution-alt/`** : Implémentation alternative avec box-sizing et transition explicite validant les 6 critères (20/20 pts).
- **`solution-invalide/`** : Implémentation avec erreurs de display (block) et omission de hover échouant sur les critères correspondants.
