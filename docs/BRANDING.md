# Charte Graphique & Identité Visuelle — Sprout Workshop (Labo STI)

> **Projet Lovable** : Sprout Workshop (Plateforme d'Entraînement Bac STI)  
> **Dernière mise à jour** : 18 octobre 2026

---

## 1. Concept et Signification de la Marque

Le nom **Sprout Workshop** symbolise :

- **Sprout (Jeune Pousse)** : La germination, la croissance des compétences des élèves de Bac STI, le passage du débutant au développeur autonome.
- **Workshop (Atelier)** : L'apprentissage par la pratique directe du code (« learning by doing »), sans friction d'installation, dans un atelier numérique complet.

---

## 2. Palette de Couleurs Officielles (Brand Colors)

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Sprout Green   │   Light Leaf    │   Deep Slate    │   Dark Panel    │
│     #22C55E     │     #4ADE80     │     #0F172A     │     #1E293B     │
│  (Couleur Clé)  │    (Accents)    │  (Fond Principal│    (Cartes/UI)  │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

| Rôle                        | Hexadécimal | OKLCH (Tailwind v4)     | Usage dans l'application                                                                       |
| --------------------------- | ----------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| **Primary (Sprout Green)**  | `#22C55E`   | `oklch(0.72 0.19 145)`  | Boutons d'action principale (« Vérifier »), liens actifs, marque Sprout, indicateurs de succès |
| **Primary Foreground**      | `#052E16`   | `oklch(0.15 0.03 145)`  | Texte sur fond vert principal                                                                  |
| **Accent / Soft Leaf**      | `#4ADE80`   | `oklch(0.80 0.16 145)`  | Deuxième feuille du logo, badges validés, highlights                                           |
| **Background (Deep Slate)** | `#0F172A`   | `oklch(0.16 0.015 250)` | Fond de page sombre de l'application                                                           |
| **Card / Panel**            | `#1E293B`   | `oklch(0.20 0.015 250)` | Explorateur de fichiers, barre d'état, cartes de sujets                                        |
| **Editor Canvas**           | `#0B1120`   | `oklch(0.14 0.012 250)` | Fond de l'éditeur de code Monaco                                                               |
| **Muted Text**              | `#94A3B8`   | `oklch(0.68 0.02 250)`  | Métadonnées, descriptions, numéros de ligne                                                    |

---

## 3. Typographie

1. **Titres et Interface Utilisateur (Sans-Serif)** :
   - Famille : `IBM Plex Sans`, `Inter`, `system-ui`, sans-serif.
   - Poids : 400 (Corps), 500 (Labels/Navigation), 600 (Titres et CTA).
2. **Code et Métriques (Monospace)** :
   - Famille : `JetBrains Mono`, `ui-monospace`, monospace.
   - Poids : 400 (Code source, numéros de ligne), 600 (Scores, balises).

---

## 4. Actifs Graphiques Disponibles dans le Dépôt

| Élément                 | Format | Chemin d'Accès                                                      | Rôle & Affichage                                         |
| ----------------------- | ------ | ------------------------------------------------------------------- | -------------------------------------------------------- |
| **Favicon Vectoriel**   | SVG    | [`public/favicon.svg`](../public/favicon.svg)                       | Onglet navigateur moderne, net à toute résolution        |
| **Favicon App Icon**    | JPG    | [`public/branding/favicon.jpg`](../public/branding/favicon.jpg)     | Écran d'accueil iOS (`apple-touch-icon`)                 |
| **Logo Horizontal**     | SVG    | [`public/sprout-logo.svg`](../public/sprout-logo.svg)               | Version vectorielle haute résolution du logo             |
| **Logo Maquette**       | JPG    | [`public/branding/logo.jpg`](../public/branding/logo.jpg)           | Maquette originale fournie                               |
| **Planche d'Icônes UI** | JPG    | [`public/branding/ui-icons.jpg`](../public/branding/ui-icons.jpg)   | Planche des 12 icônes d'interface                        |
| **Composant React**     | TSX    | [`src/components/SproutLogo.tsx`](../src/components/SproutLogo.tsx) | Composant prêt à l'emploi (tailles sm/md/lg, sous-titre) |

---

## 5. Correspondance des 12 Icônes d'Interface (Lucide React)

Pour assurer la cohérence graphique avec la planche d'icônes fournie, voici le mapping avec la bibliothèque `lucide-react` déjà installée :

| Icône Planche | Concept                 | Composant Lucide équivalent  | Stylisation recommandée                                |
| ------------- | ----------------------- | ---------------------------- | ------------------------------------------------------ |
| 1             | Calendrier / Séances    | `Calendar` ou `Grid3X3`      | `className="text-primary"`                             |
| 2             | Classes / Élèves        | `Users`                      | `className="text-primary"`                             |
| 3             | Éditeur de Code         | `Code2`                      | `className="text-primary"`                             |
| 4             | Explorateur / Dossier   | `FolderGit2` ou `FolderCode` | `className="text-emerald-400"`                         |
| 5             | Base de Données         | `Database`                   | `className="text-primary"`                             |
| 6             | Document Validé / Rendu | `FileCheck`                  | `className="text-success"`                             |
| 7             | Graphique / Progression | `TrendingUp`                 | `className="text-primary"`                             |
| 8             | Minuteur d'Examen       | `Timer` ou `Clock`           | `className="text-primary"`                             |
| 9             | Compétences / Cible     | `Target`                     | `className="text-primary"`                             |
| 10            | Référentiel / Énoncé    | `BookOpen`                   | `className="text-emerald-400"`                         |
| 11            | Commentaires / Indices  | `MessageSquareCode`          | `className="text-primary"`                             |
| 12            | Paramètres              | `Settings`                   | `className="text-muted-foreground hover:text-primary"` |
