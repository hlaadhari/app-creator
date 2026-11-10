-- Issue #245 : RLS du centre de notifications (tests négatifs).
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
  v_eleve_a uuid := '00000000-0000-0000-0000-0000000000f1';
  v_eleve_b uuid := '00000000-0000-0000-0000-0000000000f2';
  v_admin uuid := '00000000-0000-0000-0000-0000000000f3';
  v_notif_a uuid;
  v_notif_b uuid;
  v_n int;
  v_caught boolean;
  v_lu timestamptz;
  v_titre text;
begin
  -- Seed (superuser)
  insert into auth.users (id, email, raw_user_meta_data) values
    (v_eleve_a, 'notif-elevea@labosti.tn', '{"nom":"E","prenom":"A"}'::jsonb),
    (v_eleve_b, 'notif-eleveb@labosti.tn', '{"nom":"E","prenom":"B"}'::jsonb),
    (v_admin, 'notif-admin@labosti.tn', '{"nom":"A","prenom":"D"}'::jsonb);
  update public.user_roles set role = 'admin' where user_id = v_admin;

  -- 1. service_role crée des notifications via la fonction serveur
  perform test_helpers.as_user('service_role', null);
  v_notif_a := public.creer_notification(v_eleve_a, 'correction', 'Note disponible', 'Votre copie a été corrigée', '/sujet/ex-html-css-01');
  v_notif_b := public.creer_notification(v_eleve_b, 'examen', 'Échéance proche', null, null);
  perform test_helpers.assert_true(v_notif_a is not null and v_notif_b is not null,
    '#245 : service_role doit pouvoir créer des notifications');

  -- 2. Un élève ne lit que ses notifications
  perform test_helpers.as_user('authenticated', v_eleve_a);
  select count(*) into v_n from public.notifications;
  perform test_helpers.assert_true(v_n = 1, '#245 : un élève ne doit voir que ses propres notifications');
  select count(*) into v_n from public.notifications where user_id = v_eleve_b;
  perform test_helpers.assert_true(v_n = 0, '#245 : un élève ne doit pas lire les notifications d''un autre élève');
  select count(*) into v_n from public.notifications where id = v_notif_b;
  perform test_helpers.assert_true(v_n = 0, '#245 : lecture directe par identifiant d''une notification d''autrui refusée');

  -- 3. Même un administrateur ne lit que les siennes
  perform test_helpers.as_user('authenticated', v_admin);
  select count(*) into v_n from public.notifications;
  perform test_helpers.assert_true(v_n = 0, '#245 : un administrateur ne doit pas lire les notifications des élèves');

  -- 4. anon n'a aucun accès
  perform test_helpers.as_user('anon', null);
  v_caught := false;
  begin
    perform 1 from public.notifications limit 1;
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#245 : anon ne doit avoir aucun accès à notifications');

  -- 5. Aucun insert ni delete côté client
  perform test_helpers.as_user('authenticated', v_eleve_a);
  v_caught := false;
  begin
    insert into public.notifications (user_id, kind, title) values (v_eleve_a, 'systeme', 'Auto-notification');
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#245 : un élève ne doit pas pouvoir insérer une notification');

  v_caught := false;
  begin
    insert into public.notifications (user_id, kind, title) values (v_eleve_b, 'systeme', 'Faux message');
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#245 : un élève ne doit pas pouvoir écrire une notification à autrui');

  v_caught := false;
  begin
    delete from public.notifications where id = v_notif_a;
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#245 : un élève ne doit pas pouvoir supprimer une notification');

  -- 6. La fonction de création est réservée au service
  v_caught := false;
  begin
    perform public.creer_notification(v_eleve_a, 'systeme', 'Détournement');
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#245 : creer_notification ne doit pas être appelable par un élève');

  perform test_helpers.as_user('anon', null);
  v_caught := false;
  begin
    perform public.creer_notification(v_eleve_a, 'systeme', 'Détournement');
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#245 : creer_notification ne doit pas être appelable par anon');

  -- 7. Mise à jour : read_at seulement, sur ses propres notifications
  perform test_helpers.as_user('authenticated', v_eleve_a);
  update public.notifications set read_at = now() where id = v_notif_a;
  get diagnostics v_n = row_count;
  perform test_helpers.assert_true(v_n = 1, '#245 : un élève doit pouvoir marquer sa notification comme lue');
  select read_at into v_lu from public.notifications where id = v_notif_a;
  perform test_helpers.assert_true(v_lu is not null, '#245 : read_at doit être renseigné après marquage');

  update public.notifications set read_at = null where id = v_notif_a;
  get diagnostics v_n = row_count;
  perform test_helpers.assert_true(v_n = 1, '#245 : un élève doit pouvoir marquer sa notification comme non lue');

  update public.notifications set read_at = now() where id = v_notif_b;
  get diagnostics v_n = row_count;
  perform test_helpers.assert_true(v_n = 0, '#245 : un élève ne doit pas pouvoir modifier la notification d''autrui');

  v_caught := false;
  begin
    update public.notifications set title = 'Titre falsifié' where id = v_notif_a;
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#245 : le titre d''une notification ne doit pas être modifiable par l''élève');

  v_caught := false;
  begin
    update public.notifications set user_id = v_eleve_b where id = v_notif_a;
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#245 : une notification ne doit pas pouvoir être réattribuée');

  -- 8. Les contenus sont restés intacts
  perform test_helpers.as_user('service_role', null);
  select title into v_titre from public.notifications where id = v_notif_a;
  perform test_helpers.assert_true(v_titre = 'Note disponible', '#245 : le titre de la notification doit être inchangé');
  select count(*) into v_n from public.notifications where id = v_notif_b and read_at is null;
  perform test_helpers.assert_true(v_n = 1, '#245 : la notification d''autrui doit rester non lue');

  -- 9. Contraintes : seuls les chemins internes sont acceptés comme lien
  v_caught := false;
  begin
    perform public.creer_notification(v_eleve_a, 'systeme', 'Lien externe', null, 'https://evil.example/phishing');
  exception when check_violation then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#245 : un lien absolu doit être refusé');

  v_caught := false;
  begin
    perform public.creer_notification(v_eleve_a, 'systeme', 'Lien protocole relatif', null, '//evil.example');
  exception when check_violation then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#245 : un lien « // » doit être refusé');

  v_caught := false;
  begin
    perform public.creer_notification(v_eleve_a, 'inconnu', 'Type inconnu');
  exception when check_violation then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, '#245 : un type de notification inconnu doit être refusé');

  reset role;
  raise notice 'SUCCÈS : RLS des notifications (#245)';
end;
$$;

rollback;
