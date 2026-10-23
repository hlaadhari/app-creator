-- ==============================================================================
-- Migration 0019 : Fiabilisation de la table tentatives et provenance (SEC-02 / Issue #116)
-- Respecte PRD v3.1 & Audit Sécurité (SEC-02, T-15) :
--   1. Ajoute la colonne source ('client' | 'serveur' | 'enseignant') sur public.tentatives.
--   2. Impose par politique RLS et trigger BEFORE INSERT que toute tentative
--      insérée par un élève ait obligatoirement source = 'client' (T-15).
--   3. Interdit toute modification (UPDATE/DELETE) a posteriori d'une tentative.
-- ==============================================================================

-- 1. Ajout de la colonne source sur public.tentatives
alter table public.tentatives
  add column if not exists source text not null default 'client'
  check (source in ('client', 'serveur', 'enseignant'));

create index if not exists idx_tentatives_source on public.tentatives (source);

-- Révocation préventive de UPDATE/DELETE sur public.tentatives pour anon et authenticated
revoke update, delete on public.tentatives from anon, authenticated;

-- 2. Mise à jour des politiques RLS d'insertion sur public.tentatives (T-15)
drop policy if exists "Eleve enregistre ses tentatives" on public.tentatives;

create policy "Eleve enregistre ses tentatives"
  on public.tentatives for insert to authenticated
  with check (
    source = 'client'
    and (eleve_id is null or eleve_id = auth.uid())
    and (
      projet_id is null
      or exists (
        select 1 from public.projets p
        where p.id = tentatives.projet_id
          and p.eleve_id = auth.uid()
      )
    )
    and (eleve_id = auth.uid() or projet_id is not null)
  );

drop policy if exists "Enseignant enregistre tentatives verifiees" on public.tentatives;

create policy "Enseignant enregistre tentatives verifiees"
  on public.tentatives for insert to authenticated
  with check (
    source in ('serveur', 'enseignant')
    and (
      public.has_role(auth.uid(), 'admin')
      or (eleve_id is not null and public.est_eleve_de_enseignant(eleve_id))
      or (
        projet_id is not null
        and exists (
          select 1 from public.projets p
          where p.id = tentatives.projet_id
            and public.est_eleve_de_enseignant(p.eleve_id)
        )
      )
    )
  );

-- Permettre également à l'enseignant de lire les tentatives rattachées par eleve_id sans projet_id
drop policy if exists "Enseignant lit tentatives de ses eleves" on public.tentatives;

create policy "Enseignant lit tentatives de ses eleves"
  on public.tentatives for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or (eleve_id is not null and public.est_eleve_de_enseignant(eleve_id))
    or (
      projet_id is not null
      and exists (
        select 1 from public.projets p
        where p.id = tentatives.projet_id
          and public.est_eleve_de_enseignant(p.eleve_id)
      )
    )
  );

drop policy if exists "Eleve lit ses tentatives" on public.tentatives;

create policy "Eleve lit ses tentatives"
  on public.tentatives for select to authenticated
  using (
    eleve_id = auth.uid()
    or (
      projet_id is not null
      and exists (
        select 1 from public.projets p
        where p.id = tentatives.projet_id
          and p.eleve_id = auth.uid()
      )
    )
  );

-- 3. Trigger de défense en profondeur T-15 : interdiction d'usurper source='serveur' ou 'enseignant'
create or replace function public.verifier_source_tentative()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _is_trusted_rpc boolean := coalesce(current_setting('app.tentative_rpc', true), '') = 'on';
begin
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    raise exception 'Les tentatives enregistrées sont immuables (T-15)';
  end if;

  if _uid is not null and not _is_trusted_rpc then
    if new.source in ('serveur', 'enseignant') then
      if not (
        public.has_role(_uid, 'admin')
        or public.has_role(_uid, 'enseignant')
      ) then
        raise exception 'Insertion d''une tentative avec source=% interdite pour un élève : seul source=''client'' est autorisé (T-15)', new.source;
      end if;
    end if;
  end if;

  if new.eleve_id is null and _uid is not null and new.source = 'client' then
    new.eleve_id := _uid;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_verifier_source_tentative on public.tentatives;
create trigger trg_verifier_source_tentative
before insert or update or delete on public.tentatives
for each row
execute function public.verifier_source_tentative();
