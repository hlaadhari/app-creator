-- Migration 0029 : Cohérence entre demandes_enseignant et user_roles (Issue #200)
-- 1. Lorsqu'un administrateur repasse un compte au rôle 'eleve', toute demande
--    antérieure au statut 'acceptee' est basculée en 'refusee' afin que l'élève
--    ne voie jamais « Demande acceptée : habilitation validée » alors que son
--    rôle dans user_roles est 'eleve'.
-- 2. Réconciliation immédiate des lignes demandes_enseignant marquées 'acceptee'
--    dont le compte ne possède ni le rôle 'enseignant' ni le rôle 'admin'.

create or replace function public.admin_modifier_role(_user_id uuid, _role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _ancien public.app_role;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = _user_id) then
    raise exception 'utilisateur_introuvable' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.profiles where id = _user_id and anonymise_at is not null) then
    raise exception 'compte_anonymise' using errcode = 'P0001';
  end if;

  select coalesce(
    (select r.role from public.user_roles r where r.user_id = _user_id
     order by case r.role when 'admin' then 1 when 'enseignant' then 2 else 3 end limit 1),
    'eleve'::public.app_role) into _ancien;

  -- Un admin ne peut pas se rétrograder lui-même : il reste donc toujours au moins un administrateur.
  if _user_id = auth.uid() and _role <> 'admin' then
    raise exception 'auto_retrogradation_interdite' using errcode = 'P0001';
  end if;

  delete from public.user_roles where user_id = _user_id;
  insert into public.user_roles (user_id, role) values (_user_id, _role);

  update public.profiles
  set valide_par = case when _role = 'enseignant' then auth.uid() else null end,
      valide_at = case when _role = 'enseignant' then now() else null end
  where id = _user_id;

  if _role in ('enseignant', 'admin') then
    update public.demandes_enseignant
    set statut = 'acceptee', traitee_par = auth.uid(), traitee_at = now()
    where user_id = _user_id and statut = 'en_attente';
  elsif _role = 'eleve' then
    update public.demandes_enseignant
    set statut = 'refusee',
        motif_refus = 'Habilitation enseignant révoquée par un administrateur.',
        traitee_par = auth.uid(),
        traitee_at = now()
    where user_id = _user_id and statut = 'acceptee';
  end if;

  insert into public.journal_securite (type, acteur_id, meta)
  values ('role_modifie', auth.uid(),
          jsonb_build_object('cible', _user_id, 'ancien', _ancien, 'nouveau', _role));
end;
$$;

revoke all on function public.admin_modifier_role(uuid, public.app_role) from public, anon;
grant execute on function public.admin_modifier_role(uuid, public.app_role) to authenticated;

-- Réconciliation des demandes marquées 'acceptee' dont l'utilisateur est resté 'eleve' dans user_roles
update public.demandes_enseignant d
set statut = 'refusee',
    motif_refus = coalesce(d.motif_refus, 'Habilitation non active dans user_roles (réinitialisée).'),
    traitee_at = coalesce(d.traitee_at, now())
where d.statut = 'acceptee'
  and not exists (
    select 1
    from public.user_roles r
    where r.user_id = d.user_id
      and r.role in ('enseignant', 'admin')
  );
