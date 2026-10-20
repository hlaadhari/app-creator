create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete restrict,
  passage_id uuid references public.passages_examen(id) on delete set null,
  eleve_id uuid not null references public.profiles(id) on delete restrict,
  version_id uuid not null references public.sujet_versions(id) on delete restrict,
  date timestamptz not null default now(),
  hash text not null,
  manifeste jsonb not null,
  storage_archive_path text not null default ''
);
create index if not exists idx_snapshots_projet on public.snapshots (projet_id);
create index if not exists idx_snapshots_passage on public.snapshots (passage_id);
create index if not exists idx_snapshots_eleve on public.snapshots (eleve_id);
create index if not exists idx_snapshots_version on public.snapshots (version_id);
create index if not exists idx_snapshots_hash on public.snapshots (hash);

alter table public.passages_examen add constraint fk_passages_examen_snapshot_final
  foreign key (snapshot_final_id) references public.snapshots(id) on delete set null;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid references public.passages_examen(id) on delete set null,
  snapshot_id uuid not null references public.snapshots(id) on delete restrict,
  note_auto numeric(4,2) not null check (note_auto >= 0 and note_auto <= 20),
  note_finale numeric(4,2) not null check (note_finale >= 0 and note_finale <= 20),
  grille jsonb not null,
  justification text not null default '',
  corrige_par uuid not null references public.profiles(id) on delete restrict,
  historique jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notes_passage on public.notes (passage_id);
create index if not exists idx_notes_snapshot on public.notes (snapshot_id);
create index if not exists idx_notes_corrige_par on public.notes (corrige_par);

grant select, insert on public.snapshots to authenticated;
grant all on public.snapshots to service_role;
grant select, insert, update on public.notes to authenticated;
grant all on public.notes to service_role;
alter table public.snapshots enable row level security;
alter table public.notes enable row level security;

create or replace function public.interdire_mutation_snapshot()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'Snapshot immuable : toute modification ou suppression est formellement interdite (T-08)';
end;
$$;
create trigger trg_interdire_mutation_snapshot before update or delete on public.snapshots
for each row execute function public.interdire_mutation_snapshot();

create or replace function public.sceller_snapshot_examen(p_passage_id uuid, p_hash text, p_manifeste jsonb, p_storage_path text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_passage record;
  v_snapshot_id uuid;
begin
  select p.*, se.version_id as se_version_id into v_passage
  from public.passages_examen p join public.sessions_examen se on p.session_id = se.id
  where p.id = p_passage_id;
  if not found then raise exception 'Passage d examen introuvable : %', p_passage_id; end if;
  if v_passage.eleve_id <> auth.uid() then raise exception 'Accès refusé'; end if;
  if v_passage.statut = 'rendu' and v_passage.snapshot_final_id is not null then
    return v_passage.snapshot_final_id;
  end if;
  insert into public.snapshots (projet_id, passage_id, eleve_id, version_id, date, hash, manifeste, storage_archive_path)
  values (v_passage.projet_id, p_passage_id, v_passage.eleve_id, v_passage.se_version_id, clock_timestamp(), p_hash, p_manifeste, p_storage_path)
  returning id into v_snapshot_id;
  update public.passages_examen set statut = 'rendu', snapshot_final_id = v_snapshot_id,
    evenements = evenements || jsonb_build_object('type', 'snapshot_scelle', 'timestamp', clock_timestamp(), 'snapshot_id', v_snapshot_id, 'hash', p_hash)
  where id = p_passage_id;
  return v_snapshot_id;
end;
$$;
revoke execute on function public.sceller_snapshot_examen(uuid, text, jsonb, text) from public, anon;
grant execute on function public.sceller_snapshot_examen(uuid, text, jsonb, text) to authenticated;

create policy "snapshots_lecture_eleve" on public.snapshots for select to authenticated using (eleve_id = auth.uid());
create policy "snapshots_lecture_enseignant" on public.snapshots for select to authenticated
using (public.est_eleve_de_enseignant(eleve_id) or (passage_id is not null and exists (
  select 1 from public.passages_examen pe where pe.id = passage_id and public.est_enseignant_session(pe.session_id))));
create policy "snapshots_insertion_propre" on public.snapshots for insert to authenticated
with check (eleve_id = auth.uid() and exists (select 1 from public.projets p where p.id = projet_id and p.eleve_id = auth.uid()));

create policy "notes_lecture_eleve" on public.notes for select to authenticated
using (exists (select 1 from public.passages_examen pe where pe.id = notes.passage_id and pe.eleve_id = auth.uid() and pe.statut = 'corrige'));
create policy "notes_gestion_enseignant" on public.notes for all to authenticated
using (exists (select 1 from public.snapshots s where s.id = notes.snapshot_id and public.est_eleve_de_enseignant(s.eleve_id))
  or exists (select 1 from public.passages_examen pe where pe.id = notes.passage_id and public.est_enseignant_session(pe.session_id)))
with check (corrige_par = auth.uid() and (
  exists (select 1 from public.snapshots s where s.id = notes.snapshot_id and public.est_eleve_de_enseignant(s.eleve_id))
  or exists (select 1 from public.passages_examen pe where pe.id = notes.passage_id and public.est_enseignant_session(pe.session_id))));