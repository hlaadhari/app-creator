<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Consignes pour Agents IA & Développeurs — Labo STI

Bienvenue sur le projet **Labo STI**. En tant qu'agent ou développeur travaillant sur ce dépôt, vous devez respecter scrupuleusement les standards, principes architecturaux et contraintes de sécurité définis ci-dessous.

---

## 1. Documentation de Référence Obligatoire

Avant toute modification structurelle ou ajout de fonctionnalité, consultez les documents de cadrage :
- [`CONTEXT.md`](file:///d:/My%20Projects/lab-analysis/app-creator/CONTEXT.md) : Synthèse centrale du projet, vision, stack et gap analysis.
- [`docs/PRD.md`](file:///d:/My%20Projects/lab-analysis/app-creator/docs/PRD.md) : Spécification fonctionnelle et technique complète (v3.1).
- [`docs/ARCHITECTURE.md`](file:///d:/My%20Projects/lab-analysis/app-creator/docs/ARCHITECTURE.md) : Détail de l'architecture (bac à sable iframe, WASM, Plan B, résilience).
- [`docs/DATA_MODEL.md`](file:///d:/My%20Projects/lab-analysis/app-creator/docs/DATA_MODEL.md) : Schéma des 26 tables, triggers d'intégrité et relations.
- [`docs/SECURITY.md`](file:///d:/My%20Projects/lab-analysis/app-creator/docs/SECURITY.md) : Modèle de menace, matrice RLS et spécification des 14 tests négatifs (T-01 à T-14).
- [`roadmap.md`](file:///d:/My%20Projects/lab-analysis/app-creator/roadmap.md) : Suivi des jalons (M0 à M8) et critères d'acceptation par phase.

---

## 2. Principes Directeurs Inviolables

1. **Préservation de l'Histoire Git (Règle Lovable)** :
   - Ne force-pushez jamais (`git push --force`).
   - Ne faites jamais de rebase interactif ou d'amendement sur des commits déjà publiés.
   - Assurez-vous que chaque commit laisse la branche `main` dans un état propre et fonctionnel.
2. **Immuabilité Pédagogique Absolue** :
   - Une version publiée de sujet (`sujet_versions` où `publiee = true`) ne doit **jamais** être mise à jour ou supprimée. Toute correction d'énoncé, de fichier ou de critère impose la création d'une nouvelle version (`numero + 1`).
   - Les `snapshots` d'examen sont strictement scellés et immuables.
3. **Zéro Confiance Côté Client** :
   - Les tables `solutions` et les critères masqués ne doivent comporter **aucun `GRANT`** pour les rôles `anon` et `authenticated`.
   - L'évaluation officielle et la clôture d'examen sont régies par l'**horloge du serveur** (`echeance_serveur`), jamais par l'heure de la machine élève.
4. **Ne Jamais Perdre le Travail d'un Élève** :
   - Écriture en premier dans le tampon local **IndexedDB** (`labo_sti_buffer`).
   - Synchronisation asynchrone avec gestion des numéros de révision (`rev`). En cas de conflit, proposer un arbitrage à l'utilisateur : **aucun écrasement silencieux**.
5. **Isolation Stricte du Code Élève** :
   - Prévisualisation HTML/JS dans une `iframe sandbox="allow-scripts"` sans `allow-same-origin` vers le domaine maître et sans accès réseau sortant.
   - PHP (Phase 2) confiné dans un Web Worker avec watchdog (timeout 3s max) et limite de mémoire (64 Mo).

---

## 3. Standards de Code & Conventions

- **Langage & Typage** : TypeScript strict (`noImplicitAny`, typage rigoureux des props et retours d'API).
- **Framework & Routage** : TanStack Start avec TanStack Router (routes typées dans `src/routes/`).
- **Composants & Design System** : Radix UI + Tailwind CSS v4. Conserver la palette sombre/claire et le design compact adapté aux résolutions de lycée (écrans ≥ 1024px).
- **Gestion d'État & Requêtes** : TanStack Query (`@tanstack/react-query`) pour le cache asynchrone Supabase.
- **Base de Données & Migrations** :
  - Définitions dans `drizzle/migrations/` et `supabase/migrations/`.
  - Toujours accompagner une nouvelle table de ses politiques **Row Level Security (RLS)** pour `anon`, `authenticated` et `service_role`.
- **Qualité Pédagogique** :
  - Tout sujet d'exercice doit être accompagné d'au moins **2 solutions valides différentes** et d'au moins **1 solution invalide** testées avant publication.
