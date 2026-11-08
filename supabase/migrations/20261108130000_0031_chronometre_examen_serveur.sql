-- =============================================================================
-- Migration 0031 : Chronomètre d'examen pratique piloté par le serveur (Issue #198 / T-06)
-- =============================================================================
-- Constat d'audit (#198) :
--   - Le chronomètre des sujets en mode examen reposait sur `localStorage` (`bacsti_exam_start_*`).
--   - Un élève pouvait vider son stockage local pour réinitialiser son temps, ou rester bloqué
--     indéfiniment sur une ancienne valeur locale expirée.
--   - Les écritures dans `tentatives` n'étaient pas verrouillées côté serveur après l'échéance.
--
-- Correctifs appliqués :
--   1. Ajout de `debut_examen_serveur` et `echeance_serveur` sur `public.projets`.
--   2. Trigger `trg_proteger_echeance_projet` interdisant à l'élève toute modification directe
--      de `debut_examen_serveur` ou `echeance_serveur` hors RPC `security definer`.
--   3. RPC `public.demarrer_examen_pratique(_sujet_id text, _duree_min int default null)` :
--      initialise `echeance_serveur` une seule fois avec `clock_timestamp()` (ou restitue
--      l'échéance existante si déjà démarré, même après effacement du `localStorage`).
--   4. Renforcement de `public.verifier_echeance_ecriture()` sur `public.projet_fichiers`
--      et ajout de `trg_verifier_echeance_tentatives` sur `public.tentatives` pour bloquer
--      toute écriture de fichier ou de tentative après `echeance_serveur` (T-06).
-- =============================================================================

-- 1. Colonnes d'horodatage d'examen serveur sur public.projets
alter table public.projets
  add column if not exists debut_examen_serveur timestamptz,
  add column if not exists echeance_serveur timestamptz;

create index if not exists idx_projets_echeance_serveur
  on public.projets (eleve_id, version_id)
  where echeance_serveur is not null;

-- 2. Protection des colonnes d'échéance sur public.projets contre toute écriture directe élève
create or replace function public.proteger_echeance_projet()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _is_rpc boolean := coalesce(current_setting('app.examen_projet_rpc', true), '') = 'on'
                  or coalesce(current_setting('app.passage_rpc', true), '') = 'on';
  _is_privileged boolean := current_user in ('postgres', 'service_role');
begin
  if not _is_privileged and _uid is not null then
    _is_privileged := public.has_role(_uid, 'admin')
      or public.est_eleve_de_enseignant(coalesce(new.eleve_id, old.eleve_id));
  end if;

  if tg_op = 'INSERT' then
    if _uid is not null and not _is_rpc and not _is_privileged then
      if new.debut_examen_serveur is not null or new.echeance_serveur is not null then
        raise exception 'Définition directe de l''échéance serveur interdite pour l''élève : utiliser la RPC demarrer_examen_pratique (T-06)';
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if _uid is not null and not _is_rpc and not _is_privileged then
      if new.debut_examen_serveur is distinct from old.debut_examen_serveur
         or new.echeance_serveur is distinct from old.echeance_serveur then
        raise exception 'Modification directe de l''échéance serveur interdite pour l''élève (T-06)';
      end if;

      if old.statut = 'rendu' and new.statut <> 'rendu' then
        raise exception 'Réouverture d''un projet d''examen rendu interdite pour l''élève (T-07)';
      end if;
    end if;
    return new;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_proteger_echeance_projet on public.projets;
create trigger trg_proteger_echeance_projet
before insert or update on public.projets
for each row
execute function public.proteger_echeance_projet();

-- 3. Trigger T-06 renforcé sur public.projet_fichiers (vérifie passages_examen ET projets.echeance_serveur)
create or replace function public.verifier_echeance_ecriture()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  _projet_id uuid := case
    when tg_table_name = 'projets' then coalesce(new.id, old.id)
    else coalesce(new.projet_id, old.projet_id)
  end;
  _passage record;
  _projet record;
  _now timestamptz := clock_timestamp();
begin
  -- A. Vérification d'un passage de session d'examen de classe
  select p.id, p.statut, p.echeance_eleve, s.echeance_serveur
  into _passage
  from public.passages_examen p
  join public.sessions_examen s on s.id = p.session_id
  where p.projet_id = _projet_id
  order by p.created_at desc
  limit 1;

  if found then
    if _passage.statut in ('rendu', 'corrige', 'verrouille') then
      raise exception 'Dépôt verrouillé : examen déjà soumis ou terminé (T-06)';
    end if;

    if _now > coalesce(_passage.echeance_eleve, _passage.echeance_serveur) then
      raise exception 'Échéance d''examen dépassée : dépôt verrouillé par le serveur (T-06)';
    end if;
  end if;

  -- B. Vérification de l'échéance serveur propre au projet d'examen (#198)
  select p.id, p.statut, p.echeance_serveur
  into _projet
  from public.projets p
  where p.id = _projet_id;

  if found then
    if _projet.statut = 'rendu' then
      raise exception 'Dépôt verrouillé : examen déjà soumis ou terminé (T-06)';
    end if;

    if _projet.echeance_serveur is not null and _now > _projet.echeance_serveur then
      raise exception 'Échéance d''examen dépassée : dépôt verrouillé par le serveur (T-06)';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_verifier_echeance_projet_fichiers on public.projet_fichiers;
create trigger trg_verifier_echeance_projet_fichiers
before insert or update or delete on public.projet_fichiers
for each row
execute function public.verifier_echeance_ecriture();

-- 4. Trigger T-06 sur public.tentatives : refus d'insertion de tentative élève après échéance serveur (#198)
create or replace function public.verifier_echeance_tentative()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  _now timestamptz := clock_timestamp();
  _eleve_id uuid := coalesce(new.eleve_id, auth.uid());
  _projet record;
  _passage record;
begin
  -- Seules les tentatives soumises côté client élève sont soumises au verrou d'échéance ;
  -- une correction officielle serveur / enseignant reste autorisée après clôture.
  if coalesce(new.source, 'client') <> 'client' then
    return new;
  end if;

  -- A. Recherche du projet cible (par projet_id direct ou par couple eleve_id + sujet_version_id)
  if new.projet_id is not null then
    select p.id, p.version_id, p.statut, p.echeance_serveur
    into _projet
    from public.projets p
    where p.id = new.projet_id;
  elsif _eleve_id is not null and new.sujet_version_id is not null then
    select p.id, p.version_id, p.statut, p.echeance_serveur
    into _projet
    from public.projets p
    where p.eleve_id = _eleve_id
      and p.version_id = new.sujet_version_id;
  end if;

  if _projet.id is not null then
    if _projet.echeance_serveur is not null and _now > _projet.echeance_serveur then
      raise exception 'Échéance d''examen dépassée : enregistrement de tentative refusé par le serveur (T-06)';
    end if;
  end if;

  -- B. Recherche d'un passage d'examen lié au projet ou à la version du sujet
  select pe.id, pe.statut, pe.echeance_eleve, se.echeance_serveur
  into _passage
  from public.passages_examen pe
  join public.sessions_examen se on se.id = pe.session_id
  where (
    (_projet.id is not null and pe.projet_id = _projet.id)
    or (
      _eleve_id is not null
      and pe.eleve_id = _eleve_id
      and se.version_id = coalesce(new.sujet_version_id, _projet.version_id)
    )
  )
  order by pe.created_at desc
  limit 1;

  if found then
    if coalesce(_passage.echeance_eleve, _passage.echeance_serveur) is not null
       and _now > coalesce(_passage.echeance_eleve, _passage.echeance_serveur) then
      raise exception 'Échéance d''examen dépassée : enregistrement de tentative refusé par le serveur (T-06)';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_verifier_echeance_tentatives on public.tentatives;
create trigger trg_verifier_echeance_tentatives
before insert on public.tentatives
for each row
execute function public.verifier_echeance_tentative();

-- 5. RPC demarrer_examen_pratique : démarre ou récupère l'échéance serveur d'un examen pratique (#198)
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
  _debut timestamptz;
  _echeance timestamptz;
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

  -- La durée du sujet en base prime sur le paramètre client pour empêcher toute extension côté client
  _duree_effective := greatest(least(coalesce(_sujet_duree_min, _duree_min, 90), 600), 5);

  perform set_config('app.examen_projet_rpc', 'on', true);

  -- S'assurer que le projet existe (et possède ses fichiers de départ si disponibles)
  _projet_id := public.initialiser_projet(_version_id);

  select * into _projet
  from public.projets
  where id = _projet_id
  for update;

  -- Vérifier si un passage de session d'examen de classe gouverne déjà ce projet
  select pe.debut_reel, pe.echeance_eleve, se.debut_serveur, se.echeance_serveur, pe.statut
  into _passage
  from public.passages_examen pe
  join public.sessions_examen se on se.id = pe.session_id
  where pe.eleve_id = _uid
    and (pe.projet_id = _projet.id or se.version_id = _version_id)
  order by pe.created_at desc
  limit 1;

  if found and coalesce(_passage.echeance_eleve, _passage.echeance_serveur) is not null then
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
    -- Premier démarrage : l'échéance serveur est scellée à partir de clock_timestamp()
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
    -- Déjà démarré : on restitue l'échéance existante (effacer localStorage ne relance jamais le chrono)
    _debut := coalesce(_projet.debut_examen_serveur, _projet.created_at);
    _echeance := _projet.echeance_serveur;
  end if;

  perform set_config('app.examen_projet_rpc', '', true);

  return jsonb_build_object(
    'projet_id', _projet.id,
    'version_id', _version_id,
    'debut_examen_serveur', _debut,
    'echeance_serveur', _echeance,
    'horloge_serveur', _now,
    'statut', _projet.statut,
    'est_expire', (_now > _echeance)
  );
end;
$$;

revoke execute on function public.demarrer_examen_pratique(text, int) from public, anon;
grant execute on function public.demarrer_examen_pratique(text, int) to authenticated;

-- 6. Mise à jour de reparer_projets_vides pour exclure aussi les projets dont echeance_serveur est échue
create or replace function public.reparer_projets_vides()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  _nb_projets int := 0;
begin
  with projets_vides as (
    select p.id as projet_id, p.version_id
    from public.projets p
    where not exists (
      select 1 from public.projet_fichiers pf where pf.projet_id = p.id
    )
    and exists (
      select 1 from public.sujet_version_fichiers svf where svf.version_id = p.version_id
    )
    and p.statut <> 'rendu'
    and (p.echeance_serveur is null or clock_timestamp() <= p.echeance_serveur)
    and not exists (
      select 1
      from public.passages_examen pe
      join public.sessions_examen se on se.id = pe.session_id
      where pe.projet_id = p.id
        and (
          pe.statut in ('rendu', 'corrige', 'verrouille')
          or clock_timestamp() > coalesce(pe.echeance_eleve, se.echeance_serveur, clock_timestamp() + interval '1 second')
        )
    )
  ),
  insertions as (
    insert into public.projet_fichiers (projet_id, chemin, contenu, rev)
    select pv.projet_id, svf.chemin, svf.contenu, 1
    from projets_vides pv
    join public.sujet_version_fichiers svf on svf.version_id = pv.version_id
    on conflict (projet_id, chemin) do nothing
    returning projet_id
  )
  select count(distinct projet_id) into _nb_projets from insertions;

  return coalesce(_nb_projets, 0);
end;
$$;

revoke execute on function public.reparer_projets_vides() from public, anon, authenticated;
grant execute on function public.reparer_projets_vides() to service_role;
