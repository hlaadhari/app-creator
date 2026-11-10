-- Issue #255 : sauvegarder_fichiers (lot atomique) et limites de taille serveur.
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
  v_a uuid := '00000000-0000-0000-0000-0000000000c1';
  v_b uuid := '00000000-0000-0000-0000-0000000000c2';
  v_version uuid := '11111111-0000-0000-0000-000000000001'; -- carte-profil v1 (seed, publiée)
  v_pid uuid;
  v_res jsonb;
  v_rev_index int;
  v_caught boolean;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values
    (v_a, 'lot-a@labosti.tn', '{"nom":"A","prenom":"L"}'::jsonb),
    (v_b, 'lot-b@labosti.tn', '{"nom":"B","prenom":"L"}'::jsonb);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  v_pid := public.initialiser_projet(v_version);
  select rev into v_rev_index from public.projet_fichiers where projet_id = v_pid and chemin = 'index.html';
  perform test_helpers.assert_true(v_rev_index is not null, '#255 : index.html doit exister après initialiser_projet');

  -- 1. Un lot valide met à jour plusieurs fichiers en un appel (index.html existant + nouveau fichier)
  v_res := public.sauvegarder_fichiers(
    v_pid,
    jsonb_build_array(
      jsonb_build_object('chemin', 'index.html', 'contenu', '<h1>lot</h1>', 'expected_rev', v_rev_index),
      jsonb_build_object('chemin', 'nouveau.css', 'contenu', 'body{}', 'expected_rev', 0)
    )
  );
  perform test_helpers.assert_true((v_res ->> 'ok')::boolean, '#255 : le lot valide doit réussir');
  perform test_helpers.assert_true((v_res -> 'revs' ->> 'index.html')::int = v_rev_index + 1, '#255 : rev de index.html incrémentée');
  perform test_helpers.assert_true((v_res -> 'revs' ->> 'nouveau.css')::int = 1, '#255 : nouveau fichier créé en rev 1');

  -- 2. Conflit : rien n'est écrit (atomicité), le fichier en conflit est renvoyé avec son contenu serveur
  v_res := public.sauvegarder_fichiers(
    v_pid,
    jsonb_build_array(
      jsonb_build_object('chemin', 'nouveau.css', 'contenu', 'body{color:red}', 'expected_rev', 1),
      jsonb_build_object('chemin', 'index.html', 'contenu', '<h1>périmé</h1>', 'expected_rev', v_rev_index)
    )
  );
  perform test_helpers.assert_true(not (v_res ->> 'ok')::boolean, '#255 : un lot en conflit doit être refusé');
  perform test_helpers.assert_true(v_res -> 'conflit' ->> 'chemin' = 'index.html', '#255 : le fichier en conflit doit être identifié');
  perform test_helpers.assert_true(v_res -> 'conflit' ->> 'contenu' = '<h1>lot</h1>', '#255 : le contenu serveur doit être renvoyé');
  perform test_helpers.assert_true(
    (select contenu from public.projet_fichiers where projet_id = v_pid and chemin = 'nouveau.css') = 'body{}',
    '#255 : en cas de conflit, aucun fichier du lot ne doit être écrit'
  );

  -- 3. Limite de taille par fichier
  v_caught := false;
  begin
    perform public.sauvegarder_fichiers(
      v_pid,
      jsonb_build_array(jsonb_build_object('chemin', 'gros.txt', 'contenu', repeat('x', 262145), 'expected_rev', 0))
    );
  exception when others then
    v_caught := sqlerrm like '%FICHIER_TROP_VOLUMINEUX%';
  end;
  perform test_helpers.assert_true(v_caught, '#255 : un fichier de plus de 256 Ko doit être refusé');

  -- La RPC unitaire applique la même limite
  v_caught := false;
  begin
    perform public.sauvegarder_fichier(v_pid, 'gros2.txt', repeat('x', 262145), 0);
  exception when others then
    v_caught := sqlerrm like '%FICHIER_TROP_VOLUMINEUX%';
  end;
  perform test_helpers.assert_true(v_caught, '#255 : sauvegarder_fichier doit aussi refuser plus de 256 Ko');

  -- 4. Limite de taille du lot (5 fichiers de 250 Ko > 1 Mo)
  v_caught := false;
  begin
    perform public.sauvegarder_fichiers(
      v_pid,
      (select jsonb_agg(jsonb_build_object('chemin', 'f' || g || '.txt', 'contenu', repeat('y', 250000), 'expected_rev', 0))
       from generate_series(1, 5) g)
    );
  exception when others then
    v_caught := sqlerrm like '%LOT_TROP_VOLUMINEUX%';
  end;
  perform test_helpers.assert_true(v_caught, '#255 : un lot de plus de 1 Mo doit être refusé');

  -- 5. Un autre élève ne peut pas écrire dans ce projet
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  v_caught := false;
  begin
    perform public.sauvegarder_fichiers(
      v_pid,
      jsonb_build_array(jsonb_build_object('chemin', 'index.html', 'contenu', 'piraté', 'expected_rev', v_rev_index + 1))
    );
  exception when others then
    v_caught := sqlerrm like '%Accès refusé%';
  end;
  perform test_helpers.assert_true(v_caught, '#255 : un autre élève ne doit pas pouvoir sauvegarder dans ce projet');

  -- 6. Le rôle anonyme n'a pas le droit d'exécuter la RPC
  reset role;
  set local role anon;
  v_caught := false;
  begin
    perform public.sauvegarder_fichiers(v_pid, '[]'::jsonb);
  exception when others then
    v_caught := sqlerrm like '%permission denied%';
  end;
  perform test_helpers.assert_true(v_caught, '#255 : anon ne doit pas pouvoir exécuter sauvegarder_fichiers');
  reset role;
end;
$$;

rollback;
