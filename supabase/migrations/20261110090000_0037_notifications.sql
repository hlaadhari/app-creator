-- ==============================================================================
-- Migration 0037 : Centre de notifications persistant (#245)
--
-- Besoin : résultats de correction, messages du tuteur, échéance d'examen,
-- invitation de classe, conflit de synchronisation doivent rester consultables
-- après la fermeture d'un toast.
--
-- Modèle de droits (zéro confiance côté client) :
--   - Lecture : chaque utilisateur ne voit QUE ses notifications (user_id = auth.uid()).
--     Aucune exception, pas même pour l'enseignant ou l'administrateur.
--   - Écriture : aucun INSERT ni DELETE pour anon/authenticated. Une notification
--     naît d'une fonction serveur (public.creer_notification, service_role) ou d'un
--     trigger SECURITY DEFINER, jamais du navigateur.
--   - Mise à jour : le seul champ modifiable côté client est read_at (marquer lu /
--     non lu), garanti par un GRANT au niveau colonne.
--   - service_role : accès complet.
-- ==============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (
    kind in ('correction', 'tuteur', 'examen', 'invitation_classe', 'synchronisation', 'systeme')
  ),
  title text not null check (char_length(title) between 1 and 160),
  body text check (body is null or char_length(body) <= 1000),
  -- Chemin interne uniquement : jamais d'URL absolue ni de « // » (pas de redirection ouverte).
  href text check (
    href is null
    or (href ~ '^/[A-Za-z0-9_./?=&#%-]*$' and href !~ '^//')
  ),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_recent
  on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id)
  where read_at is null;

-- Droits : lecture complète, mise à jour de read_at uniquement. Ni insert ni delete.
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;

alter table public.notifications enable row level security;

create policy "Lecture de ses notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "Marquage lu de ses notifications"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Gestion complète par le service"
  on public.notifications for all to service_role
  using (true)
  with check (true);

-- Création côté serveur uniquement (Edge Functions, triggers SECURITY DEFINER, service_role).
create or replace function public.creer_notification(
  _user_id uuid,
  _kind text,
  _title text,
  _body text default null,
  _href text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, kind, title, body, href)
  values (_user_id, _kind, _title, _body, _href)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.creer_notification(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.creer_notification(uuid, text, text, text, text)
  to service_role;

-- Temps réel : le badge de la cloche se met à jour sans rechargement. Les changements
-- diffusés par Supabase Realtime respectent la RLS ci-dessus. Sans effet hors Supabase
-- (environnement de test PostgreSQL nu, sans publication supabase_realtime).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
