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
  v_prof uuid := '00000000-0000-0000-0000-0000000000f1';
  v_classe_id uuid;
  v_session_id uuid;
  v_passage_id uuid;
  v_version uuid := '11111111-0000-0000-0000-000000000001'; -- carte-profil v1 (publiée)
  v_res1 jsonb;
  v_res2 jsonb;
  v_res_relance jsonb;
  v_projet_id uuid;
  v_echeance1 timestamptz;
  v_echeance2 timestamptz;
  v_echeance_relance timestamptz;
  v_nb_sol int;
  v_caught boolean;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values
    (v_eleve, 'chrono-eleve@labosti.tn', '{"nom":"Chrono","prenom":"Eleve"}'::jsonb),
    (v_prof, 'chrono-prof@labosti.tn', '{"nom":"Chrono","prenom":"Prof"}'::jsonb);

  insert into public.user_roles (user_id, role)
  values (v_prof, 'enseignant')
  on conflict do nothing;

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

  -- 5. Mode entraînement (#188) : après expiration, accès au corrigé autorisé et relance du chrono permise
  select count(*) into v_nb_sol from public.debloquer_solution(v_version, 'apres_echeance_entrainement');
  perform test_helpers.assert_true(
    v_nb_sol >= 1,
    '#188 : après expiration du chrono en entraînement, debloquer_solution doit servir le corrigé'
  );

  v_res_relance := public.relancer_entrainement_examen('carte-profil', 90, true);
  v_echeance_relance := (v_res_relance ->> 'echeance_serveur')::timestamptz;
  perform test_helpers.assert_true(
    (v_res_relance ->> 'cadre') = 'entrainement'
    and (v_res_relance ->> 'relancable')::boolean = true
    and v_echeance_relance > clock_timestamp(),
    '#188 : relancer_entrainement_examen doit fournir une nouvelle echeance_serveur en mode entraînement'
  );

  -- Après relance, l'écriture dans projet_fichiers fonctionne à nouveau
  update public.projet_fichiers
  set contenu = '<h1>Nouvelle tentative entraînement</h1>'
  where projet_id = v_projet_id and chemin = 'index.html';

  -- Pendant la nouvelle tentative en cours, debloquer_solution est de nouveau bloqué (T-04)
  v_caught := false;
  begin
    perform * from public.debloquer_solution(v_version, 'pendant_relance');
  exception when others then
    v_caught := sqlerrm like '%T-04%';
  end;
  perform test_helpers.assert_true(
    v_caught,
    '#188 / T-04 : pendant une tentative d''entraînement en cours, debloquer_solution doit être bloqué'
  );

  -- 6. Mode examen officiel (#188) : scellé par sessions_examen / passages_examen, relance interdite
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'postgres', true);

  insert into public.classes (nom, annee_scolaire, enseignant_id, code_invitation)
  values ('4SI-Chrono', '2025-2026', v_prof, 'CHR188')
  returning id into v_classe_id;

  insert into public.classe_membres (classe_id, eleve_id)
  values (v_classe_id, v_eleve);

  insert into public.sessions_examen (
    classe_id, version_id, enseignant_id, titre, duree_min, statut, debut_serveur, echeance_serveur
  )
  values (
    v_classe_id,
    v_version,
    v_prof,
    'Examen Officiel Bac STI',
    90,
    'en_cours',
    clock_timestamp() - interval '100 minutes',
    clock_timestamp() - interval '10 minutes'
  )
  returning id into v_session_id;

  perform set_config('app.passage_rpc', 'on', true);
  insert into public.passages_examen (
    session_id, eleve_id, projet_id, statut, debut_reel, echeance_eleve
  )
  values (
    v_session_id,
    v_eleve,
    v_projet_id,
    'verrouille',
    clock_timestamp() - interval '100 minutes',
    clock_timestamp() - interval '10 minutes'
  )
  returning id into v_passage_id;
  perform set_config('app.passage_rpc', '', true);

  perform set_config('request.jwt.claim.sub', v_eleve::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- 6a. demarrer_examen_pratique signale cadre = 'officiel' et relancable = false
  v_res2 := public.demarrer_examen_pratique('carte-profil', 90);
  perform test_helpers.assert_true(
    (v_res2 ->> 'cadre') = 'officiel'
    and (v_res2 ->> 'relancable')::boolean = false
    and (v_res2 ->> 'est_expire')::boolean = true,
    '#188 : en session officielle échue, demarrer_examen_pratique doit renvoyer cadre=officiel et relancable=false'
  );

  -- 6b. relancer_entrainement_examen est strictement refusé en examen officiel
  v_caught := false;
  begin
    perform public.relancer_entrainement_examen('carte-profil', 90, false);
  exception when others then
    v_caught := sqlerrm like '%Relance interdite%';
  end;
  perform test_helpers.assert_true(
    v_caught,
    '#188 / T-06 : relancer_entrainement_examen doit être refusé lorsqu''une session officielle existe'
  );

  -- 6c. Après clôture de l'examen officiel (échéance serveur échue), l'élève a accès au corrigé de référence
  select count(*) into v_nb_sol from public.debloquer_solution(v_version, 'apres_cloture_officielle');
  perform test_helpers.assert_true(
    v_nb_sol >= 1,
    '#188 : après clôture d''un examen officiel (échéance échue), debloquer_solution doit autoriser l''accès au corrigé'
  );

  reset role;
  raise notice 'SUCCÈS : Tests SQL du chronomètre d''examen serveur et de la reprise (#198 / #188 / T-06) validés !';
end;
$$;

rollback;
