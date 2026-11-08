-- =============================================================================
-- Tests SQL & RLS : Épreuve écrite scellée et notée côté serveur (Issue #197 / T-06 / T-07)
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
  v_eleve_a uuid := '00000000-0000-0000-0000-000000000197';
  v_prof_a uuid := '00000000-0000-0000-0000-000000000297';
  v_prof_b uuid := '00000000-0000-0000-0000-000000000397';
  v_class_a uuid;
  v_res_init jsonb;
  v_res_reload jsonb;
  v_res_remise jsonb;
  v_res_notee jsonb;
  v_liste_prof jsonb;
  v_copie_id uuid;
  v_echeance1 timestamptz;
  v_caught boolean;
  v_count int;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values
    (v_eleve_a, 'ecrit-eleve@labosti.tn', '{"nom":"Ecrit","prenom":"Eleve"}'::jsonb),
    (v_prof_a, 'ecrit-profa@labosti.tn', '{"nom":"Ecrit","prenom":"ProfA"}'::jsonb),
    (v_prof_b, 'ecrit-profb@labosti.tn', '{"nom":"Ecrit","prenom":"ProfB"}'::jsonb);

  update public.user_roles set role = 'enseignant' where user_id in (v_prof_a, v_prof_b);

  insert into public.classes (nom, enseignant_id)
  values ('4SI-Ecrit-A', v_prof_a)
  returning id into v_class_a;

  insert into public.class_members (class_id, eleve_id)
  values (v_class_a, v_eleve_a);

  -- Authentification en tant qu'élève A
  perform set_config('request.jwt.claim.sub', v_eleve_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- 1. Test négatif : l'élève ne peut pas lire la table des barèmes/corrigés sujets_examen_ecrit_baremes
  v_caught := false;
  begin
    select count(*) into v_count from public.sujets_examen_ecrit_baremes;
  exception when insufficient_privilege then
    v_caught := true;
  end;
  perform test_helpers.assert_true(
    v_caught,
    '#197 : un élève authenticated ne doit avoir aucun accès direct à sujets_examen_ecrit_baremes'
  );

  -- 2. Démarrage de la copie écrite côté serveur
  v_res_init := public.demarrer_copie_examen_ecrit('written-bac-demo', 120);
  v_copie_id := (v_res_init ->> 'copie_id')::uuid;
  v_echeance1 := (v_res_init ->> 'echeance_serveur')::timestamptz;

  perform test_helpers.assert_true(
    v_copie_id is not null
    and (v_res_init ->> 'statut') = 'en_cours'
    and v_echeance1 > clock_timestamp()
    and (v_res_init -> 'detail_evaluation') = 'null'::jsonb,
    '#197 : demarrer_copie_examen_ecrit doit initialiser la copie sans divulguer detail_evaluation avant remise'
  );

  -- 3. Sauvegarde d'un brouillon et vérification de la persistance après effacement du localStorage
  perform public.sauvegarder_brouillon_examen_ecrit(
    'written-bac-demo',
    '{"qcm-1": "opt-having", "mod-1": "Employe (#Matricule, Nom, Prenom, Salaire, #CodeDep)"}'::jsonb
  );

  v_res_reload := public.demarrer_copie_examen_ecrit('written-bac-demo', 600);
  perform test_helpers.assert_true(
    (v_res_reload ->> 'echeance_serveur')::timestamptz = v_echeance1
    and (v_res_reload -> 'reponses' ->> 'qcm-1') = 'opt-having',
    '#197 : vider le localStorage et rappeler demarrer_copie_examen_ecrit restitue la même échéance et le brouillon serveur'
  );

  -- 4. Test négatif : l'élève ne peut pas modifier directement sa note ou sa copie dans copies_examen_ecrit
  v_caught := false;
  begin
    update public.copies_examen_ecrit
    set note_finale = 20, score_qcm = 20
    where id = v_copie_id;
  exception when others then
    v_caught := true;
  end;
  perform test_helpers.assert_true(
    v_caught,
    '#197 : un élève ne peut pas modifier directement copies_examen_ecrit pour s''attribuer une note'
  );

  -- 5. Remise volontaire de la copie : scellement SHA-256 et notation QCM par le serveur
  v_res_remise := public.remettre_copie_examen_ecrit(
    'written-bac-demo',
    '{"qcm-1": "opt-having", "qcm-2": ["opt-pk", "opt-fk", "opt-check"], "mod-1": "Employe (#Matricule, Nom, Prenom, Salaire, #CodeDep)"}'::jsonb,
    'remise_volontaire'
  );

  perform test_helpers.assert_true(
    (v_res_remise ->> 'statut') = 'remise'
    and (v_res_remise ->> 'motif_cloture') = 'remise_volontaire'
    and char_length(v_res_remise ->> 'hash_scelle') = 64
    and (v_res_remise ->> 'score_qcm')::numeric = 4
    and (v_res_remise ->> 'max_qcm')::numeric = 4
    and (v_res_remise ->> 'max_ouvert')::numeric = 16
    and (v_res_remise ->> 'note_finale')::numeric = 4,
    '#197 : remettre_copie_examen_ecrit doit sceller la copie (motif=remise_volontaire) et calculer le score QCM (4/4) côté serveur'
  );

  -- 6. Tests négatifs post-remise : un élève ne peut ni réécrire ni resoumettre une copie scellée
  v_caught := false;
  begin
    perform public.sauvegarder_brouillon_examen_ecrit('written-bac-demo', '{"qcm-1": "opt-where"}'::jsonb);
  exception when others then
    v_caught := sqlerrm like '%scellée%';
  end;
  perform test_helpers.assert_true(
    v_caught,
    '#197 : sauvegarder_brouillon_examen_ecrit doit être refusé sur une copie déjà scellée'
  );

  v_caught := false;
  begin
    perform public.remettre_copie_examen_ecrit('written-bac-demo', '{"qcm-1": "opt-where"}'::jsonb, 'remise_volontaire');
  exception when others then
    v_caught := sqlerrm like '%scellée%';
  end;
  perform test_helpers.assert_true(
    v_caught,
    '#197 : remettre_copie_examen_ecrit une seconde fois doit être refusé'
  );

  -- Même après effacement du localStorage, demarrer_copie_examen_ecrit restitue la copie scellée et sa note
  v_res_reload := public.demarrer_copie_examen_ecrit('written-bac-demo', 120);
  perform test_helpers.assert_true(
    (v_res_reload ->> 'statut') = 'remise'
    and (v_res_reload ->> 'motif_cloture') = 'remise_volontaire'
    and (v_res_reload ->> 'note_finale')::numeric = 4,
    '#197 : vider le localStorage après remise ne change ni la note ni l''état de la copie'
  );

  -- 7. Test négatif : l'élève ne peut pas appeler noter_copie_examen_ecrit
  v_caught := false;
  begin
    perform public.noter_copie_examen_ecrit(v_copie_id, '{"mod-1": 2.5}'::jsonb, 'Auto-notation');
  exception when others then
    v_caught := sqlerrm like '%Accès refusé%';
  end;
  perform test_helpers.assert_true(
    v_caught,
    '#197 : un élève ne peut pas appeler noter_copie_examen_ecrit'
  );

  -- 8. Test négatif : un enseignant d'une autre classe (prof_b) ne peut pas noter la copie de l'élève A
  perform set_config('request.jwt.claim.sub', v_prof_b::text, true);
  v_caught := false;
  begin
    perform public.noter_copie_examen_ecrit(v_copie_id, '{"mod-1": 2.5}'::jsonb, 'Prof externe');
  exception when others then
    v_caught := sqlerrm like '%Accès refusé%';
  end;
  perform test_helpers.assert_true(
    v_caught,
    '#197 / T-02 : un enseignant étranger à la classe ne peut pas noter la copie'
  );

  -- 9. L'enseignant de la classe (prof_a) consulte les copies et corrige les questions ouvertes
  perform set_config('request.jwt.claim.sub', v_prof_a::text, true);
  v_liste_prof := public.lister_copies_examen_ecrit_enseignant(v_class_a);
  perform test_helpers.assert_true(
    jsonb_array_length(v_liste_prof) = 1
    and (v_liste_prof -> 0 ->> 'id')::uuid = v_copie_id,
    '#197 : l''enseignant de la classe doit voir la copie écrite remise par son élève'
  );

  v_res_notee := public.noter_copie_examen_ecrit(
    v_copie_id,
    '{"mod-1": {"points": 2.5, "commentaire": "Schéma conforme"}, "mod-2": {"points": 2, "commentaire": "Bon DDL"}, "sql-1": {"points": 3}, "sql-2": {"points": 3}, "code-1": {"points": 2.5}, "code-2": {"points": 2.5}}'::jsonb,
    'Excellente maîtrise SQL et analyse de code.'
  );

  perform test_helpers.assert_true(
    (v_res_notee ->> 'statut') = 'corrigee'
    and (v_res_notee ->> 'score_qcm')::numeric = 4
    and (v_res_notee ->> 'score_ouvert')::numeric = 15.5
    and (v_res_notee ->> 'note_finale')::numeric = 19.5,
    '#197 : noter_copie_examen_ecrit doit cumuler le score QCM serveur (4) et les points ouverts enseignant (15.5) -> 19.5/20'
  );

  reset role;
  raise notice 'SUCCÈS : Tests SQL de remise et notation serveur des épreuves écrites (#197) validés !';
end;
$$;

rollback;
