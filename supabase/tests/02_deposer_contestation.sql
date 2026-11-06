-- Issue #185 : la RPC deposer_contestation insère uniquement pour l'élève authentifié.
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
  v_eleve uuid := '00000000-0000-0000-0000-0000000000a1';
  v_id uuid;
  v_caught boolean;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_eleve, 'contest-eleve@labosti.tn', '{"nom":"Eleve","prenom":"C"}'::jsonb);

  -- Élève authentifié : dépôt par code de critère sur un sujet publié du seed
  perform set_config('request.jwt.claim.sub', v_eleve::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  v_id := public.deposer_contestation('carte-profil', 'h1', 'Mon titre est bien présent dans la carte');
  perform test_helpers.assert_true(
    exists (select 1 from public.contestations where id = v_id and eleve_id = v_eleve and statut = 'en_attente'),
    '#185 : la contestation doit être créée pour l''élève authentifié, en attente'
  );

  -- Critère inconnu
  v_caught := false;
  begin
    perform public.deposer_contestation('carte-profil', 'inexistant', 'Texte suffisamment long ici');
  exception when others then
    v_caught := sqlerrm = 'critere_introuvable';
  end;
  perform test_helpers.assert_true(v_caught, '#185 : un critère inconnu doit lever critere_introuvable');

  -- Sujet inconnu
  v_caught := false;
  begin
    perform public.deposer_contestation('sujet-inexistant', 'h1', 'Texte suffisamment long ici');
  exception when others then
    v_caught := sqlerrm = 'sujet_introuvable';
  end;
  perform test_helpers.assert_true(v_caught, '#185 : un sujet inconnu doit lever sujet_introuvable');

  -- Motif trop court refusé par la contrainte de la table
  v_caught := false;
  begin
    perform public.deposer_contestation('carte-profil', 'h1', 'court');
  exception when check_violation then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#185 : un motif de moins de 10 caractères doit être refusé');

  -- Anonyme : exécution interdite
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  set local role anon;
  v_caught := false;
  begin
    perform public.deposer_contestation('carte-profil', 'h1', 'Texte suffisamment long ici');
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#185 : anon ne doit pas pouvoir exécuter deposer_contestation');

  reset role;
  raise notice 'SUCCÈS : deposer_contestation (#185)';
end;
$$;

rollback;
