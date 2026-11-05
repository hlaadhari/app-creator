-- Exercice 2
CREATE TABLE IF NOT EXISTS Epreuve (CodeEpreuve VARCHAR(10) PRIMARY KEY, Libelle VARCHAR(30) NOT NULL, Coefficient DECIMAL(3,1) NOT NULL);
ALTER TABLE Evaluation ADD FOREIGN KEY (CodeEpreuve) REFERENCES Epreuve(CodeEpreuve);
ALTER TABLE Evaluation ADD CONSTRAINT chk_note CHECK (Note BETWEEN 0 AND 20);
ALTER TABLE Candidat ADD Genre CHAR(1);

-- Exercice 3
ALTER TABLE Jeu ADD Version VARCHAR(10);
INSERT INTO Categorie VALUES ('CAT3', 'Stratégie');
INSERT INTO Jeu (CodeJeu, LibJeu, NatJeu, AgeMin, CodeCat) VALUES ('J010', 'Chess Master', 'P', 8, 'CAT1');
SELECT J.CodeJeu, J.LibJeu, C.LibCat FROM Jeu J, Categorie C WHERE J.CodeCat = C.CodeCat ORDER BY J.LibJeu ASC;

-- Exercice 4
SELECT COUNT(*) AS NbEmployes FROM Employe E, Service S WHERE E.NumService = S.NumService AND S.LibService = 'Sécurité';
SELECT AVG(MontPrime) AS MoyennePrimes FROM Prime WHERE AnneePrime = 2021;
SELECT MatEmp, SUM(MontPrime) AS TotalPrimes FROM Prime GROUP BY MatEmp;
SELECT MatEmp, NomEmp, DateRecrut FROM Employe WHERE DateRecrut >= '2021-01-01' AND DateRecrut <= '2021-12-31' ORDER BY DateRecrut DESC;
UPDATE Prime SET MontPrime = 660.000 WHERE AnneePrime = 2022 AND MatEmp = 'E01';
DELETE FROM Prime WHERE AnneePrime < 2015;
