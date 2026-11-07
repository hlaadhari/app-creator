-- Issue #186 : initialiser_projet crée le projet et copie les fichiers de départ.
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
  v_eleve uuid := '00000000-0000-0000-0000-0000000000b1';
  v_eleve_vide uuid := '00000000-0000-0000-0000-0000000000b2';
  v_eleve_travail uuid := '00000000-0000-0000-0000-0000000000b3';
  v_version uuid := '11111111-0000-0000-0000-000000000001'; -- carte-profil v1 (seed, publiée)
  v_pid uuid;
  v_pid2 uuid;
  v_pid_vide uuid;
  v_pid_travail uuid;
  v_attendus int;
  v_nb_repares int;
  v_caught boolean;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values
    (v_eleve, 'projet-eleve@labosti.tn', '{"nom":"Eleve","prenom":"P"}'::jsonb),
    (v_eleve_vide, 'projet-vide@labosti.tn', '{"nom":"Vide","prenom":"E"}'::jsonb),
    (v_eleve_travail, 'projet-travail@labosti.tn', '{"nom":"Travail","prenom":"E"}'::jsonb);

  select count(*) into v_attendus from public.sujet_version_fichiers where version_id = v_version;
  perform test_helpers.assert_true(v_attendus > 0, '#186 : le seed doit fournir des fichiers de départ');

  perform set_config('request.jwt.claim.sub', v_eleve::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  v_pid := public.initialiser_projet(v_version);
  perform test_helpers.assert_true(v_pid is not null, '#186 : initialiser_projet doit renvoyer un identifiant');
  perform test_helpers.assert_true(
    (select count(*) from public.projet_fichiers where projet_id = v_pid) = v_attendus,
    '#186 : tous les fichiers de départ doivent être copiés dans le projet'
  );

  -- Idempotence : un second appel ne duplique ni le projet ni les fichiers
  v_pid2 := public.initialiser_projet(v_version);
  perform test_helpers.assert_true(v_pid2 = v_pid, '#186 : un second appel doit renvoyer le même projet');
  perform test_helpers.assert_true(
    (select count(*) from public.projet_fichiers where projet_id = v_pid) = v_attendus,
    '#186 : un second appel ne doit pas dupliquer les fichiers'
  );

  -- Issue #212 : un projet créé vide par l'ancien repli est réparé sans écraser un projet contenant un fichier
  reset role;
  insert into public.projets (eleve_id, version_id, statut)
  values (v_eleve_vide, v_version, 'en_cours')
  returning id into v_pid_vide;

  insert into public.projets (eleve_id, version_id, statut)
  values (v_eleve_travail, v_version, 'en_cours')
  returning id into v_pid_travail;

  insert into public.projet_fichiers (projet_id, chemin, contenu, rev)
  values (v_pid_travail, 'index.html', '<h1>travail eleve conserve</h1>', 3);

  -- Un utilisateur authentifié ne peut pas appeler reparer_projets_vides directement
  perform set_config('request.jwt.claim.sub', v_eleve::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  v_caught := false;
  begin
    perform public.reparer_projets_vides();
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#212 : authenticated ne doit pas pouvoir exécuter reparer_projets_vides');

  -- Réparation globale côté serveur : seul le projet vide est peuplé
  reset role;
  v_nb_repares := public.reparer_projets_vides();
  perform test_helpers.assert_true(v_nb_repares = 1, '#212 : exactement un projet vide doit être réparé');
  perform test_helpers.assert_true(
    (select count(*) from public.projet_fichiers where projet_id = v_pid_vide) = v_attendus,
    '#212 : le projet vide doit recevoir tous les fichiers de départ'
  );
  perform test_helpers.assert_true(
    (select count(*) from public.projet_fichiers where projet_id = v_pid_travail) = 1
    and (select contenu from public.projet_fichiers where projet_id = v_pid_travail and chemin = 'index.html') = '<h1>travail eleve conserve</h1>',
    '#212 : un projet qui possède au moins un fichier ne doit jamais être touché'
  );

  -- Version inconnue ou non publiée
  perform set_config('request.jwt.claim.sub', v_eleve::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  v_caught := false;
  begin
    perform public.initialiser_projet('99999999-9999-4999-8999-999999999999');
  exception when others then
    v_caught := sqlerrm = 'Sujet non disponible';
  end;
  perform test_helpers.assert_true(v_caught, '#186 : une version inconnue doit lever « Sujet non disponible »');

  -- Anonyme : exécution interdite
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  set local role anon;
  v_caught := false;
  begin
    perform public.initialiser_projet(v_version);
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#186 : anon ne doit pas pouvoir exécuter initialiser_projet');

  reset role;
  raise notice 'SUCCÈS : initialiser_projet & reparer_projets_vides (#186, #212)';
end;
$$;

rollback;
