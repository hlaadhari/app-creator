-- Barèmes serveur pour les épreuves écrites Bac Blanc 2022, 2023 et 2024.
-- Idempotente : les lignes sont insérées ou mises à jour dans public.sujets_examen_ecrit_baremes.
insert into public.sujets_examen_ecrit_baremes (exam_id, titre, duree_min, bareme_total, sections_meta)
values
  (
    'exam-bac2022-blanc-ecrit',
    'Bac Blanc 2022 - Épreuve Écrite Systèmes & Technologies de l''Informatique',
    180,
    20,
    $json$[
      {"id":"ex1-qcm","title":"Exercice N° 1 : Concepts Web, PHP & SQL (2.5 pts)","type":"qcm","pointsMax":2.5},
      {"id":"ex2-php","title":"Exercice N° 2 : Tableaux associatifs PHP & HTML (3 pts)","type":"code_analysis","pointsMax":3},
      {"id":"ex3-contraintes","title":"Exercice N° 3 : Contraintes d'Intégrité SQL (3 pts)","type":"modeling","pointsMax":3},
      {"id":"ex4-sql-vehicules","title":"Exercice N° 4 (Partie A) : Requêtes SQL - Annonces Véhicules (5.5 pts)","type":"sql","pointsMax":5.5},
      {"id":"ex4-web","title":"Exercice N° 4 (Partie B) : Formulaire HTML, JS & PHP (3 pts)","type":"code_analysis","pointsMax":3},
      {"id":"ex5-associations","title":"Exercice N° 5 : Associations & LDD SQL (3 pts)","type":"modeling","pointsMax":3}
    ]$json$::jsonb
  ),
  (
    'exam-bac2023-blanc-ecrit',
    'Bac Blanc 2023 - Épreuve Écrite Systèmes & Technologies de l''Informatique',
    180,
    20,
    $json$[
      {"id":"ex1-qcm","title":"Exercice N° 1 : Validation de concepts Web & SQL (3 pts)","type":"qcm","pointsMax":3},
      {"id":"ex2-transfert","title":"Exercice N° 2 : Base Gestion_Transfert & LDD SQL (5 pts)","type":"modeling","pointsMax":5},
      {"id":"ex3-auth","title":"Exercice N° 3 : Formulaire d'Authentification HTML, JS & PHP (6 pts)","type":"code_analysis","pointsMax":6},
      {"id":"ex4-sql","title":"Exercice N° 4 : Requêtes SQL - Annonces Véhicules (6 pts)","type":"sql","pointsMax":6}
    ]$json$::jsonb
  ),
  (
    'exam-bac2024-blanc-ecrit',
    'Bac Blanc 2024 - Épreuve Écrite Systèmes & Technologies de l''Informatique',
    180,
    20,
    $json$[
      {"id":"ex1-qcm","title":"Exercice N° 1 (Partie 1) : QCM HTML5, CSS, JS, PHP & SQL (2.5 pts)","type":"qcm","pointsMax":2.5},
      {"id":"ex1-assoc","title":"Exercice N° 1 (Parties 2 & 3) : Fonctions & Propriétés CSS (1.25 pt)","type":"code_analysis","pointsMax":1.25},
      {"id":"ex2-client","title":"Exercice N° 2 : Formulaire BD_Gestion (HTML, JS & PHP) (3.25 pts)","type":"code_analysis","pointsMax":3.25},
      {"id":"ex3-streaming-ddl","title":"Exercice N° 3 (Parties 1 & 2-II) : Streaming_HD — Cardinalités & LDD (3.5 pts)","type":"modeling","pointsMax":3.5},
      {"id":"ex3-streaming-sql","title":"Exercice N° 3 (Partie 2-III) : Requêtes SQL Streaming_HD (6 pts)","type":"sql","pointsMax":6},
      {"id":"ex4-maintenance","title":"Exercice N° 4 : Conception & Normalisation Maintenance (3.5 pts)","type":"modeling","pointsMax":3.5}
    ]$json$::jsonb
  )
on conflict (exam_id) do update set
  titre = excluded.titre,
  duree_min = excluded.duree_min,
  bareme_total = excluded.bareme_total,
  sections_meta = excluded.sections_meta;
