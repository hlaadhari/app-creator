-- Libellés de critères pour la liste des contestations (issue #70).
-- La table criteres contient la correction (sonde, attendu) : elle n'a aucun GRANT client (T-04).
-- Cette fonction n'expose que l'identifiant, le code et le libellé, aux enseignants et administrateurs.

create or replace function public.critere_libelles(_ids uuid[])
returns table (id uuid, code text, label text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.has_role(auth.uid(), 'enseignant') or public.has_role(auth.uid(), 'admin')) then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  return query
  select c.id, c.code, c.label
  from public.criteres c
  where c.id = any(_ids);
end;
$$;

revoke all on function public.critere_libelles(uuid[]) from public, anon;
grant execute on function public.critere_libelles(uuid[]) to authenticated;
