-- Labo STI - Domaine 6 : Référentiel des Compétences Officielles du Bac STI, Calcul de Maîtrise et Badges (PRD F-57, F-58, F-59, F-60, Jalon M7)

-- 1. Table competences : Référentiel officiel arborescent du Bac STI
create table if not exists public.competences (
  id text primary key,
  code text unique not null,
  libelle text not null,
  description text,
  categorie text not null check (categorie in ('HTML', 'CSS', 'JAVASCRIPT', 'PHP', 'SQL', 'ALGO_ARCHI')),
  parent_id text references public.competences(id) on delete set null,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_competences_categorie on public.competences (categorie);
create index if not exists idx_competences_parent on public.competences (parent_id);

alter table public.competences enable row level security;
grant select on public.competences to anon, authenticated;
grant all on public.competences to service_role;

-- Tout le monde peut lire le référentiel officiel
drop policy if exists "Tout le monde lit les competences" on public.competences;
create policy "Tout le monde lit les competences"
  on public.competences for select to public
  using (true);

-- Seul admin ou service_role modifie les compétences
drop policy if exists "Admin modifie competences" on public.competences;
create policy "Admin modifie competences"
  on public.competences for all to authenticated
  using (
    public.has_role(auth.uid(),'admin')
  );


-- 2. Table critere_competences : Association N-N critères d'évaluation <-> compétences
create table if not exists public.critere_competences (
  critere_id uuid not null references public.criteres(id) on delete cascade,
  competence_id text not null references public.competences(id) on delete cascade,
  poids numeric(3,2) not null default 1.00 check (poids > 0),
  primary key (critere_id, competence_id)
);

create index if not exists idx_critere_competences_critere on public.critere_competences (critere_id);
create index if not exists idx_critere_competences_competence on public.critere_competences (competence_id);

alter table public.critere_competences enable row level security;
grant select on public.critere_competences to anon, authenticated;
grant all on public.critere_competences to service_role;

drop policy if exists "Tout le monde lit critere_competences" on public.critere_competences;
create policy "Tout le monde lit critere_competences"
  on public.critere_competences for select to public
  using (true);

drop policy if exists "Enseignant et admin gerent critere_competences" on public.critere_competences;
create policy "Enseignant et admin gerent critere_competences"
  on public.critere_competences for all to authenticated
  using (
    (public.has_role(auth.uid(),'enseignant') or public.has_role(auth.uid(),'admin'))
  );


-- 3. Table maitrise : Score de maîtrise individuel par élève et par compétence (0.000 à 1.000)
create table if not exists public.maitrise (
  eleve_id uuid not null references public.profiles(id) on delete cascade,
  competence_id text not null references public.competences(id) on delete cascade,
  niveau numeric(4,3) not null default 0.000 check (niveau >= 0.000 and niveau <= 1.000),
  nb_tentatives int not null default 0 check (nb_tentatives >= 0),
  nb_succes int not null default 0 check (nb_succes >= 0),
  premier_coup_succes boolean not null default false,
  dernier_succes timestamptz,
  version_formule text not null default 'v1.0',
  updated_at timestamptz not null default now(),
  primary key (eleve_id, competence_id)
);

create index if not exists idx_maitrise_eleve on public.maitrise (eleve_id);
create index if not exists idx_maitrise_competence on public.maitrise (competence_id);

alter table public.maitrise enable row level security;
grant select, insert, update on public.maitrise to authenticated;
grant all on public.maitrise to service_role;

-- T-01 : Élève ne consulte que ses propres scores de maîtrise
drop policy if exists "Eleve lit sa maitrise" on public.maitrise;
create policy "Eleve lit sa maitrise"
  on public.maitrise for select to authenticated
  using (eleve_id = auth.uid());

-- Élève insère ou met à jour ses scores
drop policy if exists "Eleve met a jour sa maitrise" on public.maitrise;
create policy "Eleve met a jour sa maitrise"
  on public.maitrise for all to authenticated
  using (eleve_id = auth.uid())
  with check (eleve_id = auth.uid());

-- T-02 : Enseignant consulte la maîtrise des élèves de ses classes
drop policy if exists "Enseignant lit maitrise de ses classes" on public.maitrise;
create policy "Enseignant lit maitrise de ses classes"
  on public.maitrise for select to authenticated
  using (
    exists (
      select 1 from public.class_members m
      join public.classes c on c.id = m.class_id
      where m.eleve_id = public.maitrise.eleve_id
        and c.enseignant_id = auth.uid()
        and m.left_at is null
    )
    or public.has_role(auth.uid(),'admin')
  );


-- 4. Tables badges_definition et badges
create table if not exists public.badges_definition (
  id text primary key,
  titre text not null,
  description text not null,
  icone text not null,
  categorie text not null,
  seuil_points int default 0,
  created_at timestamptz not null default now()
);

alter table public.badges_definition enable row level security;
grant select on public.badges_definition to anon, authenticated;
grant all on public.badges_definition to service_role;

drop policy if exists "Tout le monde lit badges_definition" on public.badges_definition;
create policy "Tout le monde lit badges_definition"
  on public.badges_definition for select to public
  using (true);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null references public.badges_definition(id) on delete cascade,
  obtenu_le timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  constraint uq_eleve_badge unique (eleve_id, badge_id)
);

create index if not exists idx_badges_eleve on public.badges (eleve_id);
create index if not exists idx_badges_badge on public.badges (badge_id);

alter table public.badges enable row level security;
grant select, insert on public.badges to authenticated;
grant all on public.badges to service_role;

-- T-01 : Élève lit ses propres badges
drop policy if exists "Eleve lit ses badges" on public.badges;
create policy "Eleve lit ses badges"
  on public.badges for select to authenticated
  using (eleve_id = auth.uid());

drop policy if exists "Eleve insere ses badges" on public.badges;
create policy "Eleve insere ses badges"
  on public.badges for insert to authenticated
  with check (eleve_id = auth.uid());

-- T-02 : Enseignant consulte les badges des élèves de ses classes
drop policy if exists "Enseignant lit badges de ses classes" on public.badges;
create policy "Enseignant lit badges de ses classes"
  on public.badges for select to authenticated
  using (
    exists (
      select 1 from public.class_members m
      join public.classes c on c.id = m.class_id
      where m.eleve_id = public.badges.eleve_id
        and c.enseignant_id = auth.uid()
        and m.left_at is null
    )
    or public.has_role(auth.uid(),'admin')
  );


-- 5. Fonction de calcul de maîtrise transparent v1.0
create or replace function public.calculer_score_maitrise_v1(
  p_succes int,
  p_tentatives int,
  p_premier_coup boolean,
  p_derniere_date timestamptz
)
returns numeric(4,3)
language plpgsql
immutable
as $$
declare
  v_taux numeric;
  v_bonus_premier numeric := 0.0;
  v_recence numeric := 1.0;
  v_jours_ecoules int;
  v_score numeric;
begin
  if p_tentatives <= 0 or p_succes <= 0 then
    return 0.000;
  end if;

  -- 1. Taux de succès brut (succès / tentatives)
  v_taux := least(1.0, (p_succes::numeric / greatest(p_tentatives::numeric, 1.0)));

  -- 2. Bonus premier coup (réussite directe)
  if p_premier_coup then
    v_bonus_premier := 0.15;
  end if;

  -- 3. Facteur de récence
  if p_derniere_date is not null then
    v_jours_ecoules := extract(day from (now() - p_derniere_date))::int;
    if v_jours_ecoules > 30 then
      v_recence := 0.90; -- légère atténuation après 1 mois d'inactivité
    end if;
  end if;

  -- Formule v1.0 : (0.70 * taux + 0.15 * bonus_premier + 0.15 * régularité) * récence
  v_score := (0.70 * v_taux + v_bonus_premier + 0.15 * least(1.0, p_succes::numeric / 3.0)) * v_recence;
  v_score := round(least(1.000, greatest(0.000, v_score)), 3);

  return v_score;
end;
$$;


-- 6. Seed des 25 compétences officielles Bac STI
insert into public.competences (id, code, libelle, description, categorie, ordre) values
  -- HTML
  ('HTML.STRUCT', 'HTML.STRUCT', 'Structure sémantique du document', 'Concevoir l arborescence HTML5 valide (doctype, html, head, meta, body).', 'HTML', 1),
  ('HTML.SEMANTIC', 'HTML.SEMANTIC', 'Balises de contenu et sémantique', 'Utiliser les balises adaptées (header, nav, main, article, section, footer).', 'HTML', 2),
  ('HTML.FORM', 'HTML.FORM', 'Conception de formulaires interactifs', 'Intégrer champs de saisie, labels, listes déroulantes et boutons de soumission.', 'HTML', 3),
  ('HTML.MEDIA', 'HTML.MEDIA', 'Multimédia et hyperliens', 'Intégrer liens hypertextes, ancres, images avec texte alternatif et médias.', 'HTML', 4),

  -- CSS
  ('CSS.SELECTORS', 'CSS.SELECTORS', 'Ciblage et sélecteurs CSS', 'Employer sélecteurs de balises, classes, identifiants et pseudo-classes.', 'CSS', 10),
  ('CSS.BOXMODEL', 'CSS.BOXMODEL', 'Modèle de boîte et dimensions', 'Contrôler marges internes, externes, bordures et dimensions des boîtes.', 'CSS', 11),
  ('CSS.FLEX', 'CSS.FLEX', 'Mise en page flexible (Flexbox)', 'Organiser les flux unidimensionnels (align-items, justify-content, flex-direction).', 'CSS', 12),
  ('CSS.GRID', 'CSS.GRID', 'Grille bidimensionnelle (CSS Grid)', 'Structurer des gabarits à colonnes et lignes multiples avec espacements (gap).', 'CSS', 13),
  ('CSS.RESPONSIVE', 'CSS.RESPONSIVE', 'Design adaptatif et Media Queries', 'Adapter la disposition aux résolutions mobiles et tablettes (@media).', 'CSS', 14),

  -- JAVASCRIPT
  ('JS.SYNTAX', 'JS.SYNTAX', 'Algorithmique & syntaxe JavaScript', 'Manipuler variables, types de base, conditions et structures itératives.', 'JAVASCRIPT', 20),
  ('JS.DOM', 'JS.DOM', 'Manipulation dynamique du DOM', 'Sélectionner des nœuds, modifier le texte, le balisage et les classes CSS.', 'JAVASCRIPT', 21),
  ('JS.EVENTS', 'JS.EVENTS', 'Gestion des événements utilisateur', 'Attacher des écouteurs addEventListener (click, change, submit) avec preventDefault.', 'JAVASCRIPT', 22),
  ('JS.VALIDATION', 'JS.VALIDATION', 'Validation de formulaire côté client', 'Vérifier la validité des champs de saisie (longueur, format, regex, feedback).', 'JAVASCRIPT', 23),
  ('JS.ASYNC', 'JS.ASYNC', 'Traitement temporel et asynchrone', 'Manipuler timers (setTimeout/setInterval) et requêtes asynchrones simples.', 'JAVASCRIPT', 24),

  -- PHP
  ('PHP.SYNTAX', 'PHP.SYNTAX', 'Fondamentaux et scripts PHP', 'Structurer un script PHP avec variables, boucles et fonctions personnalisées.', 'PHP', 30),
  ('PHP.SUPERGLOBALS_POST', 'PHP.SUPERGLOBALS_POST', 'Traitement des formulaires HTTP POST', 'Récupérer et assainir les données soumises via $_POST avec filtrage et validation.', 'PHP', 31),
  ('PHP.SESSIONS', 'PHP.SESSIONS', 'Gestion de sessions utilisateur', 'Initialiser et manipuler les sessions serveur ($_SESSION, session_start).', 'PHP', 32),
  ('PHP.DB_CONNECT', 'PHP.DB_CONNECT', 'Connexion et requêtes SQL en PHP', 'Interagir avec une base de données relationnelle via PDO ou MySQLi.', 'PHP', 33),
  ('PHP.ROUTING', 'PHP.ROUTING', 'Navigation et redirections serveur', 'Gérer les en-têtes HTTP de redirection (header Location) et inclusion de templates.', 'PHP', 34),

  -- SQL
  ('SQL.DDL', 'SQL.DDL', 'Définition de schéma relationnel (LDD)', 'Écrire des requêtes CREATE TABLE avec contraintes PRIMARY KEY, FOREIGN KEY, NOT NULL.', 'SQL', 40),
  ('SQL.DML_INSERT', 'SQL.DML_INSERT', 'Insertion et mise à jour de données', 'Insérer des enregistrements via INSERT INTO et mettre à jour via UPDATE.', 'SQL', 41),
  ('SQL.SELECT_BASIC', 'SQL.SELECT_BASIC', 'Sélection et filtrage de données', 'Interroger des tables avec SELECT, WHERE, ORDER BY, LIMIT.', 'SQL', 42),
  ('SQL.JOIN', 'SQL.JOIN', 'Jointures relationnelles', 'Relier plusieurs tables via INNER JOIN ou LEFT JOIN avec conditions ON.', 'SQL', 43),
  ('SQL.AGGREGATE', 'SQL.AGGREGATE', 'Agrégats et regroupements', 'Utiliser les fonctions COUNT, SUM, AVG avec GROUP BY et filtrage HAVING.', 'SQL', 44),

  -- ALGORITHMIQUE & ARCHITECTURE
  ('ALGO.LOGIC', 'ALGO.LOGIC', 'Décomposition algorithmique', 'Découper un problème technique en étapes unitaires vérifiables.', 'ALGO_ARCHI', 50),
  ('ARCHI.FULLSTACK', 'ARCHI.FULLSTACK', 'Architecture Web Client-Serveur', 'Agencer les couches front-end HTML/CSS/JS, back-end PHP et base SQL.', 'ALGO_ARCHI', 51)
on conflict (id) do update set
  libelle = excluded.libelle,
  description = excluded.description,
  categorie = excluded.categorie,
  ordre = excluded.ordre;


-- 7. Seed des badges officiels Bac STI
insert into public.badges_definition (id, titre, description, icone, categorie, seuil_points) values
  ('PREMIERS_PAS', 'Premiers Pas', 'Valider avec succès son premier critère d évaluation.', 'Sparkles', 'Général', 2),
  ('ARCHITECTE_HTML', 'Architecte Web', 'Atteindre au moins 70% de maîtrise sur les compétences HTML.', 'FileCode', 'HTML', 10),
  ('STYLISTE_CSS', 'Styliste CSS', 'Maîtriser les sélecteurs, le modèle de boîte et la mise en page flexbox.', 'Palette', 'CSS', 15),
  ('DOM_MASTER', 'Maître du DOM', 'Valider des interactions JavaScript dynamiques et des événements.', 'Zap', 'JavaScript', 15),
  ('ARTISAN_PHP', 'Artisan PHP', 'Traiter avec succès un formulaire POST complet côté serveur.', 'Server', 'PHP', 20),
  ('EXPLORATEUR_SQL', 'Explorateur SQL', 'Créer des tables et exécuter des requêtes SELECT relationnelles.', 'Database', 'SQL', 20),
  ('MAJOR_BAC_BLANC', 'Major de Promo', 'Obtenir une note supérieure ou égale à 16/20 sur une épreuve d examen blanc.', 'Trophy', 'Examen', 16),
  ('PERSEVERANT', 'Persévérant', 'Valider un critère exigeant après plus de 3 tentatives consécutives.', 'ShieldCheck', 'Mental', 5)
on conflict (id) do update set
  titre = excluded.titre,
  description = excluded.description,
  icone = excluded.icone,
  categorie = excluded.categorie,
  seuil_points = excluded.seuil_points;
