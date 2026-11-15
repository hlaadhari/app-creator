---
name: labo-db-migration
description: >-
  Guide d'écriture et de validation des migrations PostgreSQL 16, politiques Row Level Security (RLS),
  fonctions RPC SECURITY DEFINER, triggers d'immuabilité et tests SQL négatifs dans supabase/ sur Labo STI.
  À activer dès qu'une table, colonne, politique RLS, fonction SQL ou migration Supabase est créée ou modifiée.
---

# Migrations SQL, RLS & Sécurité Base de Données — Labo STI

Ce skill régit toute intervention sur le schéma PostgreSQL 16 et les politiques de sécurité Supabase (`supabase/migrations/` et `supabase/tests/`).

## 1. Convention de Nommage des Migrations

Toutes les migrations résident dans `supabase/migrations/` (source unique de vérité SQL) :
- Format : `<YYYYMMDDHHMMSS>_<NNNN>_<description_snake_case>.sql`
- Exemple : `20261110140000_0040_revoke_anon_fonctions_security_definer.sql`
- Ne **jamais** modifier une migration déjà fusionnée sur `main` ; créer toujours une nouvelle migration incrémentale.

---

## 2. Règles de Sécurité & Performance SQL (Zéro Confiance)

### A. Activation RLS et Matrice des Rôles
1. **RLS obligatoire** sur 100 % des tables du schéma `public` :
   ```sql
   ALTER TABLE public.ma_table ENABLE ROW LEVEL SECURITY;
   ```
2. **Protection des corrigés et barèmes secrets (T-04)** :
   - Les tables `solutions`, `solutions_banc`, `baremes_examen_ecrit` et les critères masqués ne doivent comporter **aucun `GRANT`** pour les rôles `anon` et `authenticated`.
3. **Optimisation RLS (`initplan`)** :
   - Dans toutes les politiques RLS (`USING` et `WITH CHECK`), envelopper systématiquement `auth.uid()` et `auth.role()` dans un sous-SELECT `(SELECT auth.uid())` afin que PostgreSQL évalue l'identifiant une seule fois par requête et non ligne par ligne :
   ```sql
   CREATE POLICY "eleve_own_rows" ON public.ma_table
     FOR SELECT TO authenticated
     USING (user_id = (SELECT auth.uid()));
   ```
4. **Indexation des clés étrangères** :
   - Toute colonne référençant une clé étrangère (`REFERENCES ...`) doit posséder un index explicite `CREATE INDEX IF NOT EXISTS idx_... ON public.ma_table(col_fk);`.

### B. Fonctions RPC `SECURITY DEFINER`
Chaque fonction `SECURITY DEFINER` doit impérativement :
1. Fixer le `search_path` pour prévenir le détournement d'objets :
   ```sql
   SECURITY DEFINER
   SET search_path = public
   ```
2. Vérifier explicitement l'identité et le rôle de l'appelant (`(SELECT auth.uid()) IS NOT NULL`).
3. Révoquer les droits d'exécution implicites de `PUBLIC` et `anon` :
   ```sql
   REVOKE ALL ON FUNCTION public.ma_fonction(...) FROM PUBLIC, anon;
   GRANT EXECUTE ON FUNCTION public.ma_fonction(...) TO authenticated, service_role;
   ```

### C. Triggers d'Intégrité et Anti-Triche
- **T-06 (Horloge serveur)** : toute soumission ou modification d'épreuve est comparée à `echeance_serveur` via `now()` côté PostgreSQL, jamais à un horodatage fourni par le client.
- **T-07 (Machine à états)** : transitions d'état des sessions d'examen strictement unidirectionnelles.
- **T-08 (Snapshots scellés)** : interdiction de `UPDATE` ou `DELETE` sur un snapshot scellé.
- **T-09 (Immuabilité pédagogique)** : interdiction de modifier ou supprimer une `sujet_versions` où `publiee = true`.

---

## 3. Suite de Tests SQL PostgreSQL (`supabase/tests/`)

Toute nouvelle règle RLS, fonction RPC ou table doit être couverte par un test SQL positif et négatif (vérifiant le rejet effectif des accès non autorisés avec `BEGIN / SAVEPOINT / ROLLBACK TO SAVEPOINT`).

1. Fichiers de tests existants dans `supabase/tests/` :
   - `00_bootstrap_supabase_env.sql`
   - `01_rls_negative_tests.sql` (T-01 à T-18)
   - `02_deposer_contestation.sql`
   - `03_initialiser_projet.sql`
   - `04_tp_reservations.sql`
   - `05_chronometre_examen_serveur.sql`
   - `06_epreuve_ecrite_serveur.sql`
   - `07_sauvegarde_fichiers_lot.sql`
   - `08_notifications.sql`
   - `09_performance_et_droits.sql`
2. Si un nouveau fichier `supabase/tests/10_*.sql` est créé, l'ajouter dans `scripts/run-db-tests.sh`.
3. Exécuter la validation :
   ```powershell
   bun run test:db
   ```
   et vérifier également le harnais Vitest :
   ```powershell
   bun run test src/test/security-negative-harness.test.ts
   ```
