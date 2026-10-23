-- Migration 0016 : Restriction de public.has_role (SEC-11, Issue #123)
-- 1. Révoque l'exécution de public.has_role pour PUBLIC et anon (empêche l'énumération anonyme des rôles).
-- 2. Restreint la vérification d'un UUID tiers aux seuls administrateurs ou appels système (service_role / postgres).

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
      or current_user not in ('anon', 'authenticated')
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

revoke all on function public.has_role(uuid, public.app_role) from public;
revoke all on function public.has_role(uuid, public.app_role) from anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
