-- =============================================================================
-- Tests SQL : parametres_application + admin_definir_parametre (Issue #294)
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
  v_admin_id uuid := '11111111-1111-1111-1111-111111111194';
  v_prof_id  uuid := '22222222-2222-2222-2222-222222222294';
  v_eleve_id uuid := '33333333-3333-3333-3333-333333333394';
  v_row public.parametres_application;
  v_count int;
  v_err boolean;
begin
  insert into auth.users (id, email) values
    (v_admin_id, 'admin294@test.local'),
    (v_prof_id,  'prof294@test.local'),
    (v_eleve_id, 'eleve294@test.local')
  on conflict (id) do nothing;

  insert into public.profiles (id, nom, prenom) values
    (v_admin_id, 'Admin', 'Test'),
    (v_prof_id,  'Prof', 'Test'),
    (v_eleve_id, 'Eleve', 'Test')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values
    (v_admin_id, 'admin'),
    (v_prof_id,  'enseignant'),
    (v_eleve_id, 'eleve')
  on conflict do nothing;

  -- 1. Valeur initiale présente et désactivée
  select * into v_row from public.parametres_application where cle = 'tuteur_gemini_notebook';
  perform test_helpers.assert_true(v_row.cle = 'tuteur_gemini_notebook', '#294 : clé initiale absente');
  perform test_helpers.assert_true((v_row.valeur ->> 'actif')::boolean = false, '#294 : doit être désactivé par défaut');

  -- 2. Un élève ne peut ni écrire directement ni appeler admin_definir_parametre
  perform set_config('request.jwt.claim.sub', v_eleve_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  v_err := false;
  begin
    update public.parametres_application set valeur = '{"actif": true}'::jsonb where cle = 'tuteur_gemini_notebook';
  exception when others then
    v_err := true;
  end;
  perform test_helpers.assert_true(v_err, '#294 : un élève ne doit pas pouvoir UPDATE parametres_application');

  v_err := false;
  begin
    perform public.admin_definir_parametre(
      'tuteur_gemini_notebook',
      '{"actif": true, "url": "https://notebook.google.com/notebook/abc"}'::jsonb
    );
  exception when others then
    v_err := true;
  end;
  perform test_helpers.assert_true(v_err, '#294 : un élève ne doit pas pouvoir appeler admin_definir_parametre');

  -- 3. Un enseignant ne peut pas non plus modifier parametres_application
  reset role;
  perform set_config('request.jwt.claim.sub', v_prof_id::text, true);
  set local role authenticated;

  v_err := false;
  begin
    perform public.admin_definir_parametre(
      'tuteur_gemini_notebook',
      '{"actif": true, "url": "https://notebook.google.com/notebook/abc"}'::jsonb
    );
  exception when others then
    v_err := true;
  end;
  perform test_helpers.assert_true(v_err, '#294 : un enseignant ne doit pas pouvoir appeler admin_definir_parametre');

  -- 4. Un admin peut modifier avec une URL valide
  reset role;
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  set local role authenticated;

  v_row := public.admin_definir_parametre(
    'tuteur_gemini_notebook',
    '{"actif": true, "url": "https://notebooklm.google.com/notebook/test-294"}'::jsonb
  );
  perform test_helpers.assert_true((v_row.valeur ->> 'actif')::boolean = true, '#294 : admin doit pouvoir activer');
  perform test_helpers.assert_true(v_row.modifie_par = v_admin_id, '#294 : modifie_par doit être tracé');

  -- 5. Une URL hors domaine autorisé est refusée
  v_err := false;
  begin
    perform public.admin_definir_parametre(
      'tuteur_gemini_notebook',
      '{"actif": true, "url": "https://evil.example.com/notebook/123"}'::jsonb
    );
  exception when others then
    v_err := true;
  end;
  perform test_helpers.assert_true(v_err, '#294 : URL hors domaine autorisé doit être refusée');

  -- 6. Une clé hors liste blanche est refusée
  v_err := false;
  begin
    perform public.admin_definir_parametre('cle_inconnue', '{"actif": true}'::jsonb);
  exception when others then
    v_err := true;
  end;
  perform test_helpers.assert_true(v_err, '#294 : clé hors liste blanche doit être refusée');

  -- 7. Trace dans journal_securite
  reset role;
  select count(*) into v_count
  from public.journal_securite
  where type = 'admin_parametre_modifie' and acteur_id = v_admin_id;
  perform test_helpers.assert_true(v_count >= 1, '#294 : la modification doit être journalisée dans journal_securite');
end $$;

rollback;
