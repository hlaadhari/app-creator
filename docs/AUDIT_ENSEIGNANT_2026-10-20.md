# Audit `/enseignant` & `/admin` — Plan de correction (20 octobre 2026)

Audit réalisé sur le déploiement `app-creator-phi.vercel.app` (compte admin de test) et sur le code.
Cette PR ne contient **que le plan** ; chaque lot ci-dessous fera l'objet d'une issue et d'une PR dédiée (AGENTS.md §2.6).

## Constats

| # | Gravité | Constat | Référence |
|---|---------|---------|-----------|
| C1 | Critique | En production, `GET profiles`, `GET user_roles` et `class_members?select=…profiles(...)` répondent **500** (les autres tables répondent 200). Les migrations du dépôt ont des politiques RLS simples : la base déployée a probablement dérivé du dépôt, ou une politique y est récursive. Le tableau de bord affiche « 0 élève » alors que la liste n'a pas pu être chargée (faux zéro). | `supabase/migrations/20261018102600_0000_*.sql` |
| C2 | Critique | Rôles forcés côté client par e-mail ; masque C1 (sans lui, l'admin serait refusé). Contredit « zéro confiance côté client ». | `src/lib/supabase/auth.tsx:68-75` |
| C3 | Élevée | Mode démo `?demo=true` contourne la garde d'accès en production, y compris l'onglet admin. | `src/routes/enseignant.tsx:481,664,746` |
| C4 | Élevée | Tableau admin : « 14 / 14 » et « 100 % Validé » écrits en dur ; liste d'utilisateurs de repli issue de `OFFICIAL_SYSTEM_ACCOUNTS` quand `profiles` échoue. Affiche des garanties non prouvées. | `src/routes/admin.tsx:360,572`, `src/lib/supabase/admin.ts:263,396-414` |
| C5 | Moyenne | E-mail personnel `dev02` affiché aux visiteurs non connectés ; e-mails/UUID de comptes codés en dur. | `enseignant.tsx:675`, `admin.ts:266-285` |
| C6 | Moyenne | `bun audit` : 17 vulnérabilités (1 critique `shell-quote`, 11 élevées), surtout chaîne de build/dev. | `bun.lock` |
| C7 | ~~Moyenne~~ Retiré | **Faux positif** : les 12 échecs venaient de `bun test` (runner natif Bun, sans jsdom). Le projet utilise `bun run test` (vitest + jsdom, comme la CI) : 294/294 tests passent. | `package.json` |
| C8 | Faible | Requêtes de profil/rôle répétées 3× sur échec → écran « Vérification des droits » > 4 s. | `auth.tsx` |
| C9 | Faible | Marque « Sprout Workshop » vs « Labo STI » ; onglets sur 2 lignes à 800 px. | `__root.tsx:82`, `index.tsx:36` |

## Plan par lots (ordre d'exécution)

### Lot 1 — Réparer la RLS en production (C1) — *bloquant*
1. Récupérer le message d'erreur Postgres des 500 (logs Supabase) ; identifier politique récursive ou dérive.
2. Comparer les politiques déployées (`pg_policies`) aux migrations ; écrire une migration corrective idempotente (`supabase/migrations/` + `drizzle/migrations/`) avec RLS pour `anon`, `authenticated`, `service_role`.
3. Lecture des profils des élèves d'une classe par l'enseignant via fonction `security definer` (évite la récursion).
4. Critère de sortie : 0 réponse 500 sur `/enseignant` et `/admin`, tests T-01..T-14 toujours verts.

### Lot 2 — Retirer la confiance client (C2, C3, C5, C8)
- Supprimer l'override par e-mail ; le rôle vient uniquement de `user_roles` (comptes de test seedés en base).
- `?demo=true` réservé à `import.meta.env.DEV` ; extraire les `DEMO_*` dans un module chargé à la demande.
- Message de garde générique (sans e-mail) ; sortir les comptes de test du code.
- Dédupliquer/mémoïser la récupération profil+rôle, avec erreur explicite et état « échec de chargement » (jamais un faux zéro).
- *Dépend du Lot 1.*

### Lot 3 — Tableau admin véridique (C4)
- Remplacer 14/14 par le résultat réel de la CI (fichier de résultats généré ou RPC), « inconnu » si indisponible.
- Supprimer le repli sur `OFFICIAL_SYSTEM_ACCOUNTS` : afficher l'erreur plutôt que des données fictives.

### Lot 4 — Dépendances et documentation des commandes (C6)
- Tests : rien à corriger (C7 retiré). Documenter dans AGENTS.md que la commande est `bun run test` et non `bun test` (AGENTS.md §2.6 cite `bun test`).
- `bun audit fix` ; traiter `shell-quote` en priorité.

### Lot 5 — Finitions (C9)
- Unifier la marque « Labo STI » ; onglets enseignants défilables/compacts < 1024 px.

## Hors périmètre / non vérifié
Onglets Contestations, Similarité, Studio ; données réelles (classe à 0 élève) ; accessibilité ; performances ; matrice RLS T-01..T-14 sur la base en ligne.

## Définition de « terminé »
Console sans 500, rôles issus uniquement de la base, aucun chiffre en dur dans `/admin`, `bun test` / `typecheck` / `build` verts.
