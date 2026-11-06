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
  v_version uuid := '11111111-0000-0000-0000-000000000001'; -- carte-profil v1 (seed, publiée)
  v_pid uuid;
  v_pid2 uuid;
  v_attendus int;
  v_caught boolean;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_eleve, 'projet-eleve@labosti.tn', '{"nom":"Eleve","prenom":"P"}'::jsonb);

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

  -- Version inconnue ou non publiée
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
  raise notice 'SUCCÈS : initialiser_projet (#186)';
end;
$$;

rollback;
