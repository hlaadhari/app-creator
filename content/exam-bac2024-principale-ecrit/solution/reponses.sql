-- =============================================================================
-- Solution Officielle : Bac STI 2024 Session Principale (Écrit)
-- =============================================================================

SELECT DISTINCT V.idVan, etatVan FROM Vanne V, Capteur C WHERE V.idVan = C.idVan AND refCapt LIKE 'D%';
SELECT idVan FROM Vanne WHERE idBar = 5 AND etatVan = 1;
SELECT DISTINCT C.idCapt, refCapt FROM Capteur C, Mesure M, Alerte A WHERE C.idCapt = M.idCapt AND M.idMes = A.idMes AND degAlert = 3 AND statAlert != 'R';
SELECT B.idBar, nomBar, COUNT(idVan) AS nbVannes FROM Barrage B LEFT JOIN Vanne V ON B.idBar = V.idBar GROUP BY B.idBar, nomBar;
SELECT DISTINCT B.idBar, nomBar FROM Barrage B, NiveauEau N WHERE B.idBar = N.idBar AND niveau > 0.9 * hauteur AND YEAR(dateNiv) = 2024;
SELECT C.idCapt, refCapt, MAX(dateMes) FROM Capteur C, Mesure M WHERE C.idCapt = M.idCapt GROUP BY C.idCapt, refCapt HAVING MAX(dateMes) < '2024-02-15';
DELETE FROM Alerte WHERE statAlert = 'R';
UPDATE Mesure SET valMes = valMes - 2 WHERE idCapt = 4 AND dateMes BETWEEN '2024-01-29' AND '2024-02-02';
CREATE TABLE Categorie (idCat INT PRIMARY KEY, nomCat VARCHAR(50));
ALTER TABLE Categorie ADD CONSTRAINT chk_nomCat CHECK (nomCat IN ('débit', 'pression', 'température'));
ALTER TABLE Capteur ADD idCat INT;
ALTER TABLE Capteur ADD FOREIGN KEY (idCat) REFERENCES Categorie(idCat);
