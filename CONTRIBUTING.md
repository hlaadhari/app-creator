# Guide de Contribution — Labo STI

Merci de contribuer au projet **Labo STI** ! Ce guide détaille les conventions de développement, les règles architecturales inviolables et les étapes pour contribuer efficacement.

---

## 1. Principes Directeurs et Règles d'Or

Toute contribution doit respecter les principes fondamentaux définis dans [`CONTEXT.md`](CONTEXT.md) et [`docs/PRD.md`](docs/PRD.md) :

1. **Préservation de l'Histoire Git (Règle Lovable)** :
   - Ce projet est interconnecté avec [Lovable](https://lovable.dev).
   - **Interdiction formelle de force-push (`git push --force`)** ou de réécrire l'historique de commits déjà publiés (`git rebase -i` sur des commits distants).
   - Chaque commit poussé sur `main` doit laisser le projet dans un état stable et exécutable.
2. **Immuabilité Pédagogique Absolue** :
   - Une version publiée de sujet (`sujet_versions` où `publiee = true`) ne doit **jamais être modifiée ni supprimée**.
   - Toute modification d'énoncé, de fichier starter ou de critère nécessite d'incrémenter le numéro de version (`numero + 1`).
   - Les snapshots d'examen sont scellés et immuables.
3. **Zéro Confiance Côté Client** :
   - Les tables `solutions` et les critères masqués ne comportent aucun `GRANT` de lecture pour `anon` et `authenticated`.
   - L'évaluation officielle et la clôture d'examen sont régies par l'horloge du serveur (`echeance_serveur`).
4. **Ne Jamais Perdre le Travail d'un Élève** :
   - Écriture en premier dans le tampon local **IndexedDB** (`labo_sti_buffer`).
   - Synchronisation asynchrone avec gestion des numéros de révision (`rev`). En cas de conflit, proposer un arbitrage explicite (aucun écrasement silencieux).
5. **Isolation Stricte du Bac à Sable** :
   - Prévisualisation HTML/JS dans une `iframe sandbox="allow-scripts"` sans `allow-same-origin` vers le domaine maître et sans accès réseau sortant.
6. **Validation Qualité Pédagogique** :
   - Tout nouveau sujet doit être accompagné et validé avec au moins **2 solutions valides différentes** et au moins **1 solution invalide** avant publication.

---

## 2. Environnement de Développement

### Prérequis
- [Node.js](https://nodejs.org/) v20+ ou v22+
- `npm` ou `bun`

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/hlaadhari/app-creator.git
cd app-creator

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Compléter les clés Supabase de test
```

### Commandes Usuelles

```bash
# Serveur de développement local
npm run dev

# Vérification du typage TypeScript
npm run typecheck

# Analyse statique du code (linter)
npm run lint

# Formatage automatique
npm run format

# Exécution des tests unitaires et de régression
npm test

# Build de production
npm run build
```

---

## 3. Conventions de Commits

Nous utilisons la convention **Conventional Commits** :

- `feat:` Nouvelle fonctionnalité (ex: `feat(editor): integration du tampon IndexedDB`)
- `fix:` Correction d'anomalie (ex: `fix(eval): gestion des espaces dans l'evaluateur CSS`)
- `docs:` Documentation ou cadrage (ex: `docs: ajout du guide de redaction des criteres`)
- `test:` Ajout ou mise à jour de tests (ex: `test(security): automatisation du test negatif T-01`)
- `refactor:` Restructuration de code sans changement fonctionnel
- `chore:` Maintenance des dépendances ou scripts de build

---

## 4. Soumettre une Pull Request

1. Créez une branche thématique : `git checkout -b feature/nom-de-la-fonctionnalite`
2. Effectuez vos modifications en respectant les standards de typage strict.
3. Vérifiez la conformité locale :
   ```bash
   npm run typecheck && npm run lint && npm test
   ```
4. Ouvrez une Pull Request sur GitHub vers la branche `main` en remplissant soigneusement la checklist du modèle [`.github/pull_request_template.md`](.github/pull_request_template.md).
