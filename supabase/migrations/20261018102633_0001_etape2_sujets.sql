-- Sujets et versions
create table public.sujets (
  id text primary key,
  titre text not null,
  niveau text not null check (niveau in ('Facile','Moyen','Difficile')),
  competence text not null,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.sujets to anon, authenticated;
grant all on public.sujets to service_role;
alter table public.sujets enable row level security;
create policy "Catalogue public" on public.sujets for select to anon, authenticated using (true);

create table public.sujet_versions (
  id uuid primary key default gen_random_uuid(),
  sujet_id text not null references public.sujets(id) on delete restrict,
  numero int not null,
  enonce text[] not null default '{}',
  publiee boolean not null default false,
  published_at timestamptz,
  unique (sujet_id, numero)
);
grant select on public.sujet_versions to anon, authenticated;
grant all on public.sujet_versions to service_role;
alter table public.sujet_versions enable row level security;
create policy "Versions publiees lisibles" on public.sujet_versions for select to anon, authenticated using (publiee);

create table public.sujet_version_fichiers (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.sujet_versions(id) on delete restrict,
  chemin text not null,
  contenu text not null default '',
  unique (version_id, chemin)
);
grant select on public.sujet_version_fichiers to anon, authenticated;
grant all on public.sujet_version_fichiers to service_role;
alter table public.sujet_version_fichiers enable row level security;
create policy "Fichiers de depart lisibles" on public.sujet_version_fichiers for select to anon, authenticated
  using (exists (select 1 from public.sujet_versions v where v.id = version_id and v.publiee));

-- Criteres : jamais lisibles par anon/authenticated (aucun GRANT)
create table public.criteres (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.sujet_versions(id) on delete restrict,
  code text not null,
  ordre int not null,
  label text not null,
  points int not null,
  message_echec text not null,
  sonde jsonb not null,
  attendu jsonb not null,
  unique (version_id, code)
);
grant all on public.criteres to service_role;
alter table public.criteres enable row level security;

-- Solutions : jamais lisibles par anon/authenticated
create table public.solutions (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.sujet_versions(id) on delete restrict,
  chemin text not null,
  contenu text not null,
  unique (version_id, chemin)
);
grant all on public.solutions to service_role;
alter table public.solutions enable row level security;

-- Indices : lisibles uniquement une fois debloques
create table public.indices (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.sujet_versions(id) on delete restrict,
  ordre int not null,
  texte text not null,
  unique (version_id, ordre)
);
grant select on public.indices to authenticated;
grant all on public.indices to service_role;
alter table public.indices enable row level security;

create table public.indices_debloques (
  user_id uuid not null,
  indice_id uuid not null references public.indices(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, indice_id)
);
grant select on public.indices_debloques to authenticated;
grant all on public.indices_debloques to service_role;
alter table public.indices_debloques enable row level security;
create policy "Chacun lit ses deblocages" on public.indices_debloques for select to authenticated
  using (auth.uid() = user_id);

create policy "Indices debloques lisibles" on public.indices for select to authenticated
  using (exists (select 1 from public.indices_debloques d where d.indice_id = id and d.user_id = auth.uid()));

-- Nombre d'indices d'une version (public)
create or replace function public.nb_indices(_version_id uuid)
returns int language sql stable security definer set search_path = public
as $$ select count(*)::int from public.indices i join public.sujet_versions v on v.id = i.version_id where i.version_id = _version_id and v.publiee $$;
grant execute on function public.nb_indices(uuid) to anon, authenticated;

-- Debloquer l'indice suivant (connecte uniquement)
create or replace function public.debloquer_indice(_version_id uuid)
returns text language plpgsql volatile security definer set search_path = public
as $$
declare _uid uuid := auth.uid(); _ind public.indices;
begin
  if _uid is null then raise exception 'Connexion requise'; end if;
  select i.* into _ind from public.indices i
    join public.sujet_versions v on v.id = i.version_id and v.publiee
    where i.version_id = _version_id
      and not exists (select 1 from public.indices_debloques d where d.indice_id = i.id and d.user_id = _uid)
    order by i.ordre limit 1;
  if _ind.id is null then return null; end if;
  insert into public.indices_debloques (user_id, indice_id) values (_uid, _ind.id);
  return _ind.texte;
end $$;
revoke execute on function public.debloquer_indice(uuid) from public, anon;
grant execute on function public.debloquer_indice(uuid) to authenticated;

-- Immuabilite des versions publiees
create or replace function public.protect_published_version()
returns trigger language plpgsql set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.publiee then raise exception 'Version publiee immuable'; end if;
  if tg_op = 'UPDATE' and old.publiee then raise exception 'Version publiee immuable'; end if;
  return coalesce(new, old);
end $$;
create trigger sujet_versions_immutables before update or delete on public.sujet_versions
  for each row execute function public.protect_published_version();

create or replace function public.protect_published_children()
returns trigger language plpgsql set search_path = public
as $$
declare _vid uuid;
begin
  _vid := case when tg_op = 'DELETE' then old.version_id else new.version_id end;
  if exists (select 1 from public.sujet_versions where id = _vid and publiee) then
    raise exception 'Version publiee immuable';
  end if;
  if tg_op = 'UPDATE' and old.version_id <> new.version_id
     and exists (select 1 from public.sujet_versions where id = old.version_id and publiee) then
    raise exception 'Version publiee immuable';
  end if;
  return coalesce(new, old);
end $$;
create trigger fichiers_immutables before insert or update or delete on public.sujet_version_fichiers for each row execute function public.protect_published_children();
create trigger criteres_immutables before insert or update or delete on public.criteres for each row execute function public.protect_published_children();
create trigger solutions_immutables before insert or update or delete on public.solutions for each row execute function public.protect_published_children();
create trigger indices_immutables before insert or update or delete on public.indices for each row execute function public.protect_published_children();

-- ===== Donnees : les 3 sujets, version 1 =====
insert into public.sujets (id, titre, niveau, competence, ordre) values
 ('carte-profil','Carte de profil','Facile','HTML – structure sémantique',1),
 ('mise-en-forme','Mise en forme d''un bouton','Moyen','CSS – sélecteurs et propriétés',2),
 ('compteur','Compteur de clics','Difficile','JavaScript – DOM et événements',3);

insert into public.sujet_versions (id, sujet_id, numero, enonce) values
 ('11111111-0000-0000-0000-000000000001','carte-profil',1, array[
   'Créez une carte de présentation dans un élément <article> de classe « carte ».',
   'Elle contient un titre <h1> avec votre prénom, un paragraphe de présentation et une liste <ul> d''au moins 3 loisirs.',
   'Ajoutez un lien <a> vers votre e-mail (mailto:).']),
 ('11111111-0000-0000-0000-000000000002','mise-en-forme',1, array[
   'Un bouton d''id « valider » est fourni dans la page.',
   'En CSS, donnez-lui une couleur de fond rgb(0, 102, 204), un texte blanc, des coins arrondis et une marge intérieure (padding) non nulle.',
   'Le titre <h1> doit être centré.']),
 ('11111111-0000-0000-0000-000000000003','compteur',1, array[
   'La page contient un bouton #plus et un <span id="total"> qui affiche 0.',
   'En JavaScript, chaque clic sur #plus augmente la valeur affichée de 1.',
   'Lorsque le total atteint 5, ajoutez la classe « max » au span.']);

insert into public.sujet_version_fichiers (version_id, chemin, contenu) values
 ('11111111-0000-0000-0000-000000000001','index.html',$f$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Profil</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Votre carte ici -->

  <script src="script.js"></script>
</body>
</html>
$f$),
 ('11111111-0000-0000-0000-000000000001','style.css',$f$body {
  font-family: sans-serif;
}
$f$),
 ('11111111-0000-0000-0000-000000000001','script.js',$f$// Pas de JavaScript nécessaire pour ce sujet
$f$),
 ('11111111-0000-0000-0000-000000000002','index.html',$f$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bouton</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Inscription</h1>
  <button id="valider">Valider</button>
  <script src="script.js"></script>
</body>
</html>
$f$),
 ('11111111-0000-0000-0000-000000000002','style.css',$f$/* Vos règles ici */
$f$),
 ('11111111-0000-0000-0000-000000000002','script.js',$f$
$f$),
 ('11111111-0000-0000-0000-000000000003','index.html',$f$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Compteur</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <p>Total : <span id="total">0</span></p>
  <button id="plus">+1</button>
  <script src="script.js"></script>
</body>
</html>
$f$),
 ('11111111-0000-0000-0000-000000000003','style.css',$f$.max {
  color: red;
  font-weight: bold;
}
$f$),
 ('11111111-0000-0000-0000-000000000003','script.js',$f$// Récupérez les éléments puis ajoutez un écouteur d'événement
$f$);

insert into public.criteres (version_id, code, ordre, label, points, message_echec, sonde, attendu) values
 ('11111111-0000-0000-0000-000000000001','article',1,'Un <article class="carte"> existe',2,'Aucun élément <article> avec la classe « carte » trouvé.','{"obs":{"k":"count","sel":"article.carte"}}','{"op":"gte","v":1}'),
 ('11111111-0000-0000-0000-000000000001','h1',2,'Un <h1> non vide dans la carte',2,'Le titre <h1> est absent ou vide dans la carte.','{"obs":{"k":"text","sel":"article.carte h1"}}','{"op":"nonempty"}'),
 ('11111111-0000-0000-0000-000000000001','p',3,'Un paragraphe de présentation',1,'Ajoutez un <p> contenant du texte dans la carte.','{"obs":{"k":"text","sel":"article.carte p"}}','{"op":"nonempty"}'),
 ('11111111-0000-0000-0000-000000000001','ul',4,'Une liste d''au moins 3 loisirs',3,'La liste <ul> doit contenir au moins 3 <li>.','{"obs":{"k":"count","sel":"article.carte ul > li"}}','{"op":"gte","v":3}'),
 ('11111111-0000-0000-0000-000000000001','mail',5,'Un lien mailto:',2,'Aucun lien dont le href commence par « mailto: ».','{"obs":{"k":"count","sel":"article.carte a[href^=\"mailto:\"]"}}','{"op":"gte","v":1}'),
 ('11111111-0000-0000-0000-000000000002','bg',1,'Fond du bouton rgb(0, 102, 204)',3,'La couleur de fond de #valider n''est pas rgb(0, 102, 204) (#0066cc).','{"obs":{"k":"css","sel":"#valider","prop":"background-color"}}','{"op":"eq","v":"rgb(0, 102, 204)"}'),
 ('11111111-0000-0000-0000-000000000002','color',2,'Texte du bouton en blanc',2,'La couleur du texte de #valider doit être blanche.','{"obs":{"k":"css","sel":"#valider","prop":"color"}}','{"op":"eq","v":"rgb(255, 255, 255)"}'),
 ('11111111-0000-0000-0000-000000000002','radius',3,'Coins arrondis',2,'Ajoutez un border-radius supérieur à 0.','{"obs":{"k":"css","sel":"#valider","prop":"border-top-left-radius"}}','{"op":"gtnum","v":0}'),
 ('11111111-0000-0000-0000-000000000002','padding',4,'Padding non nul',1,'Ajoutez un padding au bouton.','{"obs":{"k":"css","sel":"#valider","prop":"padding-top"}}','{"op":"gtnum","v":0}'),
 ('11111111-0000-0000-0000-000000000002','center',5,'Titre centré',2,'Le <h1> doit avoir text-align: center.','{"obs":{"k":"css","sel":"h1","prop":"text-align"}}','{"op":"eq","v":"center"}'),
 ('11111111-0000-0000-0000-000000000003','click1',1,'Un clic affiche 1',4,'Après un clic sur #plus, #total devrait afficher 1.','{"actions":[{"click":"#plus","n":1}],"obs":{"k":"text","sel":"#total"}}','{"op":"eq","v":"1"}'),
 ('11111111-0000-0000-0000-000000000003','click5',2,'Cinq clics affichent 5',3,'Après 5 clics au total, #total devrait afficher 5.','{"actions":[{"click":"#plus","n":4}],"obs":{"k":"text","sel":"#total"}}','{"op":"eq","v":"5"}'),
 ('11111111-0000-0000-0000-000000000003','max',3,'Classe « max » à 5',3,'À 5, le span #total doit avoir la classe « max ».','{"obs":{"k":"hasClass","sel":"#total","cls":"max"}}','{"op":"eq","v":true}');

insert into public.indices (version_id, ordre, texte) values
 ('11111111-0000-0000-0000-000000000001',1,'Commencez par écrire <article class="carte"> … </article> dans le <body>.'),
 ('11111111-0000-0000-0000-000000000001',2,'Une liste s''écrit <ul><li>…</li><li>…</li></ul>.'),
 ('11111111-0000-0000-0000-000000000001',3,'Un lien e-mail : <a href="mailto:moi@exemple.fr">Me contacter</a>.'),
 ('11111111-0000-0000-0000-000000000002',1,'Le sélecteur d''un id s''écrit #valider { … }.'),
 ('11111111-0000-0000-0000-000000000002',2,'background-color: #0066cc; équivaut à rgb(0, 102, 204).'),
 ('11111111-0000-0000-0000-000000000002',3,'Pour centrer un texte : text-align: center;'),
 ('11111111-0000-0000-0000-000000000003',1,'document.getElementById("plus") renvoie le bouton.'),
 ('11111111-0000-0000-0000-000000000003',2,'bouton.addEventListener("click", () => { … }) réagit aux clics.'),
 ('11111111-0000-0000-0000-000000000003',3,'Gardez une variable let total = 0; puis span.textContent = total; et span.classList.add("max").');

insert into public.solutions (version_id, chemin, contenu) values
 ('11111111-0000-0000-0000-000000000001','index.html',$f$<article class="carte"><h1>Prénom</h1><p>Élève en STI2D.</p><ul><li>Code</li><li>Vélo</li><li>Musique</li></ul><a href="mailto:moi@exemple.fr">Contact</a></article>$f$),
 ('11111111-0000-0000-0000-000000000002','style.css',$f$h1 { text-align: center; }
#valider { background-color: #0066cc; color: #fff; border-radius: 6px; padding: 8px 16px; }$f$),
 ('11111111-0000-0000-0000-000000000003','script.js',$f$let total = 0;
const span = document.getElementById("total");
document.getElementById("plus").addEventListener("click", () => {
  total++; span.textContent = total;
  if (total >= 5) span.classList.add("max");
});$f$);

update public.sujet_versions set publiee = true, published_at = now()
 where id in ('11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003');