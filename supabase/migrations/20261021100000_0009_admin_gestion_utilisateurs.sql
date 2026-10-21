-- Gestion des utilisateurs par l'administrateur (issue #61).
-- Les opérations sensibles passent par des fonctions SECURITY DEFINER réservées aux admins :
-- aucune écriture directe sur user_roles depuis le navigateur.

-- 1. Validation enseignant et anonymisation : colonnes sur profiles.
alter table public.profiles
  add column if not exists valide_par uuid references public.profiles(id) on delete set null,
  add column if not exists valide_at timestamptz,
  add column if not exists anonymise_at timestamptz;

-- Les enseignants déjà en place sont considérés comme validés par le premier administrateur.
update public.profiles p
set valide_par = (select user_id from public.user_roles where role = 'admin' order by user_id limit 1),
    valide_at = now()
from public.user_roles r
where r.user_id = p.id and r.role = 'enseignant' and p.valide_par is null;

-- Chacun ne peut modifier que son nom et son prénom : valide_par / valide_at / anonymise_at
-- ne sont jamais modifiables par l'utilisateur lui-même (T-03).
revoke update on public.profiles from authenticated;
grant update (nom, prenom) on public.profiles to authenticated;

-- 2. Liste des comptes (e-mail réel, dernière connexion, validation).
create or replace function public.admin_lister_utilisateurs()
returns table (
  id uuid,
  email text,
  nom text,
  prenom text,
  role public.app_role,
  email_confirme boolean,
  created_at timestamptz,
  derniere_connexion timestamptz,
  valide_par uuid,
  valide_at timestamptz,
  anonymise_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  return query
  select p.id,
         u.email::text,
         p.nom,
         p.prenom,
         coalesce(
           (select r.role from public.user_roles r where r.user_id = p.id
            order by case r.role when 'admin' then 1 when 'enseignant' then 2 else 3 end limit 1),
           'eleve'::public.app_role),
         (u.email_confirmed_at is not null),
         p.created_at,
         u.last_sign_in_at,
         p.valide_par,
         p.valide_at,
         p.anonymise_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at, p.id;
end;
$$;

-- 3. Changement de rôle (remplace le rôle existant, journalisé).
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

  insert into public.journal_securite (type, acteur_id, meta)
  values ('role_modifie', auth.uid(),
          jsonb_build_object('cible', _user_id, 'ancien', _ancien, 'nouveau', _role));
end;
$$;

-- 4. Anonymisation RGPD d'un élève : profil, identifiants de connexion, sessions.
create or replace function public.admin_anonymiser_eleve(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  if _user_id = auth.uid() then
    raise exception 'auto_anonymisation_interdite' using errcode = 'P0001';
  end if;

  if public.has_role(_user_id, 'admin') or public.has_role(_user_id, 'enseignant') then
    raise exception 'role_non_eleve' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.profiles where id = _user_id) then
    raise exception 'utilisateur_introuvable' using errcode = 'P0002';
  end if;

  update public.profiles
  set nom = 'Anonyme', prenom = 'Élève supprimé', anonymise_at = coalesce(anonymise_at, now())
  where id = _user_id;

  update auth.users
  set email = 'anonyme-' || _user_id || '@anonymise.local',
      encrypted_password = '',
      raw_user_meta_data = '{}'::jsonb,
      banned_until = 'infinity'
  where id = _user_id;

  delete from auth.identities where user_id = _user_id;
  delete from auth.sessions where user_id = _user_id;

  insert into public.journal_securite (type, acteur_id, meta)
  values ('eleve_anonymise', auth.uid(), jsonb_build_object('cible', _user_id));
end;
$$;

revoke all on function public.admin_lister_utilisateurs() from public, anon;
revoke all on function public.admin_modifier_role(uuid, public.app_role) from public, anon;
revoke all on function public.admin_anonymiser_eleve(uuid) from public, anon;
grant execute on function public.admin_lister_utilisateurs() to authenticated;
grant execute on function public.admin_modifier_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_anonymiser_eleve(uuid) to authenticated;
