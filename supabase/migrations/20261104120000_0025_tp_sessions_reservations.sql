-- ==============================================================================
-- Migration 0025 : TP Sessions et Réservations de Postes avec Approbation Enseignant et Limite de Capacité
-- Respecte Issue #161 (Workflow TP, validation enseignant, blocage IDE)
-- ==============================================================================

-- 1. Table tp_sessions
create table if not exists public.tp_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  class_id uuid references public.classes(id) on delete cascade,
  sujet_id text,
  max_seats int not null default 18 check (max_seats > 0 and max_seats <= 50),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null check (status in ('scheduled', 'live', 'completed')) default 'scheduled',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Table tp_reservations
create table if not exists public.tp_reservations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tp_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  seat_number int not null check (seat_number >= 1),
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, seat_number),
  unique (session_id, student_id)
);

-- Index pour les performances
create index if not exists idx_tp_sessions_class on public.tp_sessions(class_id);
create index if not exists idx_tp_sessions_status on public.tp_sessions(status);
create index if not exists idx_tp_reservations_session on public.tp_reservations(session_id);
create index if not exists idx_tp_reservations_student on public.tp_reservations(student_id);
create index if not exists idx_tp_reservations_status on public.tp_reservations(status);

-- Droits et RLS
grant select, insert, update, delete on public.tp_sessions to authenticated;
grant all on public.tp_sessions to service_role;
grant select, insert, update, delete on public.tp_reservations to authenticated;
grant all on public.tp_reservations to service_role;

alter table public.tp_sessions enable row level security;
alter table public.tp_reservations enable row level security;

-- Politiques RLS pour tp_sessions
create policy "Lecture des sessions TP"
  on public.tp_sessions for select to authenticated
  using (
    class_id is null
    or public.est_membre_classe(class_id)
    or public.est_enseignant_classe(class_id)
    or created_by = auth.uid()
    or public.has_role(auth.uid(), 'admin')
  );

create policy "Gestion des sessions TP par enseignant"
  on public.tp_sessions for all to authenticated
  using (
    created_by = auth.uid()
    or (class_id is not null and public.est_enseignant_classe(class_id))
    or public.has_role(auth.uid(), 'enseignant')
    or public.has_role(auth.uid(), 'admin')
  )
  with check (
    created_by = auth.uid()
    or (class_id is not null and public.est_enseignant_classe(class_id))
    or public.has_role(auth.uid(), 'enseignant')
    or public.has_role(auth.uid(), 'admin')
  );

-- Politiques RLS pour tp_reservations
create policy "Lecture des reservations TP"
  on public.tp_reservations for select to authenticated
  using (
    exists (
      select 1 from public.tp_sessions s
      where s.id = session_id
      and (
        s.class_id is null
        or public.est_membre_classe(s.class_id)
        or public.est_enseignant_classe(s.class_id)
        or s.created_by = auth.uid()
        or public.has_role(auth.uid(), 'admin')
      )
    )
  );

create policy "Eleve demande reservation"
  on public.tp_reservations for insert to authenticated
  with check (
    student_id = auth.uid()
    and status = 'pending'
  );

create policy "Eleve annule sa reservation en attente"
  on public.tp_reservations for delete to authenticated
  using (
    student_id = auth.uid() and status = 'pending'
  );

create policy "Enseignant valide ou refuse reservation"
  on public.tp_reservations for update to authenticated
  using (
    exists (
      select 1 from public.tp_sessions s
      where s.id = session_id
      and (
        s.created_by = auth.uid()
        or (s.class_id is not null and public.est_enseignant_classe(s.class_id))
        or public.has_role(auth.uid(), 'enseignant')
        or public.has_role(auth.uid(), 'admin')
      )
    )
  )
  with check (
    exists (
      select 1 from public.tp_sessions s
      where s.id = session_id
      and (
        s.created_by = auth.uid()
        or (s.class_id is not null and public.est_enseignant_classe(s.class_id))
        or public.has_role(auth.uid(), 'enseignant')
        or public.has_role(auth.uid(), 'admin')
      )
    )
  );

create policy "Enseignant supprime les reservations"
  on public.tp_reservations for delete to authenticated
  using (
    exists (
      select 1 from public.tp_sessions s
      where s.id = session_id
      and (
        s.created_by = auth.uid()
        or (s.class_id is not null and public.est_enseignant_classe(s.class_id))
        or public.has_role(auth.uid(), 'enseignant')
        or public.has_role(auth.uid(), 'admin')
      )
    )
  );

-- Trigger de vérification de capacité
create or replace function public.verifier_capacite_tp_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_seats int;
begin
  select max_seats into v_max_seats from public.tp_sessions where id = NEW.session_id;
  if NEW.seat_number > v_max_seats then
    raise exception 'Le poste % dépasse la capacité maximale de la séance (%)', NEW.seat_number, v_max_seats;
  end if;
  return NEW;
end;
$$;

create trigger trg_tp_reservation_capacite
  before insert or update of seat_number on public.tp_reservations
  for each row execute function public.verifier_capacite_tp_reservation();
