-- Demande d'accès enseignant (issue #65).
-- Un élève connecté dépose une demande ; un administrateur l'accepte ou la refuse avec un motif.
-- Aucune écriture directe : tout passe par des fonctions SECURITY DEFINER.

create table if not exists public.demandes_enseignant (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  etablissement text not null check (char_length(trim(etablissement)) between 2 and 200),
  message text not null default '' check (char_length(message) <= 1000),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'acceptee', 'refusee')),
  motif_refus text check (motif_refus is null or char_length(trim(motif_refus)) >= 5),
  traitee_par uuid references public.profiles(id) on delete set null,
  traitee_at timestamptz,
  created_at timestamptz not null default now()
);

-- Une seule demande en attente par utilisateur.
create unique index if not exists demandes_enseignant_une_en_attente
  on public.demandes_enseignant (user_id) where statut = 'en_attente';

alter table public.demandes_enseignant enable row level security;

revoke all on public.demandes_enseignant from anon, authenticated;
grant select on public.demandes_enseignant to authenticated;
grant all on public.demandes_enseignant to service_role;

drop policy if exists "Utilisateur lit ses demandes enseignant" on public.demandes_enseignant;
create policy "Utilisateur lit ses demandes enseignant"
  on public.demandes_enseignant for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admin lit toutes les demandes enseignant" on public.demandes_enseignant;
create policy "Admin lit toutes les demandes enseignant"
  on public.demandes_enseignant for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- 1. Dépôt d'une demande par un élève connecté.
create or replace function public.demander_acces_enseignant(_etablissement text, _message text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'non_connecte' using errcode = '42501';
  end if;

  if public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'enseignant') then
    raise exception 'deja_enseignant' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid() and anonymise_at is not null) then
    raise exception 'compte_anonymise' using errcode = 'P0001';
  end if;

  if char_length(trim(coalesce(_etablissement, ''))) < 2 then
    raise exception 'etablissement_requis' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.demandes_enseignant where user_id = auth.uid() and statut = 'en_attente') then
    raise exception 'demande_deja_en_attente' using errcode = 'P0001';
  end if;

  insert into public.demandes_enseignant (user_id, etablissement, message)
  values (auth.uid(), trim(_etablissement), trim(coalesce(_message, '')))
  returning id into _id;

  insert into public.journal_securite (type, acteur_id, meta)
  values ('demande_enseignant', auth.uid(), jsonb_build_object('demande', _id));

  return _id;
end;
$$;

-- 2. Liste des demandes (admin).
create or replace function public.admin_lister_demandes_enseignant()
returns table (
  id uuid,
  user_id uuid,
  email text,
  nom text,
  prenom text,
  etablissement text,
  message text,
  statut text,
  motif_refus text,
  created_at timestamptz,
  traitee_at timestamptz
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
  select d.id, d.user_id, u.email::text, p.nom, p.prenom, d.etablissement, d.message,
         d.statut, d.motif_refus, d.created_at, d.traitee_at
  from public.demandes_enseignant d
  join public.profiles p on p.id = d.user_id
  join auth.users u on u.id = d.user_id
  order by (d.statut = 'en_attente') desc, d.created_at desc;
end;
$$;

-- 3. Traitement d'une demande (admin) : acceptation = passage au rôle enseignant ; refus = motif obligatoire.
create or replace function public.admin_traiter_demande_enseignant(
  _demande_id uuid,
  _accepter boolean,
  _motif text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _user uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  select user_id into _user
  from public.demandes_enseignant
  where id = _demande_id and statut = 'en_attente'
  for update;

  if _user is null then
    raise exception 'demande_introuvable_ou_traitee' using errcode = 'P0002';
  end if;

  if _accepter then
    -- Remplace le rôle, enregistre le validateur et marque la demande comme acceptée.
    perform public.admin_modifier_role(_user, 'enseignant');
  else
    if char_length(trim(coalesce(_motif, ''))) < 5 then
      raise exception 'motif_refus_requis' using errcode = 'P0001';
    end if;

    update public.demandes_enseignant
    set statut = 'refusee', motif_refus = trim(_motif), traitee_par = auth.uid(), traitee_at = now()
    where id = _demande_id;

    insert into public.journal_securite (type, acteur_id, meta)
    values ('demande_enseignant_refusee', auth.uid(),
            jsonb_build_object('demande', _demande_id, 'cible', _user));
  end if;
end;
$$;

-- 4. Un passage direct au rôle enseignant (menu de /admin) clôt aussi la demande en attente.
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

  if _role = 'enseignant' then
    update public.demandes_enseignant
    set statut = 'acceptee', traitee_par = auth.uid(), traitee_at = now()
    where user_id = _user_id and statut = 'en_attente';
  end if;

  insert into public.journal_securite (type, acteur_id, meta)
  values ('role_modifie', auth.uid(),
          jsonb_build_object('cible', _user_id, 'ancien', _ancien, 'nouveau', _role));
end;
$$;

revoke all on function public.demander_acces_enseignant(text, text) from public, anon;
revoke all on function public.admin_lister_demandes_enseignant() from public, anon;
revoke all on function public.admin_traiter_demande_enseignant(uuid, boolean, text) from public, anon;
grant execute on function public.demander_acces_enseignant(text, text) to authenticated;
grant execute on function public.admin_lister_demandes_enseignant() to authenticated;
grant execute on function public.admin_traiter_demande_enseignant(uuid, boolean, text) to authenticated;
