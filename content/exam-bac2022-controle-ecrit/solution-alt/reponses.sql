-- Exercice 2 (Variante)
CREATE TABLE IF NOT EXISTS Epreuve (CodeEpreuve VARCHAR(10), Libelle VARCHAR(30) NOT NULL, Coefficient DECIMAL(3,1) NOT NULL, PRIMARY KEY (CodeEpreuve));
ALTER TABLE Evaluation ADD CONSTRAINT fk_epreuve FOREIGN KEY (CodeEpreuve) REFERENCES Epreuve(CodeEpreuve);
ALTER TABLE Evaluation ADD CHECK (Note >= 0 AND Note <= 20);
ALTER TABLE Candidat ADD COLUMN Genre CHAR(1);

-- Exercice 3 (Variante)
ALTER TABLE Jeu ADD COLUMN Version VARCHAR(10);
INSERT INTO Categorie (CodeCat, LibCat) VALUES ('CAT3', 'Stratégie');
INSERT INTO Jeu (CodeCat, LibJeu, CodeJeu, AgeMin, NatJeu) VALUES ('CAT1', 'Chess Master', 'J010', 8, 'P');
SELECT Jeu.CodeJeu, Jeu.LibJeu, Categorie.LibCat FROM Jeu INNER JOIN Categorie ON Jeu.CodeCat = Categorie.CodeCat ORDER BY Jeu.LibJeu ASC;

-- Exercice 4 (Variante)
SELECT COUNT(*) AS NbEmployes FROM Employe INNER JOIN Service ON Employe.NumService = Service.NumService WHERE Service.LibService = 'Sécurité';
SELECT AVG(MontPrime) AS MoyennePrimes FROM Prime WHERE AnneePrime = 2021;
SELECT Prime.MatEmp, SUM(Prime.MontPrime) AS TotalPrimes FROM Prime GROUP BY Prime.MatEmp;
SELECT MatEmp, NomEmp, DateRecrut FROM Employe WHERE DateRecrut BETWEEN '2021-01-01' AND '2021-12-31' ORDER BY DateRecrut DESC;
UPDATE Prime SET MontPrime = 660.000 WHERE MatEmp = 'E01' AND AnneePrime = 2022;
DELETE FROM Prime WHERE AnneePrime < 2015;
