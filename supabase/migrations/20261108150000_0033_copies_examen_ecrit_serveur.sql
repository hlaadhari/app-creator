-- =============================================================================
-- Migration 0033 : Remise serveur scellée et notation serveur des épreuves écrites (Issue #197 / T-06 / T-08)
-- =============================================================================
-- Constat d'audit (#197) :
--   - Sur /examen-ecrit/written-bac-demo, la remise d'une copie n'émettait aucune requête serveur.
--   - Les réponses et la note finale étaient stockées/calculées dans localStorage ; vider le
--     stockage réinitialisait la copie et la note.
--   - Les réponses attendues (correctAnswers, explications) étaient présentes côté client avant clôture.
--   - Le message « Échéance serveur atteinte : dépôt verrouillé (T-06) » et « 00:00 » s'affichaient
--     même lors d'une remise volontaire avant la fin du temps imparti.
--   - L'enseignant n'avait aucune visibilité sur les copies écrites ni moyen de noter les questions ouvertes.
--
-- Correctifs appliqués :
--   1. Table serveur `public.sujets_examen_ecrit_baremes` contenant les barèmes et corrigés QCM
--      sans aucun GRANT pour `anon` ni `authenticated` (zéro confiance côté client).
--   2. Table `public.copies_examen_ecrit` stockant l'horodatage serveur (`debut_serveur`,
--      `echeance_serveur`, `remise_serveur_at`), le statut (`en_cours`, `remise`, `expiree`, `corrigee`),
--      le motif de clôture (`remise_volontaire` vs `temps_ecoule`), l'empreinte SHA-256 scellée,
--      le score QCM calculé par le serveur et la note des questions ouvertes attribuée par l'enseignant.
--   3. RPCs `security definer` :
--        - `public.demarrer_copie_examen_ecrit(_exam_id, _duree_min)`
--        - `public.sauvegarder_brouillon_examen_ecrit(_exam_id, _reponses)`
--        - `public.remettre_copie_examen_ecrit(_exam_id, _reponses, _motif)`
--        - `public.noter_copie_examen_ecrit(_copie_id, _notes_ouvertes, _commentaire)`
--        - `public.lister_copies_examen_ecrit_enseignant(_class_id)`
-- =============================================================================

create extension if not exists pgcrypto;

-- 1. Table serveur des barèmes et corrigés d'épreuves écrites (aucun accès direct client)
create table if not exists public.sujets_examen_ecrit_baremes (
  exam_id text primary key,
  titre text not null,
  duree_min int not null default 120 check (duree_min > 0 and duree_min <= 600),
  bareme_total numeric(5,2) not null default 20 check (bareme_total > 0),
  sections_meta jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

revoke all on table public.sujets_examen_ecrit_baremes from public, anon, authenticated;
grant all on table public.sujets_examen_ecrit_baremes to service_role;
alter table public.sujets_examen_ecrit_baremes enable row level security;

insert into public.sujets_examen_ecrit_baremes (exam_id, titre, duree_min, bareme_total, sections_meta)
values
  ('written-bac-demo', 'Épreuve Écrite Théorique Standard - Bac STI (Spécimen Officiel)', 120, 20, $json$[{"id":"partie-1-qcm","title":"Partie I : QCM & Concepts Théoriques (4 pts)","type":"qcm","pointsMax":4,"questions":[{"id":"qcm-1","points":2,"multiple":false,"correctAnswers":["opt-having"],"explanation":"La clause HAVING permet de filtrer sur les fonctions d'agrégat après un GROUP BY."},{"id":"qcm-2","points":2,"multiple":true,"correctAnswers":["opt-pk","opt-fk","opt-check"],"explanation":"PRIMARY KEY, FOREIGN KEY et CHECK sont des contraintes d'intégrité."}]},{"id":"partie-2-modeling","title":"Partie II : Modélisation & Schéma Relationnel (5 pts)","type":"modeling","pointsMax":5,"questions":[{"id":"mod-1","points":2.5,"type":"representation","explanation":"Format attendu : Employe (#Matricule, Nom, Prenom, Salaire, #CodeDep)"},{"id":"mod-2","points":2.5,"type":"ddl","explanation":"CREATE TABLE Projet (CodeP VARCHAR(5) PRIMARY KEY, Titre VARCHAR(50) NOT NULL);"}]},{"id":"partie-3-sql","title":"Partie III : Exploitation & Requêtes SQL (6 pts)","type":"sql","pointsMax":6,"questions":[{"id":"sql-1","points":3,"type":"query","explanation":"SELECT Nom, Salaire FROM Employe WHERE Salaire >= 1900 ORDER BY Salaire DESC;"},{"id":"sql-2","points":3,"type":"dml","explanation":"UPDATE Employe SET Salaire = 2420.00 WHERE Matricule = 'E001';"}]},{"id":"partie-4-code","title":"Partie IV : Analyse de Code Web & Algorithmique (5 pts)","type":"code_analysis","pointsMax":5,"questions":[{"id":"code-1","points":2.5,"type":"code_analysis","explanation":"L'opérateur d'affectation '=' doit être remplacé par la comparaison de non-égalité '!==' (ou '!=') : cin.length !== 8."},{"id":"code-2","points":2.5,"type":"code_analysis","explanation":"La superglobale est $_POST['matricule']."}]}]$json$::jsonb),
  ('exam-bac2022-controle-ecrit', 'Bac 2022 (Session de Contrôle) - Épreuve Écrite Bases de Données', 120, 20, $json$[{"id":"exercice-1-qcm","title":"Exercice N°1 : QCM & Notions Théoriques BDD (3 pts)","type":"qcm","pointsMax":3,"questions":[{"id":"EX1-Q1","points":0.75,"multiple":false,"correctAnswers":["opt-select"],"explanation":"Les fonctions d'agrégation s'appliquent sur des colonnes dans la clause SELECT (ou dans HAVING)."},{"id":"EX1-Q2","points":0.75,"multiple":false,"correctAnswers":["opt-check"],"explanation":"La clause CHECK définit une contrainte d'intégrité de domaine sur une ou plusieurs colonnes."},{"id":"EX1-Q3","points":0.75,"multiple":false,"correctAnswers":["opt-link"],"explanation":"Une clé étrangère matérialise l'association entre une table enfant et une table parent."},{"id":"EX1-Q4","points":0.75,"multiple":false,"correctAnswers":["opt-ref"],"explanation":"La règle d'intégrité référentielle impose la correspondance avec la clé primaire parente."}]},{"id":"exercice-2-ddl","title":"Exercice N°2 : Base « GestionConcours » (DDL & Contraintes - 4 pts)","type":"modeling","pointsMax":4,"questions":[{"id":"EX2-Q1","points":1,"type":"ddl","explanation":"CREATE TABLE Epreuve (CodeEpreuve VARCHAR(10) PRIMARY KEY, Libelle VARCHAR(30) NOT NULL, Coefficient DECIMAL(3,1) NOT NULL);"},{"id":"EX2-Q2","points":1,"type":"ddl","explanation":"ALTER TABLE Evaluation ADD FOREIGN KEY (CodeEpreuve) REFERENCES Epreuve(CodeEpreuve);"},{"id":"EX2-Q3","points":1,"type":"ddl","explanation":"ALTER TABLE Evaluation ADD CONSTRAINT chk_note CHECK (Note BETWEEN 0 AND 20);"},{"id":"EX2-Q4","points":1,"type":"ddl","explanation":"ALTER TABLE Candidat ADD Genre CHAR(1);"}]},{"id":"exercice-3-gaming","title":"Exercice N°3 : Base « Gaming » (DDL & DML - 6 pts)","type":"sql","pointsMax":6,"questions":[{"id":"EX3-Q1","points":1.5,"type":"ddl","explanation":"ALTER TABLE Jeu ADD Version VARCHAR(10);"},{"id":"EX3-Q2","points":1.5,"type":"dml","explanation":"INSERT INTO Categorie VALUES ('CAT3', 'Stratégie');"},{"id":"EX3-Q3","points":1.5,"type":"dml","explanation":"INSERT INTO Jeu (CodeJeu, LibJeu, NatJeu, AgeMin, CodeCat) VALUES ('J010', 'Chess Master', 'P', 8, 'CAT1');"},{"id":"EX3-Q4","points":1.5,"type":"query","explanation":"SELECT J.CodeJeu, J.LibJeu, C.LibCat FROM Jeu J, Categorie C WHERE J.CodeCat = C.CodeCat ORDER BY J.LibJeu ASC;"}]},{"id":"exercice-4-employes","title":"Exercice N°4 : Base « GestionEmployes » (Requêtes SQL DML / LID - 7 pts)","type":"sql","pointsMax":7,"questions":[{"id":"EX4-Q1","points":1,"type":"query","explanation":"SELECT COUNT(*) AS NbEmployes FROM Employe E, Service S WHERE E.NumService = S.NumService AND S.LibService = 'Sécurité';"},{"id":"EX4-Q2","points":1,"type":"query","explanation":"SELECT AVG(MontPrime) AS MoyennePrimes FROM Prime WHERE AnneePrime = 2021;"},{"id":"EX4-Q3","points":1,"type":"query","explanation":"SELECT MatEmp, SUM(MontPrime) AS TotalPrimes FROM Prime GROUP BY MatEmp;"},{"id":"EX4-Q4","points":1,"type":"query","explanation":"SELECT MatEmp, NomEmp, DateRecrut FROM Employe WHERE DateRecrut >= '2021-01-01' AND DateRecrut <= '2021-12-31' ORDER BY DateRecrut DESC;"},{"id":"EX4-Q5","points":1.5,"type":"dml","explanation":"UPDATE Prime SET MontPrime = 660.000 WHERE AnneePrime = 2022 AND MatEmp = 'E01';"},{"id":"EX4-Q6","points":1.5,"type":"dml","explanation":"DELETE FROM Prime WHERE AnneePrime < 2015;"}]}]$json$::jsonb),
  ('exam-bac2023-controle-ecrit', 'Bac 2023 (Session de Contrôle) - Épreuve Écrite Systèmes & Technologies de l''Informatique', 180, 20, $json$[{"id":"exercice-1-qcm","title":"Exercice N°1 : QCM Notions Web & BDD (2 pts)","type":"qcm","pointsMax":2,"questions":[{"id":"EX1-Q1","points":0.25,"multiple":false,"correctAnswers":["opt-ul-li"],"explanation":"Une liste non ordonnée s'ouvre avec <ul> et chaque élément avec <li>."},{"id":"EX1-Q2","points":0.25,"multiple":false,"correctAnswers":["opt-link-rel"],"explanation":"La balise <link rel=\"stylesheet\" href=\"...\"> est la balise standard de liaison CSS."},{"id":"EX1-Q3","points":0.25,"multiple":false,"correctAnswers":["opt-f1-call"],"explanation":"L'appel d'une fonction en JavaScript nécessite le nom suivi de parenthèses : f1();"},{"id":"EX1-Q4","points":0.25,"multiple":false,"correctAnswers":["opt-alert"],"explanation":"alert() ouvre une boîte d'alerte modale informative."},{"id":"EX1-Q5","points":0.25,"multiple":false,"correctAnswers":["opt-num-rows"],"explanation":"mysqli_num_rows() renvoie le nombre de tuples dans le jeu de résultats d'une sélection."},{"id":"EX1-Q6","points":0.25,"multiple":false,"correctAnswers":["opt-isset"],"explanation":"isset() teste si une variable existe et possède une valeur non null."},{"id":"EX1-Q7","points":0.25,"multiple":false,"correctAnswers":["opt-h6-bg"],"explanation":"Le sélecteur de balise h6 combiné à la propriété background-color permet de colorer l'arrière-plan."},{"id":"EX1-Q8","points":0.25,"multiple":false,"correctAnswers":["opt-bloc-center"],"explanation":"Le sélecteur de classe .bloc avec la propriété text-align: center; centre le texte."}]},{"id":"exercice-2-scrabble","title":"Exercice N°2 : Scrabble du Développeur Web (3 pts)","type":"code_analysis","pointsMax":3,"questions":[{"id":"EX2-Q1","points":0.5,"type":"code_analysis","explanation":"La méthode JavaScript est prompt()."},{"id":"EX2-Q2","points":0.5,"type":"code_analysis","explanation":"L'élément HTML5 est <footer>."},{"id":"EX2-Q3","points":0.5,"type":"code_analysis","explanation":"La fonction PHP est strlen()."},{"id":"EX2-Q4","points":0.5,"type":"code_analysis","explanation":"La contrainte SQL est UNIQUE."},{"id":"EX2-Q5","points":0.5,"type":"code_analysis","explanation":"La clause SQL est CHECK."},{"id":"EX2-Q6","points":0.5,"type":"code_analysis","explanation":"La méthode JavaScript est trim()."}]},{"id":"exercice-3-ebook","title":"Exercice N°3 : Base « Ebook » & Programmation Web (7.5 pts)","type":"modeling","pointsMax":7.5,"questions":[{"id":"EX3-Q1","points":1,"type":"representation","explanation":"Specialite (#idSpec, libSpec, descSpec) et Evaluateur (#idEval, nomPrenEval, telEval, #idSpec)"},{"id":"EX3-Q2","points":1,"type":"representation","explanation":"Redaction (#isbn, #idAut)"},{"id":"EX3-Q3","points":0.75,"type":"representation","explanation":"Adresse (#mailAut, #idAut)"},{"id":"EX3-Q4","points":0.75,"type":"representation","explanation":"Evaluation (#idEval, #isbn, #dateEval, noteEval)"},{"id":"EX3-Q5","points":0.5,"type":"representation","explanation":"Vrai : le sélecteur d'identifiant et la classe sont valides."},{"id":"EX3-Q6","points":0.5,"type":"representation","explanation":"Vrai : la classe définit les dimensions attendues."},{"id":"EX3-Q7","points":0.5,"type":"representation","explanation":"Faux : un numéro de téléphone requiert type='tel' ou une validation JS sur la longueur et le format."},{"id":"EX3-Q8","points":0.5,"type":"representation","explanation":"Vrai : la balise script avec l'attribut src est la syntaxe standard."},{"id":"EX3-Q9","points":0.5,"type":"representation","explanation":"x.toLowerCase()"},{"id":"EX3-Q10","points":0.5,"type":"representation","explanation":"x.length"},{"id":"EX3-Q11","points":0.5,"type":"representation","explanation":"x.charAt(i)"},{"id":"EX3-Q12","points":0.5,"type":"representation","explanation":"L'opérateur de négation est '!'."}]},{"id":"exercice-4-seismicstat","title":"Exercice N°4 : Base « SeismicSTAT » & Requêtes SQL (7.5 pts)","type":"sql","pointsMax":7.5,"questions":[{"id":"EX4-Q1","points":1,"type":"representation","explanation":"Pays (#codePays, nomPays) / Ville (#codeVille, nomVille, #codePays) / LieuSeisme (#codeLieu, latitude, longitude, #codeVille) / Seisme (#dateSeisme, #codeLieu, magnitude)"},{"id":"EX4-Q2","points":0.5,"type":"query","explanation":"Elle met à jour le nom de toutes les villes sans exception en 'Palu'."},{"id":"EX4-Q3","points":0.5,"type":"query","explanation":"Elle supprime définitivement la table Seisme et toutes ses données."},{"id":"EX4-Q4","points":0.5,"type":"query","explanation":"Elle sélectionne les villes dont le codeVille se termine par le chiffre 3."},{"id":"EX4-Q5","points":0.5,"type":"query","explanation":"Elle compte le nombre de séismes survenus par lieu/ville."},{"id":"EX4-Q6","points":0.5,"type":"query","explanation":"SELECT S.dateSeisme, S.codeLieu, S.magnitude FROM Seisme S, LieuSeisme L WHERE S.codeLieu = L.codeLieu AND L.codeVille = 'AFN324';"},{"id":"EX4-Q7","points":0.5,"type":"query","explanation":"SELECT S.dateSeisme, S.magnitude, V.nomVille FROM Seisme S, LieuSeisme L, Ville V WHERE S.codeLieu = L.codeLieu AND L.codeVille = V.codeVille AND V.codePays = 'IDN';"},{"id":"EX4-Q8","points":0.5,"type":"query","explanation":"SELECT dateSeisme, codeLieu, magnitude FROM Seisme WHERE magnitude > 6.9 ORDER BY magnitude DESC;"},{"id":"EX4-Q9","points":0.5,"type":"query","explanation":"SELECT dateSeisme, codeLieu, magnitude FROM Seisme WHERE dateSeisme >= '2022-01-01' AND dateSeisme <= '2022-12-31';"},{"id":"EX4-Q10","points":0.5,"type":"query","explanation":"SELECT V.nomVille, COUNT(S.codeLieu) AS NbSeismes FROM Seisme S, LieuSeisme L, Ville V WHERE S.codeLieu = L.codeLieu AND L.codeVille = V.codeVille AND V.codePays = 'IDN' GROUP BY V.nomVille;"},{"id":"EX4-Q11","points":0.5,"type":"query","explanation":"SELECT dateSeisme, codeLieu, magnitude FROM Seisme WHERE magnitude = (SELECT MAX(magnitude) FROM Seisme);"},{"id":"EX4-Q12","points":0.5,"type":"query","explanation":"SELECT L.codeVille, COUNT(*) AS Total FROM Seisme S, LieuSeisme L WHERE S.codeLieu = L.codeLieu AND S.magnitude > 6 GROUP BY L.codeVille HAVING COUNT(*) >= 3;"},{"id":"EX4-Q13","points":0.25,"type":"ddl","explanation":"ALTER TABLE Seisme ADD degat VARCHAR(100);"},{"id":"EX4-Q14","points":0.25,"type":"dml","explanation":"DELETE FROM Seisme WHERE magnitude < 3.5;"},{"id":"EX4-Q15","points":0.25,"type":"dml","explanation":"UPDATE LieuSeisme SET longitude = 25.12 WHERE codeLieu = 'ZGP123';"},{"id":"EX4-Q16","points":0.25,"type":"dml","explanation":"INSERT INTO Ville (codeVille, nomVille, codePays) VALUES ('AFN223', 'Hatay', 'TUR');"}]}]$json$::jsonb),
  ('exam-bac2023-principale-ecrit', 'Bac 2023 (Session Principale) - Épreuve Écrite Systèmes & Technologies de l''Informatique', 180, 20, $json$[{"id":"exercice-1-qcm","title":"Exercice N°1 : QCM Notions Web & Programmation (2 pts)","type":"qcm","pointsMax":2,"questions":[{"id":"EX1-Q1","points":0.25,"multiple":false,"correctAnswers":["opt-checked"],"explanation":"L'attribut checked pré-sélectionne une case à cocher."},{"id":"EX1-Q2","points":0.25,"multiple":false,"correctAnswers":["opt-fieldset"],"explanation":"<fieldset> regroupe des éléments d'un formulaire et peut être titré par <legend>."},{"id":"EX1-Q3","points":0.25,"multiple":false,"correctAnswers":["opt-p-class"],"explanation":"Le sélecteur combiné p.eleve cible les paragraphes possédant class=\"eleve\"."},{"id":"EX1-Q4","points":0.25,"multiple":false,"correctAnswers":["opt-p1-p2"],"explanation":"La virgule sépare plusieurs sélecteurs partageant les mêmes propriétés CSS."},{"id":"EX1-Q5","points":0.25,"multiple":false,"correctAnswers":["opt-get-cin"],"explanation":"$_GET['cin'] récupère les données transmises dans la chaîne de requête (query string)."},{"id":"EX1-Q6","points":0.25,"multiple":false,"correctAnswers":["opt-require"],"explanation":"require() provoque une erreur fatale et stoppe le script si le fichier est introuvable."},{"id":"EX1-Q7","points":0.25,"multiple":false,"correctAnswers":["opt-trim"],"explanation":"String.prototype.trim() élimine les espaces aux extrémités."},{"id":"EX1-Q8","points":0.25,"multiple":false,"correctAnswers":["opt-for-5"],"explanation":"for (i = 0; i < 5; i++) itère pour i = 0, 1, 2, 3, 4 (soit 5 itérations)."}]},{"id":"exercice-2-mots-croises","title":"Exercice N°2 : Grille / Mots Croisés du Développeur Web (3 pts)","type":"code_analysis","pointsMax":3,"questions":[{"id":"EX2-Q1","points":0.5,"type":"code_analysis","explanation":"La propriété CSS est bottom."},{"id":"EX2-Q2","points":0.5,"type":"code_analysis","explanation":"La commande d'affichage PHP est echo."},{"id":"EX2-Q3","points":0.5,"type":"code_analysis","explanation":"Math.round() arrondit à l'entier le plus proche."},{"id":"EX2-Q4","points":0.5,"type":"code_analysis","explanation":"L'événement est oninput."},{"id":"EX2-Q5","points":0.5,"type":"code_analysis","explanation":"La contrainte SQL est UNIQUE."},{"id":"EX2-Q6","points":0.5,"type":"code_analysis","explanation":"La méthode HTTP est POST."}]},{"id":"exercice-3-integration-web","title":"Exercice N°3 : Intégration Web & JavaScript (4 pts)","type":"modeling","pointsMax":4,"questions":[{"id":"EX3-Q1","points":0.5,"type":"representation","explanation":"Vrai : la zone de texte pour le code porte l'id code et la classe bordure."},{"id":"EX3-Q2","points":0.5,"type":"representation","explanation":"Vrai : la classe .saisie définit une largeur de 250px."},{"id":"EX3-Q3","points":0.5,"type":"representation","explanation":"Vrai : le champ multiligne utilise <textarea class=\"desc\">."},{"id":"EX3-Q4","points":0.5,"type":"representation","explanation":"Vrai : il s'agit de la syntaxe standard de liaison CSS."},{"id":"EX3-Q5","points":0.5,"type":"representation","explanation":"x.toUpperCase()"},{"id":"EX3-Q6","points":0.5,"type":"representation","explanation":"true"},{"id":"EX3-Q7","points":0.5,"type":"representation","explanation":"&&"},{"id":"EX3-Q8","points":0.5,"type":"representation","explanation":"alert"}]},{"id":"exercice-4-modelisation-foad","title":"Exercice N°4 : Modélisation Relationnelle BDR « EduNum-FOAD » (3 pts)","type":"modeling","pointsMax":3,"questions":[{"id":"EX4-Q1","points":1,"type":"representation","explanation":"Représentation 1 correspond à R6 (séances multiples à dates distinctes) et Représentation 2 à R7 (assiduité unique par leçon)."},{"id":"EX4-Q2","points":1,"type":"representation","explanation":"Matiere (#idMat, libMat) et Lecon (#idLec, descLec, lienLec, #idMat)"},{"id":"EX4-Q3","points":1,"type":"representation","explanation":"Etablissement (#idEtab, libEtab, govEtab) et Apprenant (#idApp, nomPrenApp, mailApp, #idEtab)"}]},{"id":"exercice-5-biolab","title":"Exercice N°5 : Base « BioLab-Medoc » & Requêtes SQL (8 pts)","type":"sql","pointsMax":8,"questions":[{"id":"EX5-Q1","points":0.25,"type":"representation","explanation":"Faux : une maladie peut être traitée par plusieurs médicaments distincts (association Traitement N:M)."},{"id":"EX5-Q2","points":0.25,"type":"representation","explanation":"Faux : un médicament peut soigner plusieurs maladies."},{"id":"EX5-Q3","points":0.25,"type":"representation","explanation":"Faux : Medicament possède une seule clé étrangère codeForme."},{"id":"EX5-Q4","points":0.25,"type":"representation","explanation":"Vrai : la table Composition associe un médicament à plusieurs plantes."},{"id":"EX5-Q5","points":0.25,"type":"representation","explanation":"Vrai : une plante peut apparaître dans plusieurs lignes de Composition."},{"id":"EX5-Q6","points":0.25,"type":"representation","explanation":"Faux : l'attribut duree est porté par la relation Traitement et dépend du couple (codeMed, codeMaladie)."},{"id":"EX5-Q7","points":0.5,"type":"query","explanation":"Elle supprime la totalité des enregistrements de la table Plante sans toucher à sa structure."},{"id":"EX5-Q8","points":0.5,"type":"query","explanation":"Elle produit une erreur SQL car le nombre de colonnes fournies ne correspond pas à la définition de la table."},{"id":"EX5-Q9","points":0.5,"type":"query","explanation":"Elle cherche les plantes dont le codePlante est exactement égal à la chaîne de 2 caractères '4%'."},{"id":"EX5-Q10","points":0.5,"type":"query","explanation":"ORDER BY 2 trie selon la 2ème colonne projetée dans la clause SELECT (nomPlante)."},{"id":"EX5-Q11","points":0.5,"type":"ddl","explanation":"ALTER TABLE Medicament ADD dateFin DATE;"},{"id":"EX5-Q12","points":0.5,"type":"ddl","explanation":"ALTER TABLE Medicament MODIFY caracMed VARCHAR(150);"},{"id":"EX5-Q13","points":0.3125,"type":"query","explanation":"SELECT * FROM Plante ORDER BY nomPlante DESC;"},{"id":"EX5-Q14","points":0.3125,"type":"query","explanation":"SELECT M.nomMed, M.caracMed FROM Medicament M, Forme F WHERE M.codeForme = F.codeForme AND F.nomForme = 'Sirop';"},{"id":"EX5-Q15","points":0.3125,"type":"query","explanation":"SELECT P.codePlante, P.nomPlante, P.descPlante FROM Plante P, Composition C WHERE P.codePlante = C.codePlante AND C.codeMed = 'Med001';"},{"id":"EX5-Q16","points":0.3125,"type":"query","explanation":"SELECT M.nomMed FROM Medicament M, Traitement T, Maladie MA WHERE M.codeMed = T.codeMed AND T.codeMaladie = MA.codeMaladie AND MA.nomMaladie = 'Fièvre';"},{"id":"EX5-Q17","points":0.3125,"type":"query","explanation":"SELECT codeMed, nomMed FROM Medicament WHERE dateFab >= '2023-01-01' AND dateFab <= '2023-12-31';"},{"id":"EX5-Q18","points":0.3125,"type":"query","explanation":"SELECT AVG(duree) AS DureeMoyenne FROM Traitement WHERE codeMaladie = 'TSE005';"},{"id":"EX5-Q19","points":0.3125,"type":"query","explanation":"SELECT codeMed FROM Traitement WHERE codeMaladie = 'TSE005' AND duree = (SELECT MIN(duree) FROM Traitement WHERE codeMaladie = 'TSE005');"},{"id":"EX5-Q20","points":0.3125,"type":"query","explanation":"SELECT M.codeMed, M.nomMed FROM Medicament M, Composition C WHERE M.codeMed = C.codeMed GROUP BY M.codeMed, M.nomMed HAVING COUNT(C.codePlante) >= 2;"},{"id":"EX5-Q21","points":0.5,"type":"dml","explanation":"INSERT INTO Forme (codeForme, nomForme) VALUES ('IF0005', 'Inhalation');"},{"id":"EX5-Q22","points":0.5,"type":"dml","explanation":"UPDATE Composition SET dose = 100 WHERE codePlante = 'BS0001' AND codeMed = 'Med001';"}]}]$json$::jsonb),
  ('exam-bac2024-principale-ecrit', 'Bac 2024 (Session Principale) - Épreuve Écrite Systèmes & Technologies de l''Informatique', 180, 20, $json$[{"id":"exercice-1-qcm","title":"Exercice N°1 : QCM Notions Web & Programmation (2 pts)","type":"qcm","pointsMax":2,"questions":[{"id":"EX1-Q1","points":0.25,"multiple":false,"correctAnswers":["opt-attribut"],"explanation":"href est un attribut de la balise HTML <a>."},{"id":"EX1-Q2","points":0.25,"multiple":false,"correctAnswers":["opt-2"],"explanation":"Le transtypage explicite (int) tronque la partie décimale sans arrondi, donnant 2."},{"id":"EX1-Q3","points":0.25,"multiple":false,"correctAnswers":["opt-count"],"explanation":"count($A) retourne le nombre d'éléments dans un tableau PHP."},{"id":"EX1-Q4","points":0.25,"multiple":false,"correctAnswers":["opt-selecteur"],"explanation":"#cercle est un sélecteur d'identifiant en CSS."},{"id":"EX1-Q5","points":0.25,"multiple":false,"correctAnswers":["opt-transform"],"explanation":"La propriété CSS3 est transform avec la fonction rotate(45deg)."},{"id":"EX1-Q6","points":0.25,"multiple":false,"correctAnswers":["opt-12"],"explanation":"L'opérateur + concatène les deux chaînes de caractères, produisant '12'."},{"id":"EX1-Q7","points":0.25,"multiple":false,"correctAnswers":["opt-getfullyear"],"explanation":"getFullYear() retourne l'année à 4 chiffres d'une date en JavaScript."},{"id":"EX1-Q8","points":0.25,"multiple":false,"correctAnswers":["opt-12_5"],"explanation":"parseFloat('12.5') convertit la chaîne en nombre décimal 12.5."}]},{"id":"exercice-2-hippique","title":"Exercice N°2 : Base HippieTeams — Courses Hippiques (5 pts)","type":"modeling","pointsMax":5,"questions":[{"id":"EX2-VF-A","points":0.5,"type":"code_analysis","explanation":"La cardinalité Propriétaire 1 - ∞ Cheval permet à un propriétaire d'avoir plusieurs chevaux."},{"id":"EX2-VF-B","points":0.5,"type":"code_analysis","explanation":"Une course est associée à une seule compétition (clé étrangère idComp# dans Course)."},{"id":"EX2-VF-C","points":0.5,"type":"code_analysis","explanation":"La date est un attribut de Competition, toutes les courses d'une compétition ont lieu le même jour."},{"id":"EX2-VF-D","points":0.5,"type":"code_analysis","explanation":"Un cheval peut participer à plusieurs courses (relation N:M Resultat), donc à plusieurs compétitions."},{"id":"EX2-VF-E","points":0.5,"type":"code_analysis","explanation":"Le rang correspond bien au classement du cheval dans la course spécifiée."},{"id":"EX2-CI-A","points":0.5,"type":"code_analysis","explanation":"Contrainte d'intégrité référentielle sur la clé étrangère idProp dans Cheval."},{"id":"EX2-CI-B","points":0.5,"type":"code_analysis","explanation":"Le rang doit être un entier strictement positif (CHECK rang > 0)."},{"id":"EX2-CI-C","points":0.5,"type":"code_analysis","explanation":"Contrainte d'intégrité de clé primaire composite sur (idCourse, idCheval) dans Resultat."},{"id":"EX2-EXT-1","points":0.5,"type":"representation","explanation":"Proprietaire(#idProp, nomProp, telProp), Cheval(#idCheval, nomCheval), Copropriete(#idCheval, #idProp, dateProp)."},{"id":"EX2-EXT-2","points":0.5,"type":"representation","explanation":"Course(#idCourse, heureCourse, distance, #idComp) avec clé alternative (#idComp, heureCourse) ou clé primaire composite."}]},{"id":"exercice-3-bdd-barrage","title":"Exercice N°3 (Partie 1) : Base « Gestion_Barrage » (Smart Water) - Exploitation SQL (7.5 pts)","type":"sql","pointsMax":7.5,"questions":[{"id":"EX3-BDD-R1","points":0.5,"type":"code_analysis","explanation":"Les capteurs commençant par 'D' sont DeltaNiveau-2000 (idVan=103, etatVan=1) et DébitMètre-800 (idVan=102, etatVan=0)."},{"id":"EX3-BDD-R2","points":0.5,"type":"code_analysis","explanation":"Affiche idVan et etatVan des vannes équipées d'un capteur dont refCapt commence par 'D'."},{"id":"EX3-BDD-R3","points":0.5,"type":"query","explanation":"SELECT DISTINCT V.idVan, etatVan FROM Vanne V JOIN Capteur C ON V.idVan = C.idVan WHERE refCapt LIKE 'D%';"},{"id":"EX3-SQL-LID-1","points":0.6,"type":"query","explanation":"SELECT idVan FROM Vanne WHERE idBar = 5 AND etatVan = 1;"},{"id":"EX3-SQL-LID-2","points":0.6,"type":"query","explanation":"Jointure triple Capteur-Mesure-Alerte avec degAlert = 3 et statAlert != 'R'."},{"id":"EX3-SQL-LID-3","points":0.6,"type":"query","explanation":"SELECT B.idBar, nomBar, COUNT(idVan) FROM Barrage B LEFT JOIN Vanne V ON B.idBar = V.idBar GROUP BY B.idBar, nomBar;"},{"id":"EX3-SQL-LID-4","points":0.6,"type":"query","explanation":"SELECT DISTINCT B.idBar, nomBar FROM Barrage B JOIN NiveauEau N ON B.idBar = N.idBar WHERE niveau > 0.9 * hauteur AND YEAR(dateNiv) = 2024;"},{"id":"EX3-SQL-LID-5","points":0.6,"type":"query","explanation":"SELECT C.idCapt, refCapt, MAX(dateMes) FROM Capteur C JOIN Mesure M USING(idCapt) GROUP BY C.idCapt, refCapt HAVING MAX(dateMes) < '2024-02-15';"},{"id":"EX3-SQL-LMD-1","points":0.6,"type":"dml","explanation":"DELETE FROM Alerte WHERE statAlert = 'R';"},{"id":"EX3-SQL-LMD-2","points":0.6,"type":"dml","explanation":"UPDATE Mesure SET valMes = valMes - 2 WHERE idCapt = 4 AND dateMes BETWEEN '2024-01-29' AND '2024-02-02';"},{"id":"EX3-SQL-LDD-3","points":0.6,"type":"ddl","explanation":"CREATE TABLE Categorie (idCat INT PRIMARY KEY, nomCat VARCHAR(50));"},{"id":"EX3-SQL-LDD-4","points":0.6,"type":"ddl","explanation":"ALTER TABLE Categorie ADD CONSTRAINT chk_nomCat CHECK (nomCat IN ('débit', 'pression', 'température'));"},{"id":"EX3-SQL-LDD-5","points":0.6,"type":"ddl","explanation":"ALTER TABLE Capteur ADD idCat INT; ALTER TABLE Capteur ADD FOREIGN KEY (idCat) REFERENCES Categorie(idCat);"}]},{"id":"exercice-3-web-barrage","title":"Exercice N°3 (Partie 2) : Cartographie Interactive & Programmation Web (5.5 pts)","type":"code_analysis","pointsMax":5.5,"questions":[{"id":"EX3-WEB-HTML-1","points":0.3,"type":"code_analysis","explanation":"L'événement de chargement est onload."},{"id":"EX3-WEB-HTML-2","points":0.3,"type":"code_analysis","explanation":"img désigne le répertoire (dossier) dans lequel se trouve l'image tunisie.bmp."},{"id":"EX3-WEB-HTML-3","points":0.3,"type":"code_analysis","explanation":"L'attribut onmouseover déclenche la fonction dès que le pointeur de la souris survole la zone."},{"id":"EX3-WEB-HTML-4","points":0.3,"type":"code_analysis","explanation":"target='_blank' charge le résultat dans un nouvel onglet de navigation."},{"id":"EX3-WEB-HTML-5","points":0.3,"type":"code_analysis","explanation":"L'attribut booléen hidden rend le champ invisible pour l'utilisateur."},{"id":"EX3-WEB-CSS-1","points":0.33,"type":"code_analysis","explanation":"display: inline-block permet de respecter le flux et le positionnement."},{"id":"EX3-WEB-CSS-2","points":0.33,"type":"code_analysis","explanation":"border-radius: 50% transforme une boîte carrée en cercle parfait."},{"id":"EX3-WEB-CSS-3","points":0.34,"type":"code_analysis","explanation":"font-weight: bold applique le style gras."},{"id":"EX3-WEB-JS-1","points":0.375,"type":"code_analysis","explanation":"Les variables debut et fin sont déclarées avec let dans la fonction, leur portée est donc locale."},{"id":"EX3-WEB-JS-2","points":0.375,"type":"code_analysis","explanation":"indexOf('#', debut) trouve le premier indice du caractère '#' à partir de debut."},{"id":"EX3-WEB-JS-3","points":0.375,"type":"code_analysis","explanation":"substr(debut, fin - debut) extrait les informations du barrage sélectionné."},{"id":"EX3-WEB-JS-4","points":0.375,"type":"code_analysis","explanation":"innerHTML affecte le texte avec balises HTML à l'élément identifié par info2."},{"id":"EX3-WEB-PHP-1","points":0.375,"type":"code_analysis","explanation":"require génère une Fatal Error bloquante si le fichier inclus est introuvable."},{"id":"EX3-WEB-PHP-2","points":0.375,"type":"code_analysis","explanation":"str_replace('_', ' ', $nomBarrage) remplace tous les underscores par des espaces."},{"id":"EX3-WEB-PHP-3","points":0.375,"type":"code_analysis","explanation":"La clause or die('Requête erronée') affiche le message d'erreur et termine l'exécution."},{"id":"EX3-WEB-PHP-4","points":0.375,"type":"code_analysis","explanation":"mysqli_fetch_array() avec le mode par défaut MYSQLI_BOTH fournit les deux indexations."}]}]$json$::jsonb)
on conflict (exam_id) do update set
  titre = excluded.titre,
  duree_min = excluded.duree_min,
  bareme_total = excluded.bareme_total,
  sections_meta = excluded.sections_meta;

-- 2. Table des copies d'épreuves écrites scellées côté serveur
create table if not exists public.copies_examen_ecrit (
  id uuid primary key default gen_random_uuid(),
  exam_id text not null,
  eleve_id uuid not null references public.profiles(id) on delete cascade,
  statut text not null default 'en_cours' check (statut in ('en_cours', 'remise', 'expiree', 'corrigee')),
  motif_cloture text check (motif_cloture in ('remise_volontaire', 'temps_ecoule')),
  debut_serveur timestamptz not null default clock_timestamp(),
  echeance_serveur timestamptz not null,
  remise_serveur_at timestamptz,
  reponses jsonb not null default '{}'::jsonb,
  hash_scelle text,
  score_qcm numeric(5,2),
  max_qcm numeric(5,2),
  score_ouvert numeric(5,2),
  max_ouvert numeric(5,2),
  note_finale numeric(5,2),
  bareme_total numeric(5,2) not null default 20,
  detail_evaluation jsonb,
  notes_enseignant jsonb not null default '{}'::jsonb,
  commentaire_enseignant text,
  corrige_par uuid references public.profiles(id) on delete set null,
  corrige_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (eleve_id, exam_id)
);

create index if not exists idx_copies_examen_ecrit_eleve on public.copies_examen_ecrit (eleve_id, exam_id);
create index if not exists idx_copies_examen_ecrit_statut on public.copies_examen_ecrit (statut, updated_at desc);

-- Révocation stricte des écritures directes client : seules les RPC security definer écrivent dans copies_examen_ecrit
revoke all on table public.copies_examen_ecrit from public, anon, authenticated;
grant select on table public.copies_examen_ecrit to authenticated;
grant all on table public.copies_examen_ecrit to service_role;
alter table public.copies_examen_ecrit enable row level security;

drop policy if exists "copies_examen_ecrit_select" on public.copies_examen_ecrit;
create policy "copies_examen_ecrit_select"
  on public.copies_examen_ecrit
  for select
  to authenticated
  using (
    eleve_id = auth.uid()
    or public.est_eleve_de_enseignant(eleve_id)
    or public.has_role(auth.uid(), 'admin')
  );

-- Trigger de défense en profondeur : interdit toute écriture hors RPC et tout écrasement d'une copie scellée
create or replace function public.proteger_copie_examen_ecrit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  _is_rpc boolean := coalesce(current_setting('app.copie_ecrit_rpc', true), '') = 'on';
  _is_privileged boolean := current_user in ('postgres', 'service_role');
begin
  if not _is_rpc and not _is_privileged then
    raise exception 'Écriture directe dans copies_examen_ecrit interdite : utiliser exclusivement les RPC serveur (#197 / T-06)';
  end if;

  if tg_op = 'UPDATE' then
    -- Une fois la copie scellée (remise, expiree ou corrigee), les réponses, l'échéance et le hash ne peuvent plus jamais être modifiés
    if old.statut in ('remise', 'expiree', 'corrigee') then
      if new.reponses is distinct from old.reponses
         or new.hash_scelle is distinct from old.hash_scelle
         or new.echeance_serveur is distinct from old.echeance_serveur
         or new.statut = 'en_cours' then
        raise exception 'Copie d''examen écrit scellée et immuable : modification des réponses ou réouverture interdite (#197 / T-07)';
      end if;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_proteger_copie_examen_ecrit on public.copies_examen_ecrit;
create trigger trg_proteger_copie_examen_ecrit
before insert or update or delete on public.copies_examen_ecrit
for each row
execute function public.proteger_copie_examen_ecrit();

-- 3. Fonction interne de notation serveur (QCM automatique + agrégation des notes enseignant sur questions ouvertes)
create or replace function public.evaluer_copie_examen_ecrit_interne(
  _exam_id text,
  _reponses jsonb,
  _notes_enseignant jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _normalized_id text := case when trim(_exam_id) = 'demo' then 'written-bac-demo' else trim(_exam_id) end;
  _bareme record;
  _sec jsonb;
  _q jsonb;
  _q_id text;
  _q_pts numeric(5,2);
  _q_multiple boolean;
  _ans jsonb;
  _correct_arr jsonb;
  _is_correct boolean;
  _pts_earned numeric(5,2);
  _feedback text;
  _statut_corr text;
  _sec_earned numeric(5,2);
  _sec_max numeric(5,2);
  _sec_items jsonb;
  _sections_out jsonb := '[]'::jsonb;
  _score_qcm numeric(5,2) := 0;
  _max_qcm numeric(5,2) := 0;
  _score_ouvert numeric(5,2) := 0;
  _max_ouvert numeric(5,2) := 0;
  _nb_ouvert_attente int := 0;
  _total_score numeric(5,2);
  _bareme_total numeric(5,2) := 20;
  _percentage numeric(5,1);
  _note_entry jsonb;
begin
  select * into _bareme
  from public.sujets_examen_ecrit_baremes
  where exam_id = _normalized_id;

  if not found then
    return jsonb_build_object(
      'examId', _exam_id,
      'totalScore', 0,
      'baremeTotal', 20,
      'percentage', 0,
      'passed', false,
      'scoreQcm', 0,
      'maxQcm', 0,
      'scoreOuvert', null,
      'maxOuvert', 0,
      'statutNotation', 'en_attente_correction_enseignant',
      'sections', '[]'::jsonb
    );
  end if;

  _bareme_total := coalesce(_bareme.bareme_total, 20);

  for _sec in select * from jsonb_array_elements(_bareme.sections_meta)
  loop
    _sec_earned := 0;
    _sec_max := 0;
    _sec_items := '[]'::jsonb;

    for _q in select * from jsonb_array_elements(coalesce(_sec -> 'questions', '[]'::jsonb))
    loop
      _q_id := _q ->> 'id';
      _q_pts := coalesce((_q ->> 'points')::numeric, 0);
      _sec_max := _sec_max + _q_pts;
      _ans := coalesce(_reponses, '{}'::jsonb) -> _q_id;

      if (_sec ->> 'type') = 'qcm' then
        _max_qcm := _max_qcm + _q_pts;
        _q_multiple := coalesce((_q ->> 'multiple')::boolean, false);
        _correct_arr := coalesce(_q -> 'correctAnswers', '[]'::jsonb);
        _is_correct := false;

        if _ans is not null
           and jsonb_typeof(_ans) <> 'null'
           and _ans <> '""'::jsonb
           and _ans <> '[]'::jsonb then
          if _q_multiple then
            if jsonb_typeof(_ans) = 'array' then
              select (
                not exists (
                  select 1
                  from jsonb_array_elements_text(_correct_arr) c
                  where lower(trim(c)) not in (
                    select lower(trim(a)) from jsonb_array_elements_text(_ans) a
                  )
                )
                and not exists (
                  select 1
                  from jsonb_array_elements_text(_ans) a
                  where lower(trim(a)) not in (
                    select lower(trim(c)) from jsonb_array_elements_text(_correct_arr) c
                  )
                )
              ) into _is_correct;
            else
              select (
                jsonb_array_length(_correct_arr) = 1
                and lower(trim(_ans #>> '{}')) = lower(trim(_correct_arr ->> 0))
              ) into _is_correct;
            end if;
          else
            if jsonb_typeof(_ans) = 'array' then
              select (
                jsonb_array_length(_ans) = 1
                and lower(trim(_ans ->> 0)) = lower(trim(_correct_arr ->> 0))
              ) into _is_correct;
            else
              select (
                lower(trim(_ans #>> '{}')) = lower(trim(_correct_arr ->> 0))
              ) into _is_correct;
            end if;
          end if;
        end if;

        if coalesce(_is_correct, false) then
          _pts_earned := _q_pts;
          _feedback := 'Réponse exacte (validée par le serveur).';
        elsif _ans is null or jsonb_typeof(_ans) = 'null' or _ans = '""'::jsonb or _ans = '[]'::jsonb then
          _pts_earned := 0;
          _feedback := 'Aucune réponse fournie.';
        else
          _pts_earned := 0;
          _feedback := trim('Réponse incorrecte. ' || coalesce(_q ->> 'explanation', ''));
        end if;

        _score_qcm := _score_qcm + _pts_earned;
        _sec_earned := _sec_earned + _pts_earned;
        _statut_corr := 'automatique_serveur';
      else
        _max_ouvert := _max_ouvert + _q_pts;
        _note_entry := coalesce(_notes_enseignant, '{}'::jsonb) -> _q_id;

        if _note_entry is not null and jsonb_typeof(_note_entry) <> 'null' then
          if jsonb_typeof(_note_entry) = 'object' then
            _pts_earned := least(greatest(coalesce((_note_entry ->> 'points')::numeric, 0), 0), _q_pts);
            _feedback := coalesce(
              nullif(trim(_note_entry ->> 'commentaire'), ''),
              'Corrigé par l''enseignant (' || _pts_earned || ' / ' || _q_pts || ' pts).'
            );
          else
            _pts_earned := least(greatest(coalesce((_note_entry #>> '{}')::numeric, 0), 0), _q_pts);
            _feedback := 'Corrigé par l''enseignant (' || _pts_earned || ' / ' || _q_pts || ' pts).';
          end if;
          _is_correct := (_pts_earned >= (_q_pts / 2.0));
          _score_ouvert := _score_ouvert + _pts_earned;
          _sec_earned := _sec_earned + _pts_earned;
          _statut_corr := 'corrigee_enseignant';
        else
          _pts_earned := 0;
          _is_correct := false;
          _nb_ouvert_attente := _nb_ouvert_attente + 1;
          _feedback := 'Réponse scellée sur le serveur — en attente de correction manuelle par l''enseignant.';
          _statut_corr := 'en_attente_enseignant';
        end if;
      end if;

      _sec_items := _sec_items || jsonb_build_array(
        jsonb_build_object(
          'questionId', _q_id,
          'sectionId', _sec ->> 'id',
          'pointsEarned', _pts_earned,
          'pointsMax', _q_pts,
          'isCorrect', coalesce(_is_correct, false),
          'feedback', _feedback,
          'studentAnswer', _ans,
          'expectedSummary', _q ->> 'explanation',
          'statutCorrection', _statut_corr
        )
      );
    end loop;

    _sections_out := _sections_out || jsonb_build_array(
      jsonb_build_object(
        'sectionId', _sec ->> 'id',
        'title', _sec ->> 'title',
        'type', _sec ->> 'type',
        'pointsEarned', _sec_earned,
        'pointsMax', _sec_max,
        'items', _sec_items
      )
    );
  end loop;

  _total_score := round(least(_score_qcm + _score_ouvert, _bareme_total), 2);
  _percentage := round((_total_score / nullif(_bareme_total, 0)) * 100, 1);

  return jsonb_build_object(
    'examId', _exam_id,
    'totalScore', _total_score,
    'baremeTotal', _bareme_total,
    'percentage', coalesce(_percentage, 0),
    'passed', (_total_score >= (_bareme_total / 2.0)),
    'scoreQcm', _score_qcm,
    'maxQcm', _max_qcm,
    'scoreOuvert', case when _nb_ouvert_attente > 0 and _score_ouvert = 0 then null else _score_ouvert end,
    'maxOuvert', _max_ouvert,
    'statutNotation', case when _nb_ouvert_attente > 0 then 'en_attente_correction_enseignant' else 'definitive' end,
    'sections', _sections_out
  );
end;
$$;

revoke execute on function public.evaluer_copie_examen_ecrit_interne(text, jsonb, jsonb) from public, anon, authenticated;

-- 4. RPC demarrer_copie_examen_ecrit : initialise ou restitue la copie serveur (#197)
create or replace function public.demarrer_copie_examen_ecrit(
  _exam_id text,
  _duree_min int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _uid uuid := auth.uid();
  _now timestamptz := clock_timestamp();
  _normalized_id text := case when trim(_exam_id) = 'demo' then 'written-bac-demo' else trim(_exam_id) end;
  _bareme record;
  _duree_effective int;
  _bareme_total numeric(5,2);
  _copie public.copies_examen_ecrit;
  _eval jsonb;
  _hash text;
begin
  if _uid is null then
    raise exception 'Authentification requise pour démarrer une épreuve écrite (#197 / T-06)';
  end if;

  select * into _bareme
  from public.sujets_examen_ecrit_baremes
  where exam_id = _normalized_id;

  _duree_effective := greatest(least(coalesce(_bareme.duree_min, _duree_min, 120), 600), 5);
  _bareme_total := coalesce(_bareme.bareme_total, 20);

  perform set_config('app.copie_ecrit_rpc', 'on', true);

  select * into _copie
  from public.copies_examen_ecrit
  where eleve_id = _uid
    and exam_id = _normalized_id
  for update;

  if not found then
    insert into public.copies_examen_ecrit (
      exam_id,
      eleve_id,
      statut,
      debut_serveur,
      echeance_serveur,
      reponses,
      bareme_total,
      updated_at
    )
    values (
      _normalized_id,
      _uid,
      'en_cours',
      _now,
      _now + (_duree_effective || ' minutes')::interval,
      '{}'::jsonb,
      _bareme_total,
      _now
    )
    returning * into _copie;
  elsif _copie.statut = 'en_cours' and _now > _copie.echeance_serveur then
    -- Si l'échéance serveur est dépassée lors de la réouverture, sceller automatiquement la copie avec motif temps_ecoule
    _hash := encode(digest(convert_to(coalesce(_copie.reponses, '{}'::jsonb)::text, 'UTF8'), 'sha256'), 'hex');
    _eval := public.evaluer_copie_examen_ecrit_interne(_normalized_id, _copie.reponses, _copie.notes_enseignant);

    update public.copies_examen_ecrit
    set
      statut = 'expiree',
      motif_cloture = 'temps_ecoule',
      remise_serveur_at = coalesce(_copie.remise_serveur_at, _now),
      hash_scelle = _hash,
      score_qcm = (_eval ->> 'scoreQcm')::numeric,
      max_qcm = (_eval ->> 'maxQcm')::numeric,
      score_ouvert = (_eval ->> 'scoreOuvert')::numeric,
      max_ouvert = (_eval ->> 'maxOuvert')::numeric,
      note_finale = (_eval ->> 'totalScore')::numeric,
      detail_evaluation = _eval,
      updated_at = _now
    where id = _copie.id
    returning * into _copie;
  end if;

  perform set_config('app.copie_ecrit_rpc', '', true);

  -- Tant que la copie est en_cours, aucun détail de correction ni corrigé n'est renvoyé au client
  return jsonb_build_object(
    'copie_id', _copie.id,
    'exam_id', _copie.exam_id,
    'statut', _copie.statut,
    'motif_cloture', _copie.motif_cloture,
    'debut_serveur', _copie.debut_serveur,
    'echeance_serveur', _copie.echeance_serveur,
    'horloge_serveur', _now,
    'remise_serveur_at', _copie.remise_serveur_at,
    'reponses', _copie.reponses,
    'hash_scelle', _copie.hash_scelle,
    'score_qcm', _copie.score_qcm,
    'max_qcm', _copie.max_qcm,
    'score_ouvert', _copie.score_ouvert,
    'max_ouvert', _copie.max_ouvert,
    'note_finale', _copie.note_finale,
    'bareme_total', _copie.bareme_total,
    'detail_evaluation', case when _copie.statut = 'en_cours' then null else _copie.detail_evaluation end,
    'commentaire_enseignant', _copie.commentaire_enseignant
  );
end;
$$;

revoke execute on function public.demarrer_copie_examen_ecrit(text, int) from public, anon;
grant execute on function public.demarrer_copie_examen_ecrit(text, int) to authenticated;

-- 5. RPC sauvegarder_brouillon_examen_ecrit : sauvegarde les réponses avant l'échéance (#197)
create or replace function public.sauvegarder_brouillon_examen_ecrit(
  _exam_id text,
  _reponses jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _now timestamptz := clock_timestamp();
  _normalized_id text := case when trim(_exam_id) = 'demo' then 'written-bac-demo' else trim(_exam_id) end;
  _copie public.copies_examen_ecrit;
begin
  if _uid is null then
    raise exception 'Authentification requise pour sauvegarder un brouillon d''examen écrit (#197)';
  end if;

  select * into _copie
  from public.copies_examen_ecrit
  where eleve_id = _uid
    and exam_id = _normalized_id
  for update;

  if not found then
    raise exception 'Aucune copie d''examen écrit initialisée pour ce sujet (#197)';
  end if;

  if _copie.statut <> 'en_cours' then
    raise exception 'Copie déjà scellée : aucune modification n''est autorisée après remise (#197 / T-06)';
  end if;

  if _now > _copie.echeance_serveur then
    raise exception 'Échéance serveur dépassée : sauvegarde du brouillon refusée (#197 / T-06)';
  end if;

  perform set_config('app.copie_ecrit_rpc', 'on', true);

  update public.copies_examen_ecrit
  set
    reponses = coalesce(_reponses, '{}'::jsonb),
    updated_at = _now
  where id = _copie.id
  returning * into _copie;

  perform set_config('app.copie_ecrit_rpc', '', true);

  return jsonb_build_object(
    'copie_id', _copie.id,
    'statut', _copie.statut,
    'horloge_serveur', _now,
    'updated_at', _copie.updated_at
  );
end;
$$;

revoke execute on function public.sauvegarder_brouillon_examen_ecrit(text, jsonb) from public, anon;
grant execute on function public.sauvegarder_brouillon_examen_ecrit(text, jsonb) to authenticated;

-- 6. RPC remettre_copie_examen_ecrit : scelle définitivement la copie et calcule la note QCM côté serveur (#197)
create or replace function public.remettre_copie_examen_ecrit(
  _exam_id text,
  _reponses jsonb default null,
  _motif text default 'remise_volontaire'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _uid uuid := auth.uid();
  _now timestamptz := clock_timestamp();
  _normalized_id text := case when trim(_exam_id) = 'demo' then 'written-bac-demo' else trim(_exam_id) end;
  _copie public.copies_examen_ecrit;
  _reponses_finales jsonb;
  _motif_effectif text;
  _statut_effectif text;
  _hash text;
  _eval jsonb;
begin
  if _uid is null then
    raise exception 'Authentification requise pour remettre une copie d''examen écrit (#197 / T-06)';
  end if;

  -- S'assurer qu'une copie existe
  if not exists (
    select 1 from public.copies_examen_ecrit
    where eleve_id = _uid and exam_id = _normalized_id
  ) then
    perform public.demarrer_copie_examen_ecrit(_normalized_id, null);
  end if;

  select * into _copie
  from public.copies_examen_ecrit
  where eleve_id = _uid
    and exam_id = _normalized_id
  for update;

  -- Refus strict si la copie est déjà scellée (remise, expiree ou corrigee)
  if _copie.statut in ('remise', 'expiree', 'corrigee') then
    raise exception 'Copie déjà remise et scellée : toute réécriture ou nouvelle soumission est interdite (#197 / T-06)';
  end if;

  -- Distinction stricte entre remise volontaire (avant échéance) et expiration du temps réglementaire
  if _now > _copie.echeance_serveur or coalesce(_motif, '') = 'temps_ecoule' then
    _motif_effectif := 'temps_ecoule';
    _statut_effectif := 'expiree';
    -- Si l'échéance est largement dépassée (> 15s) et qu'un brouillon existait déjà en base, on conserve le brouillon serveur
    if _now > (_copie.echeance_serveur + interval '15 seconds')
       and _copie.reponses is not null
       and _copie.reponses <> '{}'::jsonb then
      _reponses_finales := _copie.reponses;
    else
      _reponses_finales := coalesce(_reponses, _copie.reponses, '{}'::jsonb);
    end if;
  else
    _motif_effectif := 'remise_volontaire';
    _statut_effectif := 'remise';
    _reponses_finales := coalesce(_reponses, _copie.reponses, '{}'::jsonb);
  end if;

  _hash := encode(digest(convert_to(_reponses_finales::text, 'UTF8'), 'sha256'), 'hex');
  _eval := public.evaluer_copie_examen_ecrit_interne(_normalized_id, _reponses_finales, _copie.notes_enseignant);

  perform set_config('app.copie_ecrit_rpc', 'on', true);

  update public.copies_examen_ecrit
  set
    statut = _statut_effectif,
    motif_cloture = _motif_effectif,
    remise_serveur_at = _now,
    reponses = _reponses_finales,
    hash_scelle = _hash,
    score_qcm = (_eval ->> 'scoreQcm')::numeric,
    max_qcm = (_eval ->> 'maxQcm')::numeric,
    score_ouvert = (_eval ->> 'scoreOuvert')::numeric,
    max_ouvert = (_eval ->> 'maxOuvert')::numeric,
    note_finale = (_eval ->> 'totalScore')::numeric,
    detail_evaluation = _eval,
    updated_at = _now
  where id = _copie.id
  returning * into _copie;

  perform set_config('app.copie_ecrit_rpc', '', true);

  insert into public.journal_securite (type, acteur_id, meta)
  values (
    'REMISE_COPIE_EXAMEN_ECRIT',
    _uid,
    jsonb_build_object(
      'copie_id', _copie.id,
      'exam_id', _copie.exam_id,
      'statut', _copie.statut,
      'motif_cloture', _copie.motif_cloture,
      'hash_scelle', _copie.hash_scelle,
      'score_qcm', _copie.score_qcm,
      'note_finale', _copie.note_finale
    )
  );

  return jsonb_build_object(
    'copie_id', _copie.id,
    'exam_id', _copie.exam_id,
    'statut', _copie.statut,
    'motif_cloture', _copie.motif_cloture,
    'debut_serveur', _copie.debut_serveur,
    'echeance_serveur', _copie.echeance_serveur,
    'horloge_serveur', _now,
    'remise_serveur_at', _copie.remise_serveur_at,
    'reponses', _copie.reponses,
    'hash_scelle', _copie.hash_scelle,
    'score_qcm', _copie.score_qcm,
    'max_qcm', _copie.max_qcm,
    'score_ouvert', _copie.score_ouvert,
    'max_ouvert', _copie.max_ouvert,
    'note_finale', _copie.note_finale,
    'bareme_total', _copie.bareme_total,
    'detail_evaluation', _copie.detail_evaluation,
    'commentaire_enseignant', _copie.commentaire_enseignant
  );
end;
$$;

revoke execute on function public.remettre_copie_examen_ecrit(text, jsonb, text) from public, anon;
grant execute on function public.remettre_copie_examen_ecrit(text, jsonb, text) to authenticated;

-- 7. RPC noter_copie_examen_ecrit : correction manuelle enseignant des questions ouvertes (#197)
create or replace function public.noter_copie_examen_ecrit(
  _copie_id uuid,
  _notes_ouvertes jsonb,
  _commentaire text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _now timestamptz := clock_timestamp();
  _copie public.copies_examen_ecrit;
  _eval jsonb;
begin
  if _uid is null then
    raise exception 'Authentification requise pour corriger une copie (#197)';
  end if;

  select * into _copie
  from public.copies_examen_ecrit
  where id = _copie_id
  for update;

  if not found then
    raise exception 'Copie d''examen écrit introuvable';
  end if;

  if not (
    public.has_role(_uid, 'admin')
    or (
      public.has_role(_uid, 'enseignant')
      and public.est_eleve_de_enseignant(_copie.eleve_id)
    )
  ) then
    raise exception 'Accès refusé : seul l''enseignant de l''élève ou un administrateur peut corriger cette copie (#197 / T-02)';
  end if;

  if _copie.statut = 'en_cours' and _now <= _copie.echeance_serveur then
    raise exception 'Correction impossible tant que la copie est encore en cours de composition par l''élève';
  end if;

  _eval := public.evaluer_copie_examen_ecrit_interne(
    _copie.exam_id,
    _copie.reponses,
    coalesce(_notes_ouvertes, '{}'::jsonb)
  );

  perform set_config('app.copie_ecrit_rpc', 'on', true);

  update public.copies_examen_ecrit
  set
    statut = 'corrigee',
    motif_cloture = coalesce(_copie.motif_cloture, 'temps_ecoule'),
    remise_serveur_at = coalesce(_copie.remise_serveur_at, _now),
    score_qcm = (_eval ->> 'scoreQcm')::numeric,
    max_qcm = (_eval ->> 'maxQcm')::numeric,
    score_ouvert = (_eval ->> 'scoreOuvert')::numeric,
    max_ouvert = (_eval ->> 'maxOuvert')::numeric,
    note_finale = (_eval ->> 'totalScore')::numeric,
    detail_evaluation = _eval,
    notes_enseignant = coalesce(_notes_ouvertes, '{}'::jsonb),
    commentaire_enseignant = _commentaire,
    corrige_par = _uid,
    corrige_at = _now,
    updated_at = _now
  where id = _copie.id
  returning * into _copie;

  perform set_config('app.copie_ecrit_rpc', '', true);

  return jsonb_build_object(
    'copie_id', _copie.id,
    'exam_id', _copie.exam_id,
    'eleve_id', _copie.eleve_id,
    'statut', _copie.statut,
    'motif_cloture', _copie.motif_cloture,
    'score_qcm', _copie.score_qcm,
    'max_qcm', _copie.max_qcm,
    'score_ouvert', _copie.score_ouvert,
    'max_ouvert', _copie.max_ouvert,
    'note_finale', _copie.note_finale,
    'bareme_total', _copie.bareme_total,
    'detail_evaluation', _copie.detail_evaluation,
    'notes_enseignant', _copie.notes_enseignant,
    'commentaire_enseignant', _copie.commentaire_enseignant,
    'corrige_at', _copie.corrige_at
  );
end;
$$;

revoke execute on function public.noter_copie_examen_ecrit(uuid, jsonb, text) from public, anon;
grant execute on function public.noter_copie_examen_ecrit(uuid, jsonb, text) to authenticated;

-- 8. RPC lister_copies_examen_ecrit_enseignant : liste les copies écrites des élèves d'une classe (#197)
create or replace function public.lister_copies_examen_ecrit_enseignant(
  _class_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _is_admin boolean;
  _result jsonb;
begin
  if _uid is null then
    raise exception 'Authentification requise (#197)';
  end if;

  _is_admin := public.has_role(_uid, 'admin');
  if not _is_admin and not public.has_role(_uid, 'enseignant') then
    raise exception 'Accès réservé aux enseignants et administrateurs (#197 / T-02)';
  end if;

  if _class_id is not null and not _is_admin and not public.est_enseignant_classe(_class_id) then
    raise exception 'Accès refusé : vous n''êtes pas l''enseignant de cette classe (T-02)';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'exam_id', c.exam_id,
        'exam_titre', coalesce(b.titre, c.exam_id),
        'eleve_id', c.eleve_id,
        'eleve_nom', coalesce(p.nom, 'Élève'),
        'eleve_prenom', coalesce(p.prenom, ''),
        'statut', c.statut,
        'motif_cloture', c.motif_cloture,
        'debut_serveur', c.debut_serveur,
        'echeance_serveur', c.echeance_serveur,
        'remise_serveur_at', c.remise_serveur_at,
        'reponses', c.reponses,
        'hash_scelle', c.hash_scelle,
        'score_qcm', c.score_qcm,
        'max_qcm', c.max_qcm,
        'score_ouvert', c.score_ouvert,
        'max_ouvert', c.max_ouvert,
        'note_finale', c.note_finale,
        'bareme_total', c.bareme_total,
        'detail_evaluation', c.detail_evaluation,
        'notes_enseignant', c.notes_enseignant,
        'commentaire_enseignant', c.commentaire_enseignant,
        'corrige_at', c.corrige_at,
        'updated_at', c.updated_at
      )
      order by c.updated_at desc
    ),
    '[]'::jsonb
  )
  into _result
  from public.copies_examen_ecrit c
  join public.profiles p on p.id = c.eleve_id
  left join public.sujets_examen_ecrit_baremes b on b.exam_id = c.exam_id
  where (
    (_class_id is not null and exists (
      select 1 from public.class_members cm
      where cm.class_id = _class_id and cm.eleve_id = c.eleve_id
    ))
    or (_class_id is null and (
      _is_admin
      or public.est_eleve_de_enseignant(c.eleve_id)
    ))
  );

  return _result;
end;
$$;

revoke execute on function public.lister_copies_examen_ecrit_enseignant(uuid) from public, anon;
grant execute on function public.lister_copies_examen_ecrit_enseignant(uuid) to authenticated;
