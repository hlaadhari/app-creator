-- ==============================================================================
-- Labo STI — Suite de Tests Négatifs SQL & RLS Réels sur PostgreSQL 16 (Issue #113 / SEC-05)
-- Vérifie en base réelle : T-01 à T-09, T-14, T-15, T-16, T-18, SEC-11 et admin_etat_systeme().
-- ==============================================================================

begin;

create schema if not exists test_helpers;
grant usage on schema test_helpers to public, anon, authenticated, service_role;

-- Fonction utilitaire d'assertion SQL
create or replace function test_helpers.assert_true(p_cond boolean, p_msg text)
returns void
language plpgsql
as $$
begin
  if not coalesce(p_cond, false) then
    raise exception 'ÉCHEC ASSERTION SQL : %', p_msg;
  end if;
end;
$$;

-- Fonction utilitaire simulant le contexte JWT Supabase d'un utilisateur
create or replace function test_helpers.switch_to_user(p_role text, p_uid uuid)
returns void
language plpgsql
as $$
begin
  reset role;
  perform set_config('app.passage_rpc', '', true);
  perform set_config('app.snapshot_rpc', '', true);
  perform set_config('app.maitrise_rpc', '', true);
  perform set_config('app.tentative_rpc', '', true);
  execute format('set local role %I', p_role);
  if p_uid is null then
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claim.role', p_role, true);
  else
    perform set_config('request.jwt.claim.sub', p_uid::text, true);
    perform set_config('request.jwt.claim.role', p_role, true);
  end if;
end;
$$;

grant execute on function test_helpers.assert_true(boolean, text) to public, anon, authenticated, service_role;
grant execute on function test_helpers.switch_to_user(text, uuid) to public, anon, authenticated, service_role;

do $$
declare
  v_admin uuid := '00000000-0000-0000-0000-000000000001';
  v_prof_a uuid := '00000000-0000-0000-0000-000000000011';
  v_prof_b uuid := '00000000-0000-0000-0000-000000000012';
  v_eleve_a uuid := '00000000-0000-0000-0000-000000000021';
  v_eleve_b uuid := '00000000-0000-0000-0000-000000000022';
  v_eleve_rgpd uuid := '00000000-0000-0000-0000-000000000023';

  v_sujet_id uuid := '00000000-0000-0000-0000-000000000101';
  v_version_pub_id uuid := '00000000-0000-0000-0000-000000000201';
  v_version_draft_id uuid := '00000000-0000-0000-0000-000000000202';
  v_critere_id uuid := '00000000-0000-0000-0000-000000000301';

  v_class_a uuid := '00000000-0000-0000-0000-000000000401';
  v_class_b uuid := '00000000-0000-0000-0000-000000000402';

  v_projet_a uuid := '00000000-0000-0000-0000-000000000501';
  v_projet_a2 uuid := '00000000-0000-0000-0000-000000000503';
  v_projet_b uuid := '00000000-0000-0000-0000-000000000502';

  v_session_active uuid := '00000000-0000-0000-0000-000000000601';
  v_session_active_2 uuid := '00000000-0000-0000-0000-000000000602';
  v_session_expiree uuid := '00000000-0000-0000-0000-000000000603';

  v_passage_a uuid;
  v_passage_a2 uuid;
  v_passage_exp uuid := '00000000-0000-0000-0000-000000000703';

  v_snap_1 public.snapshots;
  v_snap_2 public.snapshots;
  v_rev int;
  v_count int;
  v_caught boolean;
  v_etat jsonb;
begin
  -- ============================================================================
  -- 1. Seed initial (en tant que superuser / service_role) et vérification T-03
  -- ============================================================================
  insert into auth.users (id, email, raw_user_meta_data) values
    (v_admin, 'admin@labosti.tn', '{"nom":"Admin","prenom":"Root"}'::jsonb),
    (v_prof_a, 'profa@labosti.tn', '{"nom":"Prof","prenom":"Alpha"}'::jsonb),
    (v_prof_b, 'profb@labosti.tn', '{"nom":"Prof","prenom":"Beta"}'::jsonb),
    -- T-03 : tentative d'injection de role=admin dans raw_user_meta_data à l'inscription
    (v_eleve_a, 'elevea@labosti.tn', '{"nom":"Eleve","prenom":"A","role":"admin"}'::jsonb),
    (v_eleve_b, 'eleveb@labosti.tn', '{"nom":"Eleve","prenom":"B","role":"enseignant"}'::jsonb),
    (v_eleve_rgpd, 'rgpd@labosti.tn', '{"nom":"Secret","prenom":"Eleve"}'::jsonb);

  -- Vérification T-03 : le trigger handle_new_user() force exclusivement le rôle 'eleve'
  perform test_helpers.assert_true(
    (select count(*) from public.user_roles where user_id = v_eleve_a and role = 'eleve') = 1
    and (select count(*) from public.user_roles where user_id = v_eleve_a and role <> 'eleve') = 0,
    'T-03 : handle_new_user doit attribuer uniquement le rôle eleve'
  );

  -- Promotion officielle de admin et prof_a / prof_b par le système
  update public.user_roles set role = 'admin' where user_id = v_admin;
  update public.user_roles set role = 'enseignant' where user_id in (v_prof_a, v_prof_b);

  -- Création d'un sujet, d'une version brouillon puis publiée, d'un critère et d'une solution
  insert into public.sujets (id, code, titre, type, niveau)
  values (v_sujet_id, 'sujet-test-ci', 'Sujet Test CI', 'exercice', 'Terminale STI');

  insert into public.sujet_versions (id, sujet_id, numero, enonce_md, publiee)
  values
    (v_version_pub_id, v_sujet_id, 1, '# Énoncé v1', false),
    (v_version_draft_id, v_sujet_id, 2, '# Énoncé v2', false);

  insert into public.sujet_version_fichiers (version_id, chemin, contenu, role)
  values (v_version_pub_id, 'index.html', '<h1>Starter</h1>', 'depart');

  insert into public.criteres (id, version_id, code, label, points, sonde)
  values (v_critere_id, v_version_pub_id, 'HTML.H1', 'Présence H1', 5, '{"type":"dom_selector","selector":"h1"}'::jsonb);

  insert into public.critere_competences (critere_id, competence_id, poids)
  values (v_critere_id, 'HTML.STRUCT', 1.00);

  insert into public.solutions (version_id, chemin, contenu)
  values (v_version_pub_id, 'index.html', '<h1>Solution Officielle Secrète</h1>');

  -- Sceller v_version_pub_id en publiee = true
  update public.sujet_versions set publiee = true, published_at = now() where id = v_version_pub_id;

  -- Création des classes et inscriptions
  insert into public.classes (id, nom, enseignant_id) values
    (v_class_a, '4STI-A', v_prof_a),
    (v_class_b, '4STI-B', v_prof_b);

  insert into public.class_members (class_id, eleve_id) values
    (v_class_a, v_eleve_a),
    (v_class_b, v_eleve_b);

  -- Création des projets élèves
  insert into public.projets (id, eleve_id, version_id, statut) values
    (v_projet_a, v_eleve_a, v_version_pub_id, 'en_cours'),
    (v_projet_a2, v_eleve_a, v_version_draft_id, 'en_cours'),
    (v_projet_b, v_eleve_b, v_version_pub_id, 'en_cours');

  insert into public.projet_fichiers (projet_id, chemin, contenu, rev) values
    (v_projet_a, 'index.html', '<h1>Copie A</h1>', 1),
    (v_projet_a2, 'index.html', '<h1>Copie A</h1>', 1),
    (v_projet_b, 'index.html', '<h1>Copie B Secrète</h1>', 1);

  -- ============================================================================
  -- 2. T-09 : Immuabilité absolue des versions publiées
  -- ============================================================================
  v_caught := false;
  begin
    update public.sujet_versions set enonce_md = 'Altéré' where id = v_version_pub_id;
  exception when others then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-09 : modification d une sujet_version publiée doit échouer');

  v_caught := false;
  begin
    update public.criteres set points = 20 where id = v_critere_id;
  exception when others then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-09 : modification d un critère publié doit échouer');

  -- ============================================================================
  -- 3. T-01 : Isolation inter-élèves (eleve_a ne voit ni ne modifie eleve_b)
  -- ============================================================================
  perform test_helpers.switch_to_user('authenticated', v_eleve_a);

  select count(*) into v_count from public.projets where id = v_projet_b;
  perform test_helpers.assert_true(v_count = 0, 'T-01 : eleve_a ne doit pas lire le projet de eleve_b');

  select count(*) into v_count from public.projet_fichiers where projet_id = v_projet_b;
  perform test_helpers.assert_true(v_count = 0, 'T-01 : eleve_a ne doit pas lire les fichiers de eleve_b');

  update public.projet_fichiers set contenu = 'Piraté' where projet_id = v_projet_b;
  get diagnostics v_count = row_count;
  perform test_helpers.assert_true(v_count = 0, 'T-01 : eleve_a ne doit pas modifier les fichiers de eleve_b');

  -- ============================================================================
  -- 4. T-02 : Isolation inter-enseignants (prof_a ne voit ni class_b ni projet_b)
  -- ============================================================================
  perform test_helpers.switch_to_user('authenticated', v_prof_a);

  select count(*) into v_count from public.classes where id = v_class_b;
  perform test_helpers.assert_true(v_count = 0, 'T-02 : prof_a ne doit pas voir la classe de prof_b');

  select count(*) into v_count from public.projets where id = v_projet_b;
  perform test_helpers.assert_true(v_count = 0, 'T-02 : prof_a ne doit pas voir le projet d un élève hors de ses classes');

  -- ============================================================================
  -- 5. T-03 & SEC-11 : Escalade de privilèges et restriction de has_role
  -- ============================================================================
  perform test_helpers.switch_to_user('authenticated', v_eleve_a);

  v_caught := false;
  begin
    insert into public.user_roles (user_id, role) values (v_eleve_a, 'admin');
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-03 : insertion directe dans user_roles par authenticated doit être refusée');

  v_caught := false;
  begin
    update public.profiles set valide_par = v_eleve_a where id = v_eleve_a;
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-03 : modification de valide_par sur profiles par authenticated doit être refusée');

  -- SEC-11 : un élève ne peut pas énumérer le rôle d'un autre utilisateur via has_role
  perform test_helpers.assert_true(
    public.has_role(v_prof_a, 'enseignant') = false,
    'SEC-11 : has_role doit retourner false quand un élève interroge l identifiant d un tiers'
  );

  perform test_helpers.switch_to_user('anon', null);
  v_caught := false;
  begin
    perform public.has_role(v_prof_a, 'enseignant');
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'SEC-11 : anon ne doit pas pouvoir exécuter has_role');

  -- ============================================================================
  -- 6. T-04 : Confidentialité absolue de solutions et criteres
  -- ============================================================================
  perform test_helpers.switch_to_user('authenticated', v_eleve_a);

  v_caught := false;
  begin
    perform count(*) from public.solutions;
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-04 : SELECT direct sur public.solutions doit être refusé à authenticated');

  v_caught := false;
  begin
    perform count(*) from public.criteres;
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-04 : SELECT direct sur public.criteres doit être refusé à authenticated');

  -- ============================================================================
  -- 7. T-05 : Codes d'invitation révoqués ou expirés
  -- ============================================================================
  reset role;
  insert into public.class_invitations (class_id, code, revoque, expire_le)
  values (v_class_b, 'STI-REVO', true, now() + interval '7 days');

  perform test_helpers.switch_to_user('authenticated', v_eleve_a);
  perform test_helpers.assert_true(
    ((public.rejoindre_classe('STI-REVO')) ->> 'ok')::boolean = false,
    'T-05 : rejoindre_classe doit rejeter un code révoqué'
  );

  -- ============================================================================
  -- 8. T-18 (TEC-04 / SEC-09) : RPC atomique sauvegarder_fichier & CONFLIT_REVISION
  -- ============================================================================
  perform test_helpers.switch_to_user('authenticated', v_eleve_a);

  -- 1er appel avec _expected_rev = 1 -> passe à rev = 2
  v_rev := public.sauvegarder_fichier(v_projet_a, 'index.html', '<h1>Copie A</h1>', 1);
  perform test_helpers.assert_true(v_rev = 2, 'T-18 : sauvegarder_fichier doit incrémenter rev à 2');

  -- 2e appel concurrent avec la même _expected_rev = 1 -> lève CONFLIT_REVISION
  v_caught := false;
  begin
    v_rev := public.sauvegarder_fichier(v_projet_a, 'index.html', '<h1>Version concurrente</h1>', 1);
  exception when others then
    if sqlerrm like '%CONFLIT_REVISION%' then
      v_caught := true;
    end if;
  end;
  perform test_helpers.assert_true(v_caught, 'T-18 : sauvegarder_fichier avec ancienne révision doit lever CONFLIT_REVISION');

  -- ============================================================================
  -- 9. T-06a, T-06b, T-06c, T-07a (SEC-01) : Verrouillage de passages_examen
  -- ============================================================================
  reset role;
  insert into public.sessions_examen (id, class_id, version_id, titre, duree_min, statut, debut_serveur, echeance_serveur)
  values
    (v_session_active, v_class_a, v_version_pub_id, 'Examen Blanc 1', 120, 'en_cours', now() - interval '10 minutes', now() + interval '110 minutes'),
    (v_session_active_2, v_class_a, v_version_pub_id, 'Examen Blanc 2', 120, 'en_cours', now() - interval '10 minutes', now() + interval '110 minutes'),
    (v_session_expiree, v_class_a, v_version_pub_id, 'Examen Expiré', 60, 'en_cours', now() - interval '120 minutes', now() - interval '60 minutes');

  -- Test T-06b sur un passage expiré lié à v_projet_a
  insert into public.passages_examen (id, session_id, eleve_id, projet_id, statut, debut_reel, echeance_eleve)
  values (
    v_passage_exp,
    v_session_expiree,
    v_eleve_a,
    v_projet_a,
    'en_cours',
    now() - interval '120 minutes',
    now() - interval '5 minutes'
  );

  perform test_helpers.switch_to_user('authenticated', v_eleve_a);

  v_caught := false;
  begin
    update public.projet_fichiers set contenu = 'Hors délai' where projet_id = v_projet_a;
  exception when others then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-06b : modification de projet_fichiers après échéance doit être rejetée');

  -- T-08b : sceller_snapshot_examen après l'échéance doit être refusé
  v_caught := false;
  begin
    perform public.sceller_snapshot_examen(v_passage_exp);
  exception when others then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-08b : sceller_snapshot_examen après l échéance doit être refusé');

  -- Retirer le passage expiré pour tester le cycle nominal et les attaques T-06a/T-06c/T-07a
  reset role;
  delete from public.passages_examen where id = v_passage_exp;

  perform test_helpers.switch_to_user('authenticated', v_eleve_a);

  -- T-06c : un élève ne peut pas lier le projet d'un autre élève via demarrer_passage
  v_caught := false;
  begin
    perform public.demarrer_passage(v_session_active, v_projet_b);
  exception when others then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-06c : demarrer_passage doit refuser le projet d un autre élève');

  -- Démarrage légitime par RPC
  select id into v_passage_a from public.demarrer_passage(v_session_active, v_projet_a);
  perform test_helpers.assert_true(v_passage_a is not null, 'SEC-01 : demarrer_passage doit créer le passage élève');

  -- T-06a : l'élève tente un UPDATE direct pour s'accorder temps_supp_min = 999 ou repousser echeance_eleve
  perform test_helpers.switch_to_user('authenticated', v_eleve_a);
  update public.passages_examen
  set temps_supp_min = 999, echeance_eleve = now() + interval '10 hours'
  where id = v_passage_a;
  get diagnostics v_count = row_count;
  perform test_helpers.assert_true(v_count = 0, 'T-06a : un élève ne peut pas modifier directement temps_supp_min ou echeance_eleve');

  -- T-07a : l'élève tente de passer son passage à 'corrige'
  update public.passages_examen set statut = 'corrige' where id = v_passage_a;
  get diagnostics v_count = row_count;
  perform test_helpers.assert_true(v_count = 0, 'T-07a : un élève ne peut pas passer son passage à corrige');

  -- T-04 en examen actif : debloquer_solution doit être refusé pendant que v_session_active est en_cours
  v_caught := false;
  begin
    perform * from public.debloquer_solution(v_version_pub_id, 'triche');
  exception when others then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-04 : debloquer_solution doit être refusé pendant un examen actif');

  -- ============================================================================
  -- 10. T-08a & T-08c (SEC-03) : Scellement serveur exclusif des snapshots
  -- ============================================================================
  perform test_helpers.switch_to_user('authenticated', v_eleve_a);

  -- T-08a : insertion directe dans public.snapshots refusée
  v_caught := false;
  begin
    insert into public.snapshots (projet_id, passage_id, eleve_id, version_id, hash, manifeste)
    values (v_projet_a, v_passage_a, v_eleve_a, v_version_pub_id, 'faux_hash', '{}'::jsonb);
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-08a : INSERT direct dans snapshots par authenticated doit être refusé');

  -- T-08c : scellement serveur via sceller_snapshot_examen sur deux passages ayant le même contenu
  select id into v_passage_a2 from public.demarrer_passage(v_session_active_2, v_projet_a2);

  select * into v_snap_1 from public.sceller_snapshot_examen(v_passage_a);
  select * into v_snap_2 from public.sceller_snapshot_examen(v_passage_a2);

  perform test_helpers.assert_true(
    char_length(v_snap_1.hash) = 64 and v_snap_1.hash = v_snap_2.hash,
    'T-08c : deux scellements d un même contenu produisent exactement le même hash SHA-256 serveur'
  );

  -- ============================================================================
  -- 11. T-15 (SEC-02) : Provenance obligatoire source='client' sur tentatives
  -- ============================================================================
  perform test_helpers.switch_to_user('authenticated', v_eleve_a);

  v_caught := false;
  begin
    insert into public.tentatives (projet_id, eleve_id, sujet_version_id, score, max, note20, detail, source)
    values (v_projet_a, v_eleve_a, v_version_pub_id, 20, 20, 20.0, '{}'::jsonb, 'serveur');
  exception when others then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-15 : un élève ne peut pas insérer une tentative avec source=serveur');

  v_caught := false;
  begin
    insert into public.tentatives (projet_id, eleve_id, sujet_version_id, score, max, note20, detail, source)
    values (v_projet_a, v_eleve_a, v_version_pub_id, 20, 20, 20.0, '{}'::jsonb, 'enseignant');
  exception when others then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-15 : un élève ne peut pas insérer une tentative avec source=enseignant');

  -- Insertion légitime avec source='client'
  insert into public.tentatives (projet_id, eleve_id, sujet_version_id, score, max, note20, detail, source)
  values (v_projet_a, v_eleve_a, v_version_pub_id, 15, 20, 15.0, '{}'::jsonb, 'client');

  -- ============================================================================
  -- 12. T-16 (SEC-06) : Écriture directe interdite sur maitrise et badges
  -- ============================================================================
  perform test_helpers.switch_to_user('authenticated', v_eleve_a);

  -- Vérifier que le trigger serveur sur tentatives a bien calculé la maîtrise et attribué PREMIERS_PAS
  select count(*) into v_count from public.maitrise where eleve_id = v_eleve_a and competence_id = 'HTML.STRUCT';
  perform test_helpers.assert_true(v_count = 1, 'T-16 : le trigger serveur doit calculer la maîtrise lors d une tentative');

  select count(*) into v_count from public.badges where eleve_id = v_eleve_a and badge_id = 'PREMIERS_PAS';
  perform test_helpers.assert_true(v_count = 1, 'T-16 : le trigger serveur doit attribuer le badge PREMIERS_PAS');

  -- Tentative d'écriture directe élève sur maitrise
  v_caught := false;
  begin
    insert into public.maitrise (eleve_id, competence_id, niveau)
    values (v_eleve_a, 'CSS.FLEX', 1.000);
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-16 : INSERT direct élève sur maitrise doit être refusé');

  -- Tentative d'écriture directe élève sur badges
  v_caught := false;
  begin
    insert into public.badges (eleve_id, badge_id)
    values (v_eleve_a, 'MAJOR_BAC_BLANC');
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(v_caught, 'T-16 : INSERT direct élève sur badges doit être refusé');

  -- ============================================================================
  -- 13. T-14 (RGPD) & admin_etat_systeme()
  -- ============================================================================
  perform test_helpers.switch_to_user('authenticated', v_admin);

  perform public.admin_anonymiser_eleve(v_eleve_rgpd);
  perform test_helpers.assert_true(
    exists (select 1 from public.profiles where id = v_eleve_rgpd and nom = 'Anonyme' and anonymise_at is not null),
    'T-14 : admin_anonymiser_eleve doit anonymiser le profil élève'
  );

  v_etat := public.admin_etat_systeme();
  perform test_helpers.assert_true(
    jsonb_array_length(v_etat -> 'tables_sans_rls') = 0
    and (v_etat ->> 'droits_clients_corriges')::int = 0
    and jsonb_array_length(v_etat -> 'tables_anon_ecriture') = 0
    and (v_etat ->> 'ecriture_directe_user_roles')::boolean = false
    and (v_etat ->> 'triggers_immuabilite_presents')::int = (v_etat ->> 'triggers_immuabilite_attendus')::int,
    'admin_etat_systeme : tous les invariants de sécurité en base doivent être au vert'
  );

  raise notice 'SUCCÈS : Tous les tests négatifs SQL & RLS (T-01 à T-18) ont réussi sur PostgreSQL !';
end;
$$;

rollback;
