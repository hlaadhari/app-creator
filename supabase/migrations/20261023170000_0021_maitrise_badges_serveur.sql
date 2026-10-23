-- ==============================================================================
-- Migration 0021 : Calcul serveur de maitrise et badges et révocation d'écriture élève
-- Respecte PRD v3.1 & Audit Sécurité (SEC-06, T-16, Issue #117) :
--   1. Révoque INSERT, UPDATE, DELETE sur public.maitrise et public.badges pour
--      anon et authenticated et supprime les politiques d'écriture directe élève (T-16).
--   2. Ajoute un trigger de défense en profondeur interdisant toute écriture
--      directe dans public.maitrise et public.badges hors déclencheur serveur (T-16).
--   3. Recalcule automatiquement public.maitrise et attribue public.badges côté
--      serveur via triggers security definer lors de l'insertion d'une tentative
--      ou d'une note officielle d'examen.
-- ==============================================================================

-- 1. Révocation des privilèges d'écriture directe et suppression des politiques élève (T-16)
revoke insert, update, delete on public.maitrise from anon, authenticated;
revoke insert, update, delete on public.badges from anon, authenticated;

drop policy if exists "Eleve met a jour sa maitrise" on public.maitrise;
drop policy if exists "Eleve insere ses badges" on public.badges;

-- 2. Trigger de défense en profondeur T-16 sur public.maitrise et public.badges
create or replace function public.verifier_ecriture_maitrise_badges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.maitrise_rpc', true), '') <> 'on' then
    raise exception 'Écriture directe interdite sur % : le calcul de maîtrise et l''attribution des badges sont réservés au serveur (T-16)', tg_table_name;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_verifier_ecriture_maitrise on public.maitrise;
create trigger trg_verifier_ecriture_maitrise
before insert or update or delete on public.maitrise
for each row
execute function public.verifier_ecriture_maitrise_badges();

drop trigger if exists trg_verifier_ecriture_badges on public.badges;
create trigger trg_verifier_ecriture_badges
before insert or update or delete on public.badges
for each row
execute function public.verifier_ecriture_maitrise_badges();

-- 3. Trigger security definer recalculant la maîtrise et les badges après une tentative
create or replace function public.recalculer_maitrise_apres_tentative()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _eleve_id uuid := new.eleve_id;
  _succes boolean := coalesce(new.score, 0) > 0;
  _comp record;
begin
  if _eleve_id is null and new.projet_id is not null then
    select p.eleve_id into _eleve_id
    from public.projets p
    where p.id = new.projet_id;
  end if;

  if _eleve_id is null then
    return new;
  end if;

  perform set_config('app.maitrise_rpc', 'on', true);

  -- Mise à jour des compétences liées aux critères de la version du sujet si renseignée
  if new.sujet_version_id is not null then
    for _comp in
      select distinct cc.competence_id
      from public.criteres c
      join public.critere_competences cc on cc.critere_id = c.id
      where c.version_id = new.sujet_version_id
    loop
      insert into public.maitrise (
        eleve_id,
        competence_id,
        niveau,
        nb_tentatives,
        nb_succes,
        premier_coup_succes,
        dernier_succes,
        version_formule,
        updated_at
      )
      values (
        _eleve_id,
        _comp.competence_id,
        public.calculer_score_maitrise_v1(
          case when _succes then 1 else 0 end,
          1,
          _succes,
          case when _succes then now() else null end
        ),
        1,
        case when _succes then 1 else 0 end,
        _succes,
        case when _succes then now() else null end,
        'v1.0',
        now()
      )
      on conflict (eleve_id, competence_id) do update
      set
        nb_tentatives = public.maitrise.nb_tentatives + 1,
        nb_succes = public.maitrise.nb_succes + (case when _succes then 1 else 0 end),
        dernier_succes = case when _succes then now() else public.maitrise.dernier_succes end,
        niveau = public.calculer_score_maitrise_v1(
          public.maitrise.nb_succes + (case when _succes then 1 else 0 end),
          public.maitrise.nb_tentatives + 1,
          public.maitrise.premier_coup_succes,
          case when _succes then now() else public.maitrise.dernier_succes end
        ),
        updated_at = now();
    end loop;
  end if;

  -- Attribution serveur du badge PREMIERS_PAS dès le premier critère/score validé
  if _succes and exists (select 1 from public.badges_definition where id = 'PREMIERS_PAS') then
    insert into public.badges (eleve_id, badge_id, obtenu_le, meta)
    values (
      _eleve_id,
      'PREMIERS_PAS',
      now(),
      jsonb_build_object('tentative_id', new.id, 'source', new.source)
    )
    on conflict (eleve_id, badge_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_recalculer_maitrise_apres_tentative on public.tentatives;
create trigger trg_recalculer_maitrise_apres_tentative
after insert on public.tentatives
for each row
execute function public.recalculer_maitrise_apres_tentative();

-- 4. Trigger security definer attribuant MAJOR_BAC_BLANC uniquement sur note officielle >= 16/20
create or replace function public.attribuer_badges_apres_note_officielle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _eleve_id uuid;
begin
  if new.note_finale >= 16 then
    select s.eleve_id into _eleve_id
    from public.snapshots s
    where s.id = new.snapshot_id;

    if _eleve_id is not null and exists (select 1 from public.badges_definition where id = 'MAJOR_BAC_BLANC') then
      perform set_config('app.maitrise_rpc', 'on', true);

      insert into public.badges (eleve_id, badge_id, obtenu_le, meta)
      values (
        _eleve_id,
        'MAJOR_BAC_BLANC',
        now(),
        jsonb_build_object('note_id', new.id, 'note_finale', new.note_finale)
      )
      on conflict (eleve_id, badge_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_attribuer_badges_apres_note_officielle on public.notes;
create trigger trg_attribuer_badges_apres_note_officielle
after insert or update on public.notes
for each row
execute function public.attribuer_badges_apres_note_officielle();
