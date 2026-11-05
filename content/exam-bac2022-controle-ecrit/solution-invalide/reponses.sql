-- Réponses délibérément erronées
CREATE TABLE Epreuve (Libelle VARCHAR(30));
ALTER TABLE Evaluation ADD CodeEpreuve INT;
ALTER TABLE Evaluation ADD Note INT;
ALTER TABLE Candidat DROP COLUMN Nom;
ALTER TABLE Jeu DROP COLUMN AgeMin;
INSERT INTO Categorie VALUES ('CAT1', 'Doublon');
INSERT INTO Jeu VALUES ('J999', 'Faux Jeu');
SELECT * FROM Jeu;
SELECT * FROM Employe;
SELECT SUM(MontPrime) FROM Prime;
SELECT MatEmp FROM Prime;
SELECT * FROM Employe ORDER BY NomEmp ASC;
UPDATE Prime SET MontPrime = 0;
DELETE FROM Prime;
