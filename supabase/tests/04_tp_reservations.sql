-- Issue #187 : RLS des séances et réservations de postes TP (tests négatifs).
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

create or replace function test_helpers.as_user(p_role text, p_uid uuid)
returns void language plpgsql as $$
begin
  reset role;
  execute format('set local role %I', p_role);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  perform set_config('request.jwt.claim.role', p_role, true);
end;
$$;
grant execute on function test_helpers.as_user(text, uuid) to public, anon, authenticated, service_role;

do $$
declare
  v_prof_a uuid := '00000000-0000-0000-0000-0000000000c1';
  v_prof_b uuid := '00000000-0000-0000-0000-0000000000c2';
  v_eleve_a uuid := '00000000-0000-0000-0000-0000000000c3';
  v_eleve_a2 uuid := '00000000-0000-0000-0000-0000000000c4';
  v_eleve_b uuid := '00000000-0000-0000-0000-0000000000c5';
  v_class_a uuid := '00000000-0000-0000-0000-0000000000d1';
  v_class_b uuid := '00000000-0000-0000-0000-0000000000d2';
  v_sess_a uuid := '00000000-0000-0000-0000-0000000000e1';
  v_sess_b uuid := '00000000-0000-0000-0000-0000000000e2';
  v_res uuid;
  v_n int;
  v_statut text;
  v_caught boolean;
begin
  -- Seed (superuser)
  insert into auth.users (id, email, raw_user_meta_data) values
    (v_prof_a, 'tp-profa@labosti.tn', '{"nom":"P","prenom":"A"}'::jsonb),
    (v_prof_b, 'tp-profb@labosti.tn', '{"nom":"P","prenom":"B"}'::jsonb),
    (v_eleve_a, 'tp-elevea@labosti.tn', '{"nom":"E","prenom":"A"}'::jsonb),
    (v_eleve_a2, 'tp-elevea2@labosti.tn', '{"nom":"E","prenom":"A2"}'::jsonb),
    (v_eleve_b, 'tp-eleveb@labosti.tn', '{"nom":"E","prenom":"B"}'::jsonb);
  update public.user_roles set role = 'enseignant' where user_id in (v_prof_a, v_prof_b);

  insert into public.classes (id, nom, enseignant_id) values
    (v_class_a, 'TP-4STI-A', v_prof_a),
    (v_class_b, 'TP-4STI-B', v_prof_b);
  insert into public.class_members (class_id, eleve_id) values
    (v_class_a, v_eleve_a), (v_class_a, v_eleve_a2), (v_class_b, v_eleve_b);

  insert into public.tp_sessions (id, title, class_id, max_seats, start_time, end_time, created_by) values
    (v_sess_a, 'Séance A', v_class_a, 18, now(), now() + interval '2 hours', v_prof_a),
    (v_sess_b, 'Séance B', v_class_b, 18, now(), now() + interval '2 hours', v_prof_b);

  -- 1. Un élève ne crée pas de séance
  perform test_helpers.as_user('authenticated', v_eleve_a);
  v_caught := false;
  begin
    insert into public.tp_sessions (title, class_id, start_time, end_time, created_by)
    values ('Séance pirate', v_class_a, now(), now() + interval '1 hour', v_eleve_a);
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#187 : un élève ne doit pas pouvoir créer une séance TP');

  -- 2. Un élève réserve un poste dans la séance de sa classe (en attente)
  insert into public.tp_reservations (session_id, student_id, seat_number)
  values (v_sess_a, v_eleve_a, 3) returning id into v_res;
  select status into v_statut from public.tp_reservations where id = v_res;
  perform test_helpers.assert_true(v_statut = 'pending', '#187 : la réservation d''un élève doit être en attente');

  -- 3. Pas de réservation dans la séance d'une autre classe
  v_caught := false;
  begin
    insert into public.tp_reservations (session_id, student_id, seat_number)
    values (v_sess_b, v_eleve_a, 1);
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#187 : un élève ne doit pas réserver dans la séance d''une autre classe');

  -- 4. Pas de réservation déjà approuvée, ni au nom d'un autre élève
  v_caught := false;
  begin
    insert into public.tp_reservations (session_id, student_id, seat_number, status)
    values (v_sess_a, v_eleve_a2, 4, 'approved');
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#187 : un élève ne doit pas créer une réservation déjà approuvée');

  v_caught := false;
  begin
    insert into public.tp_reservations (session_id, student_id, seat_number)
    values (v_sess_a, v_eleve_a2, 4);
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#187 : un élève ne doit pas réserver au nom d''un autre élève');

  -- 5. Un élève ne valide pas sa propre demande
  update public.tp_reservations set status = 'approved' where id = v_res;
  get diagnostics v_n = row_count;
  perform test_helpers.assert_true(v_n = 0, '#187 : un élève ne doit pas pouvoir valider sa propre demande (UPDATE)');
  reset role;
  select status into v_statut from public.tp_reservations where id = v_res;
  perform test_helpers.assert_true(v_statut = 'pending', '#187 : la demande doit rester en attente après la tentative de l''élève');

  -- 6. Capacité : un poste au-delà de max_seats est refusé (deuxième élève de la classe A)
  perform test_helpers.as_user('authenticated', v_eleve_a2);
  v_caught := false;
  begin
    insert into public.tp_reservations (session_id, student_id, seat_number)
    values (v_sess_a, v_eleve_a2, 99);
  exception when others then
    v_caught := sqlerrm like 'Le poste 99 dépasse la capacité%';
  end;
  perform test_helpers.assert_true(v_caught, '#187 : un poste au-delà de la capacité doit être refusé');

  -- 7. Un autre enseignant (ni propriétaire ni enseignant de la classe) ne valide pas
  perform test_helpers.as_user('authenticated', v_prof_b);
  update public.tp_reservations set status = 'approved' where id = v_res;
  get diagnostics v_n = row_count;
  perform test_helpers.assert_true(v_n = 0, '#187 : un enseignant d''une autre classe ne doit pas valider la demande');

  -- 8. L'enseignant de la classe valide
  perform test_helpers.as_user('authenticated', v_prof_a);
  update public.tp_reservations set status = 'approved' where id = v_res;
  get diagnostics v_n = row_count;
  perform test_helpers.assert_true(v_n = 1, '#187 : l''enseignant de la classe doit pouvoir valider la demande');
  reset role;
  select status into v_statut from public.tp_reservations where id = v_res;
  perform test_helpers.assert_true(v_statut = 'approved', '#187 : la demande doit être approuvée');

  -- 9. Un enseignant ne crée pas de séance pour la classe d'un autre enseignant
  perform test_helpers.as_user('authenticated', v_prof_a);
  v_caught := false;
  begin
    insert into public.tp_sessions (title, class_id, start_time, end_time, created_by)
    values ('Séance sur classe tierce', v_class_b, now(), now() + interval '1 hour', v_prof_a);
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#187 : un enseignant ne doit pas créer une séance pour la classe d''un autre');

  insert into public.tp_sessions (title, class_id, start_time, end_time, created_by)
  values ('Séance légitime', v_class_a, now(), now() + interval '1 hour', v_prof_a);

  -- 10. Anonyme : aucun accès
  perform test_helpers.as_user('anon', null);
  v_caught := false;
  begin
    perform 1 from public.tp_sessions limit 1;
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#187 : anon ne doit avoir aucun accès à tp_sessions');

  reset role;
  raise notice 'SUCCÈS : RLS des séances et réservations TP (#187)';
end;
$$;

rollback;
