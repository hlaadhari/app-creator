# Guide de Configuration Supabase — Sprout Workshop (Labo STI)

> **Projet Supabase Cloud** : `dxanlvsonydghkmycexq`  
> **URL de l'API** : `https://dxanlvsonydghkmycexq.supabase.co`  
> **Dernière mise à jour** : 18 octobre 2026

---

## 1. Vue d'Ensemble de l'Architecture Supabase

Sprout Workshop s'appuie sur Supabase Postgres pour fournir :

1. **L'authentification et les rôles applicatifs** (`auth.users`, `profiles`, `user_roles`).
2. **Le catalogue pédagogique immuable** (`sujets`, `sujet_versions`, `sujet_version_fichiers`, `criteres`, `indices`, `solutions`).
3. **La gestion des classes et des affectations** (`classes`, `class_invitations`, `class_members`, `class_sujets`).
4. **La persistance des projets élèves** avec numéros de révision anti-conflits (`projets`, `projet_fichiers`, `tentatives`).
5. **Le stockage d'actifs pédagogiques et d'archives** (Buckets Supabase Storage).

---

## 2. Variables d'Environnement

Le fichier `.env` configure la connexion du client web et du serveur SSR :

```env
# Configuration Publique (Client Vite)
VITE_SUPABASE_PROJECT_ID="dxanlvsonydghkmycexq"
VITE_SUPABASE_URL="https://dxanlvsonydghkmycexq.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_6oy2IYNYBkyKr0umKULwVw_vy7bVVIZ"

# Configuration Serveur SSR / Nitro
SUPABASE_PROJECT_ID="dxanlvsonydghkmycexq"
SUPABASE_URL="https://dxanlvsonydghkmycexq.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_6oy2IYNYBkyKr0umKULwVw_vy7bVVIZ"
```

> [!WARNING]
> La clé secrète `SUPABASE_SERVICE_ROLE_KEY` ne doit **JAMAIS** être présente dans le bundle client ou dans les variables préfixées par `VITE_`. Le test de sécurité **T-12** intégré dans la CI GitHub Actions bloque immédiatement tout déploiement en cas de fuite.

---

## 3. Schéma des Migrations SQL

Les migrations SQL ont pour unique source de vérité le dossier **`supabase/migrations/`** (`0000` à `0016+`) :

| Fichier Supabase                                         | Contenu & Objectifs                                                                                                                                                            |
| :------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261018102600_0000_etape1_profiles_roles.sql`          | Types `app_role`, table `profiles`, table `user_roles`, trigger `on_auth_user_created`, RLS                                                                                    |
| `20261018102633_0001_etape2_sujets.sql`                  | Tables `sujets`, `sujet_versions`, `sujet_version_fichiers`, `criteres`, `solutions`, `indices`, triggers d'immuabilité                                                        |
| `20261019120001_0002_etape3_classes_projets.sql`         | Tables `classes`, `class_members`, `class_invitations`, `class_sujets`, `projets`, `projet_fichiers` (avec `rev`), `tentatives`, RPCs `rejoindre_classe`, `initialiser_projet` |
| `20261019120002_0003_etape4_sessions_examen.sql`         | Tables `sessions_examen`, `passages_examen`, triggers `verifier_echeance_ecriture` et `verifier_transition_passage_examen`, RPC `obtenir_horloge_serveur`                      |
| `20261019120003_0004_etape4_snapshots_rejouage.sql`      | Tables `snapshots` et `notes`, trigger `interdire_mutation_snapshot`, RPC `sceller_snapshot_examen`                                                                            |
| `20261019120004_0005_etape3_contestations_solutions.sql` | Tables `journal_securite`, `contestations`, `journal_acces_solutions`                                                                                                          |
| `20261019120005_0006_etape5_competences_maitrise.sql`    | Tables `competences`, `critere_competences`, `maitrise`, `badges_definition`, `badges`                                                                                         |
| `20261020150000_0007` à `20261023120000_0016+`           | Durcissement RLS/GRANTs, administration utilisateurs, `demandes_enseignant`, `solutions_banc`, Studio de sujets et restriction `has_role`                                      |

### Déploiement des Migrations :

Les migrations peuvent être appliquées par l'une des méthodes suivantes :

1. **Via la CLI Supabase** :
   ```bash
   npx supabase db push
   ```
2. **Via le SQL Editor Supabase** : Copier-coller les scripts de [`supabase/migrations/`](../supabase/migrations) dans l'éditeur SQL du Dashboard Supabase.

---

## 4. Sécurité & Modèle RLS (Row Level Security)

Toutes les tables ont RLS activé (`alter table ... enable row level security;`).

### Matrice de permissions :

- `sujets` : Lecture publique (`anon`, `authenticated`) pour le catalogue.
- `sujet_versions` : Lecture publique uniquement si `publiee = true`.
- `sujet_version_fichiers` : Lecture publique uniquement pour les versions publiées.
- `criteres` & `solutions` : **AUCUN GRANT** pour `anon` et `authenticated`. Accessible uniquement par `service_role` (Nitro API ou Workers d'évaluation).
- `classes` : Création/gestion par l'enseignant propriétaire (`enseignant_id = auth.uid()`). Lecture par les élèves inscrits via `class_members`.
- `projets` & `projet_fichiers` : Accès strictement réservé à l'élève propriétaire (`eleve_id = auth.uid()`) et en lecture seule à ses enseignants rattachés.
- `tentatives` : Insertion et lecture réservées à l'élève et consultation par ses enseignants.

---

## 5. Résilience Offline & Gestion des Conflits (`rev`)

Pour respecter le principe directeur **« Ne jamais perdre le travail d'un élève »** (PRD §9.1) :

1. Les modifications de code sont sauvegardées instantanément en local (`localStorage` / IndexedDB).
2. La synchronisation distante vers `projet_fichiers` s'effectue via la fonction RPC `sauvegarder_fichier` :
   - Elle compare le `_expected_rev` avec la révision stockée en base.
   - Si les révisions coïncident : le contenu est mis à jour et `rev` est incrémenté de 1.
   - Si une révision plus récente existe : une exception `CONFLIT_REVISION` est levée. Aucun écrasement silencieux n'a lieu, et l'interface propose un arbitrage à l'élève.
