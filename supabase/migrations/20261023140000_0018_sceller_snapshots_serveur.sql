-- ==============================================================================
-- Migration 0018 : Scellement des snapshots exclusivement par RPC serveur (SEC-03 / Issue #115)
-- Respecte PRD v3.1 (F-54, F-55, T-08a, T-08b, T-08c) :
--   1. Révoque INSERT direct sur public.snapshots pour anon et authenticated
--      et supprime la politique snapshots_insertion_propre (T-08a).
--   2. Ajoute un trigger de défense en profondeur interdisant toute insertion
--      directe dans public.snapshots hors RPC sceller_snapshot_examen (T-08a).
--   3. Remplace sceller_snapshot_examen par une RPC security definer qui :
--      - vérifie l'identité de l'élève (eleve_id = auth.uid()) et l'échéance
--        serveur (echeance_eleve / echeance_serveur) via clock_timestamp() (T-08b) ;
--      - lit les fichiers réels depuis public.projet_fichiers, construit le
--        manifeste canonique côté serveur et calcule le hash SHA-256 via
--        pgcrypto encode(digest(..., 'sha256'), 'hex') (T-08c) ;
--      - insère le snapshot scellé, met à jour passages_examen et retourne
--        l'enregistrement public.snapshots créé.
-- ==============================================================================

create extension if not exists pgcrypto;

-- 1. Révocation de l'insertion directe sur public.snapshots (T-08a)
revoke insert, update, delete on public.snapshots from anon, authenticated;
drop policy if exists "snapshots_insertion_propre" on public.snapshots;

-- 2. Trigger de défense en profondeur sur l'insertion dans public.snapshots (T-08a)
create or replace function public.verifier_insertion_snapshot_examen()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.snapshot_rpc', true), '') <> 'on' then
    raise exception 'Insertion directe dans snapshots interdite : utiliser exclusivement la RPC sceller_snapshot_examen (T-08a)';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_verifier_insertion_snapshot_examen on public.snapshots;
create trigger trg_verifier_insertion_snapshot_examen
before insert on public.snapshots
for each row
execute function public.verifier_insertion_snapshot_examen();

-- 3. Suppression de l'ancienne signature vulnérable où le client fournissait p_hash et p_manifeste
drop function if exists public.sceller_snapshot_examen(uuid, text, jsonb, text);
drop function if exists public.sceller_snapshot_examen(uuid, text);
drop function if exists public.sceller_snapshot_examen(uuid);

-- 4. RPC security definer sceller_snapshot_examen(_passage_id, _storage_path)
create or replace function public.sceller_snapshot_examen(
  _passage_id uuid,
  _storage_path text default ''
)
returns public.snapshots
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_passage record;
  v_now timestamptz := clock_timestamp();
  v_echeance timestamptz;
  v_fichiers jsonb;
  v_canonical_content text;
  v_hash text;
  v_manifeste jsonb;
  v_snapshot public.snapshots;
begin
  if v_uid is null then
    raise exception 'Authentification requise pour sceller un snapshot (T-08)';
  end if;

  select
    p.*,
    se.echeance_serveur,
    se.version_id as session_version_id,
    se.statut as session_statut,
    sv.sujet_id as sujet_id
  into v_passage
  from public.passages_examen p
  join public.sessions_examen se on p.session_id = se.id
  join public.sujet_versions sv on se.version_id = sv.id
  where p.id = _passage_id
  for update of p;

  if not found then
    raise exception 'Passage d''examen introuvable : %', _passage_id;
  end if;

  if v_passage.eleve_id <> v_uid then
    raise exception 'Accès refusé : un élève ne peut sceller que son propre passage d''examen (T-08a)';
  end if;

  if v_passage.statut = 'corrige' then
    raise exception 'Ce passage d''examen est déjà corrigé (T-08)';
  end if;

  -- Idempotence : si déjà scellé, retourner le snapshot existant uniquement si dans les délais
  v_echeance := coalesce(v_passage.echeance_eleve, v_passage.echeance_serveur);
  if v_echeance is not null and v_now > v_echeance then
    raise exception 'Échéance d''examen dépassée : scellement hors délai refusé par le serveur (T-08b)';
  end if;

  if v_passage.statut = 'verrouille' or v_passage.session_statut = 'termine' then
    raise exception 'Session ou passage verrouillé : scellement hors délai refusé par le serveur (T-08b)';
  end if;

  if v_passage.statut = 'rendu' and v_passage.snapshot_final_id is not null then
    select * into v_snapshot
    from public.snapshots
    where id = v_passage.snapshot_final_id;
    return v_snapshot;
  end if;

  if v_passage.projet_id is null then
    raise exception 'Aucun projet élève associé au passage % (T-08)', _passage_id;
  end if;

  -- Lecture déterministe des fichiers depuis public.projet_fichiers et calcul SHA-256 par fichier
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'chemin', f.chemin_norm,
          'taille', f.taille,
          'sha256', f.sha256
        )
        order by f.chemin_norm asc
      ),
      '[]'::jsonb
    ),
    coalesce(
      string_agg(
        f.chemin_norm || ':' || f.taille::text || ':' || f.sha256,
        '|' order by f.chemin_norm asc
      ),
      ''
    )
  into v_fichiers, v_canonical_content
  from (
    select
      regexp_replace(regexp_replace(trim(replace(pf.chemin, '\', '/')), '^\./', ''), '^/+', '') as chemin_norm,
      octet_length(pf.contenu) as taille,
      encode(digest(convert_to(pf.contenu, 'UTF8'), 'sha256'), 'hex') as sha256
    from public.projet_fichiers pf
    where pf.projet_id = v_passage.projet_id
      and pf.supprime = false
  ) f;

  -- Calcul du hash SHA-256 canonique côté serveur (T-08c : déterministe sur le contenu)
  v_hash := encode(digest(convert_to('v1.0|' || v_canonical_content, 'UTF8'), 'sha256'), 'hex');

  v_manifeste := jsonb_build_object(
    'versionSpec', '1.0',
    'sujetId', v_passage.sujet_id::text,
    'versionId', v_passage.session_version_id::text,
    'eleveId', v_passage.eleve_id::text,
    'projetId', v_passage.projet_id::text,
    'passageId', _passage_id::text,
    'horodatageServeur', to_jsonb(v_now)#>>'{}',
    'fichiers', v_fichiers,
    'baseDonnees', null,
    'rootHash', v_hash
  );

  perform set_config('app.snapshot_rpc', 'on', true);
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
  values (
    v_passage.projet_id,
    _passage_id,
    v_passage.eleve_id,
    v_passage.session_version_id,
    v_now,
    v_hash,
    v_manifeste,
    coalesce(_storage_path, '')
  )
  returning * into v_snapshot;

  update public.passages_examen
  set
    statut = 'rendu',
    snapshot_final_id = v_snapshot.id,
    evenements = evenements || jsonb_build_array(
      jsonb_build_object(
        'type', 'snapshot_scelle',
        'timestamp', v_now,
        'snapshot_id', v_snapshot.id,
        'hash', v_hash
      )
    )
  where id = _passage_id;

  return v_snapshot;
end;
$$;

revoke execute on function public.sceller_snapshot_examen(uuid, text) from public, anon;
grant execute on function public.sceller_snapshot_examen(uuid, text) to authenticated;
