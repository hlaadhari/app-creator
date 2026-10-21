-- Journal de sécurité : écriture contrôlée (issue #73).
-- Jusqu'ici n'importe quel utilisateur connecté pouvait insérer des lignes (politique « check true »),
-- avec l'acteur de son choix. Les incidents signalés par le navigateur passent désormais par
-- journaliser_incident(), qui impose l'acteur, n'accepte que les types connus et limite le volume.

create or replace function public.journaliser_incident(_type text, _meta jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'non_connecte' using errcode = '42501';
  end if;

  -- Types d'incidents que le navigateur est autorisé à signaler.
  if _type is null or _type not in ('TENTATIVE_ACCES_CORRIGE_EN_EXAMEN') then
    raise exception 'type_incident_inconnu' using errcode = 'P0001';
  end if;

  if _meta is null or jsonb_typeof(_meta) <> 'object' then
    raise exception 'meta_invalide' using errcode = 'P0001';
  end if;

  if octet_length(_meta::text) > 2000 then
    raise exception 'meta_trop_volumineuse' using errcode = 'P0001';
  end if;

  -- Limite de volume par utilisateur contre la saturation du journal.
  if (select count(*) from public.journal_securite
      where acteur_id = auth.uid() and date > now() - interval '1 minute') >= 30 then
    raise exception 'trop_de_signalements' using errcode = 'P0001';
  end if;

  -- L'acteur est toujours l'utilisateur connecté ; la date est celle du serveur.
  insert into public.journal_securite (type, acteur_id, meta)
  values (_type, auth.uid(), _meta || jsonb_build_object('source', 'client'));
end;
$$;

revoke all on function public.journaliser_incident(text, jsonb) from public, anon;
grant execute on function public.journaliser_incident(text, jsonb) to authenticated;

-- Plus aucune écriture directe sur le journal depuis le navigateur.
drop policy if exists "Authentifie insere journal securite" on public.journal_securite;
revoke insert on public.journal_securite from authenticated;

-- L'état du système signale aussi une écriture directe possible sur le journal.
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
    -- Le journal de sécurité ne doit être alimenté que par des fonctions contrôlées.
    'ecriture_directe_journal', (
      has_table_privilege('anon', 'public.journal_securite', 'INSERT')
      or has_table_privilege('authenticated', 'public.journal_securite', 'INSERT')
      or has_table_privilege('authenticated', 'public.journal_securite', 'UPDATE')
      or has_table_privilege('authenticated', 'public.journal_securite', 'DELETE')
    ),
    'triggers_immuabilite_attendus', cardinality(_triggers_attendus),
    'triggers_immuabilite_presents', (
      select count(*) from pg_trigger
      where not tgisinternal and tgname = any(_triggers_attendus)
    )
  );
end;
$$;
