-- Les privilèges par défaut de Supabase accordent ALL sur chaque nouvelle table à anon et authenticated.
-- Les migrations précédentes ne les ont jamais révoqués : seule la RLS protégeait les tables
-- (dont solutions et criteres, qui doivent n'avoir AUCUN GRANT pour anon/authenticated, AGENTS.md §2.3).
-- On révoque tout, puis on rétablit uniquement les droits prévus par les migrations 0000 à 0006.

revoke all on all tables in schema public from anon, authenticated;

-- Pas de droits automatiques sur les tables futures : chaque migration accorde explicitement ce qu'il faut.
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select on public.badges_definition, public.competences, public.critere_competences,
  public.sujet_version_fichiers, public.sujet_versions, public.sujets to anon, authenticated;

grant select on public.indices, public.indices_debloques, public.user_roles to authenticated;
grant insert on public.journal_securite to authenticated;
grant select, insert on public.badges, public.journal_acces_solutions,
  public.snapshots, public.tentatives to authenticated;
grant select, insert, update on public.class_invitations, public.class_members, public.contestations,
  public.maitrise, public.notes, public.passages_examen, public.profiles, public.projets to authenticated;
grant select, insert, update, delete on public.class_sujets, public.classes,
  public.projet_fichiers, public.sessions_examen to authenticated;
-- solutions, criteres : volontairement aucun grant (service_role uniquement).
