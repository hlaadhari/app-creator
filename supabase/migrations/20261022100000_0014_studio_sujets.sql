-- Studio de sujets : enregistrement réel des brouillons (issue #92).
--
-- Les sujets créés par un enseignant sont écrits dans sujets / sujet_versions / sujet_version_fichiers /
-- criteres / indices / solutions via des fonctions SECURITY DEFINER réservées aux enseignants et
-- administrateurs. Aucun GRANT n'est ajouté sur les tables : la correction reste invisible du client.
--
-- Cette étape n'ajoute PAS la publication (étape suivante) : une version créée ici reste un brouillon
-- (publiee = false), donc invisible des élèves et modifiable par son auteur ou un administrateur.

-- 1. Colonnes du Studio -------------------------------------------------------------------------
alter table public.sujets
  add column if not exists auteur_id uuid references public.profiles(id) on delete set null,
  add column if not exists duree_min int not null default 30 check (duree_min between 5 and 600);

alter table public.sujet_versions
  add column if not exists enonce_md text not null default '',
  add column if not exists auteur_id uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

-- Le catalogue public ne montre que les sujets ayant au moins une version publiée :
-- un brouillon du Studio n'apparaît jamais chez les élèves.
drop policy if exists "Catalogue public" on public.sujets;
create policy "Catalogue public" on public.sujets for select to anon, authenticated
  using (exists (select 1 from public.sujet_versions v where v.sujet_id = sujets.id and v.publiee));

-- 2. Solutions du banc didactique (canonique / alternative / invalide) --------------------------
-- La table solutions ne porte que le corrigé élève (une seule solution par version) : le banc
-- didactique a 3 variantes multi-fichiers, qui ne doivent jamais être servies à un élève.
create table if not exists public.solutions_banc (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.sujet_versions(id) on delete restrict,
  variante text not null check (variante in ('canonique', 'alternative', 'invalide')),
  nom text not null default '',
  description text not null default '',
  chemin text not null,
  contenu text not null default '',
  unique (version_id, variante, chemin)
);
alter table public.solutions_banc enable row level security;
grant all on public.solutions_banc to service_role;
create trigger solutions_banc_immutables before insert or update or delete on public.solutions_banc
  for each row execute function public.protect_published_children();

-- 3. Fonctions du Studio ------------------------------------------------------------------------
create or replace function public.studio_exiger_enseignant()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not (public.has_role(auth.uid(), 'enseignant') or public.has_role(auth.uid(), 'admin')) then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;
revoke all on function public.studio_exiger_enseignant() from public, anon, authenticated;

-- Liste : les sujets de l'enseignant (tous pour un administrateur), dernière version de chacun.
create or replace function public.studio_lister_sujets()
returns table (
  sujet_id text,
  titre text,
  niveau text,
  version_id uuid,
  numero int,
  publiee boolean,
  auteur_id uuid,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _uid uuid := public.studio_exiger_enseignant();
begin
  return query
  select s.id, s.titre, s.niveau, v.id, v.numero, v.publiee, s.auteur_id, v.updated_at
  from public.sujets s
  join lateral (
    select * from public.sujet_versions x where x.sujet_id = s.id order by x.numero desc limit 1
  ) v on true
  where public.has_role(_uid, 'admin') or s.auteur_id = _uid
  order by v.updated_at desc, s.id;
end;
$$;

-- Lecture complète d'une version (réservée à son auteur et aux administrateurs).
create or replace function public.studio_charger_version(_version_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _uid uuid := public.studio_exiger_enseignant();
  _v public.sujet_versions;
  _s public.sujets;
begin
  select * into _v from public.sujet_versions where id = _version_id;
  if _v.id is null then raise exception 'version_introuvable' using errcode = 'P0002'; end if;
  select * into _s from public.sujets where id = _v.sujet_id;
  if not (public.has_role(_uid, 'admin') or _s.auteur_id = _uid) then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'sujet_id', _s.id,
    'version_id', _v.id,
    'numero', _v.numero,
    'publiee', _v.publiee,
    'titre', _s.titre,
    'niveau', _s.niveau,
    'competence', _s.competence,
    'duree_min', _s.duree_min,
    'enonce_md', _v.enonce_md,
    'fichiers', coalesce((select jsonb_object_agg(f.chemin, f.contenu) from public.sujet_version_fichiers f where f.version_id = _v.id), '{}'::jsonb),
    'criteres', coalesce((select jsonb_agg(c.sonde order by c.ordre) from public.criteres c where c.version_id = _v.id), '[]'::jsonb),
    'indices', coalesce((select jsonb_agg(i.texte order by i.ordre) from public.indices i where i.version_id = _v.id), '[]'::jsonb),
    'solutions', coalesce((
      select jsonb_agg(jsonb_build_object('variante', g.variante, 'nom', g.nom, 'description', g.description, 'fichiers', g.fichiers) order by g.variante)
      from (
        select b.variante, max(b.nom) as nom, max(b.description) as description,
               jsonb_object_agg(b.chemin, b.contenu) as fichiers
        from public.solutions_banc b where b.version_id = _v.id group by b.variante
      ) g), '[]'::jsonb)
  );
end;
$$;

-- Enregistrement d'un brouillon : crée le sujet et la version 1, ou remplace le contenu d'un brouillon.
-- Le contenu d'une version publiée n'est jamais modifiable (triggers d'immuabilité).
create or replace function public.studio_enregistrer_brouillon(_version_id uuid, _contenu jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  _uid uuid := public.studio_exiger_enseignant();
  _sujet_id text := nullif(trim(_contenu ->> 'sujet_id'), '');
  _titre text := nullif(trim(_contenu ->> 'titre'), '');
  _niveau text := coalesce(_contenu ->> 'niveau', 'Facile');
  _vid uuid := _version_id;
  _numero int;
  _s public.sujets;
  _v public.sujet_versions;
  _crit jsonb;
  _ordre int := 0;
  _sol jsonb;
  _f record;
begin
  if _titre is null then raise exception 'titre_obligatoire' using errcode = '22023'; end if;
  if _niveau not in ('Facile', 'Moyen', 'Difficile') then
    raise exception 'niveau_invalide' using errcode = '22023';
  end if;

  if _vid is null then
    -- Création : un nouveau sujet, version 1.
    if _sujet_id is null or _sujet_id !~ '^[a-z0-9][a-z0-9-]{2,60}$' then
      raise exception 'identifiant_invalide' using errcode = '22023';
    end if;
    if exists (select 1 from public.sujets where id = _sujet_id) then
      raise exception 'identifiant_deja_utilise' using errcode = '23505';
    end if;
    insert into public.sujets (id, titre, niveau, competence, ordre, auteur_id, duree_min)
    values (_sujet_id, _titre, _niveau, coalesce(nullif(trim(_contenu ->> 'competence'), ''), 'À définir'),
            coalesce((select max(ordre) from public.sujets), 0) + 1, _uid,
            coalesce((_contenu ->> 'duree_min')::int, 30));
    insert into public.sujet_versions (sujet_id, numero, enonce_md, auteur_id)
    values (_sujet_id, 1, coalesce(_contenu ->> 'enonce_md', ''), _uid)
    returning id into _vid;
  else
    select * into _v from public.sujet_versions where id = _vid;
    if _v.id is null then raise exception 'version_introuvable' using errcode = 'P0002'; end if;
    select * into _s from public.sujets where id = _v.sujet_id;
    if not (public.has_role(_uid, 'admin') or _s.auteur_id = _uid) then
      raise exception 'acces_refuse' using errcode = '42501';
    end if;
    if _v.publiee then raise exception 'Version publiee immuable'; end if;

    update public.sujets
      set titre = _titre, niveau = _niveau,
          competence = coalesce(nullif(trim(_contenu ->> 'competence'), ''), competence),
          duree_min = coalesce((_contenu ->> 'duree_min')::int, duree_min)
      where id = _v.sujet_id;
    update public.sujet_versions
      set enonce_md = coalesce(_contenu ->> 'enonce_md', ''), updated_at = now()
      where id = _vid;

    delete from public.sujet_version_fichiers where version_id = _vid;
    delete from public.criteres where version_id = _vid;
    delete from public.indices where version_id = _vid;
    delete from public.solutions where version_id = _vid;
    delete from public.solutions_banc where version_id = _vid;
  end if;

  -- Fichiers de départ
  for _f in select key as chemin, value #>> '{}' as contenu
            from jsonb_each(coalesce(_contenu -> 'fichiers', '{}'::jsonb)) loop
    insert into public.sujet_version_fichiers (version_id, chemin, contenu) values (_vid, _f.chemin, coalesce(_f.contenu, ''));
  end loop;

  -- Critères : le critère JSON complet est conservé dans « sonde » (format json-v1).
  for _crit in select * from jsonb_array_elements(coalesce(_contenu -> 'criteres', '[]'::jsonb)) loop
    _ordre := _ordre + 1;
    insert into public.criteres (version_id, code, ordre, label, points, message_echec, sonde, attendu)
    values (_vid,
            coalesce(nullif(_crit ->> 'id', ''), 'c' || _ordre),
            _ordre,
            coalesce(nullif(_crit ->> 'titre', ''), nullif(_crit ->> 'label', ''), 'Critère ' || _ordre),
            greatest(coalesce((_crit ->> 'points')::int, 0), 0),
            coalesce(nullif(_crit ->> 'fail_message', ''), 'Critère non satisfait'),
            _crit,
            '{"format":"json-v1"}'::jsonb);
  end loop;

  -- Indices
  _ordre := 0;
  for _crit in select * from jsonb_array_elements(coalesce(_contenu -> 'indices', '[]'::jsonb)) loop
    _ordre := _ordre + 1;
    insert into public.indices (version_id, ordre, texte) values (_vid, _ordre, _crit #>> '{}');
  end loop;

  -- Solutions du banc didactique ; la solution canonique sert aussi de corrigé élève.
  for _sol in select * from jsonb_array_elements(coalesce(_contenu -> 'solutions', '[]'::jsonb)) loop
    if (_sol ->> 'variante') not in ('canonique', 'alternative', 'invalide') then
      raise exception 'variante_invalide' using errcode = '22023';
    end if;
    for _f in select key as chemin, value #>> '{}' as contenu from jsonb_each(coalesce(_sol -> 'fichiers', '{}'::jsonb)) loop
      insert into public.solutions_banc (version_id, variante, nom, description, chemin, contenu)
      values (_vid, _sol ->> 'variante', coalesce(_sol ->> 'nom', ''), coalesce(_sol ->> 'description', ''),
              _f.chemin, coalesce(_f.contenu, ''));
      if (_sol ->> 'variante') = 'canonique' then
        insert into public.solutions (version_id, chemin, contenu) values (_vid, _f.chemin, coalesce(_f.contenu, ''));
      end if;
    end loop;
  end loop;

  select numero into _numero from public.sujet_versions where id = _vid;
  return jsonb_build_object('version_id', _vid, 'numero', _numero);
end;
$$;

-- Suppression d'un brouillon (jamais d'une version publiée).
create or replace function public.studio_supprimer_brouillon(_version_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  _uid uuid := public.studio_exiger_enseignant();
  _v public.sujet_versions;
  _s public.sujets;
begin
  select * into _v from public.sujet_versions where id = _version_id;
  if _v.id is null then return; end if;
  select * into _s from public.sujets where id = _v.sujet_id;
  if not (public.has_role(_uid, 'admin') or _s.auteur_id = _uid) then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;
  if _v.publiee then raise exception 'Version publiee immuable'; end if;

  delete from public.sujet_version_fichiers where version_id = _version_id;
  delete from public.criteres where version_id = _version_id;
  delete from public.indices where version_id = _version_id;
  delete from public.solutions where version_id = _version_id;
  delete from public.solutions_banc where version_id = _version_id;
  delete from public.sujet_versions where id = _version_id;
  -- Le sujet disparaît avec sa dernière version.
  if not exists (select 1 from public.sujet_versions where sujet_id = _v.sujet_id) then
    delete from public.sujets where id = _v.sujet_id;
  end if;
end;
$$;

revoke all on function public.studio_lister_sujets() from public, anon;
revoke all on function public.studio_charger_version(uuid) from public, anon;
revoke all on function public.studio_enregistrer_brouillon(uuid, jsonb) from public, anon;
revoke all on function public.studio_supprimer_brouillon(uuid) from public, anon;
grant execute on function public.studio_lister_sujets() to authenticated;
grant execute on function public.studio_charger_version(uuid) to authenticated;
grant execute on function public.studio_enregistrer_brouillon(uuid, jsonb) to authenticated;
grant execute on function public.studio_supprimer_brouillon(uuid) to authenticated;
