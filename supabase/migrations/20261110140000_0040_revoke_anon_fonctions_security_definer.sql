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

-- Fonctions d'API et d'aide RLS : réservées aux utilisateurs connectés
revoke execute on function public.debloquer_indice(uuid)                 from public, anon;
revoke execute on function public.debloquer_solution(uuid, text)         from public, anon;
revoke execute on function public.est_eleve_de_enseignant(uuid)          from public, anon;
revoke execute on function public.est_enseignant_classe(uuid)            from public, anon;
revoke execute on function public.est_enseignant_session(uuid)           from public, anon;
revoke execute on function public.est_membre_classe(uuid)                from public, anon;
revoke execute on function public.lancer_coup_denvoi_examen(uuid)        from public, anon;
revoke execute on function public.rejoindre_classe(text)                 from public, anon;

grant execute on function public.debloquer_indice(uuid)                  to authenticated;
grant execute on function public.debloquer_solution(uuid, text)          to authenticated;
grant execute on function public.est_eleve_de_enseignant(uuid)           to authenticated;
grant execute on function public.est_enseignant_classe(uuid)             to authenticated;
grant execute on function public.est_enseignant_session(uuid)            to authenticated;
grant execute on function public.est_membre_classe(uuid)                 to authenticated;
grant execute on function public.lancer_coup_denvoi_examen(uuid)         to authenticated;
grant execute on function public.rejoindre_classe(text)                  to authenticated;

-- Fonctions de déclencheur : aucun appel client
revoke execute on function public.attribuer_badges_apres_note_officielle()  from public, anon, authenticated;
revoke execute on function public.handle_new_user()                         from public, anon, authenticated;
revoke execute on function public.recalculer_maitrise_apres_tentative()     from public, anon, authenticated;
revoke execute on function public.verifier_capacite_tp_reservation()        from public, anon, authenticated;

-- Fonctions publiques par conception : droits rappelés explicitement
grant execute on function public.sujet_publie_pour_eleve(text)           to anon, authenticated;
grant execute on function public.nb_indices(uuid)                        to anon, authenticated;
