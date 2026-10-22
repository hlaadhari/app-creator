-- Studio de sujets : publication immuable, nouvelle version et livraison aux élèves (issue #94).
--
-- 1. studio_publier_version : fait passer un brouillon complet à l'état publié (définitif : les
--    triggers d'immuabilité interdisent ensuite toute modification). Le serveur re-vérifie la
--    structure (critères, fichiers, 3 solutions du banc) et conserve le rapport du banc didactique,
--    exécuté par le navigateur de l'enseignant (le moteur d'évaluation tourne côté client).
-- 2. studio_nouvelle_version : copie la dernière version publiée en brouillon numéro + 1.
-- 3. sujet_publie_pour_eleve : fournit à l'élève (connecté ou invité) le sujet publié et ses critères,
--    jamais les solutions ni les indices. Les critères sont de toute façon évalués dans le navigateur
--    de l'élève ; leur contenu est celui des critères déjà livrés avec l'application pour le catalogue.

alter table public.sujet_versions
  add column if not exists banc_rapport jsonb,
  add column if not exists banc_valide_at timestamptz;

-- 1. Publication ---------------------------------------------------------------------------------
create or replace function public.studio_publier_version(_version_id uuid, _rapport jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  _uid uuid := public.studio_exiger_enseignant();
  _v public.sujet_versions;
  _s public.sujets;
  _manque text;
begin
  select * into _v from public.sujet_versions where id = _version_id for update;
  if _v.id is null then raise exception 'version_introuvable' using errcode = 'P0002'; end if;
  select * into _s from public.sujets where id = _v.sujet_id;
  if not (public.has_role(_uid, 'admin') or _s.auteur_id = _uid) then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;
  if _v.publiee then raise exception 'Version publiee immuable'; end if;

  if coalesce((_rapport ->> 'ready')::boolean, false) is not true then
    raise exception 'banc_non_valide' using errcode = '22023';
  end if;
  if not exists (select 1 from public.criteres where version_id = _v.id) then
    raise exception 'criteres_manquants' using errcode = '22023';
  end if;
  if not exists (select 1 from public.criteres where version_id = _v.id and points > 0) then
    raise exception 'criteres_sans_points' using errcode = '22023';
  end if;
  if not exists (select 1 from public.sujet_version_fichiers where version_id = _v.id) then
    raise exception 'fichiers_manquants' using errcode = '22023';
  end if;
  if length(trim(_v.enonce_md)) = 0 then
    raise exception 'enonce_manquant' using errcode = '22023';
  end if;
  select v.variante into _manque
  from (values ('canonique'), ('alternative'), ('invalide')) as v(variante)
  where not exists (
    select 1 from public.solutions_banc b where b.version_id = _v.id and b.variante = v.variante
  )
  limit 1;
  if _manque is not null then
    raise exception 'solution_manquante' using errcode = '22023';
  end if;

  update public.sujet_versions
    set publiee = true, published_at = now(), banc_rapport = _rapport, banc_valide_at = now(), updated_at = now()
    where id = _v.id;

  return jsonb_build_object('version_id', _v.id, 'numero', _v.numero, 'sujet_id', _v.sujet_id);
end;
$$;

-- 2. Nouvelle version ----------------------------------------------------------------------------
create or replace function public.studio_nouvelle_version(_sujet_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  _uid uuid := public.studio_exiger_enseignant();
  _s public.sujets;
  _derniere public.sujet_versions;
  _brouillon public.sujet_versions;
  _nouvelle uuid;
begin
  select * into _s from public.sujets where id = _sujet_id;
  if _s.id is null then raise exception 'version_introuvable' using errcode = 'P0002'; end if;
  if not (public.has_role(_uid, 'admin') or _s.auteur_id = _uid) then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  select * into _derniere from public.sujet_versions where sujet_id = _sujet_id order by numero desc limit 1;
  if not _derniere.publiee then
    -- Un brouillon existe déjà : on ne crée pas de doublon.
    return jsonb_build_object('version_id', _derniere.id, 'numero', _derniere.numero);
  end if;

  insert into public.sujet_versions (sujet_id, numero, enonce_md, auteur_id)
  values (_sujet_id, _derniere.numero + 1, _derniere.enonce_md, _uid)
  returning id into _nouvelle;

  insert into public.sujet_version_fichiers (version_id, chemin, contenu)
    select _nouvelle, chemin, contenu from public.sujet_version_fichiers where version_id = _derniere.id;
  insert into public.criteres (version_id, code, ordre, label, points, message_echec, sonde, attendu)
    select _nouvelle, code, ordre, label, points, message_echec, sonde, attendu from public.criteres where version_id = _derniere.id;
  insert into public.indices (version_id, ordre, texte)
    select _nouvelle, ordre, texte from public.indices where version_id = _derniere.id;
  insert into public.solutions (version_id, chemin, contenu)
    select _nouvelle, chemin, contenu from public.solutions where version_id = _derniere.id;
  insert into public.solutions_banc (version_id, variante, nom, description, chemin, contenu)
    select _nouvelle, variante, nom, description, chemin, contenu from public.solutions_banc where version_id = _derniere.id;

  return jsonb_build_object('version_id', _nouvelle, 'numero', _derniere.numero + 1);
end;
$$;

-- 3. Sujet publié pour l'élève ------------------------------------------------------------------
create or replace function public.sujet_publie_pour_eleve(_sujet_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _v public.sujet_versions;
  _s public.sujets;
begin
  select * into _s from public.sujets where id = _sujet_id;
  if _s.id is null then return null; end if;
  select * into _v from public.sujet_versions
    where sujet_id = _sujet_id and publiee order by numero desc limit 1;
  if _v.id is null then return null; end if;

  return jsonb_build_object(
    'sujet_id', _s.id,
    'version_id', _v.id,
    'numero', _v.numero,
    'titre', _s.titre,
    'niveau', _s.niveau,
    'competence', _s.competence,
    'duree_min', _s.duree_min,
    'enonce_md', _v.enonce_md,
    'fichiers', coalesce((select jsonb_object_agg(f.chemin, f.contenu) from public.sujet_version_fichiers f where f.version_id = _v.id), '{}'::jsonb),
    -- Seuls les critères au format du Studio (json-v1) sont livrés : les anciens critères
    -- (sonde/attendu) des sujets d'initiation restent évalués par le catalogue embarqué.
    'criteres', coalesce((select jsonb_agg(c.sonde order by c.ordre) from public.criteres c
                          where c.version_id = _v.id and c.attendu ->> 'format' = 'json-v1'), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.studio_publier_version(uuid, jsonb) from public, anon;
revoke all on function public.studio_nouvelle_version(text) from public, anon;
revoke all on function public.sujet_publie_pour_eleve(text) from public;
grant execute on function public.studio_publier_version(uuid, jsonb) to authenticated;
grant execute on function public.studio_nouvelle_version(text) to authenticated;
grant execute on function public.sujet_publie_pour_eleve(text) to anon, authenticated;
