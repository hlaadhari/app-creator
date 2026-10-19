-- Labo STI - Domaine 4 & 5 : Snapshots Immuables & Rejouage de Référence (PRD §10, §11, §12, F-54, F-55, T-08)

-- 1. Table snapshots (Immuable - Copie certifiée scellée lors de la fin d'un examen ou d'une remise officielle)
create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete restrict,
  passage_id uuid references public.passages_examen(id) on delete set null,
  eleve_id uuid not null references public.profiles(id) on delete restrict,
  version_id uuid not null references public.sujet_versions(id) on delete restrict,
  date timestamptz not null default now(),
  hash text not null, -- Empreinte cryptographique SHA-256 canonique
  manifeste jsonb not null, -- Arborescence exacte, tailles et SHA-256 de chaque fichier + dump SQL
  storage_archive_path text not null default ''
);

-- Index pour la performance des requêtes et la vérification
create index if not exists idx_snapshots_projet on public.snapshots (projet_id);
create index if not exists idx_snapshots_passage on public.snapshots (passage_id);
create index if not exists idx_snapshots_eleve on public.snapshots (eleve_id);
create index if not exists idx_snapshots_version on public.snapshots (version_id);
create index if not exists idx_snapshots_hash on public.snapshots (hash);

-- Contrainte de clé étrangère entre passages_examen et snapshots
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_passages_examen_snapshot_final'
  ) then
    alter table public.passages_examen
    add constraint fk_passages_examen_snapshot_final
    foreign key (snapshot_final_id) references public.snapshots(id) on delete set null;
  end if;
end;
$$;

-- 2. Table notes (Grille de notation officielle, note automatique et décision pédagogique)
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid references public.passages_examen(id) on delete set null,
  snapshot_id uuid not null references public.snapshots(id) on delete restrict,
  note_auto numeric(4,2) not null check (note_auto >= 0 and note_auto <= 20),
  note_finale numeric(4,2) not null check (note_finale >= 0 and note_finale <= 20),
  grille jsonb not null, -- Rubrique détaillée critère par critère
  justification text not null default '', -- Motivation pédagogique en cas d'ajustement
  corrige_par uuid not null references public.profiles(id) on delete restrict,
  historique jsonb not null default '[]'::jsonb, -- Audit log des révisions de notation
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notes_passage on public.notes (passage_id);
create index if not exists idx_notes_snapshot on public.notes (snapshot_id);
create index if not exists idx_notes_corrige_par on public.notes (corrige_par);

-- 3. Activation RLS
grant select, insert on public.snapshots to authenticated;
grant all on public.snapshots to service_role;
grant select, insert, update on public.notes to authenticated;
grant all on public.notes to service_role;
alter table public.snapshots enable row level security;
alter table public.notes enable row level security;

-- 4. Trigger T-08 : Immuabilité absolue des snapshots
create or replace function public.interdire_mutation_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Snapshot immuable : toute modification ou suppression est formellement interdite (T-08)';
end;
$$;

drop trigger if exists trg_interdire_mutation_snapshot on public.snapshots;
create trigger trg_interdire_mutation_snapshot
before update or delete on public.snapshots
for each row
execute function public.interdire_mutation_snapshot();

-- 5. RPC : Scellement cryptographique d'une copie d'examen
create or replace function public.sceller_snapshot_examen(
  p_passage_id uuid,
  p_hash text,
  p_manifeste jsonb,
  p_storage_path text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_passage record;
  v_snapshot_id uuid;
begin
  -- Vérification de l'existence et du statut du passage
  select p.*, se.echeance_serveur into v_passage
  from public.passages_examen p
  join public.sessions_examen se on p.session_id = se.id
  where p.id = p_passage_id;

  if not found then
    raise exception 'Passage d examen introuvable : %', p_passage_id;
  end if;
  if v_passage.eleve_id <> auth.uid() then
    raise exception 'Accès refusé';
  end if;

  if v_passage.statut = 'rendu' and v_passage.snapshot_final_id is not null then
    return v_passage.snapshot_final_id;
  end if;

  -- Création du snapshot scellé
  insert into public.snapshots (
    projet_id,
    passage_id,
    eleve_id,
    version_id,
    date,
    hash,
    manifeste,
    storage_archive_path
  )
  select
    v_passage.projet_id,
    p_passage_id,
    v_passage.eleve_id,
    se.version_id,
    clock_timestamp(),
    p_hash,
    p_manifeste,
    p_storage_path
  from public.sessions_examen se
  where se.id = v_passage.session_id
  returning id into v_snapshot_id;

  -- Mise à jour du passage d'examen vers l'état scellé / rendu
  update public.passages_examen
  set
    statut = 'rendu',
    snapshot_final_id = v_snapshot_id,
    evenements = evenements || jsonb_build_object(
      'type', 'snapshot_scelle',
      'timestamp', clock_timestamp(),
      'snapshot_id', v_snapshot_id,
      'hash', p_hash
    )
  where id = p_passage_id;

  return v_snapshot_id;
end;
$$;

-- 6. Politiques RLS pour snapshots

-- Élèves : lecture de leurs propres snapshots
create policy "snapshots_lecture_eleve"
on public.snapshots for select
to authenticated
using (
  eleve_id = auth.uid()
);

-- Enseignants : lecture des snapshots des élèves inscrits dans leurs classes
create policy "snapshots_lecture_enseignant"
on public.snapshots for select
to authenticated
using (
  public.est_eleve_de_enseignant(snapshots.eleve_id)
  or exists (
    select 1
    from public.passages_examen pe
    join public.sessions_examen se on pe.session_id = se.id
    join public.classes c on se.class_id = c.id
    where pe.id = snapshots.passage_id
      and c.enseignant_id = auth.uid()
  )
);

-- Insertion de snapshot autorisée pour l'élève sur son propre projet/passage ou par le tuteur
create policy "snapshots_insertion_propre"
on public.snapshots for insert
to authenticated
with check (
  eleve_id = auth.uid()
);

-- 7. Politiques RLS pour notes

-- Élèves : consultation de leur note une fois l'examen corrigé
create policy "notes_lecture_eleve"
on public.notes for select
to authenticated
using (
  exists (
    select 1
    from public.passages_examen pe
    where pe.id = notes.passage_id
      and pe.eleve_id = auth.uid()
      and pe.statut = 'corrige'
  )
);

-- Enseignants : consultation et notation pour leurs classes
create policy "notes_gestion_enseignant"
on public.notes for all
to authenticated
using (
  exists (select 1 from public.snapshots s where s.id = notes.snapshot_id and public.est_eleve_de_enseignant(s.eleve_id))
  or exists (
    select 1
    from public.passages_examen pe
    join public.sessions_examen se on pe.session_id = se.id
    join public.classes c on se.class_id = c.id
    where pe.id = notes.passage_id
      and c.enseignant_id = auth.uid()
  )
)
with check (
  exists (select 1 from public.snapshots s where s.id = notes.snapshot_id and public.est_eleve_de_enseignant(s.eleve_id))
  or exists (
    select 1
    from public.passages_examen pe
    join public.sessions_examen se on pe.session_id = se.id
    join public.classes c on se.class_id = c.id
    where pe.id = notes.passage_id
      and c.enseignant_id = auth.uid()
  )
);

revoke execute on function public.sceller_snapshot_examen(uuid, text, jsonb, text) from public, anon;
grant execute on function public.sceller_snapshot_examen(uuid, text, jsonb, text) to authenticated;
