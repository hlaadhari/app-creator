# Modèle de Données & Schéma Postgres — Labo STI

> **Source de référence** : PRD v3.1 (§11)  
> **Dernière mise à jour** : 18 octobre 2026

---

## 1. Vue d'Ensemble des 26 Tables

Le schéma de données Postgres est divisé en **6 domaines fonctionnels** :

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             DOMAINE 1 : UTILISATEURS & CLASSES                   │
│   profiles · user_roles · classes · class_invitations · class_members            │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
┌───────────────────────────────────────┼──────────────────────────────────────────┐
│                                       ▼                                          │
│   DOMAINE 2 : SUJETS & VERSIONS (IMMUABLES)       DOMAINE 3 : CRITÈRES & AIDES    │
│   sujets · sujet_versions                         criteres · critere_competences │
│   sujet_version_fichiers · sujet_version_bases    indices · indices_debloques    │
│   solutions · class_sujets                        contestations                  │
└───────────────────────────────────────┬──────────────────────────────────────────┘
                                        │
┌───────────────────────────────────────┼──────────────────────────────────────────┐
│                                       ▼                                          │
│   DOMAINE 4 : PROJETS & TRAVAUX ÉLÈVES            DOMAINE 5 : EXAMENS & NOTES    │
│   projets · projet_fichiers · projet_bases        sessions_examen                │
│   tentatives · snapshots                          passages_examen · notes        │
└───────────────────────────────────────┬──────────────────────────────────────────┘
                                        │
┌───────────────────────────────────────▼──────────────────────────────────────────┐
│                   DOMAINE 6 : COMPÉTENCES, PILOTAGE & AUDIT                      │
│   competences · maitrise · badges · commentaires · journal_securite              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Spécification Détaillée des Tables

### 2.1 Domaine 1 : Utilisateurs et Classes

#### `profiles`
Rattachée à `auth.users(id)`.
- `id` (uuid, PK, references `auth.users`)
- `nom` (text, not null)
- `prenom` (text, not null)
- `statut` (text, check `statut in ('actif', 'suspendu')`, default `'actif'`)
- `valide_par` (uuid, references `profiles(id)`, nullable - pour validation enseignant par admin)
- `created_at` (timestamptz, default `now()`)

#### `user_roles`
Gère les rôles applicatifs (`eleve`, `enseignant`, `admin`).
- `id` (uuid, PK, default `gen_random_uuid()`)
- `user_id` (uuid, references `auth.users`, not null)
- `role` (enum `app_role`: `'eleve'`, `'enseignant'`, `'admin'`)
- *Contrainte* : `UNIQUE(user_id, role)`

#### `classes`
- `id` (uuid, PK, default `gen_random_uuid()`)
- `nom` (text, not null - ex: "Terminale STI2D 1")
- `enseignant_id` (uuid, references `profiles(id)`, not null)
- `annee` (text, not null - ex: "2026-2027")
- `archivee` (boolean, default false)
- `created_at` (timestamptz, default `now()`)

#### `class_invitations`
- `id` (uuid, PK, default `gen_random_uuid()`)
- `class_id` (uuid, references `classes(id)` on delete cascade, not null)
- `code` (text, unique, not null - ex: "STI-7842")
- `expire_le` (timestamptz, not null)
- `revoque` (boolean, default false)
- `utilisations_max` (int, default 35)
- `nb_utilisations` (int, default 0)

#### `class_members`
- `class_id` (uuid, references `classes(id)` on delete cascade)
- `eleve_id` (uuid, references `profiles(id)` on delete cascade)
- `joined_at` (timestamptz, default `now()`)
- `left_at` (timestamptz, nullable)
- *PK* : `(class_id, eleve_id)`

---

### 2.2 Domaine 2 : Sujets et Versions Immuables

#### `sujets`
- `id` (text, PK - slug lisible ou uuid)
- `auteur_id` (uuid, references `profiles(id)`, nullable)
- `titre` (text, not null)
- `categorie` (text, not null - 'HTML/CSS', 'JavaScript', 'PHP/SQL', 'Examen')
- `type` (text, check `type in ('tp', 'examen')`, default `'tp'`)
- `brouillon_courant` (jsonb, nullable)
- `created_at` (timestamptz, default `now()`)

#### `sujet_versions` (**Immuable**)
- `id` (uuid, PK, default `gen_random_uuid()`)
- `sujet_id` (text, references `sujets(id)` on delete restrict, not null)
- `numero` (int, not null)
- `enonce` (text[], not null default `'{}'`)
- `enonce_md` (text, not null default `''`)
- `niveau` (text, check `niveau in ('Facile','Moyen','Difficile')`, default `'Moyen'`)
- `duree_min` (int, default 60)
- `hash_contenu` (text, nullable)
- `publiee` (boolean, default false)
- `published_at` (timestamptz, nullable)
- *Contrainte* : `UNIQUE(sujet_id, numero)`

#### `sujet_version_fichiers` (**Immuable**)
Fichiers initiaux du sujet fournis à l'élève.
- `id` (uuid, PK, default `gen_random_uuid()`)
- `version_id` (uuid, references `sujet_versions(id)` on delete restrict, not null)
- `chemin` (text, not null - ex: 'index.html', 'style.css')
- `contenu` (text, not null default `''`)
- `storage_path` (text, nullable)
- `role` (text, check `role in ('depart', 'corrige', 'ressource')`, default `'depart'`)
- *Contrainte* : `UNIQUE(version_id, chemin)`

#### `sujet_version_bases` (**Immuable**)
Scripts SQL initiaux pour la version.
- `id` (uuid, PK, default `gen_random_uuid()`)
- `version_id` (uuid, references `sujet_versions(id)` on delete restrict, not null)
- `nom` (text, not null - ex: 'schema.sql')
- `storage_path` (text, not null)

#### `class_sujets`
Association entre une classe et une version de sujet.
- `id` (uuid, PK, default `gen_random_uuid()`)
- `class_id` (uuid, references `classes(id)` on delete cascade, not null)
- `version_id` (uuid, references `sujet_versions(id)` on delete restrict, not null)
- `ouvert` (boolean, default true)
- `date_limite` (timestamptz, nullable)
- `regles` (jsonb, default `'{}'`)

---

### 2.3 Domaine 3 : Critères de Validation, Indices et Corrigés

#### `criteres`
Critères de correction automatique au format JSON déclaratif.
- `id` (uuid, PK, default `gen_random_uuid()`)
- `version_id` (uuid, references `sujet_versions(id)` on delete restrict, not null)
- `code` (text, not null)
- `ordre` (int, not null)
- `label` (text, not null)
- `points` (int, not null default 1)
- `message_echec` (text, not null)
- `sonde` (jsonb, not null)
- `attendu` (jsonb, not null)
- `masque` (boolean, default false)
- `actif` (boolean, default true)
- *Contrainte* : `UNIQUE(version_id, code)`

#### `solutions` (**Confidentiel**)
Corrigé type officiel. Ne fait l'objet d'aucun `GRANT` en lecture aux élèves.
- `id` (uuid, PK, default `gen_random_uuid()`)
- `version_id` (uuid, references `sujet_versions(id)` on delete restrict, not null)
- `chemin` (text, not null)
- `contenu` (text, not null)
- *Contrainte* : `UNIQUE(version_id, chemin)`

#### `indices`
- `id` (uuid, PK, default `gen_random_uuid()`)
- `version_id` (uuid, references `sujet_versions(id)` on delete restrict, not null)
- `critere_id` (uuid, references `criteres(id)`, nullable)
- `ordre` (int, not null)
- `niveau` (int, check `niveau between 1 and 3`, default 1)
- `texte` (text, not null)

#### `indices_debloques`
Historique d'accès aux indices pour traçabilité pédagogique.
- `user_id` (uuid, references `auth.users(id)` on delete cascade)
- `indice_id` (uuid, references `indices(id)` on delete cascade)
- `unlocked_at` (timestamptz, default `now()`)
- *PK* : `(user_id, indice_id)`

#### `contestations`
Permet à un élève de signaler un critère jugé erroné ou ambigu.
- `id` (uuid, PK, default `gen_random_uuid()`)
- `critere_id` (uuid, references `criteres(id)`, not null)
- `eleve_id` (uuid, references `profiles(id)`, not null)
- `texte` (text, not null)
- `statut` (text, check `statut in ('en_attente', 'acceptee', 'rejetee')`, default `'en_attente'`)
- `created_at` (timestamptz, default `now()`)

---

### 2.4 Domaine 4 : Projets Élèves et Snapshots

#### `projets`
- `id` (uuid, PK, default `gen_random_uuid()`)
- `eleve_id` (uuid, references `profiles(id)` on delete cascade, not null)
- `version_id` (uuid, references `sujet_versions(id)` on delete restrict, not null)
- `statut` (text, check `statut in ('non_commence', 'en_cours', 'rendu')`, default `'en_cours'`)
- `created_at` (timestamptz, default `now()`)
- `updated_at` (timestamptz, default `now()`)
- *Contrainte* : `UNIQUE(eleve_id, version_id)`

#### `projet_fichiers`
- `id` (uuid, PK, default `gen_random_uuid()`)
- `projet_id` (uuid, references `projets(id)` on delete cascade, not null)
- `chemin` (text, not null)
- `contenu` (text, not null default `''`)
- `storage_path` (text, nullable)
- `rev` (int, not null default 1)
- `supprime` (boolean, default false)
- `updated_at` (timestamptz, default `now()`)
- *Contrainte* : `UNIQUE(projet_id, chemin)`

#### `tentatives`
Consigne chaque clic sur le bouton « Vérifier ».
- `id` (uuid, PK, default `gen_random_uuid()`)
- `projet_id` (uuid, references `projets(id)` on delete cascade, not null)
- `score` (int, not null)
- `max` (int, not null)
- `detail` (jsonb, not null)
- `version_moteur` (text, not null)
- `version_criteres` (int, not null)
- `snapshot_id` (uuid, nullable)
- `date` (timestamptz, default `now()`)

#### `snapshots` (**Immuable**)
Copie certifiée scellée lors de la fin d'un examen ou d'une remise officielle.
- `id` (uuid, PK, default `gen_random_uuid()`)
- `projet_id` (uuid, references `projets(id)` on delete restrict, not null)
- `date` (timestamptz, default `now()`)
- `hash` (text, not null)
- `manifeste` (jsonb, not null - contient l'arborescence exacte et le hash de chaque fichier)
- `storage_archive_path` (text, not null)

---

### 2.5 Domaine 5 : Sessions d'Examen et Notations

#### `sessions_examen`
- `id` (uuid, PK, default `gen_random_uuid()`)
- `class_id` (uuid, references `classes(id)`, not null)
- `version_id` (uuid, references `sujet_versions(id)`, not null)
- `debut_prevu` (timestamptz, not null)
- `duree_min` (int, not null default 120)
- `debut_serveur` (timestamptz, nullable)
- `statut` (text, check `statut in ('planifie', 'salle_attente', 'en_cours', 'termine')`, default `'planifie'`)

#### `passages_examen`
- `id` (uuid, PK, default `gen_random_uuid()`)
- `session_id` (uuid, references `sessions_examen(id)` on delete cascade, not null)
- `eleve_id` (uuid, references `profiles(id)`, not null)
- `statut` (text, check `statut in ('en_attente', 'en_cours', 'verrouille', 'rendu', 'corrige')`, default `'en_attente'`)
- `debut_reel` (timestamptz, nullable)
- `echeance_serveur` (timestamptz, nullable)
- `temps_supp_min` (int, default 0 - aménagement tiers-temps)
- `evenements` (jsonb, default `'[]'`)
- `snapshot_final_id` (uuid, references `snapshots(id)`, nullable)

#### `notes`
- `id` (uuid, PK, default `gen_random_uuid()`)
- `passage_id` (uuid, references `passages_examen(id)`, nullable)
- `snapshot_id` (uuid, references `snapshots(id)`, not null)
- `note_auto` (numeric(4,2), not null)
- `note_finale` (numeric(4,2), not null)
- `grille` (jsonb, not null)
- `justification` (text, default `''`)
- `corrige_par` (uuid, references `profiles(id)`, not null)
- `historique` (jsonb, default `'[]'`)
- `created_at` (timestamptz, default `now()`)

---

### 2.6 Domaine 6 : Compétences, Motivation et Audit

#### `competences`
- `id` (text, PK - ex: 'HTML.STRUCT', 'CSS.FLEX', 'JS.EVENT', 'PHP.FORM', 'SQL.SELECT')
- `code` (text, unique, not null)
- `libelle` (text, not null)
- `categorie` (text, not null)
- `parent_id` (text, references `competences(id)`, nullable)

#### `maitrise`
- `eleve_id` (uuid, references `profiles(id)` on delete cascade)
- `competence_id` (text, references `competences(id)` on delete cascade)
- `niveau` (numeric(3,2), not null default 0.0)
- `version_formule` (text, not null default 'v1.0')
- `updated_at` (timestamptz, default `now()`)
- *PK* : `(eleve_id, competence_id)`

#### `journal_securite`
Journalisation minimale et anonymisée (conformité RGPD) des événements anormaux.
- `id` (uuid, PK, default `gen_random_uuid()`)
- `type` (text, not null - ex: 'TENTATIVE_ECRITURE_HORS_DELAI', 'BRUTEFORCE_INVITATION')
- `acteur_id` (uuid, nullable)
- `date` (timestamptz, default `now()`)
- `meta` (jsonb, default `'{}'`)

---

## 3. Triggers d'Immuabilité Déjà Actifs

Le fichier de migration `drizzle/migrations/0001_etape2_sujets.sql` applique d'ores et déjà les triggers de protection d'intégrité :

```sql
-- Blocage strict des modifications sur sujet_versions publiées
create or replace function public.protect_published_version()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op in ('DELETE', 'UPDATE') and old.publiee then 
    raise exception 'Version publiee immuable'; 
  end if;
  return coalesce(new, old);
end $$;

-- Protection des entités enfants rattachées à une version publiée
create or replace function public.protect_published_children()
returns trigger language plpgsql set search_path = public as $$
declare _vid uuid;
begin
  _vid := case when tg_op = 'DELETE' then old.version_id else new.version_id end;
  if exists (select 1 from public.sujet_versions where id = _vid and publiee) then
    raise exception 'Version publiee immuable';
  end if;
  return coalesce(new, old);
end $$;
```
Ces triggers sont reliés aux tables `sujet_version_fichiers`, `criteres`, `solutions` et `indices`.

## Studio de sujets (migration 0014, issue #92)

- `sujets` gagne `auteur_id` et `duree_min` ; `sujet_versions` gagne `enonce_md`, `auteur_id`, `updated_at`.
- La politique « Catalogue public » de `sujets` ne montre que les sujets ayant au moins une version publiée : un brouillon n'apparaît jamais chez les élèves.
- `solutions_banc` (aucun GRANT, immuable une fois la version publiée) contient les 3 variantes du banc didactique (`canonique`, `alternative`, `invalide`), multi-fichiers. La variante canonique est aussi copiée dans `solutions` (corrigé élève) : une variante invalide n'est jamais servie par `debloquer_solution`.
- `criteres.sonde` contient le critère JSON complet (format des `content/<sujet>/criteria.json`), `criteres.attendu` vaut `{"format":"json-v1"}`.
- Fonctions `studio_lister_sujets`, `studio_charger_version`, `studio_enregistrer_brouillon`, `studio_supprimer_brouillon` : SECURITY DEFINER, réservées aux enseignants et administrateurs, écriture limitée à l'auteur (ou à un administrateur) et refusée sur une version publiée.

## Publication des sujets du Studio (migration 0015, issue #94)

- `sujet_versions` gagne `banc_rapport` et `banc_valide_at` : rapport du banc didactique fourni par le navigateur de l'enseignant (le moteur d'évaluation tourne côté client) au moment de la publication.
- `studio_publier_version(version, rapport)` : auteur ou admin ; refuse sans rapport `ready`, sans critère, sans point, sans fichier, sans énoncé ou sans les 3 variantes du banc. La version devient définitivement immuable (triggers existants).
- `studio_nouvelle_version(sujet)` : copie la dernière version publiée (fichiers, critères, indices, solutions, banc) en brouillon numéro + 1 ; renvoie le brouillon existant s'il y en a déjà un.
- `sujet_publie_pour_eleve(sujet)` (anon et authenticated) : dernière version publiée, énoncé, fichiers de départ et critères au format `json-v1` ; jamais les solutions ni les indices. Les critères sont évalués dans le navigateur de l'élève, comme ceux du catalogue embarqué.
- Limite connue : la validité du banc est attestée par le navigateur de l'enseignant ; le serveur ne ré-exécute pas les solutions.
- Les métadonnées d'un sujet (`sujets.titre`, `niveau`, `duree_min`, `competence`) ne sont pas versionnées : les modifier depuis un brouillon v2 les change aussi pour la version publiée v1.

## Critères « corrigés par l'enseignant » (issue #98)

Un critère JSON (`criteres.sonde`) peut porter `"correction": "enseignant"` : il n'est jamais noté automatiquement (même s'il a une sonde), l'élève le voit annoncé comme corrigé par son enseignant, et ses points sont comptés comme « non vérifiables » (jamais gagnés d'office). Le banc didactique accepte ces critères mais exige qu'au moins un critère ait une vérification automatique ; un critère sans vérification qui n'est pas déclaré ainsi continue de bloquer la publication. Aucune migration : la valeur est stockée dans le JSON du critère. La saisie de la note de ces critères par l'enseignant n'est pas couverte par ce changement.

## Vérification par cas « js_test_cas » (issue #102)

Critère JSON `{"type": "js_test_cas", "function_name": "verif1", "cas": [...]}`. Chaque cas : `saisies` (id de champ → texte, booléen pour une case, ou date relative `+10j` / `-1j`), `appel` (fonction, sinon `function_name`), puis `attendu` (retour true/false), `etat` (état de champs après l'appel) ou `texte` (texte affiché). Tous les cas doivent réussir ; les champs sont restaurés après chaque cas ; un champ ou une fonction absents font échouer le cas. Si tous les cas attendent « false », la vérification est refusée (le code de départ la satisferait).
