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

Les migrations sont versionnées à la fois pour **Drizzle ORM** (`drizzle/migrations/`) et pour la **CLI Supabase** (`supabase/migrations/`) :

| Fichier Drizzle | Fichier Supabase | Contenu & Objectifs | Statut Cloud |
| :--- | :--- | :--- | :--- |
| `0000_etape1_profiles_roles.sql` | `20261018102600_...` | Types `app_role`, table `profiles`, table `user_roles`, trigger `on_auth_user_created`, RLS | **Appliqué** |
| `0001_etape2_sujets.sql` | `20261018102633_...` | Tables `sujets`, `sujet_versions`, `sujet_version_fichiers`, `criteres`, `solutions`, `indices`, données initiales (S1, S2, S3) | **Appliqué** |
| `0002_etape3_classes_projets.sql` | `20261018114500_...` | Tables `classes`, `class_members`, `class_invitations`, `class_sujets`, `projets`, `projet_fichiers` (avec `rev`), `tentatives`, RPCs `rejoindre_classe`, `initialiser_projet`, `sauvegarder_fichier` | **Prêt à appliquer** |

### Déploiement de la Migration 0002 :
La migration 0002 peut être appliquée par l'une des méthodes suivantes :
1. **Via Lovable Sync** : Le commit pushé sur `main` est synchronisé vers Lovable, qui détecte le fichier dans `drizzle/migrations/` et l'applique automatiquement via sa connexion de migration.
2. **Via le SQL Editor Supabase** : Copier-coller le contenu de [`drizzle/migrations/0002_etape3_classes_projets.sql`](file:///d:/My%20Projects/lab-analysis/app-creator/drizzle/migrations/0002_etape3_classes_projets.sql) dans l'éditeur SQL du Dashboard Supabase (`https://supabase.com/dashboard/project/dxanlvsonydghkmycexq/sql`).
3. **Via la CLI Supabase** :
   ```bash
   npx supabase db push
   ```

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
