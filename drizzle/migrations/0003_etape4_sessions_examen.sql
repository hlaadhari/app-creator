-- Labo STI - Domaine 5 : Sessions d'Examen et Notations (PRD §8, §12, F-49 à F-53, F-56, T-06, T-07)

-- 1. Table sessions_examen
create table if not exists public.sessions_examen (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  version_id uuid not null references public.sujet_versions(id) on delete restrict,
  titre text not null,
  debut_prevu timestamptz not null,
  duree_min int not null default 90 check (duree_min > 0),
  debut_serveur timestamptz,
  echeance_serveur timestamptz,
  statut text not null check (statut in ('planifie', 'salle_attente', 'en_cours', 'termine')) default 'planifie',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 2. Table passages_examen
create table if not exists public.passages_examen (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions_examen(id) on delete cascade,
  eleve_id uuid not null references public.profiles(id) on delete cascade,
  projet_id uuid references public.projets(id) on delete set null,
  statut text not null check (statut in ('en_attente', 'en_cours', 'verrouille', 'rendu', 'corrige')) default 'en_attente',
  debut_reel timestamptz,
  echeance_eleve timestamptz,
  temps_supp_min int not null default 0 check (temps_supp_min >= 0),
  evenements jsonb not null default '[]'::jsonb,
  snapshot_final_id uuid,
  created_at timestamptz not null default now(),
  unique (session_id, eleve_id)
);

-- Index pour la réactivité
create index if not exists idx_sessions_examen_class on public.sessions_examen (class_id);
create index if not exists idx_sessions_examen_statut on public.sessions_examen (statut);
create index if not exists idx_passages_examen_session on public.passages_examen (session_id);
create index if not exists idx_passages_examen_eleve on public.passages_examen (eleve_id);
create index if not exists idx_passages_examen_projet on public.passages_examen (projet_id);

-- Activation RLS
alter table public.sessions_examen enable row level security;
alter table public.passages_examen enable row level security;

-- 3. Fonction pour obtenir l'horloge officielle du serveur (anti-triche horloge locale)
create or replace function public.obtenir_horloge_serveur()
returns timestamptz
language sql
stable
set search_path = public
as $$
  select clock_timestamp();
$$;

-- 4. Trigger T-07 : Machine à états des passages d'examen (interdiction de repasser à 'en_cours' après rendu)
create or replace function public.verifier_transition_passage_examen()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.statut in ('rendu', 'corrige') and new.statut = 'en_cours' then
    raise exception 'Transition strictement interdite : un examen rendu ne peut pas être rouvert (T-07)';
  end if;

  if old.statut = 'verrouille' and new.statut = 'en_cours' and now() > coalesce(old.echeance_eleve, now()) then
    raise exception 'Transition interdite : passage verrouille post-echeance (T-07)';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_verifier_transition_passage_examen on public.passages_examen;
create trigger trg_verifier_transition_passage_examen
before update on public.passages_examen
for each row
execute function public.verifier_transition_passage_examen();

-- 5. Trigger T-06 : Refus strict des écritures post-échéance
create or replace function public.verifier_echeance_ecriture()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  _passage record;
begin
  select p.id, p.statut, p.echeance_eleve, s.echeance_serveur
  into _passage
  from public.passages_examen p
  join public.sessions_examen s on s.id = p.session_id
  where p.projet_id = case when tg_table_name = 'projets' then coalesce(new.id, old.id) else coalesce(new.projet_id, old.projet_id) end;

  if found then
    if _passage.statut in ('rendu', 'corrige', 'verrouille') then
      raise exception 'Dépôt verrouillé : examen déjà soumis ou terminé (T-06)';
    end if;

    if now() > coalesce(_passage.echeance_eleve, _passage.echeance_serveur) then
      raise exception 'Échéance d''examen dépassée : dépôt verrouillé par le serveur (T-06)';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_verifier_echeance_projet_fichiers on public.projet_fichiers;
create trigger trg_verifier_echeance_projet_fichiers
before insert or update on public.projet_fichiers
for each row
execute function public.verifier_echeance_ecriture();

-- 6. RPC Coup d'envoi simultané par l'enseignant (PRD F-49, F-50)
create or replace function public.lancer_coup_denvoi_examen(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _session record;
  _now timestamptz := clock_timestamp();
  _echeance timestamptz;
  _count int;
begin
  select * into _session from public.sessions_examen where id = p_session_id;
  if not found then
    raise exception 'Session d''examen introuvable';
  end if;

  _echeance := _now + (_session.duree_min || ' minutes')::interval;

  update public.sessions_examen
  set
    statut = 'en_cours',
    debut_serveur = _now,
    echeance_serveur = _echeance
  where id = p_session_id;

  update public.passages_examen
  set
    statut = 'en_cours',
    debut_reel = _now,
    echeance_eleve = _now + ((_session.duree_min + temps_supp_min) || ' minutes')::interval
  where session_id = p_session_id and statut in ('en_attente', 'planifie');

  get diagnostics _count = row_count;

  return jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'debut_serveur', _now,
    'echeance_serveur', _echeance,
    'eleves_demarres', _count
  );
end;
$$;

-- 7. Politiques RLS
create policy "sessions_examen_lecture_membres"
on public.sessions_examen for select
to authenticated
using (
  exists (
    select 1 from public.class_members cm
    where cm.class_id = sessions_examen.class_id
    and cm.user_id = auth.uid()
  )
  or public.has_role('admin')
);

create policy "sessions_examen_gestion_enseignants"
on public.sessions_examen for all
to authenticated
using (
  exists (
    select 1 from public.classes c
    where c.id = sessions_examen.class_id
    and (c.enseignant_id = auth.uid() or public.has_role('admin'))
  )
)
with check (
  exists (
    select 1 from public.classes c
    where c.id = sessions_examen.class_id
    and (c.enseignant_id = auth.uid() or public.has_role('admin'))
  )
);

create policy "passages_examen_lecture_propre"
on public.passages_examen for select
to authenticated
using (
  eleve_id = auth.uid()
  or exists (
    select 1 from public.sessions_examen se
    join public.classes c on c.id = se.class_id
    where se.id = passages_examen.session_id
    and (c.enseignant_id = auth.uid() or public.has_role('admin'))
  )
);

create policy "passages_examen_ecriture_propre"
on public.passages_examen for update
to authenticated
using (
  eleve_id = auth.uid()
  or exists (
    select 1 from public.sessions_examen se
    join public.classes c on c.id = se.class_id
    where se.id = passages_examen.session_id
    and (c.enseignant_id = auth.uid() or public.has_role('admin'))
  )
);
