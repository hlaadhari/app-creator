-- État réel du système pour le panneau d'administration (issue #54).
-- Remplace les chiffres écrits en dur de /admin (« 26 tables isolées », « 0 fuite client »…)
-- par des mesures faites dans la base au moment de l'affichage. Lecture seule, réservée aux admins.

create or replace function public.admin_etat_systeme()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _tables_sans_rls jsonb;
  _anon_ecriture jsonb;
  _triggers_attendus text[] := array[
    'criteres_immutables', 'fichiers_immutables', 'indices_immutables',
    'solutions_immutables', 'sujet_versions_immutables', 'trg_interdire_mutation_snapshot',
    'trg_verifier_echeance_projet_fichiers', 'trg_verifier_transition_passage_examen'
  ];
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(c.relname order by c.relname), '[]'::jsonb)
    into _tables_sans_rls
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity;

  select coalesce(jsonb_agg(c.relname order by c.relname), '[]'::jsonb)
    into _anon_ecriture
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    and (has_table_privilege('anon', c.oid, 'INSERT')
      or has_table_privilege('anon', c.oid, 'UPDATE')
      or has_table_privilege('anon', c.oid, 'DELETE')
      or has_table_privilege('anon', c.oid, 'TRUNCATE'));

  return jsonb_build_object(
    'horloge_serveur', clock_timestamp(),
    'tables', (select count(*) from pg_class c
               where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'),
    'tables_sans_rls', _tables_sans_rls,
    'politiques', (select count(*) from pg_policies where schemaname = 'public'),
    -- Aucune lecture directe de la correction (solutions) ni des sondes (criteres) pour les clients.
    'droits_clients_corriges', (
      select count(*)
      from (values ('anon'), ('authenticated')) r(role),
           (values ('solutions'), ('criteres')) t(tbl),
           (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv)
      where has_table_privilege(r.role, 'public.' || t.tbl, p.priv)
    ),
    'tables_anon_ecriture', _anon_ecriture,
    -- Les rôles ne peuvent être modifiés que par les fonctions réservées aux admins.
    'ecriture_directe_user_roles', (
      has_table_privilege('authenticated', 'public.user_roles', 'INSERT')
      or has_table_privilege('authenticated', 'public.user_roles', 'UPDATE')
      or has_table_privilege('authenticated', 'public.user_roles', 'DELETE')
    ),
    'triggers_immuabilite_attendus', cardinality(_triggers_attendus),
    'triggers_immuabilite_presents', (
      select count(*) from pg_trigger
      where not tgisinternal and tgname = any(_triggers_attendus)
    )
  );
end;
$$;

revoke all on function public.admin_etat_systeme() from public, anon;
grant execute on function public.admin_etat_systeme() to authenticated;
