-- Migration 0024 : Taxonomie, référentiel explicite et provenance des sujets (Issue #131 / PED-01)
--
-- Formalise le référentiel pédagogique tunisien (4ème Sciences de l'Informatique - Matière STI)
-- et associe à chaque sujet du catalogue sa taxonomie, son année/session et sa source vérifiable.

create table if not exists public.referentiels (
  id text primary key,
  code text not null unique,
  libelle text not null,
  pays text not null default 'Tunisie',
  section text not null default 'Sciences de l''Informatique',
  niveau text not null default '4ème SI',
  matiere text not null default 'STI',
  description text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

grant select on public.referentiels to anon, authenticated;
grant all on public.referentiels to service_role;
alter table public.referentiels enable row level security;

create policy "Referentiels publics en lecture"
  on public.referentiels for select
  to anon, authenticated
  using (true);

-- Référentiel officiel principal
insert into public.referentiels (id, code, libelle, pays, section, niveau, matiere, description)
values (
  'bac-si-tn',
  'BAC_SI_TN',
  'Baccalauréat Sciences de l''Informatique - Épreuve Pratique STI',
  'Tunisie',
  'Sciences de l''Informatique',
  '4ème SI',
  'Systèmes et Technologies de l''Informatique (STI)',
  'Programme officiel tunisien pour la section Sciences de l''Informatique : Modules Web client (HTML5/CSS3/JS), Programmation serveur (PHP/MySQLi) et Bases de données relationnelles.'
)
on conflict (id) do update set
  code = excluded.code,
  libelle = excluded.libelle,
  matiere = excluded.matiere,
  description = excluded.description;

-- Ajout des colonnes de taxonomie et traçabilité sur les sujets
alter table public.sujets
  add column if not exists referentiel_id text references public.referentiels(id) on delete set null,
  add column if not exists type_sujet text not null default 'exercice',
  add column if not exists session_annee integer,
  add column if not exists session_libelle text,
  add column if not exists source_reference text,
  add column if not exists statut_validation text not null default 'valide_pedagogiquement';

-- Contraintes de domaine si non déjà posées
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sujets_type_sujet_check'
  ) then
    alter table public.sujets
      add constraint sujets_type_sujet_check
      check (type_sujet in ('exercice', 'tp', 'annale_officielle', 'annale_adaptee', 'sujet_original'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sujets_statut_validation_check'
  ) then
    alter table public.sujets
      add constraint sujets_statut_validation_check
      check (statut_validation in ('brouillon', 'en_revue', 'valide_pedagogiquement', 'archive'));
  end if;
end $$;

-- Renseignement de la provenance pour les sujets du catalogue
update public.sujets
set referentiel_id = 'bac-si-tn',
    type_sujet = 'exercice',
    source_reference = 'Labo STI — Équipe Pédagogique',
    statut_validation = 'valide_pedagogiquement'
where id in ('ex-html-css-01', 'ex-js-01', 'ex-sql-01');

update public.sujets
set referentiel_id = 'bac-si-tn',
    type_sujet = 'tp',
    source_reference = 'Labo STI — Équipe Pédagogique',
    statut_validation = 'valide_pedagogiquement'
where id = 'tp-fs-01';

update public.sujets
set referentiel_id = 'bac-si-tn',
    type_sujet = 'tp',
    session_annee = 2021,
    session_libelle = 'Session de contrôle',
    source_reference = 'Ministère de l''Éducation — Tunisie',
    statut_validation = 'valide_pedagogiquement'
where id = 'tp-fs-02';

update public.sujets
set referentiel_id = 'bac-si-tn',
    type_sujet = 'annale_officielle',
    session_annee = 2018,
    session_libelle = 'Session principale',
    source_reference = 'Ministère de l''Éducation — Tunisie',
    statut_validation = 'valide_pedagogiquement'
where id = 'exam-bac2018-test-drive';

update public.sujets
set referentiel_id = 'bac-si-tn',
    type_sujet = 'annale_officielle',
    session_annee = 2023,
    session_libelle = 'Session principale',
    source_reference = 'Ministère de l''Éducation — Tunisie',
    statut_validation = 'valide_pedagogiquement'
where id = 'exam-bac2023-location-habits';

update public.sujets
set referentiel_id = 'bac-si-tn',
    type_sujet = 'annale_officielle',
    session_annee = 2025,
    session_libelle = 'Sujet spécimen',
    source_reference = 'Inspection Générale de l''Informatique',
    statut_validation = 'valide_pedagogiquement'
where id = 'exam-bac2025-droits-acces';

update public.sujets
set referentiel_id = 'bac-si-tn',
    type_sujet = 'annale_adaptee',
    session_annee = 2026,
    session_libelle = 'Épreuve blanche (08h30)',
    source_reference = 'Examen Blanc — Conception Pédagogique',
    statut_validation = 'valide_pedagogiquement'
where id = 'exam-bac2026-bijoux-aurythia';

update public.sujets
set referentiel_id = 'bac-si-tn',
    type_sujet = 'annale_adaptee',
    session_annee = 2026,
    session_libelle = 'Épreuve blanche (12h30)',
    source_reference = 'Examen Blanc — Conception Pédagogique',
    statut_validation = 'valide_pedagogiquement'
where id = 'exam-bac2026-croisieres-marivana';
