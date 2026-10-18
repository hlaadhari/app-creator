# Guide & Règles des Contributeurs — Sprout Workshop (Labo STI)

Bienvenue sur le projet **Sprout Workshop / Labo STI**. Ce document fixe les règles obligatoires et le code de conduite technique pour toute contribution au code source, à la documentation ou aux sujets pédagogiques.

---

## 1. Les 8 Règles d'Or Inviolables (Golden Rules)

Tout contributeur doit respecter sans exception les principes architecturaux issus du [**PRD v3.1**](docs/PRD.md) :

### Règle 1 : Préservation de l'Histoire Git (Interconnexion Lovable)
- Le dépôt est synchronisé en continu avec [Lovable](https://lovable.dev).
- **Interdiction formelle de force-push (`git push --force`)** ou de réécrire l'historique de commits déjà publiés (`git rebase -i`, `git commit --amend` sur commits distants).
- Chaque commit sur `main` doit laisser le projet dans un état propre, stable et exécutable.

### Règle 2 : Immuabilité Pédagogique Absolue
- Une version publiée de sujet (`sujet_versions` où `publiee = true`) ne doit **jamais être modifiée ni supprimée**.
- Toute correction d'énoncé, de fichier de départ ou de critère nécessite d'incrémenter le numéro de version (`numero + 1`).
- Les `snapshots` d'examen sont strictement scellés et immuables.

### Règle 3 : Zéro Confiance Côté Client
- Les tables `solutions` et les critères masqués ne doivent comporter **aucun `GRANT`** de lecture pour `anon` et `authenticated`.
- L'évaluation officielle et la clôture d'examen sont régies par l'**horloge du serveur** (`echeance_serveur`), jamais par l'heure de la machine élève.

### Règle 4 : Ne Jamais Perdre le Travail d'un Élève (Offline-First)
- Écriture en premier dans le tampon local **IndexedDB** (`labo_sti_buffer`).
- Synchronisation asynchrone avec gestion des numéros de révision (`rev`). En cas de conflit, proposer un arbitrage explicite : **aucun écrasement silencieux**.

### Règle 5 : Confinement & Isolation Stricte du Bac à Sable
- Prévisualisation HTML/JS dans une `iframe sandbox="allow-scripts"` sans `allow-same-origin` vers le domaine maître et sans accès réseau sortant.
- PHP (Phase 2) confiné dans un Web Worker avec watchdog (timeout 3s max) et limite de mémoire (64 Mo).

### Règle 6 : Obligation de Test Pré-Publication (Qualité Pédagogique)
- Tout sujet d'exercice doit être validé avec **au moins 2 solutions valides différentes à 100 %** et **au moins 1 solution invalide** avant publication (voir [`docs/CRITERIA_GUIDE.md`](docs/CRITERIA_GUIDE.md)).

### Règle 7 : Sécurité RLS Systématique
- Toute nouvelle table PostgreSQL créée dans `drizzle/migrations/` ou `supabase/migrations/` doit obligatoirement être accompagnée de ses politiques **Row Level Security (RLS)** pour `anon`, `authenticated` et `service_role`.

### Règle 8 : Typage TypeScript Strict
- Pas de `any` implicite (`noImplicitAny`), typage rigoureux des props React et des schémas de base de données.

---

## 2. Workflow de Contribution GitHub

```
main ───────────► (toujours déployable)
      │
      └─── feature/nom-de-la-branche ───► PR (revue + CI) ───► Merge sur main
```

### 2.1 Convention de Nommage des Branches
- `feature/<description-courte>` : Nouvelle fonctionnalité (ex: `feature/indexeddb-buffer`)
- `fix/<description-courte>` : Correction de bug (ex: `fix/css-eval-padding`)
- `docs/<description-courte>` : Documentation (ex: `docs/guide-criteres`)
- `test/<description-courte>` : Ajout de tests (ex: `test/negative-t01`)

### 2.2 Convention de Commits (Conventional Commits)
Le titre de vos commits et de vos Pull Requests doit respecter le format standard :

`<type>(<portée optionnelle>): <description en minuscules>`

Types autorisés :
- `feat` : Nouvelle fonctionnalité
- `fix` : Correction d'une anomalie
- `docs` : Modification ou ajout de documentation
- `test` : Ajout ou correction de tests
- `refactor` : Restructuration sans impact fonctionnel
- `chore` : Tâches de build, dépendances ou configuration
- `ci` : Configuration de l'intégration continue

*Exemples valides :*
- `feat(editor): integration du tampon de sauvegarde IndexedDB`
- `fix(eval): prise en compte des variantes de couleurs hex/rgb`
- `docs(api): mise a jour du schema des 26 tables`

---

## 3. Standards de Code & Bonnes Pratiques

### 3.1 Frontend & Composants UI
- Framework : **TanStack Start** avec TanStack Router (routes typées dans `src/routes/`).
- Composants : **Radix UI** primitives non stylisées + **Tailwind CSS v4**.
- Icônes : Utiliser `lucide-react` selon le mapping défini dans [`docs/BRANDING.md`](docs/BRANDING.md).
- Accessibilité : Tous les boutons interactifs doivent avoir un label accessible ou un `aria-label`.

### 3.2 Gestion des Données & Migrations
- Tout changement de schéma passe par un fichier SQL dans `drizzle/migrations/` numéroté séquentiellement (`0000_...`, `0001_...`, `0002_...`).
- N'effectuez jamais de `DROP TABLE` sans plan de migration et accord explicite des mainteneurs.

### 3.3 Vérifications Locales Obligatoires Avant Push
Avant de soumettre une Pull Request, exécutez la suite de contrôle qualité :

```bash
# 1. Vérification du typage
npm run typecheck

# 2. Analyse statique (lint)
npm run lint

# 3. Formatage
npm run format

# 4. Tests unitaires et pédagogiques
npm test

# 5. Build de production
npm run build
```

---

## 4. Processus de Revue et Fusion (Merge)

1. **Vérification Automatique par la CI** :
   - Le workflow GitHub Actions [`.github/workflows/ci.yml`](.github/workflows/ci.yml) valide le typage, le lint, les tests et l'absence de fuite de secrets (**T-12**).
   - Le workflow [`.github/workflows/pr-lint.yml`](.github/workflows/pr-lint.yml) valide le titre de la PR.
2. **Revue de Code Obligatoire** :
   - Tout changement nécessite l'approbation d'un mainteneur défini dans [`.github/CODEOWNERS`](.github/CODEOWNERS) (`@hlaadhari`).
3. **Checklist de Pull Request** :
   - Assurez-vous d'avoir coché les critères du template [`.github/pull_request_template.md`](.github/pull_request_template.md).
