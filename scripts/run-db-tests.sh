#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/labo_sti_test}"

echo "==> [1/3] Bootstrap de l'environnement Supabase (rôles anon/authenticated/service_role & schéma auth)..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/00_bootstrap_supabase_env.sql

echo "==> [2/3] Application séquentielle des migrations SQL (supabase/migrations/*.sql)..."
for migration in $(ls supabase/migrations/*.sql | sort); do
  echo "    -> $migration"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$migration"
done

echo "==> [3/3] Exécution de la suite de tests négatifs SQL & RLS (T-01 à T-18)..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/01_rls_negative_tests.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/02_deposer_contestation.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/03_initialiser_projet.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/04_tp_reservations.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/05_chronometre_examen_serveur.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/06_epreuve_ecrite_serveur.sql

echo "==> Tous les tests SQL PostgreSQL se sont terminés avec succès."
