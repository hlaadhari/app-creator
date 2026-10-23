## Description des Modifications

<!-- Résumez clairement la nature de la modification, le jalon ou la phase concernée (ex: Phase 1 / Lot B - Tampon Local). -->

## Type de Changement

- [ ] 🐛 Correction de bug (non-breaking change)
- [ ] ✨ Nouvelle fonctionnalité (phase ou exigence PRD)
- [ ] 🔒 Sécurité / RLS / Durcissement
- [ ] 📚 Documentation / Cadrage
- [ ] ♻️ Refactorisation / Dette technique

## Checklist de Qualité & Sécurité (Standards Labo STI)

### 1. Intégrité Pédagogique & Données

- [ ] **Immuabilité** : Aucune mise à jour directe sur une `sujet_version` publiée (`publiee = true`).
- [ ] **Confidentialité** : Aucun `GRANT` de lecture vers `solutions` ou critères masqués pour `anon` ou `authenticated`.
- [ ] **Offline First** : Écriture locale d'abord dans IndexedDB avant synchronisation distante.
- [ ] **Arbitrage des conflits** : Gestion du numéro de révision `rev` sans écrasement silencieux.

### 2. Sécurité & Bac à Sable

- [ ] **Isolation Sandbox** : Prévisualisation dans une iframe `sandbox="allow-scripts"` sans `allow-same-origin` vers le domaine maître.
- [ ] **Zéro secret client** : Aucune clé `service_role` ni secret sensible dans le bundle ou les logs.
- [ ] **Conformité RLS** : Toute nouvelle table est assortie de ses politiques Row Level Security documentées.

### 3. Validation & Tests

- [ ] `npm run lint` passe sans erreur.
- [ ] `npx tsc --noEmit` passe sans erreur.
- [ ] `npm test` passe avec succès.
- [ ] Pour tout nouveau sujet : validé avec au moins **2 solutions valides différentes** et **1 solution invalide**.
