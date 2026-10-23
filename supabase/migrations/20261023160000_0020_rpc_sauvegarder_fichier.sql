-- ==============================================================================
-- Migration 0020 : RPC atomique sauvegarder_fichier avec détection de CONFLIT_REVISION
-- Respecte PRD v3.1 & Audit Technique/Sécurité (TEC-04, SEC-09, T-18, Issue #119) :
--   1. Définit la RPC atomique public.sauvegarder_fichier(_projet_id, _chemin, _contenu, _expected_rev)
--      vérifiant la propriété du projet (eleve_id = auth.uid()).
--   2. Si _expected_rev = 0 et que le fichier n'existe pas, insère avec rev = 1.
--   3. Sinon, exécute un UPDATE atomique WHERE rev = _expected_rev RETURNING rev.
--   4. Si aucune ligne n'est insérée ou mise à jour, lève RAISE EXCEPTION 'CONFLIT_REVISION' (T-18).
-- ==============================================================================

create or replace function public.sauvegarder_fichier(
  _projet_id uuid,
  _chemin text,
  _contenu text,
  _expected_rev int
)
returns int
language plpgsql
security definer
set search_path = public
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

  if _expected_rev is null or _expected_rev < 0 then
    raise exception 'CONFLIT_REVISION';
  end if;

  if _expected_rev = 0 then
    insert into public.projet_fichiers (
      projet_id,
      chemin,
      contenu,
      rev,
      supprime,
      updated_at
    )
    values (
      _projet_id,
      _chemin,
      coalesce(_contenu, ''),
      1,
      false,
      now()
    )
    on conflict (projet_id, chemin) do nothing
    returning rev into _new_rev;

    if _new_rev is null then
      raise exception 'CONFLIT_REVISION';
    end if;

    update public.projets
    set updated_at = now()
    where id = _projet_id;

    return _new_rev;
  end if;

  update public.projet_fichiers
  set
    contenu = coalesce(_contenu, ''),
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

  update public.projets
  set updated_at = now()
  where id = _projet_id;

  return _new_rev;
end;
$$;

revoke execute on function public.sauvegarder_fichier(uuid, text, text, int) from public, anon;
grant execute on function public.sauvegarder_fichier(uuid, text, text, int) to authenticated;
