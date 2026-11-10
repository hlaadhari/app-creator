-- =============================================================================
-- Tests SQL : index de clés étrangères, RLS sans réévaluation par ligne, droits anon (Issue #259)
-- =============================================================================
begin;

create schema if not exists test_helpers;
create or replace function test_helpers.assert_true(p_cond boolean, p_msg text)
returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then
    raise exception 'ÉCHEC ASSERTION SQL : %', p_msg;
  end if;
end;
$$;

do $$
declare
  v_manquants text;
  v_non_enveloppees text;
  v_exposees text;
begin
  -- 1. Les 22 colonnes de clé étrangère de l'audit ont un index dont la première colonne est la leur
  select string_agg(x.tbl || '.' || x.col, ', ') into v_manquants
  from (values
    ('class_invitations', 'class_id'), ('class_members', 'eleve_id'), ('class_sujets', 'version_id'),
    ('classes', 'enseignant_id'), ('contestations', 'projet_id'), ('contestations', 'sujet_version_id'),
    ('contestations', 'traitee_par'), ('copies_examen_ecrit', 'corrige_par'),
    ('demandes_enseignant', 'traitee_par'), ('indices_debloques', 'indice_id'),
    ('journal_acces_solutions', 'user_id'), ('journal_acces_solutions', 'version_id'),
    ('journal_securite', 'acteur_id'), ('passages_examen', 'snapshot_final_id'),
    ('profiles', 'valide_par'), ('projets', 'version_id'), ('sessions_examen', 'created_by'),
    ('sessions_examen', 'version_id'), ('sujet_versions', 'auteur_id'), ('sujets', 'auteur_id'),
    ('tentatives', 'projet_id'), ('tp_sessions', 'created_by')
  ) as x(tbl, col)
  where not exists (
    select 1
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = (i.indkey::int2[])[0]
    where i.indrelid = format('public.%I', x.tbl)::regclass and a.attname = x.col
  );
  perform test_helpers.assert_true(v_manquants is null, '#259 : clés étrangères sans index couvrant : ' || coalesce(v_manquants, ''));

  -- 2. Aucune politique RLS du schéma public n'appelle auth.uid() / auth.role() / auth.jwt() sans select
  select string_agg(tablename || '.' || policyname, ', ') into v_non_enveloppees
  from pg_policies
  where schemaname = 'public'
    and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ '(?<!SELECT )auth\.(uid|role|jwt)\(\)';
  perform test_helpers.assert_true(
    v_non_enveloppees is null,
    '#259 : politiques RLS avec auth.xxx() non enveloppé : ' || coalesce(v_non_enveloppees, '')
  );

  -- 3. Aucune fonction SECURITY DEFINER du schéma public n'est exécutable sans connexion,
  --    hormis les deux fonctions volontairement publiques
  select string_agg(p.oid::regprocedure::text, ', ') into v_exposees
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.prosecdef
    and has_function_privilege('anon', p.oid, 'execute')
    and p.proname not in ('sujet_publie_pour_eleve', 'nb_indices');
  perform test_helpers.assert_true(
    v_exposees is null,
    '#259 : fonctions SECURITY DEFINER exécutables par anon : ' || coalesce(v_exposees, '')
  );

  perform test_helpers.assert_true(
    has_function_privilege('anon', 'public.sujet_publie_pour_eleve(text)', 'execute'),
    '#259 : sujet_publie_pour_eleve doit rester publique (page /sujet/$id sans connexion)'
  );
  perform test_helpers.assert_true(
    has_function_privilege('anon', 'public.nb_indices(uuid)', 'execute'),
    '#259 : nb_indices doit rester publique'
  );

  -- 4. Les fonctions d'aide RLS et d'API présentes restent exécutables par les utilisateurs connectés
  select string_agg(p.oid::regprocedure::text, ', ') into v_exposees
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('debloquer_indice', 'debloquer_solution', 'est_eleve_de_enseignant',
                      'est_enseignant_classe', 'est_enseignant_session', 'est_membre_classe',
                      'lancer_coup_denvoi_examen', 'rejoindre_classe')
    and not has_function_privilege('authenticated', p.oid, 'execute');
  perform test_helpers.assert_true(
    v_exposees is null,
    '#259 : fonctions d API ou d aide RLS devenues inaccessibles à authenticated : ' || coalesce(v_exposees, '')
  );

  -- 5. Les fonctions de déclencheur ne sont plus appelables via l'API
  select string_agg(p.oid::regprocedure::text, ', ') into v_exposees
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('attribuer_badges_apres_note_officielle', 'handle_new_user',
                      'recalculer_maitrise_apres_tentative', 'verifier_capacite_tp_reservation')
    and has_function_privilege('authenticated', p.oid, 'execute');
  perform test_helpers.assert_true(
    v_exposees is null,
    '#259 : fonctions de déclencheur exécutables par authenticated : ' || coalesce(v_exposees, '')
  );
end;
$$;

do $$
declare
  v_manquants text;
  v_non_enveloppees text;
  v_exposees text;
  v_nb int;
begin
  -- 1. Les 22 colonnes de clé étrangère de l'audit ont un index dont la première colonne est la leur
  select string_agg(x.tbl || '.' || x.col, ', ') into v_manquants
  from (values
    ('class_invitations', 'class_id'), ('class_members', 'eleve_id'), ('class_sujets', 'version_id'),
    ('classes', 'enseignant_id'), ('contestations', 'projet_id'), ('contestations', 'sujet_version_id'),
    ('contestations', 'traitee_par'), ('copies_examen_ecrit', 'corrige_par'),
    ('demandes_enseignant', 'traitee_par'), ('indices_debloques', 'indice_id'),
    ('journal_acces_solutions', 'user_id'), ('journal_acces_solutions', 'version_id'),
    ('journal_securite', 'acteur_id'), ('passages_examen', 'snapshot_final_id'),
    ('profiles', 'valide_par'), ('projets', 'version_id'), ('sessions_examen', 'created_by'),
    ('sessions_examen', 'version_id'), ('sujet_versions', 'auteur_id'), ('sujets', 'auteur_id'),
    ('tentatives', 'projet_id'), ('tp_sessions', 'created_by')
  ) as x(tbl, col)
  where not exists (
    select 1
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = (i.indkey::int2[])[0]
    where i.indrelid = format('public.%I', x.tbl)::regclass and a.attname = x.col
  );
  perform test_helpers.assert_true(v_manquants is null, '#259 : clés étrangères sans index couvrant : ' || coalesce(v_manquants, ''));

  -- 2. Aucune politique RLS du schéma public n'appelle auth.uid() / auth.role() / auth.jwt() sans select
  select string_agg(tablename || '.' || policyname, ', ') into v_non_enveloppees
  from pg_policies
  where schemaname = 'public'
    and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ '(?<!SELECT )auth\.(uid|role|jwt)\(\)';
  perform test_helpers.assert_true(
    v_non_enveloppees is null,
    '#259 : politiques RLS avec auth.xxx() non enveloppé : ' || coalesce(v_non_enveloppees, '')
  );

  -- 3. Aucune fonction SECURITY DEFINER du schéma public n'est exécutable sans connexion,
  --    hormis les deux fonctions volontairement publiques
  select string_agg(p.oid::regprocedure::text, ', ') into v_exposees
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.prosecdef
    and has_function_privilege('anon', p.oid, 'execute')
    and p.proname not in ('sujet_publie_pour_eleve', 'nb_indices');
  perform test_helpers.assert_true(
    v_exposees is null,
    '#259 : fonctions SECURITY DEFINER exécutables par anon : ' || coalesce(v_exposees, '')
  );

  perform test_helpers.assert_true(
    has_function_privilege('anon', 'public.sujet_publie_pour_eleve(text)', 'execute'),
    '#259 : sujet_publie_pour_eleve doit rester publique (page /sujet/$id sans connexion)'
  );
  perform test_helpers.assert_true(
    has_function_privilege('anon', 'public.nb_indices(uuid)', 'execute'),
    '#259 : nb_indices doit rester publique'
  );

  -- 4. Les fonctions d'aide RLS et d'API restent exécutables par les utilisateurs connectés
  perform test_helpers.assert_true(
    has_function_privilege('authenticated', 'public.est_membre_classe(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.est_enseignant_classe(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.est_enseignant_session(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.est_eleve_de_enseignant(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.rejoindre_classe(text)', 'execute')
    and has_function_privilege('authenticated', 'public.lancer_coup_denvoi_examen(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.debloquer_indice(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.debloquer_solution(uuid, text)', 'execute'),
    '#259 : les fonctions d API et d aide RLS doivent rester exécutables par authenticated'
  );

  -- 5. Les fonctions de déclencheur ne sont plus appelables via l'API
  perform test_helpers.assert_true(
    not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute')
    and not has_function_privilege('authenticated', 'public.recalculer_maitrise_apres_tentative()', 'execute')
    and not has_function_privilege('authenticated', 'public.attribuer_badges_apres_note_officielle()', 'execute')
    and not has_function_privilege('authenticated', 'public.verifier_capacite_tp_reservation()', 'execute'),
    '#259 : les fonctions de déclencheur ne doivent plus être exécutables par authenticated'
  );
end;
$$;

rollback;
