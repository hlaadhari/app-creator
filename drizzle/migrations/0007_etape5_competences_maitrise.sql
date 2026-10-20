create table if not exists public.competences (
  id text primary key,
  code text unique not null,
  libelle text not null,
  description text,
  categorie text not null check (categorie in ('HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'SQL', 'ALGO_ARCHI')),
  parent_id text references public.competences(id) on delete set null,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_competences_categorie on public.competences (categorie);
create index if not exists idx_competences_parent on public.competences (parent_id);
grant select on public.competences to anon, authenticated;
grant insert, update, delete on public.competences to authenticated;
grant all on public.competences to service_role;
alter table public.competences enable row level security;
create policy "Tout le monde lit les competences" on public.competences for select to anon, authenticated using (true);
create policy "Admin modifie competences" on public.competences for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table if not exists public.critere_competences (
  critere_id uuid not null references public.criteres(id) on delete cascade,
  competence_id text not null references public.competences(id) on delete cascade,
  poids numeric(3,2) not null default 1.00 check (poids > 0),
  primary key (critere_id, competence_id)
);
create index if not exists idx_critere_competences_competence on public.critere_competences (competence_id);
grant select on public.critere_competences to anon, authenticated;
grant insert, update, delete on public.critere_competences to authenticated;
grant all on public.critere_competences to service_role;
alter table public.critere_competences enable row level security;
create policy "Tout le monde lit critere_competences" on public.critere_competences for select to anon, authenticated using (true);
create policy "Enseignant et admin gerent critere_competences" on public.critere_competences for all to authenticated
  using (public.has_role(auth.uid(),'enseignant') or public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'enseignant') or public.has_role(auth.uid(),'admin'));

create table if not exists public.maitrise (
  eleve_id uuid not null references public.profiles(id) on delete cascade,
  competence_id text not null references public.competences(id) on delete cascade,
  niveau numeric(4,3) not null default 0.000 check (niveau >= 0.000 and niveau <= 1.000),
  nb_tentatives int not null default 0 check (nb_tentatives >= 0),
  nb_succes int not null default 0 check (nb_succes >= 0),
  premier_coup_succes boolean not null default false,
  dernier_succes timestamptz,
  version_formule text not null default 'v1.0',
  updated_at timestamptz not null default now(),
  primary key (eleve_id, competence_id)
);
create index if not exists idx_maitrise_competence on public.maitrise (competence_id);
grant select, insert, update on public.maitrise to authenticated;
grant all on public.maitrise to service_role;
alter table public.maitrise enable row level security;
create policy "Eleve gere sa maitrise" on public.maitrise for all to authenticated
  using (eleve_id = auth.uid()) with check (eleve_id = auth.uid());
create policy "Enseignant lit maitrise de ses classes" on public.maitrise for select to authenticated
  using (public.est_eleve_de_enseignant(eleve_id) or public.has_role(auth.uid(),'admin'));

create table if not exists public.badges_definition (
  id text primary key,
  titre text not null,
  description text not null,
  icone text not null,
  categorie text not null,
  seuil_points int default 0,
  created_at timestamptz not null default now()
);
grant select on public.badges_definition to anon, authenticated;
grant all on public.badges_definition to service_role;
alter table public.badges_definition enable row level security;
create policy "Tout le monde lit badges_definition" on public.badges_definition for select to anon, authenticated using (true);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null references public.badges_definition(id) on delete cascade,
  obtenu_le timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  constraint uq_eleve_badge unique (eleve_id, badge_id)
);
create index if not exists idx_badges_badge on public.badges (badge_id);
grant select, insert on public.badges to authenticated;
grant all on public.badges to service_role;
alter table public.badges enable row level security;
create policy "Eleve lit ses badges" on public.badges for select to authenticated using (eleve_id = auth.uid());
create policy "Eleve insere ses badges" on public.badges for insert to authenticated with check (eleve_id = auth.uid());
create policy "Enseignant lit badges de ses classes" on public.badges for select to authenticated
  using (public.est_eleve_de_enseignant(eleve_id) or public.has_role(auth.uid(),'admin'));

create or replace function public.calculer_score_maitrise_v1(p_succes int, p_tentatives int, p_premier_coup boolean, p_derniere_date timestamptz)
returns numeric(4,3) language plpgsql stable set search_path = public as $$
declare
  v_taux numeric;
  v_bonus numeric := 0.0;
  v_recence numeric := 1.0;
  v_score numeric;
begin
  if p_tentatives <= 0 or p_succes <= 0 then return 0.000; end if;
  v_taux := least(1.0, p_succes::numeric / greatest(p_tentatives::numeric, 1.0));
  if p_premier_coup then v_bonus := 0.15; end if;
  if p_derniere_date is not null and extract(day from (now() - p_derniere_date)) > 30 then v_recence := 0.90; end if;
  v_score := (0.70 * v_taux + v_bonus + 0.15 * least(1.0, p_succes::numeric / 3.0)) * v_recence;
  return round(least(1.000, greatest(0.000, v_score)), 3);
end;
$$;