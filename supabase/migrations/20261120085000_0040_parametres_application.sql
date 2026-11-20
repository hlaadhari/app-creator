-- Issue #294 : table clé/valeur réutilisable pour les réglages d'application
-- (dont « tuteur_gemini_notebook » activable depuis /admin sans redéploiement).

create table if not exists public.parametres_application (
  cle text primary key,
  valeur jsonb not null,
  modifie_par uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_parametres_application_modifie_par
  on public.parametres_application(modifie_par);

alter table public.parametres_application enable row level security;

-- Lecture autorisée pour les utilisateurs authentifiés ; aucune écriture directe.
revoke all on public.parametres_application from public, anon, authenticated;
grant select on public.parametres_application to authenticated;
grant all on public.parametres_application to service_role;

drop policy if exists "parametres_application_select_authenticated" on public.parametres_application;
create policy "parametres_application_select_authenticated"
  on public.parametres_application
  for select
  to authenticated
  using (true);

-- Valeur initiale idempotente : désactivée par défaut.
insert into public.parametres_application (cle, valeur)
values (
  'tuteur_gemini_notebook',
  '{"actif": false, "url": "https://notebook.google.com/notebook/a42c871a-969a-42a2-8bb3-af3be46fcd65"}'::jsonb
)
on conflict (cle) do nothing;

-- RPC SECURITY DEFINER réservée aux administrateurs pour modifier un réglage autorisé.
create or replace function public.admin_definir_parametre(
  p_cle text,
  p_valeur jsonb
)
returns public.parametres_application
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_url text;
  v_row public.parametres_application;
begin
  if v_uid is null or not public.has_role(v_uid, 'admin'::public.app_role) then
    raise exception 'Accès refusé : droits administrateur requis.' using errcode = '42501';
  end if;

  if p_cle is null or p_cle not in ('tuteur_gemini_notebook') then
    raise exception 'Clé de paramètre non autorisée : %', coalesce(p_cle, '<null>') using errcode = '22023';
  end if;

  if p_valeur is null or jsonb_typeof(p_valeur) <> 'object' then
    raise exception 'La valeur du paramètre doit être un objet JSON.' using errcode = '22023';
  end if;

  if p_cle = 'tuteur_gemini_notebook' then
    if jsonb_typeof(p_valeur -> 'actif') <> 'boolean' then
      raise exception 'Le champ actif doit être un booléen.' using errcode = '22023';
    end if;

    if jsonb_typeof(p_valeur -> 'url') <> 'string' then
      raise exception 'Le champ url doit être une chaîne.' using errcode = '22023';
    end if;

    v_url := btrim(p_valeur ->> 'url');
    if v_url !~ '^https://(notebook|notebooklm)\.google\.com(/.*)?$' then
      raise exception 'URL non autorisée : seuls https://notebook.google.com et https://notebooklm.google.com sont acceptés.'
        using errcode = '22023';
    end if;

    p_valeur := jsonb_build_object(
      'actif', (p_valeur -> 'actif')::boolean,
      'url', v_url
    );
  end if;

  insert into public.parametres_application (cle, valeur, modifie_par, updated_at)
  values (p_cle, p_valeur, v_uid, now())
  on conflict (cle) do update set
    valeur = excluded.valeur,
    modifie_par = excluded.modifie_par,
    updated_at = excluded.updated_at
  returning * into v_row;

  insert into public.journal_securite (type, acteur_id, meta)
  values (
    'admin_parametre_modifie',
    v_uid,
    jsonb_build_object('cle', p_cle, 'valeur', p_valeur)
  );

  return v_row;
end;
$$;

revoke all on function public.admin_definir_parametre(text, jsonb) from public, anon;
grant execute on function public.admin_definir_parametre(text, jsonb) to authenticated, service_role;
