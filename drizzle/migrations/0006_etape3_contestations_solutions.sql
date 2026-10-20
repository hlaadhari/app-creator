create table if not exists public.journal_securite (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  acteur_id uuid references public.profiles(id) on delete set null,
  date timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);
grant select, insert on public.journal_securite to authenticated;
grant all on public.journal_securite to service_role;
alter table public.journal_securite enable row level security;
create policy "Enseignant et admin lisent journal securite" on public.journal_securite for select to authenticated
  using (public.has_role(auth.uid(),'enseignant') or public.has_role(auth.uid(),'admin'));
create policy "Authentifie insere journal securite" on public.journal_securite for insert to authenticated
  with check (acteur_id = auth.uid());

create table if not exists public.contestations (
  id uuid primary key default gen_random_uuid(),
  critere_id uuid not null references public.criteres(id) on delete cascade,
  eleve_id uuid not null references public.profiles(id) on delete cascade,
  projet_id uuid references public.projets(id) on delete set null,
  sujet_version_id uuid references public.sujet_versions(id) on delete cascade,
  texte text not null check (char_length(trim(texte)) >= 10),
  statut text not null check (statut in ('en_attente', 'acceptee', 'rejetee')) default 'en_attente',
  motif_rejet text,
  traitee_par uuid references public.profiles(id) on delete set null,
  traitee_le timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_contestations_eleve on public.contestations (eleve_id);
create index if not exists idx_contestations_critere on public.contestations (critere_id);
create index if not exists idx_contestations_statut on public.contestations (statut);
grant select, insert, update on public.contestations to authenticated;
grant all on public.contestations to service_role;
alter table public.contestations enable row level security;
create policy "Eleve lit ses contestations" on public.contestations for select to authenticated using (eleve_id = auth.uid());
create policy "Eleve depose une contestation" on public.contestations for insert to authenticated
  with check (eleve_id = auth.uid() and statut = 'en_attente' and traitee_par is null);
create policy "Enseignant lit contestations eleves" on public.contestations for select to authenticated
  using (public.est_eleve_de_enseignant(eleve_id) or public.has_role(auth.uid(),'admin'));
create policy "Enseignant arbitre contestations eleves" on public.contestations for update to authenticated
  using (public.est_eleve_de_enseignant(eleve_id) or public.has_role(auth.uid(),'admin'));

alter table public.tentatives add column if not exists eleve_id uuid references public.profiles(id) on delete cascade;
alter table public.tentatives add column if not exists sujet_version_id uuid references public.sujet_versions(id) on delete cascade;
alter table public.tentatives add column if not exists note20 numeric(4,2);
alter table public.tentatives add column if not exists points_obtenus numeric(5,2);
alter table public.tentatives add column if not exists points_total numeric(5,2);
alter table public.tentatives add column if not exists details jsonb;
alter table public.tentatives alter column projet_id drop not null;
create index if not exists idx_tentatives_eleve_date on public.tentatives (eleve_id, date desc);
create index if not exists idx_tentatives_sujet_version on public.tentatives (sujet_version_id);
create policy "Eleve enregistre ses tentatives directes" on public.tentatives for insert to authenticated
  with check (projet_id is null and eleve_id = auth.uid());
create policy "Eleve lit ses tentatives directes" on public.tentatives for select to authenticated
  using (eleve_id = auth.uid());
create policy "Enseignant lit tentatives directes" on public.tentatives for select to authenticated
  using (eleve_id is not null and public.est_eleve_de_enseignant(eleve_id));

create table if not exists public.journal_acces_solutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  version_id uuid not null references public.sujet_versions(id) on delete restrict,
  motif text not null default 'consultation',
  date timestamptz not null default now()
);
grant select, insert on public.journal_acces_solutions to authenticated;
grant all on public.journal_acces_solutions to service_role;
alter table public.journal_acces_solutions enable row level security;
create policy "Utilisateur consigne son acces solution" on public.journal_acces_solutions for insert to authenticated
  with check (user_id = auth.uid());
create policy "Utilisateur consulte ses acces solution" on public.journal_acces_solutions for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'enseignant') or public.has_role(auth.uid(),'admin'));

create or replace function public.debloquer_solution(p_version_id uuid, p_motif text default 'consultation')
returns table (id uuid, chemin text, contenu text)
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_exam boolean;
begin
  if v_user_id is null then raise exception 'Authentification requise pour accéder aux corrigés (T-04)'; end if;
  if public.has_role(v_user_id,'enseignant') or public.has_role(v_user_id,'admin') then
    insert into public.journal_acces_solutions (user_id, version_id, motif) values (v_user_id, p_version_id, 'consultation_enseignant');
    return query select s.id, s.chemin, s.contenu from public.solutions s where s.version_id = p_version_id;
    return;
  end if;
  select exists (
    select 1 from public.passages_examen pe join public.sessions_examen se on se.id = pe.session_id
    where pe.eleve_id = v_user_id and se.version_id = p_version_id
      and (se.statut in ('salle_attente', 'en_cours') or pe.statut in ('en_attente', 'en_cours', 'verrouille'))
  ) into v_exam;
  if v_exam then
    insert into public.journal_securite (type, acteur_id, meta)
    values ('TENTATIVE_ACCES_CORRIGE_EN_EXAMEN', v_user_id, jsonb_build_object('version_id', p_version_id, 'motif', p_motif));
    raise exception 'Accès au corrigé strictement interdit en session d examen active (T-04 / T-06)';
  end if;
  insert into public.journal_acces_solutions (user_id, version_id, motif) values (v_user_id, p_version_id, coalesce(p_motif, 'consultation_eleve'));
  return query select s.id, s.chemin, s.contenu from public.solutions s where s.version_id = p_version_id;
end;
$$;
revoke execute on function public.debloquer_solution(uuid, text) from public, anon;
grant execute on function public.debloquer_solution(uuid, text) to authenticated;