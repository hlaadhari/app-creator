-- Migration 0023 : barèmes décimaux (issue #150).
--
-- Les examens ont un barème au quart de point (1,25 ; 0,75...). Les colonnes criteres.points,
-- tentatives.score et tentatives.max étaient des entiers : un critère à 1,25 point ne pouvait pas
-- être publié depuis le Studio, et une tentative d'examen à 10,75 points était refusée par la base.
-- Elles deviennent numeric(6,2). Les valeurs existantes sont conservées telles quelles.

alter table public.criteres
  alter column points type numeric(6,2) using points::numeric;

alter table public.tentatives
  alter column score type numeric(6,2) using score::numeric,
  alter column max type numeric(6,2) using max::numeric;

-- Le Studio enregistre désormais les points avec deux décimales.
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
            round(greatest(coalesce((_crit ->> 'points')::numeric, 0), 0), 2),
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
