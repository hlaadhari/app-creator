-- =============================================================================
-- Migration 0040 : fonctions SECURITY DEFINER inaccessibles sans connexion (Issue #259)
-- =============================================================================
-- Audit de capacité (phase B), avis « sécurité » de Supabase : 14 fonctions SECURITY DEFINER du
-- schéma public restaient appelables par le rôle anon (EXECUTE accordé à PUBLIC par défaut), donc
-- via /rest/v1/rpc sans aucune connexion. Chacune vérifie déjà auth.uid() ou ne sert qu'aux
-- politiques RLS des utilisateurs connectés, mais l'exposition est inutile : elle permet à un
-- robot de solliciter la base à vide.
--
--   - 8 fonctions d'API et d'aide RLS : EXECUTE retiré à PUBLIC et anon, conservé pour authenticated.
--     Aucune politique visant le rôle anon ne les utilise (vérifié sur pg_policies).
--   - 4 fonctions de déclencheur : jamais appelées par un client (une fonction de déclencheur ne
--     peut pas être invoquée directement) ; EXECUTE retiré aux rôles de l'API. PostgreSQL ne
--     contrôle ce droit qu'à la création du déclencheur, pas à son déclenchement.
--   - 2 fonctions volontairement laissées publiques : sujet_publie_pour_eleve (la page /sujet/$id
--     n'exige pas de connexion et son chargeur appelle cette fonction avec la clé anon ; elle ne
--     renvoie que le contenu publié, sans corrigé) et nb_indices (simple compteur affiché dans
--     l'atelier, y compris pour un visiteur).
-- Idempotente.
-- =============================================================================

-- Les fonctions sont désignées par leur nom et résolues dans pg_proc : certaines (ex.
-- est_enseignant_session) existent en production sans avoir été créées par une migration du dépôt ;
-- une base reconstruite à partir des seules migrations ne les a pas, et la migration doit passer
-- dans les deux cas.
do $$
declare
  _f record;
begin
  -- Fonctions d'API et d'aide RLS : réservées aux utilisateurs connectés
  for _f in
    select p.oid::regprocedure as sig from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('debloquer_indice', 'debloquer_solution', 'est_eleve_de_enseignant',
                        'est_enseignant_classe', 'est_enseignant_session', 'est_membre_classe',
                        'lancer_coup_denvoi_examen', 'rejoindre_classe')
  loop
    execute format('revoke execute on function %s from public, anon', _f.sig);
    execute format('grant execute on function %s to authenticated', _f.sig);
  end loop;

  -- Fonctions de déclencheur : aucun appel client
  for _f in
    select p.oid::regprocedure as sig from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('attribuer_badges_apres_note_officielle', 'handle_new_user',
                        'recalculer_maitrise_apres_tentative', 'verifier_capacite_tp_reservation')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', _f.sig);
  end loop;

  -- Fonctions publiques par conception : droits rappelés explicitement
  for _f in
    select p.oid::regprocedure as sig from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('sujet_publie_pour_eleve', 'nb_indices')
  loop
    execute format('grant execute on function %s to anon, authenticated', _f.sig);
  end loop;
end;
$$;
