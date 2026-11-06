-- Issue #185 : dépôt d'une contestation par code de critère.
-- Le client ne connaît ni l'UUID du critère (table masquée à l'élève) ni la version publiée :
-- cette RPC les résout côté serveur et insère pour l'élève authentifié uniquement.

create or replace function public.deposer_contestation(
  p_sujet_id text,
  p_critere_code text,
  p_texte text,
  p_projet_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_version uuid;
  v_critere uuid;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'authentification_requise' using errcode = '28000';
  end if;

  select v.id into v_version
  from public.sujet_versions v
  where v.sujet_id = p_sujet_id and v.publiee
  order by v.numero desc
  limit 1;
  if v_version is null then
    raise exception 'sujet_introuvable' using errcode = 'P0002';
  end if;

  select c.id into v_critere
  from public.criteres c
  where c.version_id = v_version and lower(c.code) = lower(p_critere_code);
  if v_critere is null then
    raise exception 'critere_introuvable' using errcode = 'P0002';
  end if;

  insert into public.contestations (critere_id, eleve_id, projet_id, sujet_version_id, texte)
  values (v_critere, v_user, p_projet_id, v_version, p_texte)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.deposer_contestation(text, text, text, uuid) from public, anon;
grant execute on function public.deposer_contestation(text, text, text, uuid) to authenticated;
