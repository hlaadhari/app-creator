-- =============================================================================
-- Migration 0032 : Distinction entraînement (relançable) vs examen officiel (scellé)
--                  et accès au corrigé après clôture (Issue #188 / T-04 / T-06)
-- =============================================================================
-- Constat d'audit (#188) :
--   - Sur les sujets d'annales en mode examen (`exam-bac2023-location-habits`, etc.),
--     une fois l'échéance écoulée, l'édition restait verrouillée définitivement sans
--     aucun moyen de relancer une tentative d'entraînement.
--   - En examen officiel, après clôture (`echeance_serveur` dépassée ou session terminée),
--     `debloquer_solution` refusait encore l'accès au corrigé si le statut était `verrouille`
--     ou si `sessions_examen.statut` n'avait pas encore été basculé manuellement.
--
-- Correctifs appliqués :
--   1. `public.demarrer_examen_pratique` distingue désormais :
--        - `cadre = 'officiel'` si un passage dans `public.passages_examen` gouverne le sujet ;
--        - `cadre = 'entrainement'` s'il s'agit d'une annale travaillée en autonomie.
--   2. Nouvelle RPC `public.relancer_entrainement_examen(_sujet_id, _duree_min, _reinitialiser_fichiers)` :
--        - Autorise la relance d'un nouveau chronomètre serveur uniquement en mode `'entrainement'` ;
--        - Refuse strictement toute relance si un passage d'examen officiel existe (`T-06`).
--   3. Mise à jour de `public.debloquer_solution(p_version_id, p_motif)` :
--        - Bloque l'accès tant que l'examen (officiel ou entraînement) est en cours d'exécution ;
--        - Autorise l'accès au corrigé de référence dès que l'échéance serveur est échue ou que
--          la session officielle est clôturée.
-- =============================================================================

-- 1. Mise à jour de demarrer_examen_pratique pour exposer cadre / relancable / corrige_disponible
create or replace function public.demarrer_examen_pratique(
  _sujet_id text,
  _duree_min int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _now timestamptz := clock_timestamp();
  _version_id uuid;
  _sujet_duree_min int;
  _duree_effective int;
  _projet_id uuid;
  _projet public.projets;
  _passage record;
  _is_officiel boolean := false;
  _debut timestamptz;
  _echeance timestamptz;
  _est_expire boolean;
begin
  if _uid is null then
    raise exception 'Authentification requise pour démarrer un examen (T-06)';
  end if;

  select v.id, s.duree_min
  into _version_id, _sujet_duree_min
  from public.sujet_versions v
  join public.sujets s on s.id = v.sujet_id
  where (v.sujet_id = trim(_sujet_id) or v.id::text = trim(_sujet_id))
    and v.publiee = true
  order by v.numero desc
  limit 1;

  if _version_id is null then
    raise exception 'Sujet d''examen introuvable ou non publié';
  end if;

  _duree_effective := greatest(least(coalesce(_sujet_duree_min, _duree_min, 90), 600), 5);

  perform set_config('app.examen_projet_rpc', 'on', true);

  _projet_id := public.initialiser_projet(_version_id);

  select * into _projet
  from public.projets
  where id = _projet_id
  for update;

  -- Vérifier si un passage de session d'examen officielle de classe gouverne ce sujet
  select
    pe.id as passage_id,
    pe.debut_reel,
    pe.echeance_eleve,
    pe.statut as passage_statut,
    se.id as session_id,
    se.debut_serveur,
    se.echeance_serveur,
    se.statut as session_statut
  into _passage
  from public.passages_examen pe
  join public.sessions_examen se on se.id = pe.session_id
  where pe.eleve_id = _uid
    and (pe.projet_id = _projet.id or se.version_id = _version_id)
  order by pe.created_at desc
  limit 1;

  if found then
    _is_officiel := true;
  end if;

  if _is_officiel and coalesce(_passage.echeance_eleve, _passage.echeance_serveur) is not null then
    _debut := coalesce(_passage.debut_reel, _passage.debut_serveur, _projet.debut_examen_serveur, _now);
    _echeance := coalesce(_passage.echeance_eleve, _passage.echeance_serveur);

    if _projet.echeance_serveur is distinct from _echeance
       or _projet.debut_examen_serveur is distinct from _debut then
      update public.projets
      set
        debut_examen_serveur = _debut,
        echeance_serveur = _echeance,
        updated_at = _now
      where id = _projet.id
      returning * into _projet;
    end if;
  elsif _projet.echeance_serveur is null then
    _debut := _now;
    _echeance := _now + (_duree_effective || ' minutes')::interval;

    update public.projets
    set
      debut_examen_serveur = _debut,
      echeance_serveur = _echeance,
      updated_at = _now
    where id = _projet.id
    returning * into _projet;
  else
    _debut := coalesce(_projet.debut_examen_serveur, _projet.created_at);
    _echeance := _projet.echeance_serveur;
  end if;

  perform set_config('app.examen_projet_rpc', '', true);

  _est_expire := (_now > _echeance)
    or _projet.statut = 'rendu'
    or (_is_officiel and (
      _passage.passage_statut in ('rendu', 'corrige', 'verrouille')
      or _passage.session_statut in ('termine', 'corrige')
    ));

  return jsonb_build_object(
    'projet_id', _projet.id,
    'version_id', _version_id,
    'debut_examen_serveur', _debut,
    'echeance_serveur', _echeance,
    'horloge_serveur', _now,
    'statut', _projet.statut,
    'est_expire', _est_expire,
    'cadre', case when _is_officiel then 'officiel' else 'entrainement' end,
    'relancable', (not _is_officiel),
    'corrige_disponible', _est_expire
  );
end;
$$;

revoke execute on function public.demarrer_examen_pratique(text, int) from public, anon;
grant execute on function public.demarrer_examen_pratique(text, int) to authenticated;

-- 2. RPC relancer_entrainement_examen : relance une nouvelle tentative d'entraînement sur une annale (#188)
create or replace function public.relancer_entrainement_examen(
  _sujet_id text,
  _duree_min int default null,
  _reinitialiser_fichiers boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _now timestamptz := clock_timestamp();
  _version_id uuid;
  _sujet_duree_min int;
  _duree_effective int;
  _projet_id uuid;
  _projet public.projets;
  _debut timestamptz;
  _echeance timestamptz;
begin
  if _uid is null then
    raise exception 'Authentification requise pour relancer un entraînement (T-06)';
  end if;

  select v.id, s.duree_min
  into _version_id, _sujet_duree_min
  from public.sujet_versions v
  join public.sujets s on s.id = v.sujet_id
  where (v.sujet_id = trim(_sujet_id) or v.id::text = trim(_sujet_id))
    and v.publiee = true
  order by v.numero desc
  limit 1;

  if _version_id is null then
    raise exception 'Sujet d''examen introuvable ou non publié';
  end if;

  -- Interdiction absolue de relancer si un passage d'examen officiel de classe gouverne ce sujet (T-06 / T-07)
  if exists (
    select 1
    from public.passages_examen pe
    join public.sessions_examen se on se.id = pe.session_id
    left join public.projets p on p.id = pe.projet_id
    where pe.eleve_id = _uid
      and (se.version_id = _version_id or p.version_id = _version_id)
  ) then
    raise exception 'Relance interdite : cet examen fait l''objet d''une session officielle scellée par le serveur (T-06)';
  end if;

  _duree_effective := greatest(least(coalesce(_sujet_duree_min, _duree_min, 90), 600), 5);
  _debut := _now;
  _echeance := _now + (_duree_effective || ' minutes')::interval;

  perform set_config('app.examen_projet_rpc', 'on', true);

  _projet_id := public.initialiser_projet(_version_id);

  update public.projets
  set
    statut = 'en_cours',
    debut_examen_serveur = _debut,
    echeance_serveur = _echeance,
    updated_at = _now
  where id = _projet_id
  returning * into _projet;

  if coalesce(_reinitialiser_fichiers, false) then
    -- Restaurer les fichiers de départ tout en incrémentant la révision
    update public.projet_fichiers pf
    set
      contenu = svf.contenu,
      rev = pf.rev + 1,
      supprime = false,
      updated_at = _now
    from public.sujet_version_fichiers svf
    where pf.projet_id = _projet.id
      and svf.version_id = _version_id
      and pf.chemin = svf.chemin;

    insert into public.projet_fichiers (projet_id, chemin, contenu, rev, supprime, updated_at)
    select _projet.id, svf.chemin, svf.contenu, 1, false, _now
    from public.sujet_version_fichiers svf
    where svf.version_id = _version_id
    on conflict (projet_id, chemin) do nothing;
  end if;

  perform set_config('app.examen_projet_rpc', '', true);

  insert into public.journal_securite (type, acteur_id, meta)
  values (
    'RELANCE_ENTRAINEMENT_EXAMEN',
    _uid,
    jsonb_build_object(
      'sujet_id', _sujet_id,
      'version_id', _version_id,
      'projet_id', _projet.id,
      'reinitialiser_fichiers', coalesce(_reinitialiser_fichiers, false),
      'nouvelle_echeance', _echeance
    )
  );

  return jsonb_build_object(
    'projet_id', _projet.id,
    'version_id', _version_id,
    'debut_examen_serveur', _debut,
    'echeance_serveur', _echeance,
    'horloge_serveur', _now,
    'statut', _projet.statut,
    'est_expire', false,
    'cadre', 'entrainement',
    'relancable', true,
    'corrige_disponible', false
  );
end;
$$;

revoke execute on function public.relancer_entrainement_examen(text, int, boolean) from public, anon;
grant execute on function public.relancer_entrainement_examen(text, int, boolean) to authenticated;

-- 3. Mise à jour de debloquer_solution : interdit pendant l'épreuve active, autorisé après clôture (#188 / T-04 / T-06)
create or replace function public.debloquer_solution(
  p_version_id uuid,
  p_motif text default 'consultation'
)
returns table (
  id uuid,
  chemin text,
  contenu text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_is_in_active_exam boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentification requise pour accéder aux corrigés (T-04)';
  end if;

  -- Si l'utilisateur est enseignant ou admin : accès libre tracé
  if public.has_role(v_user_id, 'enseignant') or public.has_role(v_user_id, 'admin') then
    insert into public.journal_acces_solutions (user_id, version_id, motif)
    values (v_user_id, p_version_id, 'consultation_enseignant');

    return query
    select s.id, s.chemin, s.contenu
    from public.solutions s
    where s.version_id = p_version_id;
    return;
  end if;

  -- A. Vérification d'une session d'examen officielle non encore clôturée
  -- Une session officielle bloque le corrigé tant qu'elle est en salle d'attente
  -- ou que son échéance n'est pas écoulée et que la session n'est pas terminée.
  select exists (
    select 1
    from public.passages_examen pe
    join public.sessions_examen se on se.id = pe.session_id
    where pe.eleve_id = v_user_id
      and se.version_id = p_version_id
      and se.statut not in ('termine', 'corrige')
      and (
        se.statut = 'salle_attente'
        or pe.statut = 'en_attente'
        or (
          pe.statut = 'en_cours'
          and (
            coalesce(pe.echeance_eleve, se.echeance_serveur) is null
            or v_now <= coalesce(pe.echeance_eleve, se.echeance_serveur)
          )
        )
      )
  ) into v_is_in_active_exam;

  -- B. Vérification d'un chronomètre d'examen pratique en cours sur public.projets
  if not v_is_in_active_exam then
    select exists (
      select 1
      from public.projets p
      where p.eleve_id = v_user_id
        and p.version_id = p_version_id
        and p.echeance_serveur is not null
        and p.statut <> 'rendu'
        and v_now <= p.echeance_serveur
    ) into v_is_in_active_exam;
  end if;

  if v_is_in_active_exam then
    insert into public.journal_securite (type, acteur_id, meta)
    values (
      'TENTATIVE_ACCES_CORRIGE_EN_EXAMEN',
      v_user_id,
      jsonb_build_object('version_id', p_version_id, 'motif', p_motif)
    );
    raise exception 'Accès au corrigé strictement interdit en session d examen active (T-04 / T-06)';
  end if;

  -- Après clôture (échéance serveur dépassée ou examen terminé), l'accès au corrigé est autorisé et journalisé
  insert into public.journal_acces_solutions (user_id, version_id, motif)
  values (v_user_id, p_version_id, coalesce(p_motif, 'consultation_eleve'));

  return query
  select s.id, s.chemin, s.contenu
  from public.solutions s
  where s.version_id = p_version_id;
end;
$$;

revoke execute on function public.debloquer_solution(uuid, text) from public, anon;
grant execute on function public.debloquer_solution(uuid, text) to authenticated;
