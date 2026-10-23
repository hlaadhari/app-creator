-- =============================================================================
-- Migration 0017 : Verrouillage strict de passages_examen contre le contournement
--                  de l'échéance d'examen (SEC-01 / Issue #114 / T-06, T-07)
-- =============================================================================
-- Constat d'audit SEC-01 :
--   - La politique `passages_examen_ecriture_propre` autorisait l'élève à faire un UPDATE
--     direct sur `passages_examen` sans WITH CHECK (modification de `echeance_eleve`,
--     `statut`, `projet_id`, `temps_supp_min`).
--Correctifs appliqués :
--   1. Suppression de `passages_examen_ecriture_propre` et remplacement par
--      `passages_examen_maj_enseignant` réservée à l'enseignant de la classe / admin.
--   2. Durcissement de `passages_examen_inscription_eleve` (INSERT limité à `statut = 'en_attente'`,
--      `temps_supp_min = 0`, `echeance_eleve is null`, `debut_reel is null`, `snapshot_final_id is null`).
--   3. Durcissement du trigger `verifier_transition_passage_examen` :
--      - Toute écriture directe par l'élève (hors RPC security definer) est refusée.
--      - `eleve_id` et `session_id` sont immuables.
--      - Aucune transition vers `en_cours` après `coalesce(echeance_eleve, echeance_serveur)`.
--      - Les états finaux `rendu` et `corrige` ne peuvent plus jamais revenir à `en_cours` ni `en_attente`.
--      - L'état `corrige` ne peut être positionné que par l'enseignant de la classe ou un admin.
--   4. Création des RPC `security definer` :
--      - `demarrer_passage(_session_id uuid, _projet_id uuid default null)`
--      - `rendre_passage(_passage_id uuid)`
--      - `accorder_temps_supp_passage(_passage_id uuid, _temps_supp_min int)`
-- =============================================================================

-- 1. Remplacement des politiques d'écriture sur passages_examen
drop policy if exists "passages_examen_ecriture_propre" on public.passages_examen;
drop policy if exists "passages_examen_maj_enseignant" on public.passages_examen;

create policy "passages_examen_maj_enseignant"
on public.passages_examen for update
to authenticated
using (
  exists (
    select 1 from public.sessions_examen se
    join public.classes c on c.id = se.class_id
    where se.id = passages_examen.session_id
      and (c.enseignant_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  )
)
with check (
  exists (
    select 1 from public.sessions_examen se
    join public.classes c on c.id = se.class_id
    where se.id = passages_examen.session_id
      and (c.enseignant_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  )
);

drop policy if exists "passages_examen_inscription_eleve" on public.passages_examen;

create policy "passages_examen_inscription_eleve"
on public.passages_examen for insert
to authenticated
with check (
  eleve_id = auth.uid()
  and statut = 'en_attente'
  and temps_supp_min = 0
  and debut_reel is null
  and echeance_eleve is null
  and snapshot_final_id is null
  and (
    projet_id is null
    or exists (
      select 1 from public.projets pr
      where pr.id = passages_examen.projet_id
        and pr.eleve_id = auth.uid()
    )
  )
  and exists (
    select 1 from public.sessions_examen se
    where se.id = passages_examen.session_id
      and public.est_membre_classe(se.class_id)
  )
);

-- 2. Trigger durci verifier_transition_passage_examen (T-06a/b/c, T-07a)
create or replace function public.verifier_transition_passage_examen()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  _session record;
  _now timestamptz := clock_timestamp();
  _is_rpc boolean := coalesce(current_setting('app.passage_rpc', true), '') = 'on';
  _is_teacher_or_admin boolean := false;
begin
  -- Colonnes d'identité strictement immuables
  if new.eleve_id is distinct from old.eleve_id or new.session_id is distinct from old.session_id then
    raise exception 'Modification de eleve_id ou session_id interdite sur passages_examen (T-06)';
  end if;

  select * into _session from public.sessions_examen where id = old.session_id;

  if auth.uid() is not null then
    _is_teacher_or_admin := public.est_enseignant_classe(_session.class_id)
      or public.has_role(auth.uid(), 'admin');
  end if;

  -- Défense en profondeur : un élève ne peut jamais muter directement son passage hors RPC
  if not _is_rpc and auth.uid() is not null and not _is_teacher_or_admin then
    raise exception 'Modification directe de passages_examen interdite pour l''élève : utiliser les RPC dédiées (T-06)';
  end if;

  -- Même via RPC élève, l'élève ne peut jamais modifier temps_supp_min, echeance_eleve manuellement,
  -- ni réassigner projet_id une fois défini, ni passer à 'corrige'.
  if auth.uid() = old.eleve_id and not _is_teacher_or_admin then
    if new.temps_supp_min is distinct from old.temps_supp_min then
      raise exception 'Modification de temps_supp_min interdite pour l''élève (T-06a)';
    end if;
    if old.projet_id is not null and new.projet_id is distinct from old.projet_id then
      raise exception 'Modification de projet_id interdite après liaison du projet d''examen (T-06c)';
    end if;
    if new.statut = 'corrige' then
      raise exception 'Transition vers corrige réservée à l''enseignant (T-07a)';
    end if;
  end if;

  -- Machine à états T-07 : un examen rendu ou corrigé ne peut jamais revenir en arrière
  if old.statut in ('rendu', 'corrige') and new.statut in ('en_attente', 'en_cours', 'verrouille') then
    raise exception 'Transition strictement interdite : un examen rendu ou corrigé ne peut pas être rouvert (T-07)';
  end if;

  -- Interdiction de passer ou rester en 'en_cours' après l'échéance (T-06b)
  if new.statut = 'en_cours' then
    if _now > coalesce(new.echeance_eleve, old.echeance_eleve, _session.echeance_serveur, _now) then
      raise exception 'Transition interdite : échéance d''examen dépassée (T-06b / T-07)';
    end if;
  end if;

  if old.statut = 'verrouille' and new.statut = 'en_cours' then
    raise exception 'Transition interdite : un passage verrouillé ne peut pas repasser en_cours (T-06b / T-07)';
  end if;

  return new;
end;
$$;

-- 3. Mise à jour de lancer_coup_denvoi_examen pour poser le drapeau RPC interne
create or replace function public.lancer_coup_denvoi_examen(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _session record;
  _now timestamptz := clock_timestamp();
  _echeance timestamptz;
  _count int;
begin
  select * into _session from public.sessions_examen where id = p_session_id;
  if not found then
    raise exception 'Session d''examen introuvable';
  end if;
  if not (public.est_enseignant_classe(_session.class_id) or public.has_role(auth.uid(), 'admin')) then
    raise exception 'Accès refusé';
  end if;

  perform set_config('app.passage_rpc', 'on', true);

  _echeance := _now + (_session.duree_min || ' minutes')::interval;

  update public.sessions_examen
  set
    statut = 'en_cours',
    debut_serveur = _now,
    echeance_serveur = _echeance
  where id = p_session_id;

  update public.passages_examen
  set
    statut = 'en_cours',
    debut_reel = _now,
    echeance_eleve = _now + ((_session.duree_min + temps_supp_min) || ' minutes')::interval
  where session_id = p_session_id and statut in ('en_attente', 'planifie');

  get diagnostics _count = row_count;

  return jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'debut_serveur', _now,
    'echeance_serveur', _echeance,
    'eleves_demarres', _count
  );
end;
$$;

-- 4. RPC demarrer_passage : démarre ou rejoint un passage d'examen avec échéance calculée par le serveur
create or replace function public.demarrer_passage(
  _session_id uuid,
  _projet_id uuid default null
)
returns public.passages_examen
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _session record;
  _passage public.passages_examen;
  _now timestamptz := clock_timestamp();
  _echeance_eleve timestamptz;
  _statut_initial text;
begin
  if _uid is null then
    raise exception 'Authentification requise';
  end if;

  select * into _session from public.sessions_examen where id = _session_id;
  if not found then
    raise exception 'Session d''examen introuvable';
  end if;

  if not public.est_membre_classe(_session.class_id) then
    raise exception 'Accès refusé : vous n''êtes pas membre de cette classe';
  end if;

  if _session.statut = 'termine' then
    raise exception 'La session d''examen est terminée (T-06)';
  end if;

  if _projet_id is not null then
    if not exists (
      select 1 from public.projets p
      where p.id = _projet_id and p.eleve_id = _uid
    ) then
      raise exception 'Projet invalide ou n''appartenant pas à l''élève (T-06c)';
    end if;
  end if;

  perform set_config('app.passage_rpc', 'on', true);

  select * into _passage
  from public.passages_examen
  where session_id = _session_id and eleve_id = _uid
  for update;

  if not found then
    if _session.statut = 'en_cours' then
      _echeance_eleve := coalesce(
        _session.echeance_serveur,
        _now + (_session.duree_min || ' minutes')::interval
      );
      if _now > _echeance_eleve then
        raise exception 'Échéance d''examen dépassée : impossible de démarrer le passage (T-06)';
      end if;
      _statut_initial := 'en_cours';
    else
      _echeance_eleve := null;
      _statut_initial := 'en_attente';
    end if;

    insert into public.passages_examen (
      session_id,
      eleve_id,
      projet_id,
      statut,
      debut_reel,
      echeance_eleve,
      temps_supp_min,
      evenements
    )
    values (
      _session_id,
      _uid,
      _projet_id,
      _statut_initial,
      case when _statut_initial = 'en_cours' then _now else null end,
      _echeance_eleve,
      0,
      jsonb_build_array(
        jsonb_build_object('type', 'passage_initialise', 'timestamp', _now, 'statut', _statut_initial)
      )
    )
    returning * into _passage;

    return _passage;
  end if;

  -- Passage existant : vérifier qu'il n'est ni rendu, ni corrigé, ni verrouillé
  if _passage.statut in ('rendu', 'corrige', 'verrouille') then
    raise exception 'Ce passage d''examen ne peut plus être démarré (statut actuel : %) (T-07)', _passage.statut;
  end if;

  if _session.statut = 'en_cours' then
    _echeance_eleve := coalesce(
      _passage.echeance_eleve,
      _session.echeance_serveur + (_passage.temps_supp_min || ' minutes')::interval,
      _now + ((_session.duree_min + _passage.temps_supp_min) || ' minutes')::interval
    );
    if _now > _echeance_eleve then
      raise exception 'Échéance d''examen dépassée : passage verrouillé par le serveur (T-06)';
    end if;

    update public.passages_examen
    set
      statut = 'en_cours',
      projet_id = coalesce(_passage.projet_id, _projet_id),
      debut_reel = coalesce(_passage.debut_reel, _now),
      echeance_eleve = _echeance_eleve,
      evenements = _passage.evenements || jsonb_build_object(
        'type', 'passage_demarre',
        'timestamp', _now,
        'echeance_eleve', _echeance_eleve
      )
    where id = _passage.id
    returning * into _passage;
  elsif _projet_id is not null and _passage.projet_id is null then
    update public.passages_examen
    set projet_id = _projet_id
    where id = _passage.id
    returning * into _passage;
  end if;

  return _passage;
end;
$$;

-- 5. RPC rendre_passage : remise définitive par l'élève avant l'échéance serveur
create or replace function public.rendre_passage(_passage_id uuid)
returns public.passages_examen
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _passage public.passages_examen;
  _session record;
  _now timestamptz := clock_timestamp();
  _echeance timestamptz;
begin
  if _uid is null then
    raise exception 'Authentification requise';
  end if;

  select * into _passage
  from public.passages_examen
  where id = _passage_id
  for update;

  if not found then
    raise exception 'Passage d''examen introuvable';
  end if;

  if _passage.eleve_id <> _uid then
    raise exception 'Accès refusé';
  end if;

  if _passage.statut in ('rendu', 'corrige') then
    return _passage;
  end if;

  if _passage.statut <> 'en_cours' then
    raise exception 'Seul un passage en_cours peut être rendu (statut actuel : %) (T-07)', _passage.statut;
  end if;

  select * into _session from public.sessions_examen where id = _passage.session_id;
  _echeance := coalesce(_passage.echeance_eleve, _session.echeance_serveur);

  if _echeance is not null and _now > _echeance then
    raise exception 'Échéance d''examen dépassée : remise hors délai refusée par le serveur (T-06)';
  end if;

  perform set_config('app.passage_rpc', 'on', true);

  update public.passages_examen
  set
    statut = 'rendu',
    evenements = _passage.evenements || jsonb_build_object(
      'type', 'passage_rendu',
      'timestamp', _now
    )
  where id = _passage_id
  returning * into _passage;

  return _passage;
end;
$$;

-- 6. RPC accorder_temps_supp_passage : aménagement tiers-temps par l'enseignant de la classe
create or replace function public.accorder_temps_supp_passage(
  _passage_id uuid,
  _temps_supp_min int
)
returns public.passages_examen
language plpgsql
security definer
set search_path = public
as $$
declare
  _passage public.passages_examen;
  _session record;
  _now timestamptz := clock_timestamp();
  _nouvelle_echeance timestamptz;
begin
  if _temps_supp_min < 0 or _temps_supp_min > 120 then
    raise exception 'Temps supplémentaire invalide (doit être compris entre 0 et 120 minutes)';
  end if;

  select * into _passage from public.passages_examen where id = _passage_id for update;
  if not found then
    raise exception 'Passage d''examen introuvable';
  end if;

  select * into _session from public.sessions_examen where id = _passage.session_id;
  if not (public.est_enseignant_classe(_session.class_id) or public.has_role(auth.uid(), 'admin')) then
    raise exception 'Accès refusé : réservé à l''enseignant de la classe ou à un administrateur';
  end if;

  if _passage.statut in ('rendu', 'corrige') then
    raise exception 'Impossible de modifier le temps supplémentaire d''une copie déjà rendue ou corrigée (T-07)';
  end if;

  perform set_config('app.passage_rpc', 'on', true);

  if _session.debut_serveur is not null then
    _nouvelle_echeance := _session.debut_serveur + ((_session.duree_min + _temps_supp_min) || ' minutes')::interval;
  elsif _passage.debut_reel is not null then
    _nouvelle_echeance := _passage.debut_reel + ((_session.duree_min + _temps_supp_min) || ' minutes')::interval;
  else
    _nouvelle_echeance := _passage.echeance_eleve;
  end if;

  update public.passages_examen
  set
    temps_supp_min = _temps_supp_min,
    echeance_eleve = _nouvelle_echeance,
    evenements = _passage.evenements || jsonb_build_object(
      'type', 'temps_supp_accorde',
      'timestamp', _now,
      'temps_supp_min', _temps_supp_min,
      'accorde_par', auth.uid()
    )
  where id = _passage_id
  returning * into _passage;

  return _passage;
end;
$$;

-- 7. Mise à jour de sceller_snapshot_examen pour activer app.passage_rpc
create or replace function public.sceller_snapshot_examen(
  p_passage_id uuid,
  p_hash text,
  p_manifeste jsonb,
  p_storage_path text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_passage record;
  v_snapshot_id uuid;
  v_now timestamptz := clock_timestamp();
  v_echeance timestamptz;
begin
  select p.*, se.echeance_serveur into v_passage
  from public.passages_examen p
  join public.sessions_examen se on p.session_id = se.id
  where p.id = p_passage_id;

  if not found then
    raise exception 'Passage d examen introuvable : %', p_passage_id;
  end if;
  if v_passage.eleve_id <> auth.uid() then
    raise exception 'Accès refusé';
  end if;

  if v_passage.statut = 'rendu' and v_passage.snapshot_final_id is not null then
    return v_passage.snapshot_final_id;
  end if;

  v_echeance := coalesce(v_passage.echeance_eleve, v_passage.echeance_serveur);
  if v_echeance is not null and v_now > v_echeance then
    raise exception 'Échéance d''examen dépassée : scellement hors délai refusé par le serveur (T-06 / T-08)';
  end if;

  perform set_config('app.passage_rpc', 'on', true);

  insert into public.snapshots (
    projet_id,
    passage_id,
    eleve_id,
    version_id,
    date,
    hash,
    manifeste,
    storage_archive_path
  )
  select
    v_passage.projet_id,
    p_passage_id,
    v_passage.eleve_id,
    se.version_id,
    v_now,
    p_hash,
    p_manifeste,
    p_storage_path
  from public.sessions_examen se
  where se.id = v_passage.session_id
  returning id into v_snapshot_id;

  update public.passages_examen
  set
    statut = 'rendu',
    snapshot_final_id = v_snapshot_id,
    evenements = evenements || jsonb_build_object(
      'type', 'snapshot_scelle',
      'timestamp', v_now,
      'snapshot_id', v_snapshot_id,
      'hash', p_hash
    )
  where id = p_passage_id;

  return v_snapshot_id;
end;
$$;

revoke execute on function public.demarrer_passage(uuid, uuid) from public, anon;
grant execute on function public.demarrer_passage(uuid, uuid) to authenticated;

revoke execute on function public.rendre_passage(uuid) from public, anon;
grant execute on function public.rendre_passage(uuid) to authenticated;

revoke execute on function public.accorder_temps_supp_passage(uuid, int) from public, anon;
grant execute on function public.accorder_temps_supp_passage(uuid, int) to authenticated;
