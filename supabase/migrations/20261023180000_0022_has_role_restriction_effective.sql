-- Migration 0022 : rend effective la restriction de public.has_role (SEC-11, issue #149).
--
-- La migration 0016 testait `current_user not in ('anon', 'authenticated')`. Or has_role est
-- SECURITY DEFINER : current_user y vaut toujours le propriétaire de la fonction, donc la condition
-- était toujours vraie et un utilisateur connecté pouvait interroger le rôle de n'importe qui.
--
-- On se fonde désormais sur le rôle du JWT (auth.role(), renseigné par PostgREST et non modifiable
-- par le client) : un appel sans rôle client (déclencheur, service_role, SQL direct) reste autorisé ;
-- un appel d'un utilisateur connecté ne peut viser qu'un tiers s'il est lui-même administrateur.

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when _user_id is null then false
    when _user_id = auth.uid()
      or coalesce(auth.role(), '') not in ('anon', 'authenticated')
      or exists (
        select 1 from public.user_roles
        where user_id = auth.uid() and role = 'admin'::public.app_role
      )
    then exists (
      select 1 from public.user_roles
      where user_id = _user_id and role = _role
    )
    else false
  end;
$$;

-- Les droits d'exécution fixés par la migration 0016 sont conservés ; on les réaffirme.
revoke all on function public.has_role(uuid, public.app_role) from public;
revoke all on function public.has_role(uuid, public.app_role) from anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
