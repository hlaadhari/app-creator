-- Correction (issue #52) : récursion infinie de RLS en production.
-- Les politiques "Admin lit tous les roles" (user_roles) et "Admin lit tous les profils" (profiles)
-- interrogeaient user_roles dans leur propre définition (SQLSTATE 42P17 -> HTTP 500 sur
-- profiles, user_roles et toute jointure vers profiles). Elles existaient dans la base déployée
-- mais pas dans les migrations. On les remplace par has_role() (SECURITY DEFINER, sans récursion).

drop policy if exists "Admin lit tous les roles" on public.user_roles;
create policy "Admin lit tous les roles"
  on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admin lit tous les profils" on public.profiles;
create policy "Admin lit tous les profils"
  on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Un enseignant lit les profils (nom, prénom) des élèves actifs de ses classes :
-- nécessaire à la jointure class_members -> profiles du tableau de bord.
drop policy if exists "Enseignant lit profils de ses eleves" on public.profiles;
create policy "Enseignant lit profils de ses eleves"
  on public.profiles for select to authenticated
  using (public.est_eleve_de_enseignant(id));
