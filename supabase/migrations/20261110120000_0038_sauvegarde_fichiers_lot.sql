-- =============================================================================
-- Migration 0038 : sauvegarde des fichiers en lot, avec limites de taille (Issue #255)
-- =============================================================================
-- Audit de capacité : chaque sauvegarde déclenchait un appel RPC par fichier (tous les fichiers,
-- même non modifiés), chacun mettant aussi à jour projets.updated_at, et aucune limite de taille
-- n'était imposée côté serveur.
--
--   1. public.sauvegarder_fichiers(_projet_id, _fichiers jsonb) : un seul appel, atomique.
--      Tous les conflits de révision sont détectés AVANT toute écriture ; en cas de conflit,
--      rien n'est écrit et le premier fichier en conflit est renvoyé avec son contenu serveur.
--   2. Limites serveur : 256 Ko par fichier, 1 Mo par lot, 50 fichiers par lot.
--   3. public.sauvegarder_fichier (unitaire, conservée pour la résolution de conflit) reçoit la
--      même limite par fichier.
-- Idempotente (create or replace).
-- =============================================================================

create or replace function public.sauvegarder_fichiers(_projet_id uuid, _fichiers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _f jsonb;
  _chemin text;
  _contenu text;
  _exp int;
  _cur record;
  _total int := 0;
  _new int;
  _revs jsonb := '{}'::jsonb;
  _vus text[] := '{}';
begin
  if _uid is null then
    raise exception 'Authentification requise pour sauvegarder un fichier (T-18)';
  end if;

  if _fichiers is null or jsonb_typeof(_fichiers) <> 'array' then
    raise exception 'LOT_INVALIDE';
  end if;

  if jsonb_array_length(_fichiers) = 0 then
    return jsonb_build_object('ok', true, 'revs', '{}'::jsonb);
  end if;

  if jsonb_array_length(_fichiers) > 50 then
    raise exception 'LOT_TROP_GRAND';
  end if;

  -- Propriété du projet + verrou de la ligne : deux lots concurrents du même projet sont sérialisés.
  perform 1
  from public.projets p
  where p.id = _projet_id
    and p.eleve_id = _uid
  for update;

  if not found then
    raise exception 'Accès refusé : ce projet n''appartient pas à l''élève (T-01 / T-18)';
  end if;

  -- 1. Vérification de tous les fichiers avant la moindre écriture
  for _f in select * from jsonb_array_elements(_fichiers) loop
    _chemin := _f ->> 'chemin';
    _contenu := coalesce(_f ->> 'contenu', '');
    _exp := (_f ->> 'expected_rev')::int;

    if _chemin is null or length(_chemin) = 0 or length(_chemin) > 200 then
      raise exception 'CHEMIN_INVALIDE';
    end if;
    if _chemin = any(_vus) then
      raise exception 'CHEMIN_EN_DOUBLE';
    end if;
    _vus := _vus || _chemin;

    if octet_length(_contenu) > 262144 then
      raise exception 'FICHIER_TROP_VOLUMINEUX';
    end if;
    _total := _total + octet_length(_contenu);
    if _total > 1048576 then
      raise exception 'LOT_TROP_VOLUMINEUX';
    end if;

    if _exp is null or _exp < 0 then
      raise exception 'CONFLIT_REVISION';
    end if;

    select pf.rev, pf.contenu into _cur
    from public.projet_fichiers pf
    where pf.projet_id = _projet_id and pf.chemin = _chemin;

    if (_exp = 0 and found) or (_exp > 0 and (not found or _cur.rev <> _exp)) then
      return jsonb_build_object(
        'ok', false,
        'conflit', jsonb_build_object(
          'chemin', _chemin,
          'rev', _cur.rev,
          'contenu', _cur.contenu
        )
      );
    end if;
  end loop;

  -- 2. Écriture
  for _f in select * from jsonb_array_elements(_fichiers) loop
    _chemin := _f ->> 'chemin';
    _contenu := coalesce(_f ->> 'contenu', '');
    _exp := (_f ->> 'expected_rev')::int;

    if _exp = 0 then
      insert into public.projet_fichiers (projet_id, chemin, contenu, rev, supprime, updated_at)
      values (_projet_id, _chemin, _contenu, 1, false, now())
      returning rev into _new;
    else
      update public.projet_fichiers
      set contenu = _contenu,
          rev = rev + 1,
          supprime = false,
          updated_at = now()
      where projet_id = _projet_id
        and chemin = _chemin
        and rev = _exp
      returning rev into _new;
    end if;

    if _new is null then
      raise exception 'CONFLIT_REVISION';
    end if;
    _revs := _revs || jsonb_build_object(_chemin, _new);
  end loop;

  update public.projets set updated_at = now() where id = _projet_id;

  return jsonb_build_object('ok', true, 'revs', _revs);
end;
$$;

revoke execute on function public.sauvegarder_fichiers(uuid, jsonb) from public, anon;
grant execute on function public.sauvegarder_fichiers(uuid, jsonb) to authenticated;

-- Limite de taille par fichier sur la RPC unitaire (conservée pour la résolution de conflit)
create or replace function public.sauvegarder_fichier(
  _projet_id uuid,
  _chemin text,
  _contenu text,
  _expected_rev integer
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _uid uuid := auth.uid();
  _new_rev int;
begin
  if _uid is null then
    raise exception 'Authentification requise pour sauvegarder un fichier (T-18)';
  end if;

  if not exists (
    select 1 from public.projets p
    where p.id = _projet_id
      and p.eleve_id = _uid
  ) then
    raise exception 'Accès refusé : ce projet n''appartient pas à l''élève (T-01 / T-18)';
  end if;

  if octet_length(coalesce(_contenu, '')) > 262144 then
    raise exception 'FICHIER_TROP_VOLUMINEUX';
  end if;

  if _expected_rev is null or _expected_rev < 0 then
    raise exception 'CONFLIT_REVISION';
  end if;

  if _expected_rev = 0 then
    insert into public.projet_fichiers (projet_id, chemin, contenu, rev, supprime, updated_at)
    values (_projet_id, _chemin, coalesce(_contenu, ''), 1, false, now())
    on conflict (projet_id, chemin) do nothing
    returning rev into _new_rev;

    if _new_rev is null then
      raise exception 'CONFLIT_REVISION';
    end if;

    update public.projets set updated_at = now() where id = _projet_id;

    return _new_rev;
  end if;

  update public.projet_fichiers
  set contenu = coalesce(_contenu, ''),
      rev = rev + 1,
      supprime = false,
      updated_at = now()
  where projet_id = _projet_id
    and chemin = _chemin
    and rev = _expected_rev
  returning rev into _new_rev;

  if _new_rev is null then
    raise exception 'CONFLIT_REVISION';
  end if;

  update public.projets set updated_at = now() where id = _projet_id;

  return _new_rev;
end;
$$;

revoke execute on function public.sauvegarder_fichier(uuid, text, text, int) from public, anon;
grant execute on function public.sauvegarder_fichier(uuid, text, text, int) to authenticated;
