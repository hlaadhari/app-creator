-- ==============================================================================
-- Migration 0030 : Confidentialité des réservations de postes TP côté élève (#199)
--
-- Problème constaté (#199) :
--   1. La politique RLS "Lecture des reservations TP" sur public.tp_reservations
--      autorisait tout élève membre de la classe (ou sur une séance sans classe)
--      à faire un SELECT * sur les réservations de tous les autres élèves,
--      exposant leurs identifiants (student_id) et leurs noms (notes).
--   2. Côté élève, la grille de salle a besoin de connaître l'état d'occupation
--      des postes (numéro de siège + statut pending/approved) sans jamais exposer
--      l'identité des autres élèves.
--
-- Correctif :
--   1. Restreindre la lecture directe de public.tp_reservations à l'élève
--      propriétaire de sa propre réservation (student_id = auth.uid()), à
--      l'enseignant responsable de la séance/classe et aux administrateurs.
--   2. Fournir la RPC SECURITY DEFINER public.lister_occupation_postes_tp(_session_id)
--      qui retourne l'état des postes de la séance en masquant student_id,
--      student_name et notes pour les réservations appartenant aux autres élèves.
-- ==============================================================================

drop policy if exists "Lecture des reservations TP" on public.tp_reservations;

create policy "Lecture des reservations TP"
  on public.tp_reservations for select to authenticated
  using (
    student_id = auth.uid()
    or public.has_role(auth.uid(), 'admin')
    or (
      public.has_role(auth.uid(), 'enseignant')
      and exists (
        select 1 from public.tp_sessions s
        where s.id = session_id
        and (
          s.created_by = auth.uid()
          or (s.class_id is not null and public.est_enseignant_classe(s.class_id))
        )
      )
    )
  );

create or replace function public.lister_occupation_postes_tp(_session_id uuid)
returns table (
  id uuid,
  session_id uuid,
  seat_number int,
  status text,
  created_at timestamptz,
  is_mine boolean,
  student_id uuid,
  student_name text,
  notes text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.tp_sessions%rowtype;
  v_est_superviseur boolean := false;
  v_a_acces boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  select * into v_session
  from public.tp_sessions s
  where s.id = _session_id;

  if not found then
    return;
  end if;

  v_est_superviseur :=
    public.has_role(v_uid, 'admin')
    or (
      public.has_role(v_uid, 'enseignant')
      and (
        v_session.created_by = v_uid
        or (v_session.class_id is not null and public.est_enseignant_classe(v_session.class_id))
      )
    );

  v_a_acces :=
    v_est_superviseur
    or v_session.class_id is null
    or public.est_membre_classe(v_session.class_id);

  if not v_a_acces then
    return;
  end if;

  return query
  select
    r.id,
    r.session_id,
    r.seat_number,
    r.status,
    r.created_at,
    (r.student_id = v_uid) as is_mine,
    case
      when v_est_superviseur or r.student_id = v_uid then r.student_id
      else null
    end as student_id,
    case
      when v_est_superviseur or r.student_id = v_uid then
        coalesce(
          nullif(trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), ''),
          nullif(trim(coalesce(r.notes, '')), '')
        )
      else null
    end as student_name,
    case
      when v_est_superviseur or r.student_id = v_uid then r.notes
      else null
    end as notes
  from public.tp_reservations r
  left join public.profiles p on p.id = r.student_id
  where r.session_id = _session_id
  order by r.seat_number asc;
end;
$$;

revoke all on function public.lister_occupation_postes_tp(uuid) from public, anon;
grant execute on function public.lister_occupation_postes_tp(uuid) to authenticated, service_role;
