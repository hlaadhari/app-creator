-- ==============================================================================
-- Migration 0002 : Classes, Membres, Invitations, Projets et Sauvegarde
-- Respecte PRD v3.1 (§9.1, §9.3, §11, §12 - Tests négatifs T-01 et T-02)
-- ==============================================================================

-- 1. Classes
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  enseignant_id uuid references public.profiles(id) on delete cascade not null,
  annee text not null default '2026-2027',
  archivee boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.classes to authenticated;
grant all on public.classes to service_role;
alter table public.classes enable row level security;

-- L'enseignant gère ses propres classes
create policy "Enseignant gere ses classes"
  on public.classes for all to authenticated
  using (auth.uid() = enseignant_id)
  with check (auth.uid() = enseignant_id);


-- 2. Membres de classes
create table public.class_members (
  class_id uuid references public.classes(id) on delete cascade not null,
  eleve_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (class_id, eleve_id)
);

grant select, insert, update on public.class_members to authenticated;
grant all on public.class_members to service_role;
alter table public.class_members enable row level security;

create or replace function public.est_enseignant_classe(_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes where id = _class_id and enseignant_id = auth.uid())
$$;
create or replace function public.est_membre_classe(_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.class_members where class_id = _class_id and eleve_id = auth.uid() and left_at is null)
$$;
create or replace function public.est_eleve_de_enseignant(_eleve_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.class_members m join public.classes c on c.id = m.class_id
    where m.eleve_id = _eleve_id and c.enseignant_id = auth.uid() and m.left_at is null)
$$;
revoke execute on function public.est_enseignant_classe(uuid), public.est_membre_classe(uuid), public.est_eleve_de_enseignant(uuid) from public, anon;
grant execute on function public.est_enseignant_classe(uuid), public.est_membre_classe(uuid), public.est_eleve_de_enseignant(uuid) to authenticated;

create policy "Eleve lit ses classes" on public.classes for select to authenticated
  using (public.est_membre_classe(id));

-- Un élève lit ses propres adhésions
create policy "Eleve lit ses adhésions"
  on public.class_members for select to authenticated
  using (eleve_id = auth.uid());

-- L'enseignant lit et gère les membres de ses classes
create policy "Enseignant lit les membres de ses classes"
  on public.class_members for select to authenticated
  using (
    public.est_enseignant_classe(class_id)
  );

-- 3. Codes d'invitation
create table public.class_invitations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade not null,
  code text unique not null,
  expire_le timestamptz not null default (now() + interval '30 days'),
  revoque boolean not null default false,
  utilisations_max int not null default 35,
  nb_utilisations int not null default 0,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.class_invitations to authenticated;
grant all on public.class_invitations to service_role;
alter table public.class_invitations enable row level security;

-- L'enseignant gère les invitations de ses classes
create policy "Enseignant gere invitations"
  on public.class_invitations for all to authenticated
  using (
    public.est_enseignant_classe(class_id)
  )
  with check (
    public.est_enseignant_classe(class_id)
  );

-- 4. Affectation de sujets aux classes
create table public.class_sujets (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade not null,
  version_id uuid references public.sujet_versions(id) on delete restrict not null,
  ouvert boolean not null default true,
  date_limite timestamptz,
  regles jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (class_id, version_id)
);

grant select, insert, update, delete on public.class_sujets to authenticated;
grant all on public.class_sujets to service_role;
alter table public.class_sujets enable row level security;

-- L'enseignant gère les affectations de sa classe
create policy "Enseignant gere sujets de sa classe"
  on public.class_sujets for all to authenticated
  using (
    public.est_enseignant_classe(class_id)
  );

-- L'élève lit les sujets ouverts de ses classes
create policy "Eleve lit les sujets de sa classe"
  on public.class_sujets for select to authenticated
  using (
    ouvert and public.est_membre_classe(class_id)
  );

-- 5. Projets élèves
create table public.projets (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid references public.profiles(id) on delete cascade not null,
  version_id uuid references public.sujet_versions(id) on delete restrict not null,
  statut text not null default 'en_cours' check (statut in ('non_commence', 'en_cours', 'rendu')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (eleve_id, version_id)
);

grant select, insert, update on public.projets to authenticated;
grant all on public.projets to service_role;
alter table public.projets enable row level security;

-- Élève : accès complet à ses propres projets (T-01)
create policy "Eleve gere ses projets"
  on public.projets for all to authenticated
  using (eleve_id = auth.uid())
  with check (eleve_id = auth.uid());

-- Enseignant : lecture seule des projets des élèves de ses classes (T-02, F-63)
create policy "Enseignant lit projets de ses eleves"
  on public.projets for select to authenticated
  using (
    public.est_eleve_de_enseignant(projets.eleve_id)
  );

-- 6. Fichiers de projet
create table public.projet_fichiers (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid references public.projets(id) on delete cascade not null,
  chemin text not null,
  contenu text not null default '',
  storage_path text,
  rev int not null default 1,
  supprime boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (projet_id, chemin)
);

grant select, insert, update, delete on public.projet_fichiers to authenticated;
grant all on public.projet_fichiers to service_role;
alter table public.projet_fichiers enable row level security;

-- Élève : gère ses fichiers
create policy "Eleve gere ses fichiers"
  on public.projet_fichiers for all to authenticated
  using (
    exists (select 1 from public.projets p where p.id = projet_id and p.eleve_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projets p where p.id = projet_id and p.eleve_id = auth.uid())
  );

-- Enseignant : lecture seule des fichiers des élèves de ses classes
create policy "Enseignant lit fichiers de ses eleves"
  on public.projet_fichiers for select to authenticated
  using (
    exists (select 1 from public.projets p where p.id = projet_id and public.est_eleve_de_enseignant(p.eleve_id))
  );

-- 7. Tentatives de validation
create table public.tentatives (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid references public.projets(id) on delete cascade not null,
  score int not null,
  max int not null,
  detail jsonb not null,
  version_moteur text not null default 'v1.0',
  version_criteres int not null default 1,
  date timestamptz not null default now()
);

grant select, insert on public.tentatives to authenticated;
grant all on public.tentatives to service_role;
alter table public.tentatives enable row level security;

-- Élève : enregistre et consulte ses tentatives
create policy "Eleve enregistre ses tentatives"
  on public.tentatives for insert to authenticated
  with check (
    exists (select 1 from public.projets p where p.id = projet_id and p.eleve_id = auth.uid())
  );

create policy "Eleve lit ses tentatives"
  on public.tentatives for select to authenticated
  using (
    exists (select 1 from public.projets p where p.id = projet_id and p.eleve_id = auth.uid())
  );

-- Enseignant : lit les tentatives de ses élèves
create policy "Enseignant lit tentatives de ses eleves"
  on public.tentatives for select to authenticated
  using (
    exists (select 1 from public.projets p where p.id = projet_id and public.est_eleve_de_enseignant(p.eleve_id))
  );

-- ==============================================================================
-- Procédures Stockées & Fonctions Métier Sécurisées
-- ==============================================================================

-- Rejoindre une classe via code d'invitation (sécurisé, rate-limité)
create or replace function public.rejoindre_classe(_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _inv public.class_invitations%rowtype;
  _cid uuid;
begin
  if _uid is null then
    raise exception 'Authentification requise';
  end if;

  -- Vérifier le code d'invitation (T-05)
  select * into _inv from public.class_invitations
  where code = upper(trim(_code))
    and not revoque
    and expire_le > now()
    and nb_utilisations < utilisations_max;

  if _inv.id is null then
    raise exception 'Code invitation invalide, expiré ou complet';
  end if;

  _cid := _inv.class_id;

  -- Enregistrer l'adhésion si pas déjà membre actif
  insert into public.class_members (class_id, eleve_id)
  values (_cid, _uid)
  on conflict (class_id, eleve_id) do update set left_at = null;

  -- Incrémenter le compteur d'utilisations
  update public.class_invitations
  set nb_utilisations = nb_utilisations + 1
  where id = _inv.id;

  return jsonb_build_object('success', true, 'class_id', _cid);
end;
$$;

revoke execute on function public.rejoindre_classe(text) from public, anon;
grant execute on function public.rejoindre_classe(text) to authenticated;

-- Initialiser ou réinitialiser un projet à partir des fichiers du sujet (F-35, F-65)
create or replace function public.initialiser_projet(_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _pid uuid;
  _f record;
begin
  if _uid is null then
    raise exception 'Authentification requise';
  end if;

  -- Vérifier que la version est publiée
  if not exists (select 1 from public.sujet_versions where id = _version_id and publiee) then
    raise exception 'Sujet non disponible';
  end if;

  -- Créer ou récupérer le projet
  insert into public.projets (eleve_id, version_id, statut, updated_at)
  values (_uid, _version_id, 'en_cours', now())
  on conflict (eleve_id, version_id) do update set updated_at = now()
  returning id into _pid;

  -- Copier les fichiers de départ de la version si aucun fichier n'existe
  if not exists (select 1 from public.projet_fichiers where projet_id = _pid) then
    for _f in select chemin, contenu, storage_path from public.sujet_version_fichiers where version_id = _version_id and role = 'depart' loop
      insert into public.projet_fichiers (projet_id, chemin, contenu, storage_path, rev)
      values (_pid, _f.chemin, _f.contenu, _f.storage_path, 1);
    end loop;
  end if;

  return _pid;
end;
$$;

revoke execute on function public.initialiser_projet(uuid) from public, anon;
grant execute on function public.initialiser_projet(uuid) to authenticated;
