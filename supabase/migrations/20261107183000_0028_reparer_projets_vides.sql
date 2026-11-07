-- Issue #212 (suite de #186) : réparer les projets créés vides par l'ancien repli client,
-- sans jamais toucher un projet qui possède déjà au moins un fichier.

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
    and not exists (
      select 1
      from public.passages_examen pe
      join public.sessions_examen se on se.id = pe.session_id
      where pe.projet_id = p.id
        and (
          pe.statut in ('rendu', 'corrige', 'verrouille')
          or now() > coalesce(pe.echeance_eleve, se.echeance_serveur, now() + interval '1 second')
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

-- Réparation immédiate des projets vides existants à l'application de la migration
select public.reparer_projets_vides();
