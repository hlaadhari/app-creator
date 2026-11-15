---
name: labo-ui-a11y
description: >-
  Standards d'interface utilisateur, ergonomie responsive (desktop redimensionnable, tablette 2 colonnes,
  mobile navigation bas), hydratation SSR/CSR et accessibilité WCAG 2.1 AA (axe-core, contrastes thème sombre)
  sur Labo STI. À activer lors de la création ou modification de composants dans src/components/ ou de routes dans src/routes/.
---

# Standards UI, Ergonomie & Accessibilité WCAG 2.1 AA — Labo STI

Ce skill rassemble les contraintes d'architecture front-end, d'accessibilité et de performance appliquées aux écrans de **Labo STI** (TanStack Start, React 19, Radix UI, Tailwind CSS v4).

## 1. Architecture des Composants & En-Tête Partagé

1. **`AppHeader` unifié** (`src/components/layout/AppHeader.tsx`) :
   - Toutes les routes principales utilisent `AppHeader` avec navigation épurée sans bordures superflues.
   - Le menu profil (`UserProfileMenu`) intègre le sélecteur de prévisualisation de rôle (« Prévisualiser en tant que : Élève / Enseignant / Admin ») pour les administrateurs.
   - La cloche de notifications (`NotificationsBell`) ne s'affiche que si `VITE_NOTIFICATIONS_ENABLED=true`.
2. **Découpage du Workspace Sujet** (`src/routes/sujet.$id.tsx` & `src/components/workspace/`) :
   - **Desktop (≥ 1024 px)** : panneaux redimensionnables (énoncé/consignes, éditeur Monaco, aperçu/console PHP/SQL).
   - **Tablette (768 px – 1023 px)** : disposition en deux colonnes équilibrées.
   - **Mobile (< 768 px)** : affichage d'un panneau actif à la fois avec barre de navigation inférieure dédiée et bandeau de mode consultation.

---

## 2. Accessibilité WCAG 2.1 AA & Conformité `axe-core`

Chaque écran est testé automatiquement avec `axe-core`. Toute modification UI doit respecter :

1. **Landmarks & Hiérarchie des Titres** :
   - Exactement un `<main>` par page et un `<h1>` unique et descriptif.
   - Chaque `<nav>` ou `<section>` importante doit posséder un `aria-label` ou `aria-labelledby` distinct.
   - Titre de document (`document.title`) unique par route.
2. **Contrastes des Couleurs (Ratio ≥ 4.5:1 pour le texte normal)** :
   - En **thème sombre** (`dark:`), ne jamais utiliser de texte coloré en nuances `-500` ou `-600` sur fond sombre (`slate-900`/`slate-950`) : utiliser les nuances **`-400`** ou **`-300`** (`text-emerald-400`, `text-sky-400`, `text-amber-400`, `text-rose-400`).
   - Sur les badges colorés (ex: émeraude), garantir un contraste AA entre le fond et le texte (`bg-emerald-500/15 text-emerald-300` en sombre, `bg-emerald-100 text-emerald-800` en clair).
   - Texte secondaire : privilégier `text-slate-600 dark:text-slate-300` ou `text-muted-foreground`.
3. **Noms Accessibles & Régions Défilables** :
   - Tout bouton contenant uniquement une icône Lucide doit avoir un `aria-label` explicite en français.
   - Tout bloc de code ou conteneur défilable (`overflow-auto` / `overflow-x-auto`) doit être accessible au clavier (`tabIndex={0}`, `role="region"`, `aria-label="..."`).
   - Les zones de retour dynamique (résultats de vérification, chronomètre, alertes) utilisent `aria-live="polite"`.

---

## 3. Hydratation SSR/CSR & Performance Front-End

1. **Zéro décalage d'hydratation (Hydration Mismatch)** :
   - Ne jamais lire `localStorage`, `sessionStorage`, `window.innerWidth` ou `Date.now()` directement pendant le premier rendu synchrone d'un composant. Différer dans un `useEffect`.
   - Pour le compte à rebours d'examen, le premier rendu serveur et client doit être strictement identique avant synchronisation avec `echeance_serveur`.
2. **Polices & Chargement Différé** :
   - Polices auto-hébergées via `@fontsource/ibm-plex-sans` et `@fontsource/jetbrains-mono` (aucun appel réseau externe vers Google Fonts).
   - Charger les composants lourds non critiques (ex: guide d'accueil, modale de progression des compétences, Monaco Editor) de manière différée (`React.lazy` / `requestIdleCallback`).

---

## 4. Tests UI & Accessibilité à Exécuter

```powershell
bun run test src/test/accessibility-wcag.test.tsx src/test/app-header.test.tsx src/test/workspace-header-declutter.test.tsx src/test/workspace-mobile-nav.test.tsx src/test/profile-menu-role-switch.test.tsx
```
