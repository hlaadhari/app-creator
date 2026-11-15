---
name: labo-pr-workflow
description: >-
  Runbook complet du workflow strict par Pull Request sur Labo STI (règle #6 de AGENTS.md et règle Lovable).
  À activer avant de créer une branche, soumettre un commit, valider la qualité locale (format, lint, typecheck,
  validate:criteria, test, build), ouvrir une Pull Request sur GitHub, surveiller la CI ou fusionner dans main.
---

# Workflow Strict par Pull Request — Labo STI

Ce skill définit la procédure obligatoire pour toute livraison de fonctionnalité ou correction d'issue sur le dépôt **Labo STI**.

## 1. Règles Inviolables

1. **Aucun push direct sur `main`** : chaque issue ou amélioration doit passer par une branche dédiée et une Pull Request.
2. **Préservation de l'histoire Git (Règle Lovable)** :
   - Interdiction absolue de `git push --force`, `git rebase` ou `git commit --amend` sur des commits déjà poussés.
3. **Environnement Shell Windows (PowerShell)** :
   - Ne jamais chaîner des commandes avec `&&` (invalide en PowerShell Windows). Utiliser le point-virgule `;` ou des appels séquentiels.
4. **Zéro fuite de secrets (T-12)** :
   - Ne jamais inscrire de jeton GitHub (PAT) ou de clé `SUPABASE_SERVICE_ROLE_KEY` / `sb_secret_` dans les fichiers suivis par Git ou dans l'URL distante permanente de `.git/config`.

---

## 2. Étapes du Cycle de Vie d'une Issue

### Étape 1 : Synchronisation et création de la branche dédiée

```powershell
git checkout main
git pull --ff-only origin main
git checkout -b feat/issue-<num>-<slug-court>
```
*(Utiliser les préfixes `feat/`, `fix/`, `perf/`, `refactor/`, `test/`, `docs/` ou `chore/`).*

### Étape 2 : Contraintes de codage TypeScript strict

Le projet active les options TypeScript les plus strictes (`tsconfig.json`) :
- **`noPropertyAccessFromIndexSignature`** : sur tout objet de type `Record<string, unknown>`, accéder aux clés via `obj["cle"]` et jamais `obj.cle` (erreur `TS4111`).
- **`exactOptionalPropertyTypes`** : les propriétés optionnelles pouvant recevoir `undefined` explicite doivent être typées `prop?: Type | undefined`.
- **`noUncheckedIndexedAccess`** : tout accès par index (`arr[0]`, `match[1]`) renvoie `T | undefined` ; toujours vérifier ou utiliser `??`.
- **Imports serveur TanStack Start** : ne jamais importer `"server-only"` (Next.js) ; utiliser les fichiers `*.server.ts` ou `@tanstack/react-start/server-only`.

### Étape 3 : Les 6 Portes de Validation Locale (Obligatoires avant commit)

Vous pouvez exécuter le script groupé [verify-all.ps1](./scripts/verify-all.ps1) :

```powershell
pwsh -NoProfile -File .agents/skills/labo-pr-workflow/scripts/verify-all.ps1
```

Ou exécuter les commandes dans cet ordre exact :

```powershell
# 1. Formatage Prettier
bun run format
bun run format:check

# 2. Linter ESLint (aucun avertissement toléré : --max-warnings=0)
bun run lint

# 3. Typage strict TypeScript
bun run typecheck

# 4. Validation Zod des criteria.json et garde du score initial (0 pt sur initial/)
bun run validate:criteria

# 5. Tests unitaires et d'intégration Vitest
bun run test

# 6. Build de production (Standard & Vercel Nitro)
bun run build
```

> Si la modification touche `supabase/migrations/` ou `supabase/tests/`, exécuter également `bun run test:db`.

### Étape 4 : Commit au format Conventional Commits

Le workflow `.github/workflows/pr-lint.yml` bloque toute PR dont le titre ne respecte pas **Conventional Commits** :

```powershell
git add <fichiers>
git commit -m "feat(scope): description concise en français (#<num>)"
```
Types autorisés : `feat`, `fix`, `perf`, `refactor`, `style`, `test`, `docs`, `build`, `ops`, `chore`, `security`.

### Étape 5 : Ouverture de la Pull Request et Surveillance CI

1. Pousser la branche dédiée vers `origin`.
2. Ouvrir la Pull Request vers `main` avec :
   - **Titre** : identique au format Conventional Commits (`feat(scope): ... (#<num>)`).
   - **Corps** : résumé structuré des changements et mention `Closes #<num>`.
3. Attendre que l'ensemble des vérifications CI GitHub Actions soient au statut `completed` avec `conclusion: success` :
   - `Validate PR Title (Conventional Commits)`
   - `Format Check, Lint, Typecheck, Test & Build`
   - `PostgreSQL 16 Migrations & Real RLS Negative Tests (T-01 to T-18)`
   - `E2E Playwright (parcours par rôle, app déployée)`
   - `CodeQL Security Scan (javascript-typescript)`
   - `Vercel Preview Comments`

### Étape 6 : Fusion (Squash Merge) et Nettoyage

Une fois la CI 100 % verte :
1. Fusionner la PR en mode `squash` sur GitHub.
2. Revenir sur `main` et synchroniser :

```powershell
git checkout main
git pull --ff-only origin main
git branch -D feat/issue-<num>-<slug-court>
```
