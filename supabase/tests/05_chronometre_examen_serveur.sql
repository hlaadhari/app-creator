-- =============================================================================
-- Tests SQL & RLS : Chronomètre d'examen pratique piloté par le serveur (Issue #198 / T-06)
-- =============================================================================
begin;

create schema if not exists test_helpers;
grant usage on schema test_helpers to public, anon, authenticated, service_role;
create or replace function test_helpers.assert_true(p_cond boolean, p_msg text)
returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then
    raise exception 'ÉCHEC ASSERTION SQL : %', p_msg;
  end if;
end;
$$;
grant execute on function test_helpers.assert_true(boolean, text) to public, anon, authenticated, service_role;

do $$
declare
  v_eleve uuid := '00000000-0000-0000-0000-0000000000e1';
  v_version uuid := '11111111-0000-0000-0000-000000000001'; -- carte-profil v1 (publiée)
  v_res1 jsonb;
  v_res2 jsonb;
  v_projet_id uuid;
  v_echeance1 timestamptz;
  v_echeance2 timestamptz;
  v_caught boolean;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_eleve, 'chrono-eleve@labosti.tn', '{"nom":"Chrono","prenom":"Eleve"}'::jsonb);

  perform set_config('request.jwt.claim.sub', v_eleve::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- 1. Premier démarrage : echeance_serveur est initialisée en base par le serveur
  v_res1 := public.demarrer_examen_pratique('carte-profil', 90);
  v_projet_id := (v_res1 ->> 'projet_id')::uuid;
  v_echeance1 := (v_res1 ->> 'echeance_serveur')::timestamptz;

  perform test_helpers.assert_true(
    v_projet_id is not null and v_echeance1 is not null and v_echeance1 > clock_timestamp(),
    '#198 : demarrer_examen_pratique doit initialiser echeance_serveur dans le futur'
  );

  -- 2. Effacement du localStorage simulé par un second appel : même échéance restituée
  v_res2 := public.demarrer_examen_pratique('carte-profil', 600);
  v_echeance2 := (v_res2 ->> 'echeance_serveur')::timestamptz;

  perform test_helpers.assert_true(
    v_echeance2 = v_echeance1,
    '#198 : un élève qui efface son stockage et rappelle demarrer_examen_pratique retrouve exactement la même échéance'
  );

  -- 3. Attaque directe : l'élève tente de repousser echeance_serveur sur public.projets
  v_caught := false;
  begin
    update public.projets
    set echeance_serveur = clock_timestamp() + interval '5 hours'
    where id = v_projet_id;
  exception when others then
    v_caught := sqlerrm like '%interdite%';
  end;
  perform test_helpers.assert_true(
    v_caught,
    '#198 / T-06 : un élève ne peut pas modifier directement projets.echeance_serveur'
  );

  -- 4. Expiration de l'échéance côté serveur : écritures dans projet_fichiers et tentatives refusées
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'postgres', true);
  update public.projets
  set
    debut_examen_serveur = clock_timestamp() - interval '95 minutes',
    echeance_serveur = clock_timestamp() - interval '5 minutes'
  where id = v_projet_id;

  perform set_config('request.jwt.claim.sub', v_eleve::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- 4a. Écriture directe sur projet_fichiers refusée
  v_caught := false;
  begin
    update public.projet_fichiers
    set contenu = '<h1>Hors délai</h1>'
    where projet_id = v_projet_id;
  exception when others then
    v_caught := sqlerrm like '%T-06%';
  end;
  perform test_helpers.assert_true(
    v_caught,
    '#198 / T-06 : toute écriture directe sur projet_fichiers après echeance_serveur doit être refusée'
  );

  -- 4b. Écriture via RPC sauvegarder_fichier refusée après échéance
  v_caught := false;
  begin
    perform public.sauvegarder_fichier(v_projet_id, 'index.html', '<h1>Hors délai RPC</h1>', 1);
  exception when others then
    v_caught := sqlerrm like '%T-06%';
  end;
  perform test_helpers.assert_true(
    v_caught,
    '#198 / T-06 : sauvegarder_fichier après echeance_serveur doit être refusé'
  );

  -- 4c. Insertion de tentative avec projet_id refusée après échéance
  v_caught := false;
  begin
    insert into public.tentatives (projet_id, eleve_id, sujet_version_id, score, max, note20, detail, source)
    values (v_projet_id, v_eleve, v_version, 18, 20, 18.0, '{}'::jsonb, 'client');
  exception when others then
    v_caught := sqlerrm like '%T-06%';
  end;
  perform test_helpers.assert_true(
    v_caught,
    '#198 / T-06 : insertion dans tentatives avec projet_id après echeance_serveur doit être refusée'
  );

  -- 4d. Insertion de tentative sans projet_id (via sujet_version_id seul) également refusée après échéance
  v_caught := false;
  begin
    insert into public.tentatives (projet_id, eleve_id, sujet_version_id, score, max, note20, detail, source)
    values (null, v_eleve, v_version, 18, 20, 18.0, '{}'::jsonb, 'client');
  exception when others then
    v_caught := sqlerrm like '%T-06%';
  end;
  perform test_helpers.assert_true(
    v_caught,
    '#198 / T-06 : insertion dans tentatives sans projet_id (par sujet_version_id) après echeance_serveur doit être refusée'
  );

  reset role;
  raise notice 'SUCCÈS : Tests SQL du chronomètre d''examen serveur (#198 / T-06) validés !';
end;
$$;

rollback;
