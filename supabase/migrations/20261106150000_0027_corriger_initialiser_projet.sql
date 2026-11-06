-- Issue #186 : initialiser_projet lisait sujet_version_fichiers.storage_path et .role,
-- colonnes inexistantes (42703 -> HTTP 400). Les lignes de sujet_version_fichiers sont par
-- définition les fichiers de départ : on copie chemin et contenu uniquement.

create or replace function public.initialiser_projet(_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _pid uuid;
begin
  if _uid is null then
    raise exception 'Authentification requise';
  end if;

  -- Vérifier que la version est publiée
  if not exists (select 1 from public.sujet_versions where id = _version_id and publiee) then
    raise exception 'Sujet non disponible';
  end if;

  -- Créer ou récupérer le projet
  insert into public.projets (eleve_id, version_id, statut, updated_at)
  values (_uid, _version_id, 'en_cours', now())
  on conflict (eleve_id, version_id) do update set updated_at = now()
  returning id into _pid;

  -- Copier les fichiers de départ de la version si aucun fichier n'existe
  if not exists (select 1 from public.projet_fichiers where projet_id = _pid) then
    insert into public.projet_fichiers (projet_id, chemin, contenu, rev)
    select _pid, f.chemin, f.contenu, 1
    from public.sujet_version_fichiers f
    where f.version_id = _version_id;
  end if;

  return _pid;
end;
$$;

revoke execute on function public.initialiser_projet(uuid) from public, anon;
grant execute on function public.initialiser_projet(uuid) to authenticated;
