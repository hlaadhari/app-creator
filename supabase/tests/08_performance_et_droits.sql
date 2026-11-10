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
  v_nb int;
begin
  -- 1. Les 22 clés étrangères de l'audit ont un index dont les premières colonnes sont celles de la clé
  select count(*) into v_nb
  from pg_constraint
  where contype = 'f' and connamespace = 'public'::regnamespace
    and conname in (
      'class_invitations_class_id_fkey', 'class_members_eleve_id_fkey', 'class_sujets_version_id_fkey',
      'classes_enseignant_id_fkey', 'contestations_projet_id_fkey', 'contestations_sujet_version_id_fkey',
      'contestations_traitee_par_fkey', 'copies_examen_ecrit_corrige_par_fkey',
      'demandes_enseignant_traitee_par_fkey', 'indices_debloques_indice_id_fkey',
      'journal_acces_solutions_user_id_fkey', 'journal_acces_solutions_version_id_fkey',
      'journal_securite_acteur_id_fkey', 'fk_passages_examen_snapshot_final', 'profiles_valide_par_fkey',
      'projets_version_id_fkey', 'sessions_examen_created_by_fkey', 'sessions_examen_version_id_fkey',
      'sujet_versions_auteur_id_fkey', 'sujets_auteur_id_fkey', 'tentatives_projet_id_fkey',
      'tp_sessions_created_by_fkey'
    );
  perform test_helpers.assert_true(v_nb = 22, '#259 : les 22 clés étrangères de l audit doivent exister (trouvées : ' || v_nb || ')');

  select string_agg(c.conrelid::regclass::text || '.' || c.conname, ', ') into v_manquants
  from pg_constraint c
  where c.contype = 'f' and c.connamespace = 'public'::regnamespace
    and c.conname in (
      'class_invitations_class_id_fkey', 'class_members_eleve_id_fkey', 'class_sujets_version_id_fkey',
      'classes_enseignant_id_fkey', 'contestations_projet_id_fkey', 'contestations_sujet_version_id_fkey',
      'contestations_traitee_par_fkey', 'copies_examen_ecrit_corrige_par_fkey',
      'demandes_enseignant_traitee_par_fkey', 'indices_debloques_indice_id_fkey',
      'journal_acces_solutions_user_id_fkey', 'journal_acces_solutions_version_id_fkey',
      'journal_securite_acteur_id_fkey', 'fk_passages_examen_snapshot_final', 'profiles_valide_par_fkey',
      'projets_version_id_fkey', 'sessions_examen_created_by_fkey', 'sessions_examen_version_id_fkey',
      'sujet_versions_auteur_id_fkey', 'sujets_auteur_id_fkey', 'tentatives_projet_id_fkey',
      'tp_sessions_created_by_fkey'
    )
    and not exists (
      select 1 from pg_index i
      where i.indrelid = c.conrelid
        and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey
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
