-- =============================================================================
-- Migration 0039 : index de clés étrangères et politiques RLS sans réévaluation par ligne (Issue #259)
-- =============================================================================
-- Audit de capacité (phase B), avis « performance » de Supabase :
--   1. 22 clés étrangères sans index couvrant : les jointures et les suppressions en cascade
--      (ex. suppression d'un projet -> tentatives) feraient un parcours complet de la table fille.
--   2. 52 politiques RLS appellent auth.uid() directement : PostgreSQL réévalue la fonction pour
--      chaque ligne. Enveloppée dans (select auth.uid()), elle n'est évaluée qu'une fois par requête.
--      La réécriture est mécanique et ne change pas la sémantique des politiques.
-- Idempotente : create index if not exists ; la réécriture ignore les politiques déjà corrigées.
-- =============================================================================

-- 1. Index couvrant les clés étrangères ---------------------------------------
create index if not exists idx_class_invitations_class_id        on public.class_invitations (class_id);
create index if not exists idx_class_members_eleve_id            on public.class_members (eleve_id);
create index if not exists idx_class_sujets_version_id           on public.class_sujets (version_id);
create index if not exists idx_classes_enseignant_id             on public.classes (enseignant_id);
create index if not exists idx_contestations_projet_id           on public.contestations (projet_id);
create index if not exists idx_contestations_sujet_version_id    on public.contestations (sujet_version_id);
create index if not exists idx_contestations_traitee_par         on public.contestations (traitee_par);
create index if not exists idx_copies_examen_ecrit_corrige_par   on public.copies_examen_ecrit (corrige_par);
create index if not exists idx_demandes_enseignant_traitee_par   on public.demandes_enseignant (traitee_par);
create index if not exists idx_indices_debloques_indice_id       on public.indices_debloques (indice_id);
create index if not exists idx_journal_acces_solutions_user_id   on public.journal_acces_solutions (user_id);
create index if not exists idx_journal_acces_solutions_version_id on public.journal_acces_solutions (version_id);
create index if not exists idx_journal_securite_acteur_id        on public.journal_securite (acteur_id);
create index if not exists idx_passages_examen_snapshot_final_id on public.passages_examen (snapshot_final_id);
create index if not exists idx_profiles_valide_par               on public.profiles (valide_par);
create index if not exists idx_projets_version_id                on public.projets (version_id);
create index if not exists idx_sessions_examen_created_by        on public.sessions_examen (created_by);
create index if not exists idx_sessions_examen_version_id        on public.sessions_examen (version_id);
create index if not exists idx_sujet_versions_auteur_id          on public.sujet_versions (auteur_id);
create index if not exists idx_sujets_auteur_id                  on public.sujets (auteur_id);
create index if not exists idx_tentatives_projet_id              on public.tentatives (projet_id);
create index if not exists idx_tp_sessions_created_by            on public.tp_sessions (created_by);

-- 2. Politiques RLS : (select auth.uid()) au lieu de auth.uid() ----------------
-- pg_policies expose les expressions déjà déparsées ; une expression déjà enveloppée s'écrit
-- « ( SELECT auth.uid() AS uid) » et n'est donc pas modifiée (lookbehind sur « SELECT »).
do $$
declare
  _p record;
  _qual text;
  _check text;
  _clauses text;
  _nb int := 0;
begin
  for _p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  loop
    _qual := case when _p.qual is null then null
      else regexp_replace(_p.qual, '(?<!SELECT )auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g') end;
    _check := case when _p.with_check is null then null
      else regexp_replace(_p.with_check, '(?<!SELECT )auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g') end;

    if _qual is not distinct from _p.qual and _check is not distinct from _p.with_check then
      continue;
    end if;

    _clauses := '';
    if _qual is not null then
      _clauses := _clauses || ' using (' || _qual || ')';
    end if;
    if _check is not null then
      _clauses := _clauses || ' with check (' || _check || ')';
    end if;

    execute format('alter policy %I on %I.%I%s', _p.policyname, _p.schemaname, _p.tablename, _clauses);
    _nb := _nb + 1;
  end loop;

  raise notice '0039 : % politiques RLS réécrites', _nb;
end;
$$;
